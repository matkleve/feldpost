/**
 * UploadAttachPipelineService ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â handles the 'attach' upload pipeline.
 *
 * Pipeline phases (Spec: upload-manager-pipeline.md Ãƒâ€šÃ‚Â§ Attach Upload Pipeline):
 * validating ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ converting_format ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ hashing ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ dedup_check ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ uploading ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ saving_record ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ enrichment ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ complete
 *
 * Purpose: Add a new photo to an existing photoless image row after conflict resolution.
 * Triggered by: conflict resolution response = 'use_existing' (user chooses to attach to found row)
 *
 * Entry points:
 *  - run(jobId, ctx): Main orchestrator; prepares file, uploads, attaches to existing row
 *
 * Side effects:
 *  - New storage file created and linked to existing row
 *  - Row status updated from 'empty' to 'with_media'
 *  - EXIF metadata captured from new photo
 *  - RLS: Only user's org + row owner can attach
 *
 * Delegates to:
 *  - UploadStorageService: Upload file, get storage_path
 *  - UploadEnrichmentService: Reverse-geocode if new coords provided
 *  - runAttachRecordUpdate: Atomically attach file + update row status
 *  - Conflict resolution: Part of the conversation about duplicate handling (see upload-conflict.service.ts)
 */

import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { MediaDownloadService } from '../media-download/media-download.service';
import { SupabaseService } from '../supabase/supabase.service';
import { computeAttachContentHash } from './upload-attach-hash.util';
import { runAttachPostUpdate } from './upload-attach-post-update.util';
import { runAttachRecordUpdate } from './upload-attach-record-update-runner.util';
import { isCancelledUploadJob } from './upload-cancelled.util';
import { handleCancelledStorageCleanup } from './upload-cancelled-storage-cleanup.util';
import { handleDedupSkip } from './upload-dedup-skip.util';
import { UploadEnrichmentService } from './upload-enrichment.service';
import { UploadJobStateService } from './upload-job-state.service';
import type { UploadJob } from './upload-manager.types';
import type { PipelineContext } from './upload-manager.types';
import { UploadQueueService } from './upload-queue.service';
import { UploadStorageService } from './upload-storage.service';
import { UploadService } from './upload.service';

type AttachPreparedJob = {
  job: UploadJob;
  parsedExif: Awaited<ReturnType<UploadService['parseExif']>>;
  contentHash: string;
};

@Injectable({ providedIn: 'root' })
export class UploadAttachPipelineService {
  private readonly uploadService = inject(UploadService);
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly mediaDownloadService = inject(MediaDownloadService);
  private readonly jobState = inject(UploadJobStateService);
  private readonly queue = inject(UploadQueueService);
  private readonly storage = inject(UploadStorageService);
  private readonly enrichment = inject(UploadEnrichmentService);

  async run(jobId: string, ctx: PipelineContext): Promise<void> {
    const initialJob = this.jobState.findJob(jobId)!;
    const abortSignal = ctx.getAbortSignal(jobId);
    const prepared = await this.prepareAttachJob(jobId, initialJob, ctx);
    if (!prepared) {
      return;
    }
    const { job, parsedExif, contentHash } = prepared;

    const storagePath = await this.uploadAttachFile(jobId, job.file, abortSignal, ctx);
    if (!storagePath) {
      return;
    }

    const handleCancelled = (): Promise<boolean> =>
      handleCancelledStorageCleanup({
        cancelled: this.isCancelled(jobId),
        storagePath,
        removeStoragePath: async (cleanupPath) => {
          await this.supabase.client.storage.from('media').remove([cleanupPath]);
        },
        findJob: () => this.jobState.findJob(jobId),
        markDone: () => this.queue.markDone(jobId),
        emitBatchProgress: (batchId) => ctx.emitBatchProgress(batchId),
        drainQueue: () => ctx.drainQueue(),
      });

    const recordUpdate = await runAttachRecordUpdate({
      jobId,
      job,
      parsedExif,
      contentHash,
      storagePath,
      userId: this.auth.user()?.id,
      supabaseClient: this.supabase.client,
      setPhase: (phase) => this.jobState.setPhase(jobId, phase),
      failJob: (phase, error) => ctx.failJob(jobId, phase, error),
      onCancelled: handleCancelled,
      logInfo: (...logArgs) => console.log(...logArgs),
      logError: (...logArgs) => console.error(...logArgs),
    });
    if (!recordUpdate) {
      return;
    }
    const { hadExistingCoords, isAttachKeep, finalCoords } = recordUpdate;
    const updatedJob = this.jobState.findJob(jobId)!;
    await runAttachPostUpdate({
      jobId,
      storagePath,
      hadExistingCoords,
      isAttachKeep,
      finalCoords,
      direction: parsedExif.direction,
      updatedJob,
      setPhase: (phase) => this.jobState.setPhase(jobId, phase),
      updateJob: (patch) => this.jobState.updateJob(jobId, patch),
      markDone: () => this.queue.markDone(jobId),
      findJob: () => this.jobState.findJob(jobId),
      isCancelled: () => this.isCancelled(jobId),
      setLocalUrl: (imageId, localUrl) => this.mediaDownloadService.setLocalUrl(imageId, localUrl),
      emitImageAttached: (event) => ctx.emitImageAttached(event),
      emitBatchProgress: (batchId) => ctx.emitBatchProgress(batchId),
      drainQueue: () => ctx.drainQueue(),
      enrichWithReverseGeocode: (imageId) => this.enrichment.enrichWithReverseGeocode(imageId),
      enrichWithForwardGeocode: (imageId, titleAddress) =>
        this.enrichment.enrichWithForwardGeocode(imageId, titleAddress),
      log: (...args) => console.log(...args),
      warn: (...args) => console.warn(...args),
    });
  }

  private async prepareAttachJob(
    jobId: string,
    job: NonNullable<ReturnType<UploadJobStateService['findJob']>>,
    ctx: PipelineContext,
  ): Promise<AttachPreparedJob | null> {
    this.jobState.setPhase(jobId, 'validating');
    const validation = this.uploadService.validateFile(job.file);
    if (!validation.valid) {
      console.error('[attach-pipeline] ÃƒÂ¢Ã…â€œÃ¢â‚¬â€ validation failed:', validation.error);
      ctx.failJob(jobId, 'validating', validation.error!);
      return null;
    }

    this.jobState.setPhase(jobId, 'parsing_exif');
    const parsedExif = job.parsedExif ?? (await this.uploadService.parseExif(job.file));
    this.jobState.updateJob(jobId, { parsedExif });

    if (parsedExif.coords) {
      this.jobState.updateJob(jobId, {
        coords: parsedExif.coords,
        direction: parsedExif.direction,
      });
    }
    let currentJob = this.jobState.findJob(jobId)!;
    if (this.uploadService.isHeic(currentJob.file)) {
      this.jobState.setPhase(jobId, 'converting_format');
      const convertedFile = await this.uploadService.convertToJpeg(currentJob.file);
      let newThumbnailUrl = currentJob.thumbnailUrl;
      if (newThumbnailUrl) {
        URL.revokeObjectURL(newThumbnailUrl);
      }
      newThumbnailUrl = URL.createObjectURL(convertedFile);

      this.jobState.updateJob(jobId, {
        file: convertedFile,
        thumbnailUrl: newThumbnailUrl,
      });
      currentJob = this.jobState.findJob(jobId)!;
    }

    if (!this.uploadService.isPhotoFile(currentJob.file)) {
      ctx.failJob(
        jobId,
        'validating',
        'Only photo files can be attached to an existing photo-less item.',
      );
      return null;
    }

    this.jobState.setPhase(jobId, 'hashing');
    const contentHash = await computeAttachContentHash(currentJob.file, parsedExif);
    this.jobState.updateJob(jobId, { contentHash });
    this.jobState.setPhase(jobId, 'dedup_check');
    const dedupResult = currentJob.forceDuplicateUpload
      ? null
      : await ctx.checkDedupHash(contentHash);
    if (currentJob.forceDuplicateUpload) {
      this.jobState.updateJob(jobId, { forceDuplicateUpload: false });
    }
    if (dedupResult) {
      handleDedupSkip({
        jobId,
        job: currentJob,
        contentHash,
        existingImageId: dedupResult,
        setPhase: (id, phase) => this.jobState.setPhase(id, phase),
        updateJob: (id, patch) => this.jobState.updateJob(id, patch),
        markDone: (id) => this.queue.markDone(id),
        ctx,
      });
      return null;
    }

    return { job: currentJob, parsedExif, contentHash };
  }

  private async uploadAttachFile(
    jobId: string,
    file: File,
    abortSignal: AbortSignal | undefined,
    ctx: PipelineContext,
  ): Promise<string | null> {
    this.jobState.setPhase(jobId, 'uploading');
    this.jobState.updateJob(jobId, { progress: 0 });

    const handleCancelled = (path: string): Promise<boolean> =>
      handleCancelledStorageCleanup({
        cancelled: this.isCancelled(jobId),
        storagePath: path,
        removeStoragePath: async (cleanupPath) => {
          await this.supabase.client.storage.from('media').remove([cleanupPath]);
        },
        findJob: () => this.jobState.findJob(jobId),
        markDone: () => this.queue.markDone(jobId),
        emitBatchProgress: (batchId) => ctx.emitBatchProgress(batchId),
        drainQueue: () => ctx.drainQueue(),
      });

    const storagePath = await this.storage.upload(file, abortSignal);
    if (!storagePath) {
      console.error('[attach-pipeline] ÃƒÂ¢Ã…â€œÃ¢â‚¬â€ storage upload returned null');
      ctx.failJob(jobId, 'uploading', 'Storage upload failed.');
      return null;
    }
    if (await handleCancelled(storagePath)) {
      return null;
    }

    this.jobState.updateJob(jobId, { storagePath, progress: 100 });
    return storagePath;
  }

  private isCancelled(jobId: string): boolean {
    return isCancelledUploadJob(this.jobState.findJob(jobId));
  }
}
