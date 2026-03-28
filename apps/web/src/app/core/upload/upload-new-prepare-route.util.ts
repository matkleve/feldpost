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
  if (job.coords) {
    const conflicted = await runConflictCheck(deps, jobId, ctx);
    if (conflicted) return;
    await runUploadPhase(jobId, job.coords, parsedExif, ctx);
    return;
  }

  deps.jobState.setPhase(jobId, 'extracting_title');
  const titleAddress = deps.filenameParser.extractAddress(job.file.name);
  if (titleAddress) {
    deps.jobState.updateJob(jobId, { titleAddress });
    const conflicted = await runConflictCheck(deps, jobId, ctx);
    if (conflicted) return;
    await runUploadPhase(jobId, undefined, parsedExif, ctx);
    return;
  }

  deps.jobState.setPhase(jobId, 'missing_data');
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
