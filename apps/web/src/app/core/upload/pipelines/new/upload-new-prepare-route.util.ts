import type { FilenameParserService } from '../../../filename-parser/filename-parser.service';
import type { UploadAttachPipelineService } from '../attach/upload-attach-pipeline.service';
import { runUploadDedupCheck } from '../../support/upload-dedup-check.util';
import type { UploadConflictService } from '../../support/upload-conflict.service';
import type { UploadJobStateService } from '../../support/upload-job-state.service';
import type { PipelineContext, UploadJob } from '../../upload-manager.types';
import type { UploadQueueService } from '../../support/upload-queue.service';
import type { UploadService } from '../../upload.service';
import type { ParsedExif } from '../../upload.service';
import type { UploadLocationConfigService } from '../../location/upload-location-config.service';

type NewPrepareRouteDeps = {
  jobState: UploadJobStateService;
  queue: UploadQueueService;
  uploadService: UploadService;
  filenameParser: FilenameParserService;
  locationConfig: UploadLocationConfigService;
  conflictService: UploadConflictService;
  attachPipeline: UploadAttachPipelineService;
};

const heicConversionByJobId = new Map<string, Promise<void>>();

function applyConvertedFileToJob(
  deps: Pick<NewPrepareRouteDeps, 'jobState'>,
  jobId: string,
  convertedFile: File,
): void {
  const current = deps.jobState.findJob(jobId);
  if (!current) {
    return;
  }
  let newThumbnailUrl = current.thumbnailUrl;
  if (newThumbnailUrl) {
    URL.revokeObjectURL(newThumbnailUrl);
  }
  newThumbnailUrl = URL.createObjectURL(convertedFile);
  deps.jobState.updateJob(jobId, { file: convertedFile, thumbnailUrl: newThumbnailUrl });
}

/** Singleflight HEIC->JPEG for one job (prepare may have started this in background). */
function ensureHeicConversionScheduled(
  deps: Pick<NewPrepareRouteDeps, 'jobState' | 'uploadService'>,
  jobId: string,
  sourceFile: File,
): Promise<void> {
  const existing = heicConversionByJobId.get(jobId);
  if (existing) {
    return existing;
  }
  const conversion = (async (): Promise<void> => {
    deps.jobState.setPhase(jobId, 'converting_format');
    const convertedFile = await deps.uploadService.convertToJpeg(sourceFile);
    applyConvertedFileToJob(deps, jobId, convertedFile);
  })();
  const tracked = conversion.finally(() => {
    heicConversionByJobId.delete(jobId);
  });
  heicConversionByJobId.set(jobId, tracked);
  return tracked;
}

/**
 * Upload gate: JPEG bytes required. Waits background conversion from prepare, or
 * converts now when tray resolved before this job's prepare ran (common in batches).
 */
export async function awaitHeicConversionForUpload(
  deps: Pick<NewPrepareRouteDeps, 'jobState' | 'uploadService'>,
  jobId: string,
): Promise<void> {
  const job = deps.jobState.findJob(jobId);
  if (!job || !deps.uploadService.isHeic(job.file)) {
    return;
  }
  await ensureHeicConversionScheduled(deps, jobId, job.file);
  const after = deps.jobState.findJob(jobId);
  if (after && deps.uploadService.isHeic(after.file)) {
    throw new Error('HEIC conversion did not produce a JPEG file');
  }
}

export async function resumeIfAlreadyRoutedNewJob(
  deps: NewPrepareRouteDeps,
  jobId: string,
  ctx: PipelineContext,
  runUploadPhase: (
    jobId: string,
    coords: UploadJob['coords'],
    parsedExif: ParsedExif | undefined,
    ctx: PipelineContext,
  ) => Promise<void>,
): Promise<boolean> {
  const job = deps.jobState.findJob(jobId)!;

  if (job.coords && !job.conflictResolution && isAutoLocationEnabled(job)) {
    await runUploadPhase(jobId, job.coords, job.parsedExif, ctx);
    return true;
  }

  if (job.conflictResolution) {
    const updatedJob = deps.jobState.findJob(jobId)!;
    if (updatedJob.mode === 'attach') {
      await deps.attachPipeline.run(jobId, ctx);
    } else {
      await runUploadPhase(jobId, updatedJob.coords, updatedJob.parsedExif, ctx);
    }
    return true;
  }

  return false;
}

export async function prepareNewJobForUpload(
  deps: NewPrepareRouteDeps,
  jobId: string,
  ctx: PipelineContext,
): Promise<{ job: UploadJob; parsedExif: ParsedExif } | null> {
  let job = deps.jobState.findJob(jobId)!;

  deps.jobState.setPhase(jobId, 'validating');
  const validation = deps.uploadService.validateFile(job.file);
  if (!validation.valid) {
    ctx.failJob(jobId, 'validating', validation.error!);
    return null;
  }

  const prepared = await prepareExifAndFile(deps, jobId, job, ctx);
  if (!prepared) {
    return null;
  }

  return { job: deps.jobState.findJob(jobId)!, parsedExif: prepared.parsedExif };
}

/**
 * routePreparedNewJob() -- Route a job through conflict check -> upload phase or -> issues lane.
 *
 * Ground rules:
 *  - If job has coordinates: run conflict check -> upload phase
 *  - If no coordinates + high-confidence address: run conflict check -> upload phase
 *  - If no coordinates + low/no confidence:
 *    - For photos: set phase=missing_data, issueKind=missing_gps
 *    - For documents: set phase=missing_data, issueKind=document_unresolved
 *    - Mark job done (dequeue); emit MissingDataEvent
 *
 * Spec compliance (upload-manager-pipeline.md):
 *  - Document routing: issueKind=document_unresolved when no address
 *  - Confidence gating: Only high-confidence addresses proceed to upload
 *  - Conflict check: Run after address resolution
 */
/**
 * Phase 6 -- placement decided in pre-resolve; upload bytes only when job.coords is set.
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md
 */
export async function routePreparedNewJob(
  deps: NewPrepareRouteDeps,
  jobId: string,
  job: UploadJob,
  parsedExif: ParsedExif,
  ctx: PipelineContext,
  runUploadPhase: (
    jobId: string,
    coords: UploadJob['coords'],
    parsedExif: ParsedExif | undefined,
    ctx: PipelineContext,
  ) => Promise<void>,
): Promise<void> {
  if (!isAutoLocationEnabled(job)) {
    await uploadWithoutAutoLocation(deps, jobId, parsedExif, ctx, runUploadPhase);
    return;
  }

  const routedJob = deps.jobState.findJob(jobId)!;
  if (routedJob.coords) {
    const conflicted = await runConflictCheck(deps, jobId, ctx);
    if (conflicted) {
      return;
    }
    await runUploadPhase(jobId, routedJob.coords, parsedExif, ctx);
    return;
  }

  if (routedJob.phase === 'missing_data' || routedJob.phase === 'awaiting_disambiguation') {
    return;
  }

  routeJobToMissingData(deps, jobId, routedJob, ctx);
}

/** Branch A -- no text coords and no EXIF metadata after geocode failure. */
export function routeJobToMissingData(
  deps: Pick<NewPrepareRouteDeps, 'jobState' | 'queue' | 'uploadService'>,
  jobId: string,
  job: UploadJob,
  ctx: PipelineContext,
): void {
  const isDocument = deps.uploadService.resolveMediaType(job.file) === 'document';
  if (job.locationRequirementMode === 'optional') {
    return;
  }
  deps.jobState.setPhase(jobId, 'missing_data');
  deps.jobState.updateJob(jobId, {
    locationSourceUsed: 'none',
    issueKind: isDocument ? 'document_unresolved' : 'missing_gps',
    statusLabel: isDocument ? 'Choose location or project' : 'Missing location',
  });
  deps.queue.markDone(jobId);
  ctx.emitMissingData({
    jobId,
    batchId: job.batchId,
    fileName: job.file.name,
    reason: 'no_gps_no_address',
  });
  ctx.emitBatchProgress(job.batchId);
  ctx.drainQueue();
}

/**
 * Phase 0 -- EXIF parse and HEIC conversion run in parallel (both work on the original file).
 * Upload gate (Phase B) waits for conversion; geocode starts as soon as EXIF + SO are ready.
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md # Phase 0 prepareExif
 */
async function prepareExifAndFile(
  deps: NewPrepareRouteDeps,
  jobId: string,
  job: UploadJob,
  ctx: PipelineContext,
): Promise<{ job: UploadJob; parsedExif: ParsedExif } | null> {
  const isHeic = deps.uploadService.isHeic(job.file);

  // Fire both immediately -- EXIF parse and HEIC->JPEG conversion are independent of each other.
  deps.jobState.setPhase(jobId, 'parsing_exif');
  const exifPromise: Promise<ParsedExif> = job.parsedExif
    ? Promise.resolve(job.parsedExif)
    : deps.uploadService.parseExif(job.file);
  const convertPromise: Promise<File> | null = isHeic
    ? deps.uploadService.convertToJpeg(job.file)
    : null;

  // Await EXIF first (usually fast); switch phase label to converting_format once it's done.
  const parsedExif = await exifPromise;
  if (isHeic) {
    deps.jobState.setPhase(jobId, 'converting_format');
  }
  deps.jobState.updateJob(jobId, { parsedExif });
  if (parsedExif.direction != null && isAutoLocationEnabled(job)) {
    deps.jobState.updateJob(jobId, { direction: parsedExif.direction });
  }

  if (isHeic) {
    const conversion = (async (): Promise<void> => {
      try {
        const convertedFile = await convertPromise!;
        applyConvertedFileToJob(deps, jobId, convertedFile);
      } catch (err) {
        const message =
          err instanceof Error && err.message === 'HEIC_CONVERSION_FAILED'
            ? `Could not convert "${job.file.name}" to JPEG. Try exporting as JPEG and upload again.`
            : err instanceof Error
              ? err.message
              : 'HEIC conversion failed.';
        ctx.failJob(jobId, 'converting_format', message);
        throw err;
      }
    })();
    heicConversionByJobId.set(
      jobId,
      conversion.finally(() => {
        heicConversionByJobId.delete(jobId);
      }),
    );
    job = deps.jobState.findJob(jobId)!;
    if (job.phase === 'error') {
      return null;
    }
    return { job, parsedExif };
  }

  return { job, parsedExif };
}

/**
 * Hash + dedup check after placement; shows modal or marks skip.
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.md # Actions 7-9
 */
export async function hashAndCheckDedupForNewJob(
  deps: Pick<NewPrepareRouteDeps, 'jobState' | 'queue' | 'uploadService'>,
  jobId: string,
  job: UploadJob,
  parsedExif: ParsedExif,
  ctx: PipelineContext,
): Promise<boolean> {
  const outcome = await runUploadDedupCheck(deps, jobId, job, parsedExif, ctx);
  return outcome === 'skipped' || outcome === 'issue';
}

/** Panel "No auto location" -- only explicit optional disables GPS/filename routing. */
function isAutoLocationEnabled(job: UploadJob): boolean {
  return job.locationRequirementMode !== 'optional';
}

async function uploadWithoutAutoLocation(
  deps: NewPrepareRouteDeps,
  jobId: string,
  parsedExif: ParsedExif,
  ctx: PipelineContext,
  runUploadPhase: (
    jobId: string,
    coords: UploadJob['coords'],
    parsedExif: ParsedExif | undefined,
    ctx: PipelineContext,
  ) => Promise<void>,
): Promise<void> {
  deps.jobState.updateJob(jobId, {
    issueKind: undefined,
    locationSourceUsed: 'none',
    coords: undefined,
    titleAddress: undefined,
    titleAddressSource: undefined,
  });
  const conflicted = await runConflictCheck(deps, jobId, ctx);
  if (conflicted) return;
  await runUploadPhase(jobId, undefined, parsedExif, ctx);
}

async function runConflictCheck(
  deps: NewPrepareRouteDeps,
  jobId: string,
  ctx: PipelineContext,
): Promise<boolean> {
  const job = deps.jobState.findJob(jobId);
  if (!job) return false;

  deps.jobState.setPhase(jobId, 'conflict_check');

  const candidate = await deps.conflictService.findConflict(job.coords, job.titleAddress);
  if (!candidate) return false;

  deps.jobState.updateJob(jobId, { conflictCandidate: candidate });
  deps.jobState.setPhase(jobId, 'awaiting_conflict_resolution');

  deps.queue.markDone(jobId);

  ctx.emitLocationConflict({
    jobId,
    batchId: job.batchId,
    fileName: job.file.name,
    candidate,
    uploadCoords: job.coords,
    uploadAddress: job.titleAddress,
  });

  ctx.drainQueue();
  return true;
}
