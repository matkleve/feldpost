/**
 * UploadAttachPipelineService — handles the 'attach' upload pipeline.
 *
 * Pipeline phases (Spec: upload-manager-pipeline.md § Attach Upload Pipeline):
 * validating → parsing_exif → hashing → dedup_check → uploading → replacing_record → enrichment → complete
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
import { AuthService } from '../../../auth/auth.service';
import { MediaDownloadService } from '../../../media-download/media-download.service';
import { SupabaseService } from '../../../supabase/supabase.service';
import { runAttachPostUpdate } from './upload-attach-post-update.util';
import { runAttachRecordUpdate } from './upload-attach-record-update-runner.util';
import { uploadManagerDebugLog } from '../../support/upload-manager-debug.util';
import { isCancelledUploadJob } from '../../support/upload-cancelled.util';
import { handleCancelledStorageCleanup } from '../../support/upload-cancelled-storage-cleanup.util';
import { runUploadDedupCheck } from '../../support/upload-dedup-check.util';
import { UploadEnrichmentService } from '../../support/upload-enrichment.service';
import { buildUploadAddressPersistContext } from '../../address-resolution/upload-address-persist-context.helpers';
import { UploadJobStateService } from '../../support/upload-job-state.service';
import type { UploadJob } from '../../upload-manager.types';
import type { PipelineContext } from '../../upload-manager.types';
import { UploadQueueService } from '../../support/upload-queue.service';
import { UploadStorageService } from '../../support/upload-storage.service';
import { UploadService } from '../../upload.service';
import { awaitHeicConversionForUpload } from '../../support/upload-heic-prepare.util';
import {
  DEFAULT_UPLOAD_PHASE_TIMEOUT_MS,
  runStorageUploadWithTimeout,
} from '../../support/upload-storage-timeout.util';

type AttachPreparedJob = {
  job: UploadJob;
  parsedExif: Awaited<ReturnType<UploadService['parseExif']>>;
  contentHash: string;
};

@Injectable({ providedIn: 'root' })
export class UploadAttachPipelineService {
  private static readonly UPLOAD_PHASE_TIMEOUT_MS = DEFAULT_UPLOAD_PHASE_TIMEOUT_MS;

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

    try {
      await awaitHeicConversionForUpload(
        { jobState: this.jobState, uploadService: this.uploadService },
        jobId,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'HEIC conversion failed before upload.';
      ctx.failJob(jobId, 'converting_format', message);
      return;
    }

    const jobForUpload = this.jobState.findJob(jobId)!;
    const storagePath = await this.uploadAttachFile(jobId, jobForUpload.file, abortSignal, ctx);
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
      failJob: (phase, error, errorKey) => ctx.failJob(jobId, phase, error, errorKey),
      onCancelled: handleCancelled,
      logInfo: uploadManagerDebugLog,
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
      setLocalUrl: (mediaId, localUrl) => this.mediaDownloadService.setLocalUrl(mediaId, localUrl),
      emitImageAttached: (event) => ctx.emitImageAttached(event),
      emitBatchProgress: (batchId) => ctx.emitBatchProgress(batchId),
      drainQueue: () => ctx.drainQueue(),
      enrichWithReverseGeocode: (mediaId) => this.enrichment.enrichWithReverseGeocode(mediaId),
      enrichWithForwardGeocode: (mediaId, titleAddress) => {
        const job = this.jobState.findJob(jobId);
        const addressContext = job
          ? buildUploadAddressPersistContext({ job, groupState: null })
          : null;
        return this.enrichment.enrichWithForwardGeocode(mediaId, titleAddress, addressContext);
      },
      // `warn` (missing thumbnailUrl at finalize) is left ungated: it flags a
      // real data anomaly rather than routine trace noise. See UP-41.
      log: uploadManagerDebugLog,
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
      console.error('[attach-pipeline] ✗ validation failed:', validation.error);
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
    const currentJob = this.jobState.findJob(jobId)!;
    this.jobState.updateJob(jobId, {
      sourceFile: currentJob.sourceFile ?? currentJob.file,
      filePrepareComplete: true,
    });

    if (!this.uploadService.isPhotoFile(currentJob.file)) {
      ctx.failJob(
        jobId,
        'validating',
        'Only photo files can be attached to an existing photo-less item.',
      );
      return null;
    }

    const dedupOutcome = await runUploadDedupCheck(
      { jobState: this.jobState, queue: this.queue, uploadService: this.uploadService },
      jobId,
      currentJob,
      parsedExif,
      ctx,
    );
    if (dedupOutcome === 'skipped' || dedupOutcome === 'issue') {
      return null;
    }

    const updated = this.jobState.findJob(jobId)!;
    return { job: updated, parsedExif, contentHash: updated.contentHash! };
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

    let storagePath: string | null;
    try {
      storagePath = await runStorageUploadWithTimeout(
        this.storage.upload(file, abortSignal),
        UploadAttachPipelineService.UPLOAD_PHASE_TIMEOUT_MS,
        'Upload timed out. Please retry.',
        () => ctx.abortJobRequest(jobId),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Storage upload failed.';
      ctx.failJob(jobId, 'uploading', message);
      return null;
    }

    if (!storagePath) {
      console.error('[attach-pipeline] ✗ storage upload returned null');
      ctx.failJob(jobId, 'uploading', 'Storage upload failed.', 'storage_upload_failed');
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
