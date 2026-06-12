/**
 * Replace pipeline: uploading → replacing_record → complete.
 * @see upload-replace-pipeline.service.ts
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.md § Replace Upload Pipeline
 */

import {
  insertDedupHashFireAndForget,
  organizationIdFromStoragePath,
} from '../../support/upload-db-postwrite.util';
import type { PipelineContext } from '../../upload-manager.types';
import { buildReplaceUpdateData } from './upload-replace-update-data.util';
import type {
  ReplacePipelinePrepared,
  ReplacePipelineRunDeps,
} from './upload-replace-pipeline-run.util';

/**
 * uploading → replacing_record → complete.
 * @see upload-replace-pipeline.service.ts run (second half)
 */
export async function finishReplacePipelineJob(
  jobId: string,
  ctx: PipelineContext,
  prepared: ReplacePipelinePrepared,
  abortSignal: AbortSignal | undefined,
  deps: ReplacePipelineRunDeps,
): Promise<void> {
  const { targetMediaItemId, parsedExif } = prepared;
  const job = prepared.job;

  deps.jobState.setPhase(jobId, 'uploading');
  deps.jobState.updateJob(jobId, { progress: 0 });

  const storagePath = await deps.storage.upload(job.file, abortSignal);
  if (!storagePath) {
    ctx.failJob(jobId, 'uploading', 'Storage upload failed.');
    return;
  }
  if (deps.isCancelled(jobId)) {
    await deps.supabaseClient.storage.from('media').remove([storagePath]);
    const cancelledJob = deps.jobState.findJob(jobId);
    deps.queue.markDone(jobId);
    if (cancelledJob) {
      ctx.emitBatchProgress(cancelledJob.batchId);
    }
    ctx.drainQueue();
    return;
  }
  deps.jobState.updateJob(jobId, { storagePath, progress: 100 });

  deps.jobState.setPhase(jobId, 'replacing_record');

  const updateData = buildReplaceUpdateData(storagePath, parsedExif, job.file.name);

  const { error: updateError } = await deps.supabaseClient
    .from('media_items')
    .update(updateData)
    .eq('id', targetMediaItemId);

  if (deps.isCancelled(jobId)) {
    await deps.supabaseClient.storage.from('media').remove([storagePath]);
    const cancelledJob = deps.jobState.findJob(jobId);
    deps.queue.markDone(jobId);
    if (cancelledJob) {
      ctx.emitBatchProgress(cancelledJob.batchId);
    }
    ctx.drainQueue();
    return;
  }

  if (updateError) {
    await deps.supabaseClient.storage.from('media').remove([storagePath]);
    ctx.failJob(jobId, 'replacing_record', updateError.message);
    return;
  }

  const updatedJob = deps.jobState.findJob(jobId)!;
  const pathsToDelete: string[] = [];
  if (updatedJob.oldStoragePath) pathsToDelete.push(updatedJob.oldStoragePath);
  if (updatedJob.oldThumbnailPath) pathsToDelete.push(updatedJob.oldThumbnailPath);
  if (pathsToDelete.length > 0) {
    deps.supabaseClient.storage.from('media').remove(pathsToDelete);
  }

  insertDedupHashFireAndForget({
    contentHash: updatedJob.contentHash,
    mediaItemId: targetMediaItemId,
    userId: deps.getUser()?.id,
    organizationId: organizationIdFromStoragePath(updatedJob.storagePath),
    hashAlgo: updatedJob.contentHashAlgo,
    insert: (payload) => deps.supabaseClient.from('dedup_hashes').insert(payload),
  });

  deps.jobState.updateJob(jobId, {
    mediaId: targetMediaItemId,
    coords: parsedExif.coords,
    direction: parsedExif.direction,
  });

  deps.jobState.setPhase(jobId, 'complete');
  deps.queue.markDone(jobId);

  const finalJob = deps.jobState.findJob(jobId)!;
  if (deps.isCancelled(jobId)) {
    ctx.emitBatchProgress(finalJob.batchId);
    ctx.drainQueue();
    return;
  }

  if (finalJob.thumbnailUrl) {
    deps.mediaDownloadService.setLocalUrl(targetMediaItemId, finalJob.thumbnailUrl);
  }

  ctx.emitImageReplaced({
    jobId,
    mediaId: targetMediaItemId,
    newStoragePath: storagePath,
    localObjectUrl: finalJob.thumbnailUrl,
    coords: parsedExif.coords,
    direction: parsedExif.direction,
  });

  ctx.emitBatchProgress(finalJob.batchId);
  ctx.drainQueue();
}
