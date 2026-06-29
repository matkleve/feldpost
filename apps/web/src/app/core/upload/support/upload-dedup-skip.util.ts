import type { PipelineContext, UploadJob } from '../upload-manager.types';

type DedupSkipArgs = {
  jobId: string;
  job: UploadJob;
  contentHash: string;
  existingMediaId: string;
  setPhase: (jobId: string, phase: 'skipped') => void;
  updateJob: (jobId: string, patch: Partial<UploadJob>) => void;
  markDone: (jobId: string) => void;
  ctx: Pick<PipelineContext, 'emitUploadSkipped' | 'emitBatchProgress' | 'drainQueue'>;
};

export function handleDedupSkip(args: DedupSkipArgs): void {
  const { jobId, job, contentHash, existingMediaId, setPhase, updateJob, markDone, ctx } = args;

  setPhase(jobId, 'skipped');
  updateJob(jobId, { existingMediaId });
  markDone(jobId);
  ctx.emitUploadSkipped({
    jobId,
    batchId: job.batchId,
    fileName: job.file.name,
    contentHash,
    existingMediaId,
  });
  ctx.emitBatchProgress(job.batchId);
  ctx.drainQueue();
}
