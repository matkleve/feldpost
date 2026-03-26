import type { PipelineContext, UploadJob } from './upload-manager.types';

type DedupSkipArgs = {
  jobId: string;
  job: UploadJob;
  contentHash: string;
  existingImageId: string;
  setPhase: (jobId: string, phase: 'skipped') => void;
  updateJob: (jobId: string, patch: Partial<UploadJob>) => void;
  markDone: (jobId: string) => void;
  ctx: Pick<PipelineContext, 'emitUploadSkipped' | 'emitBatchProgress' | 'drainQueue'>;
};

export function handleDedupSkip(args: DedupSkipArgs): void {
  const { jobId, job, contentHash, existingImageId, setPhase, updateJob, markDone, ctx } = args;

  setPhase(jobId, 'skipped');
  updateJob(jobId, { existingImageId });
  markDone(jobId);
  ctx.emitUploadSkipped({
    jobId,
    batchId: job.batchId,
    fileName: job.file.name,
    contentHash,
    existingImageId,
  });
  ctx.emitBatchProgress(job.batchId);
  ctx.drainQueue();
}
