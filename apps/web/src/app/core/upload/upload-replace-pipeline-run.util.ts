/**
 * Replace pipeline phase runners (mechanical extract from UploadReplacePipelineService.run).
 * @see upload-replace-pipeline.service.ts
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.md § Replace Upload Pipeline
 */

import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { computeContentHash, readFileHead } from './content-hash.util';
import type { MediaDownloadService } from '../media-download/media-download.service';
import { handleDedupSkip } from './upload-dedup-skip.util';
import type { UploadJobStateService } from './upload-job-state.service';
import type { PipelineContext, UploadJob } from './upload-manager.types';
import type { UploadQueueService } from './upload-queue.service';
import type { UploadStorageService } from './upload-storage.service';
import type { UploadService } from './upload.service';
import type { ParsedExif } from './upload.types';

export interface ReplacePipelineRunDeps {
  uploadService: UploadService;
  supabaseClient: SupabaseClient;
  mediaDownloadService: MediaDownloadService;
  jobState: UploadJobStateService;
  queue: UploadQueueService;
  storage: UploadStorageService;
  getUser: () => User | null | undefined;
  isCancelled: (jobId: string) => boolean;
}

export type ReplacePipelinePrepared = {
  job: UploadJob;
  targetMediaItemId: string;
  parsedExif: ParsedExif;
  contentHash: string;
};

/**
 * validating → parsing_exif → converting_format → hashing → dedup_check.
 * @see upload-replace-pipeline.service.ts run (first half)
 */
export async function prepareReplacePipelineJob(
  jobId: string,
  ctx: PipelineContext,
  deps: ReplacePipelineRunDeps,
): Promise<ReplacePipelinePrepared | null> {
  let job = deps.jobState.findJob(jobId)!;

  deps.jobState.setPhase(jobId, 'validating');
  const validation = deps.uploadService.validateFile(job.file);
  if (!validation.valid) {
    ctx.failJob(jobId, 'validating', validation.error!);
    return null;
  }

  const { data: targetRow, error: targetResolveError } = await deps.supabaseClient
    .from('media_items')
    .select('id')
    .or(`id.eq.${job.targetMediaId!},source_image_id.eq.${job.targetMediaId!}`)
    .limit(1)
    .maybeSingle();

  if (targetResolveError || !targetRow?.id) {
    ctx.failJob(jobId, 'validating', 'Could not find the existing image row.');
    return null;
  }

  const targetMediaItemId = targetRow.id;

  const { data: existingRow, error: fetchError } = await deps.supabaseClient
    .from('media_items')
    .select('storage_path, thumbnail_path')
    .eq('id', targetMediaItemId)
    .limit(1)
    .maybeSingle();

  if (fetchError || !existingRow) {
    ctx.failJob(jobId, 'validating', 'Could not find the existing image row.');
    return null;
  }

  deps.jobState.updateJob(jobId, {
    oldStoragePath: existingRow.storage_path ?? undefined,
    oldThumbnailPath: existingRow.thumbnail_path ?? undefined,
    targetMediaId: targetMediaItemId,
  });

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

  if (!deps.uploadService.isPhotoFile(job.file)) {
    ctx.failJob(jobId, 'validating', 'Only photo files can replace an existing photo.');
    return null;
  }

  deps.jobState.setPhase(jobId, 'hashing');
  const fileHead = await readFileHead(job.file);
  const contentHash = await computeContentHash({
    fileHeadBytes: fileHead,
    fileSize: job.file.size,
  });
  deps.jobState.updateJob(jobId, { contentHash });

  deps.jobState.setPhase(jobId, 'dedup_check');
  const dedupResult = job.forceDuplicateUpload ? null : await ctx.checkDedupHash(contentHash);
  if (job.forceDuplicateUpload) {
    deps.jobState.updateJob(jobId, { forceDuplicateUpload: false });
  }
  if (dedupResult) {
    handleDedupSkip({
      jobId,
      job,
      contentHash,
      existingMediaId: dedupResult,
      setPhase: (id, phase) => deps.jobState.setPhase(id, phase),
      updateJob: (id, patch) => deps.jobState.updateJob(id, patch),
      markDone: (id) => deps.queue.markDone(id),
      ctx,
    });
    return null;
  }

  return { job, targetMediaItemId, parsedExif, contentHash };
}
