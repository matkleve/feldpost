/**
 * UploadReplacePipelineService — handles the 'replace' upload pipeline.
 *
 * Pipeline phases (Spec: upload-manager-pipeline.md § Replace Upload Pipeline):
 * validating → converting_format → hashing → dedup_check → uploading → replacing_record → complete
 *
 * Purpose: Swap the file on an existing image row, update EXIF metadata, preserve location/project.
 * Triggered by: resolveUploadManagerConflict(jobId, 'use_existing')
 *
 * Entry points:
 *  - run(jobId, ctx): Main orchestrator; validates file, hashes, checks dedup, uploads, updates DB
 *
 * Side effects:
 *  - Old storage file deleted (cleanup via UploadStorageService)
 *  - EXIF metadata updated from new file
 *  - RLS: Only user's org + row owner can replace
 *
 * Delegates to:
 *  - UploadStorageService: Upload new file; delete old storage path
 *  - UploadService: EXIF parsing, file validation
 *  - buildReplaceUpdateData: Construct DB update payload (exif, storage_path, file_size)
 */

import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { computeContentHash, readFileHead } from '../content-hash.util';
import { PhotoLoadService } from '../photo-load.service'; // TODO: Migrate to MediaDownloadService
import { SupabaseService } from '../supabase/supabase.service';
import { isCancelledUploadJob } from './upload-cancelled.util';
import { handleDedupSkip } from './upload-dedup-skip.util';
import { insertDedupHashFireAndForget } from './upload-db-postwrite.util';
import { UploadJobStateService } from './upload-job-state.service';
import type { PipelineContext } from './upload-manager.types';
import { UploadQueueService } from './upload-queue.service';
import { buildReplaceUpdateData } from './upload-replace-update-data.util';
import { UploadStorageService } from './upload-storage.service';
import { UploadService } from './upload.service';

@Injectable({ providedIn: 'root' })
export class UploadReplacePipelineService {
  private readonly uploadService = inject(UploadService);
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly photoLoad = inject(PhotoLoadService);
  private readonly jobState = inject(UploadJobStateService);
  private readonly queue = inject(UploadQueueService);
  private readonly storage = inject(UploadStorageService);

  /** Run the replace pipeline for a single job. */
  async run(jobId: string, ctx: PipelineContext): Promise<void> {
    let job = this.jobState.findJob(jobId)!;
    const abortSignal = ctx.getAbortSignal(jobId);

    // ── Phase: validating ──────────────────────────────────────────────
    this.jobState.setPhase(jobId, 'validating');
    const validation = this.uploadService.validateFile(job.file);
    if (!validation.valid) {
      ctx.failJob(jobId, 'validating', validation.error!);
      return;
    }

    const { data: targetRow, error: targetResolveError } = await this.supabase.client
      .from('media_items')
      .select('id')
      .or(`id.eq.${job.targetImageId!},source_image_id.eq.${job.targetImageId!}`)
      .limit(1)
      .maybeSingle();

    if (targetResolveError || !targetRow?.id) {
      ctx.failJob(jobId, 'validating', 'Could not find the existing image row.');
      return;
    }

    const targetMediaItemId = targetRow.id;

    const { data: existingRow, error: fetchError } = await this.supabase.client
      .from('media_items')
      .select('storage_path, thumbnail_path')
      .eq('id', targetMediaItemId)
      .limit(1)
      .maybeSingle();

    if (fetchError || !existingRow) {
      ctx.failJob(jobId, 'validating', 'Could not find the existing image row.');
      return;
    }

    this.jobState.updateJob(jobId, {
      oldStoragePath: existingRow.storage_path ?? undefined,
      oldThumbnailPath: existingRow.thumbnail_path ?? undefined,
      targetImageId: targetMediaItemId,
    });

    if (this.uploadService.isHeic(job.file)) {
      this.jobState.setPhase(jobId, 'converting_format');
      const convertedFile = await this.uploadService.convertToJpeg(job.file);

      let newThumbnailUrl = job.thumbnailUrl;
      if (newThumbnailUrl) {
        URL.revokeObjectURL(newThumbnailUrl);
      }
      newThumbnailUrl = URL.createObjectURL(convertedFile);

      this.jobState.updateJob(jobId, {
        file: convertedFile,
        thumbnailUrl: newThumbnailUrl,
      });
      job = this.jobState.findJob(jobId)!;
    }

    if (!this.uploadService.isPhotoFile(job.file)) {
      ctx.failJob(jobId, 'validating', 'Only photo files can replace an existing photo.');
      return;
    }

    // ── Phase: hashing (skip EXIF for replace — existing row has metadata) ──
    this.jobState.setPhase(jobId, 'hashing');
    const fileHead = await readFileHead(job.file);
    const contentHash = await computeContentHash({
      fileHeadBytes: fileHead,
      fileSize: job.file.size,
    });
    this.jobState.updateJob(jobId, { contentHash });

    // ── Phase: dedup_check ─────────────────────────────────────────────
    this.jobState.setPhase(jobId, 'dedup_check');
    const dedupResult = job.forceDuplicateUpload ? null : await ctx.checkDedupHash(contentHash);
    if (job.forceDuplicateUpload) {
      this.jobState.updateJob(jobId, { forceDuplicateUpload: false });
    }
    if (dedupResult) {
      handleDedupSkip({
        jobId,
        job,
        contentHash,
        existingImageId: dedupResult,
        setPhase: (id, phase) => this.jobState.setPhase(id, phase),
        updateJob: (id, patch) => this.jobState.updateJob(id, patch),
        markDone: (id) => this.queue.markDone(id),
        ctx,
      });
      return;
    }

    // ── Phase: uploading ───────────────────────────────────────────────
    this.jobState.setPhase(jobId, 'uploading');
    this.jobState.updateJob(jobId, { progress: 0 });

    const storagePath = await this.storage.upload(job.file, abortSignal);
    if (!storagePath) {
      ctx.failJob(jobId, 'uploading', 'Storage upload failed.');
      return;
    }
    if (this.isCancelled(jobId)) {
      await this.supabase.client.storage.from('media').remove([storagePath]);
      const cancelledJob = this.jobState.findJob(jobId);
      this.queue.markDone(jobId);
      if (cancelledJob) {
        ctx.emitBatchProgress(cancelledJob.batchId);
      }
      ctx.drainQueue();
      return;
    }
    this.jobState.updateJob(jobId, { storagePath, progress: 100 });

    // ── Phase: replacing_record ────────────────────────────────────────
    this.jobState.setPhase(jobId, 'replacing_record');

    // Parse EXIF from new file for metadata update
    const parsedExif = await this.uploadService.parseExif(job.file);

    const updateData = buildReplaceUpdateData(storagePath, parsedExif);

    const { error: updateError } = await this.supabase.client
      .from('media_items')
      .update(updateData)
      .eq('id', targetMediaItemId);

    if (this.isCancelled(jobId)) {
      await this.supabase.client.storage.from('media').remove([storagePath]);
      const cancelledJob = this.jobState.findJob(jobId);
      this.queue.markDone(jobId);
      if (cancelledJob) {
        ctx.emitBatchProgress(cancelledJob.batchId);
      }
      ctx.drainQueue();
      return;
    }

    if (updateError) {
      await this.supabase.client.storage.from('media').remove([storagePath]);
      ctx.failJob(jobId, 'replacing_record', updateError.message);
      return;
    }

    // Best-effort cleanup of old files
    const updatedJob = this.jobState.findJob(jobId)!;
    const pathsToDelete: string[] = [];
    if (updatedJob.oldStoragePath) pathsToDelete.push(updatedJob.oldStoragePath);
    if (updatedJob.oldThumbnailPath) pathsToDelete.push(updatedJob.oldThumbnailPath);
    if (pathsToDelete.length > 0) {
      this.supabase.client.storage.from('media').remove(pathsToDelete);
    }

    // Insert dedup hash
    insertDedupHashFireAndForget({
      contentHash: updatedJob.contentHash,
      mediaItemId: targetMediaItemId,
      userId: this.auth.user()?.id,
      insert: (payload) => this.supabase.client.from('dedup_hashes').insert(payload),
    });

    this.jobState.updateJob(jobId, {
      imageId: targetMediaItemId,
      coords: parsedExif.coords,
      direction: parsedExif.direction,
    });

    // ── Complete ───────────────────────────────────────────────────────
    this.jobState.setPhase(jobId, 'complete');
    this.queue.markDone(jobId);

    const finalJob = this.jobState.findJob(jobId)!;
    if (this.isCancelled(jobId)) {
      ctx.emitBatchProgress(finalJob.batchId);
      ctx.drainQueue();
      return;
    }

    if (finalJob.thumbnailUrl) {
      this.photoLoad.setLocalUrl(targetMediaItemId, finalJob.thumbnailUrl);
    }

    ctx.emitImageReplaced({
      jobId,
      imageId: targetMediaItemId,
      newStoragePath: storagePath,
      localObjectUrl: finalJob.thumbnailUrl,
      coords: parsedExif.coords,
      direction: parsedExif.direction,
    });

    ctx.emitBatchProgress(finalJob.batchId);
    ctx.drainQueue();
  }

  private isCancelled(jobId: string): boolean {
    return isCancelledUploadJob(this.jobState.findJob(jobId));
  }
}
