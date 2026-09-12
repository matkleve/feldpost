import type { FilenameParserService } from '../../../filename-parser/filename-parser.service';
import type { UploadAttachPipelineService } from '../attach/upload-attach-pipeline.service';
import type { UploadConflictService } from '../../support/upload-conflict.service';
import type { UploadJobStateService } from '../../support/upload-job-state.service';
import type { PipelineContext, UploadJob } from '../../upload-manager.types';
import type { UploadQueueService } from '../../support/upload-queue.service';
import type { UploadService } from '../../upload.service';
import type { ParsedExif } from '../../upload.service';
import type { UploadLocationConfigService } from '../../location/upload-location-config.service';
import { awaitHeicConversionForUpload } from '../../support/upload-heic-prepare.util';
import { isUploadDocumentFile } from '../../support/upload.service.util';

type NewPrepareRouteDeps = {
  jobState: UploadJobStateService;
  queue: UploadQueueService;
  uploadService: UploadService;
  filenameParser: FilenameParserService;
  locationConfig: UploadLocationConfigService;
  conflictService: UploadConflictService;
  attachPipeline: UploadAttachPipelineService;
};

/** What `routeJobToMissingData` alone needs — narrower than the full prepare/route bag. */
export type RouteToMissingDataDeps = {
  jobState: UploadJobStateService;
  queue: Pick<UploadQueueService, 'markDone'>;
  uploadService: Pick<UploadService, 'resolveMediaType'>;
};

export { awaitHeicConversionForUpload };

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
 * routePreparedNewJob() — Route a job through conflict check → upload phase or → issues lane.
 *
 * Ground rules:
 *  - If job has coordinates: run conflict check → upload phase
 *  - If no coordinates + high-confidence address: run conflict check → upload phase
 *  - If no coordinates + low/no confidence:
 *    - For photos: set phase=missing_data, issueKind=missing_gps
 *    - For documents: set phase=missing_data, issueKind=document_unresolved
 *    - Mark job done (dequeue); emit MissingDataEvent
 *
 * Spec compliance (upload-manager-pipeline.md):
 *  ✅ Document routing: issueKind=document_unresolved when no address
 *  ✅ Confidence gating: Only high-confidence addresses proceed to upload
 *  ✅ Conflict check: Run after address resolution
 */
/**
 * Phase 6 — placement decided in pre-resolve; upload bytes only when job.coords is set.
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

/** Branch A — no text coords and no EXIF metadata after geocode failure. */
export function routeJobToMissingData(
  deps: RouteToMissingDataDeps,
  jobId: string,
  job: UploadJob,
  ctx: PipelineContext,
): void {
  const isDocument = isUploadDocumentFile(job.file, (file) => deps.uploadService.resolveMediaType(file));
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
 * Phase 0 — EXIF parse on the original file. HEIC→JPEG is deferred until the upload gate.
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md § Phase 0 prepareExif
 */
async function prepareExifAndFile(
  deps: NewPrepareRouteDeps,
  jobId: string,
  job: UploadJob,
  _ctx: PipelineContext,
): Promise<{ job: UploadJob; parsedExif: ParsedExif } | null> {
  deps.jobState.setPhase(jobId, 'parsing_exif');
  const parsedExif = job.parsedExif ?? (await deps.uploadService.parseExif(job.file));

  deps.jobState.updateJob(jobId, {
    parsedExif,
    sourceFile: job.sourceFile ?? job.file,
    filePrepareComplete: true,
  });
  if (parsedExif.direction != null && isAutoLocationEnabled(job)) {
    deps.jobState.updateJob(jobId, { direction: parsedExif.direction });
  }

  job = deps.jobState.findJob(jobId)!;
  return { job, parsedExif };
}

/** Panel "No auto location" — only explicit optional disables GPS/filename routing. */
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

  // @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-07 —
  // set issueKind explicitly here; getIssueKind() no longer infers it from phase.
  deps.jobState.updateJob(jobId, { conflictCandidate: candidate, issueKind: 'conflict_review' });
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
