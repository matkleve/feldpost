import type { DedupHashMatch, PipelineContext, UploadJob } from '../upload-manager.types';
import { handleDedupSkip } from './upload-dedup-skip.util';

export type { DedupHashMatch };

export function shouldAutoSkipDedupMatch(
  match: DedupHashMatch,
  currentUserId: string | undefined,
  hashAlgo: UploadJob['contentHashAlgo'],
): boolean {
  return hashAlgo === 'photo_v1' && !!currentUserId && match.registeredByUserId === currentUserId;
}

type DedupMatchHandlerDeps = {
  setPhase: (jobId: string, phase: 'skipped' | 'missing_data') => void;
  updateJob: (jobId: string, patch: Partial<UploadJob>) => void;
  markDone: (jobId: string) => void;
};

type ApplyDedupMatchArgs = {
  jobId: string;
  job: UploadJob;
  hashAlgo: UploadJob['contentHashAlgo'];
  contentHash: string;
  match: DedupHashMatch;
  currentUserId: string | undefined;
  deps: DedupMatchHandlerDeps;
  ctx: Pick<PipelineContext, 'emitUploadSkipped' | 'emitBatchProgress' | 'drainQueue' | 'emitDuplicateDetected'>;
};

/** Same-user → silent skip; colleague → duplicate issue + modal event. */
export function applyDedupMatch(args: ApplyDedupMatchArgs): 'skipped' | 'issue' {
  const { jobId, job, hashAlgo, contentHash, match, currentUserId, deps, ctx } = args;

  if (shouldAutoSkipDedupMatch(match, currentUserId, hashAlgo)) {
    handleDedupSkip({
      jobId,
      job,
      contentHash,
      existingMediaId: match.mediaItemId,
      setPhase: deps.setPhase,
      updateJob: deps.updateJob,
      markDone: deps.markDone,
      ctx,
    });
    return 'skipped';
  }

  deps.setPhase(jobId, 'missing_data');
  deps.updateJob(jobId, {
    issueKind: 'duplicate_file',
    existingMediaId: match.mediaItemId,
    duplicateOfMediaId: match.mediaItemId,
  });
  deps.markDone(jobId);
  ctx.emitDuplicateDetected({
    jobId,
    batchId: job.batchId,
    fileName: job.file.name,
    contentHash,
    existingMediaId: match.mediaItemId,
  });
  ctx.emitBatchProgress(job.batchId);
  ctx.drainQueue();
  return 'issue';
}
