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
import type { MediaDownloadService } from '../media-download/media-download.service';
import type { MediaThumbnailPersistenceService } from '../media-thumbnail/media-thumbnail-persistence.service';
import type { MediaPreviewGenerationService } from '../media-thumbnail/media-preview-generation.service';
import { persistUploadJobThumbnailIfNeeded } from './upload-thumbnail-persist.util';
import {
  formatUploadFailureMessage,
  uploadFailureMessageToToastText,
} from './upload-error-messages.util';
import { resolveUploadPhaseInputs } from './upload-location-inputs.helpers';
import { awaitHeicConversionForUpload } from './upload-new-prepare-route.util';

type RunNewUploadPhaseArgs = {
  jobId: string;
  coords: ExifCoords | undefined;
  parsedExif: ParsedExif | undefined;
  ctx: PipelineContext;
  uploadPhaseTimeoutMs: number;
  mismatchToleranceMeters: number;
  isCancelled: () => boolean;
  jobState: UploadJobStateService;
  queue: UploadQueueService;
  uploadService: UploadService;
  supabaseClient: SupabaseService['client'];
  enrich: UploadEnrichmentService;
  mediaDownloadService: MediaDownloadService;
  thumbnailPersistence: MediaThumbnailPersistenceService;
  previewGeneration: MediaPreviewGenerationService;
  getUserId: () => string | undefined;
};

export async function runNewUploadPhase(args: RunNewUploadPhaseArgs): Promise<void> {
  const {
    jobId,
    coords,
    parsedExif,
    ctx,
    uploadPhaseTimeoutMs,
    mismatchToleranceMeters,
    isCancelled,
    jobState,
    queue,
    uploadService,
    supabaseClient,
    enrich,
    mediaDownloadService,
    thumbnailPersistence,
    previewGeneration,
    getUserId,
  } = args;

  const job = jobState.findJob(jobId);
  if (!job) return;
  if (isCancelled()) return;

  await awaitHeicConversionForUpload({ jobState, uploadService }, jobId);

  const locationInputs = resolveUploadPhaseInputs({
    job: jobState.findJob(jobId)!,
    manualCoords: coords,
    parsedExif,
  });

  const result = await runUploadCall({
    job,
    coords: locationInputs.coords,
    parsedExif: locationInputs.parsedExif,
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
    enrichWithReverseGeocode: (mediaId) => enrich.enrichWithReverseGeocode(mediaId),
    enrichWithForwardGeocode: (mediaId, titleAddress) =>
      enrich.enrichWithForwardGeocode(mediaId, titleAddress),
    geocodeTitleAddress: (titleAddress) => enrich.forwardGeocodeAddress(titleAddress),
    mismatchToleranceMeters,
    setLocalUrl: (mediaId, localUrl) => mediaDownloadService.setLocalUrl(mediaId, localUrl),
    persistThumbnail: async (job: UploadJob) => {
      const userId = getUserId();
      if (!userId) {
        return;
      }
      await persistUploadJobThumbnailIfNeeded({
        job,
        userId,
        persistence: thumbnailPersistence,
        mediaDownload: mediaDownloadService,
        previewGeneration,
      });
    },
    emitImageUploaded: (event) => ctx.emitImageUploaded(event),
  });
}

/** @deprecated Use resolveUploadPhaseInputs from upload-location-inputs.helpers.ts */
export function resolveUploadLocationInputs(
  job: UploadJob,
  coords: ExifCoords | undefined,
  parsedExif: ParsedExif | undefined,
): { coords: ExifCoords | undefined; parsedExif: ParsedExif | undefined } {
  return resolveUploadPhaseInputs({ job, manualCoords: coords, parsedExif });
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
    uploadService.uploadFile(
      job.file,
      coords,
      parsedExif,
      job.projectId,
      abortSignal,
      job.relativePath,
      { pendingPartialLocation: job.pendingPartialLocation },
    ),
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
  const savedCoords =
    jobState.findJob(jobId)?.locationRequirementMode === 'optional'
      ? undefined
      : result.coords;

  jobState.updateJob(jobId, {
    progress: 100,
    mediaId: result.id,
    storagePath: result.storagePath,
    coords: savedCoords,
    direction: result.direction,
  });

  const savedJob = jobState.findJob(jobId)!;
  if (isCancelled()) {
    handleCancelledSavedJob(jobId, savedJob.batchId, ctx, queue);
    return null;
  }

  if (savedJob.contentHash && savedJob.mediaId) {
    insertDedupHashFireAndForget({
      contentHash: savedJob.contentHash,
      mediaItemId: savedJob.mediaId,
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
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'object'
        ? ((error as { message?: string }).message ?? String(error))
        : String(error);
  return uploadFailureMessageToToastText(formatUploadFailureMessage(raw));
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
