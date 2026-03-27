import { insertDedupHashFireAndForget } from './upload-db-postwrite.util';
import { finalizeNewUploadPhase } from './upload-new-post-save.util';
import type { UploadEnrichmentService } from './upload-enrichment.service';
import type { UploadJobStateService } from './upload-job-state.service';
import type { PipelineContext, UploadJob } from './upload-manager.types';
import type { UploadQueueService } from './upload-queue.service';
import type { UploadService } from './upload.service';
import type { ExifCoords, ParsedExif } from './upload.service';
import type { UploadResult } from './upload.types';
import type { SupabaseService } from '../supabase/supabase.service';
import type { PhotoLoadService } from '../photo-load.service';

type RunNewUploadPhaseArgs = {
  jobId: string;
  coords: ExifCoords | undefined;
  parsedExif: ParsedExif | undefined;
  ctx: PipelineContext;
  uploadPhaseTimeoutMs: number;
  isCancelled: () => boolean;
  jobState: UploadJobStateService;
  queue: UploadQueueService;
  uploadService: UploadService;
  supabaseClient: SupabaseService['client'];
  enrich: UploadEnrichmentService;
  photoLoad: PhotoLoadService;
  getUserId: () => string | undefined;
};

export async function runNewUploadPhase(args: RunNewUploadPhaseArgs): Promise<void> {
  const {
    jobId,
    coords,
    parsedExif,
    ctx,
    uploadPhaseTimeoutMs,
    isCancelled,
    jobState,
    queue,
    uploadService,
    supabaseClient,
    enrich,
    photoLoad,
    getUserId,
  } = args;

  const job = jobState.findJob(jobId);
  if (!job) return;
  if (isCancelled()) return;

  const result = await runUploadCall({
    job,
    coords,
    parsedExif,
    uploadService,
    jobState,
    timeoutMs: uploadPhaseTimeoutMs,
    abortSignal: ctx.getAbortSignal(jobId),
  });

  const savedJob = await handleUploadResult({
    jobId,
    result,
    ctx,
    isCancelled,
    jobState,
    queue,
    supabaseClient,
    getUserId,
  });
  if (!savedJob) return;

  await finalizeNewUploadPhase({
    jobId,
    isCancelled,
    findJob: () => jobState.findJob(jobId),
    setPhase: (phase) => jobState.setPhase(jobId, phase),
    updateJob: (patch) => jobState.updateJob(jobId, patch),
    markDone: () => queue.markDone(jobId),
    emitBatchProgress: (batchId) => ctx.emitBatchProgress(batchId),
    drainQueue: () => ctx.drainQueue(),
    enrichWithReverseGeocode: (imageId) => enrich.enrichWithReverseGeocode(imageId),
    enrichWithForwardGeocode: (imageId, titleAddress) =>
      enrich.enrichWithForwardGeocode(imageId, titleAddress),
    setLocalUrl: (imageId, localUrl) => photoLoad.setLocalUrl(imageId, localUrl),
    emitImageUploaded: (event) => ctx.emitImageUploaded(event),
  });
}

async function runUploadCall(args: {
  job: UploadJob;
  coords: ExifCoords | undefined;
  parsedExif: ParsedExif | undefined;
  uploadService: UploadService;
  jobState: UploadJobStateService;
  timeoutMs: number;
  abortSignal: AbortSignal | undefined;
}): Promise<UploadResult> {
  const { job, coords, parsedExif, uploadService, jobState, timeoutMs, abortSignal } = args;

  jobState.setPhase(job.id, 'uploading');
  jobState.updateJob(job.id, { progress: 0 });

  return withTimeout(
    uploadService.uploadFile(job.file, coords, parsedExif, job.projectId, abortSignal),
    timeoutMs,
    'Upload timed out. Please retry.',
  );
}

async function handleUploadResult(args: {
  jobId: string;
  result: UploadResult;
  ctx: PipelineContext;
  isCancelled: () => boolean;
  jobState: UploadJobStateService;
  queue: UploadQueueService;
  supabaseClient: SupabaseService['client'];
  getUserId: () => string | undefined;
}): Promise<UploadJob | null> {
  const { jobId, result, ctx, isCancelled, jobState, queue, supabaseClient, getUserId } = args;

  if (isCancelled()) {
    await handleCancelledResultBeforeFinalize({
      jobId,
      result,
      ctx,
      jobState,
      queue,
      supabaseClient,
    });
    return null;
  }

  if (result.error !== null) {
    const msg = getUploadErrorMessage(result.error);
    ctx.failJob(jobId, 'saving_record', msg);
    return null;
  }

  jobState.setPhase(jobId, 'saving_record');
  jobState.updateJob(jobId, {
    progress: 100,
    imageId: result.id,
    storagePath: result.storagePath,
    coords: result.coords,
    direction: result.direction,
  });

  const savedJob = jobState.findJob(jobId)!;
  if (isCancelled()) {
    handleCancelledSavedJob(jobId, savedJob.batchId, ctx, queue);
    return null;
  }

  if (savedJob.contentHash && savedJob.imageId) {
    insertDedupHashFireAndForget({
      contentHash: savedJob.contentHash,
      mediaItemId: savedJob.imageId,
      userId: getUserId(),
      insert: (payload) => supabaseClient.from('dedup_hashes').insert(payload),
    });
  }

  return savedJob;
}

async function handleCancelledResultBeforeFinalize(args: {
  jobId: string;
  result: UploadResult;
  ctx: PipelineContext;
  jobState: UploadJobStateService;
  queue: UploadQueueService;
  supabaseClient: SupabaseService['client'];
}): Promise<void> {
  const { jobId, result, ctx, jobState, queue, supabaseClient } = args;

  if (result.error === null) {
    await supabaseClient.storage.from('media').remove([result.storagePath]);
    // Delete from primary media_items table by media id or legacy source image id.
    await supabaseClient
      .from('media_items')
      .delete()
      .or(`id.eq.${result.id},source_image_id.eq.${result.id}`);
  }

  const cancelledJob = jobState.findJob(jobId);
  queue.markDone(jobId);
  if (cancelledJob) {
    ctx.emitBatchProgress(cancelledJob.batchId);
  }
  ctx.drainQueue();
}

function handleCancelledSavedJob(
  jobId: string,
  batchId: string,
  ctx: PipelineContext,
  queue: UploadQueueService,
): void {
  queue.markDone(jobId);
  ctx.emitBatchProgress(batchId);
  ctx.drainQueue();
}

function getUploadErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object') {
    return (error as { message?: string }).message ?? String(error);
  }
  return String(error);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
