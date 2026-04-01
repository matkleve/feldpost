import { computeContentHash, readFileHead } from '../content-hash.util';
import type { FilenameParserService } from '../filename-parser.service';
import type { UploadAttachPipelineService } from './upload-attach-pipeline.service';
import { handleDedupSkip } from './upload-dedup-skip.util';
import type { UploadConflictService } from './upload-conflict.service';
import type { UploadJobStateService } from './upload-job-state.service';
import type { PipelineContext, UploadJob } from './upload-manager.types';
import type { UploadQueueService } from './upload-queue.service';
import type { UploadService } from './upload.service';
import type { ParsedExif } from './upload.service';

type NewPrepareRouteDeps = {
  jobState: UploadJobStateService;
  queue: UploadQueueService;
  uploadService: UploadService;
  filenameParser: FilenameParserService;
  conflictService: UploadConflictService;
  attachPipeline: UploadAttachPipelineService;
};

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

  if (job.coords && !job.conflictResolution) {
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

  const prepared = await prepareExifAndFile(deps, jobId, job);
  job = prepared.job;

  const deduped = await hashAndCheckDedup(deps, jobId, job, prepared.parsedExif, ctx);
  if (deduped) return null;

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
  const isDocument = deps.uploadService.resolveMediaType(job.file) === 'document';

  // Location resolution decision tree (deterministic, first match wins):
  // Spec context:
  // - docs/element-specs/upload-manager-pipeline.md (Actions 4, 4a, 5)
  // - docs/element-specs/location-path-parser.md (filename priority behavior)
  // 1) If EXIF GPS exists, GPS is the authoritative source for routing.
  //    - Clear issue flag
  //    - Run conflict check with coords
  //    - Continue upload path with coords
  // 2) If GPS is missing, try filename title extraction.
  //    - Accept only `high` confidence title addresses for automatic routing
  //    - Save titleAddress on job, run conflict check, continue upload path
  // 3) Otherwise route to `missing_data` (no trustworthy location anchor).
  //    - photos: issueKind=missing_gps
  //    - documents: issueKind=document_unresolved
  // This split ensures ambiguous/weak text does not silently bypass the issues lane.

  if (job.coords) {
    deps.jobState.updateJob(jobId, { issueKind: undefined, locationSourceUsed: 'exif' });
    const conflicted = await runConflictCheck(deps, jobId, ctx);
    if (conflicted) return;
    await runUploadPhase(jobId, job.coords, parsedExif, ctx);
    return;
  }

  deps.jobState.setPhase(jobId, 'extracting_title');
  const parsed = deps.filenameParser.extractAddress(job.file.name);
  const inheritedTitleAddress = job.titleAddress?.trim();
  // Only accept high-confidence addresses; low-confidence → Issues
  if (parsed && parsed.confidence === 'high') {
    deps.jobState.updateJob(jobId, {
      titleAddress: parsed.address,
      titleAddressSource: 'file',
      locationSourceUsed: 'file',
      issueKind: undefined,
    });
    const conflicted = await runConflictCheck(deps, jobId, ctx);
    if (conflicted) return;
    await runUploadPhase(jobId, undefined, parsedExif, ctx);
    return;
  }

  // Folder-level hints are defaults only and are used only when no high-confidence
  // file-level title override was found for this file.
  // Spec context: docs/element-specs/upload-manager-pipeline.md (Action 3 + Action 4).
  if (inheritedTitleAddress) {
    deps.jobState.updateJob(jobId, {
      titleAddress: inheritedTitleAddress,
      titleAddressSource: job.titleAddressSource ?? 'folder',
      locationSourceUsed: 'folder',
      issueKind: undefined,
    });
    const conflicted = await runConflictCheck(deps, jobId, ctx);
    if (conflicted) return;
    await runUploadPhase(jobId, undefined, parsedExif, ctx);
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

async function prepareExifAndFile(
  deps: NewPrepareRouteDeps,
  jobId: string,
  job: UploadJob,
): Promise<{ job: UploadJob; parsedExif: ParsedExif }> {
  deps.jobState.setPhase(jobId, 'parsing_exif');
  const parsedExif = job.parsedExif ?? (await deps.uploadService.parseExif(job.file));
  deps.jobState.updateJob(jobId, { parsedExif });

  if (parsedExif.coords) {
    deps.jobState.updateJob(jobId, {
      coords: parsedExif.coords,
      direction: parsedExif.direction,
    });
  }

  if (deps.uploadService.isHeic(job.file)) {
    deps.jobState.setPhase(jobId, 'converting_format');
    const convertedFile = await deps.uploadService.convertToJpeg(job.file);
    let newThumbnailUrl = job.thumbnailUrl;
    if (newThumbnailUrl) {
      URL.revokeObjectURL(newThumbnailUrl);
    }
    newThumbnailUrl = URL.createObjectURL(convertedFile);

    deps.jobState.updateJob(jobId, {
      file: convertedFile,
      thumbnailUrl: newThumbnailUrl,
    });
    job = deps.jobState.findJob(jobId)!;
  }

  return { job, parsedExif };
}

async function hashAndCheckDedup(
  deps: NewPrepareRouteDeps,
  jobId: string,
  job: UploadJob,
  parsedExif: ParsedExif,
  ctx: PipelineContext,
): Promise<boolean> {
  if (!deps.uploadService.isPhotoFile(job.file)) {
    return false;
  }

  if (job.forceDuplicateUpload) {
    deps.jobState.updateJob(jobId, { forceDuplicateUpload: false });
    return false;
  }

  deps.jobState.setPhase(jobId, 'hashing');
  const fileHead = await readFileHead(job.file);
  const contentHash = await computeContentHash({
    fileHeadBytes: fileHead,
    fileSize: job.file.size,
    gpsCoords: parsedExif.coords
      ? { lat: parsedExif.coords.lat, lng: parsedExif.coords.lng }
      : undefined,
    capturedAt: parsedExif.capturedAt?.toISOString(),
    direction: parsedExif.direction,
  });
  deps.jobState.updateJob(jobId, { contentHash });

  deps.jobState.setPhase(jobId, 'dedup_check');
  const dedupResult = await ctx.checkDedupHash(contentHash);
  if (!dedupResult) {
    return false;
  }

  handleDedupSkip({
    jobId,
    job,
    contentHash,
    existingImageId: dedupResult,
    setPhase: (id, phase) => deps.jobState.setPhase(id, phase),
    updateJob: (id, patch) => deps.jobState.updateJob(id, patch),
    markDone: (id) => deps.queue.markDone(id),
    ctx,
  });
  return true;
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
