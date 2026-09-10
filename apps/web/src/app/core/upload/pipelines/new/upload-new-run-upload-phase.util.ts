import {
  insertDedupHashFireAndForget,
  organizationIdFromStoragePath,
} from '../../support/upload-db-postwrite.util';
import { removeUploadCancelResidue } from '../../support/upload-cancel-residue.util';
import { finalizeNewUploadPhase } from './upload-new-post-save.util';
import type { UploadEnrichmentService } from '../../support/upload-enrichment.service';
import type { UploadJobStateService } from '../../support/upload-job-state.service';
import type { PipelineContext, UploadJob } from '../../upload-manager.types';
import type { UploadQueueService } from '../../support/upload-queue.service';
import type { UploadService } from '../../upload.service';
import type { ExifCoords, ParsedExif } from '../../upload.service';
import type { UploadResult } from '../../upload.types';
import type { SupabaseService } from '../../../supabase/supabase.service';
import type { MediaDownloadService } from '../../../media-download/media-download.service';
import type { MediaThumbnailPersistenceService } from '../../../media-thumbnail/media-thumbnail-persistence.service';
import type { MediaPreviewGenerationService } from '../../../media-thumbnail/media-preview-generation.service';
import { persistUploadJobThumbnailIfNeeded } from '../../support/upload-thumbnail-persist.util';
import {
  formatUploadFailureMessage,
  uploadFailureMessageToToastText,
} from '../../support/upload-error-messages.util';
import { resolveUploadPhaseInputs } from '../../location/upload-location-inputs.helpers';
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

  try {
    await awaitHeicConversionForUpload({ jobState, uploadService }, jobId);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'HEIC conversion failed before upload.';
    ctx.failJob(jobId, 'converting_format', message);
    return;
  }

  const jobForUpload = jobState.findJob(jobId);
  if (!jobForUpload) {
    return;
  }

  const locationInputs = resolveUploadPhaseInputs({
    job: jobForUpload,
    manualCoords: coords,
    parsedExif,
  });

  const result = await runUploadCall({
    jobId,
    job: jobForUpload,
    coords: locationInputs.coords,
    parsedExif: locationInputs.parsedExif,
    uploadService,
    jobState,
    timeoutMs: uploadPhaseTimeoutMs,
    abortSignal: ctx.getAbortSignal(jobId),
    ctx,
    supabaseClient,
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
    persistMismatch: async (mediaId, distanceMeters) => {
      await supabaseClient
        .from('media_items')
        .update({ location_mismatch_meters: distanceMeters })
        .eq('id', mediaId);
    },
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

export async function runUploadCall(args: {
  jobId: string;
  job: UploadJob;
  coords: ExifCoords | undefined;
  parsedExif: ParsedExif | undefined;
  uploadService: UploadService;
  jobState: UploadJobStateService;
  timeoutMs: number;
  abortSignal: AbortSignal | undefined;
  ctx: PipelineContext;
  supabaseClient: SupabaseService['client'];
}): Promise<UploadResult> {
  const {
    jobId,
    job,
    coords,
    parsedExif,
    uploadService,
    jobState,
    timeoutMs,
    abortSignal,
    ctx,
    supabaseClient,
  } = args;

  jobState.setPhase(job.id, 'uploading');
  jobState.updateJob(job.id, { progress: 0 });

  const uploadPromise = uploadService.uploadFile(
    job.file,
    coords,
    parsedExif,
    job.projectId,
    abortSignal,
    job.relativePath,
    { pendingPartialLocation: job.pendingPartialLocation },
    job.addressNotes,
  );

  return withTimeout(uploadPromise, timeoutMs, 'Upload timed out. Please retry.', () => {
    // The installed @supabase/storage-js client does not honour AbortSignal for
    // `.upload()` (verified against @supabase/storage-js@2.105.4 — the signal is
    // dropped before it reaches the HTTP layer), so this cannot interrupt an
    // in-flight request; it only narrows the window for the manual
    // `abortSignal?.aborted` checkpoints inside persistUploadFile. Because the
    // upload can still succeed after we've already failed the job on timeout,
    // clean up that late arrival so it doesn't leave an orphaned storage object
    // and media_items row that nothing ever references.
    // @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-06
    ctx.abortJobRequest(jobId);
    void cleanupLateUploadSuccess(uploadPromise, supabaseClient);
  });
}

async function cleanupLateUploadSuccess(
  uploadPromise: Promise<UploadResult>,
  supabaseClient: SupabaseService['client'],
): Promise<void> {
  let result: UploadResult;
  try {
    result = await uploadPromise;
  } catch {
    // The upload eventually failed on its own; nothing was persisted to clean up.
    return;
  }
  if (result.error === null) {
    await removeUploadCancelResidue(result.storagePath, result.id, supabaseClient);
  }
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
      organizationId: organizationIdFromStoragePath(savedJob.storagePath),
      hashAlgo: savedJob.contentHashAlgo,
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
    await removeUploadCancelResidue(result.storagePath, result.id, supabaseClient);
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
  onTimeout?: () => void,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          onTimeout?.();
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
