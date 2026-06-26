import type { ParsedExif } from '../upload.service';
import type { PipelineContext, UploadJob } from '../upload-manager.types';
import type { UploadQueueService } from './upload-queue.service';
import type { UploadJobStateService } from './upload-job-state.service';
import type { UploadService } from '../upload.service';
import { computeUploadContentHash } from './content-hash.util';
import { isContentHashDedupEligible } from './upload-dedup-eligibility.util';
import { applyDedupMatch } from './upload-dedup-match.util';

export type UploadDedupCheckOutcome = 'ineligible' | 'no_match' | 'skipped' | 'issue';

type UploadDedupCheckDeps = {
  jobState: UploadJobStateService;
  queue: UploadQueueService;
  uploadService: UploadService;
};

/**
 * Hash (when needed), org dedup lookup, and same-user vs colleague routing.
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.dedup-scope.supplement.md
 */
export async function runUploadDedupCheck(
  deps: UploadDedupCheckDeps,
  jobId: string,
  job: UploadJob,
  parsedExif: ParsedExif | undefined,
  ctx: PipelineContext,
): Promise<UploadDedupCheckOutcome> {
  const mediaType = deps.uploadService.resolveMediaType(job.file);
  if (!isContentHashDedupEligible(mediaType) || job.forceDuplicateUpload) {
    return 'ineligible';
  }

  let contentHash = job.contentHash;
  let hashAlgo = job.contentHashAlgo;
  if (!contentHash) {
    deps.jobState.setPhase(jobId, 'hashing');
    const computed = await computeUploadContentHash(job.file, parsedExif, mediaType);
    contentHash = computed.contentHash;
    hashAlgo = computed.hashAlgo;
    deps.jobState.updateJob(jobId, { contentHash, contentHashAlgo: hashAlgo });
  }

  // Intra-batch duplicate (e.g. the same file picked via two folders): a
  // byte-identical sibling already owns this hash in the batch. Deterministic
  // and local — no second server round-trip, decided before placement/tray.
  const ownerJobId = ctx.claimBatchHash(job.batchId, contentHash, jobId);
  if (ownerJobId) {
    return skipIntraBatchDuplicate(deps, jobId, job, ownerJobId, ctx);
  }

  deps.jobState.setPhase(jobId, 'dedup_check');
  const match = await ctx.checkDedupHash(contentHash);
  if (!match) {
    return 'no_match';
  }

  const result = applyDedupMatch({
    jobId,
    job,
    contentHash,
    match,
    currentUserId: ctx.getCurrentUserId(),
    deps: {
      setPhase: (id, phase) => deps.jobState.setPhase(id, phase),
      updateJob: (id, patch) => deps.jobState.updateJob(id, patch),
      markDone: (id) => deps.queue.markDone(id),
    },
    ctx,
  });
  return result;
}

/**
 * Skip a job whose bytes are already owned by an earlier sibling in the same
 * batch. Silent (same-user semantics); links the sibling's media row if it has
 * already persisted, otherwise the skipped row simply shows without it.
 */
function skipIntraBatchDuplicate(
  deps: UploadDedupCheckDeps,
  jobId: string,
  job: UploadJob,
  ownerJobId: string,
  ctx: Pick<
    PipelineContext,
    'emitUploadSkipped' | 'emitBatchProgress' | 'drainQueue' | 'mergeDuplicateAddress'
  >,
): 'skipped' {
  const owner = deps.jobState.findJob(ownerJobId);

  // Same file under a different folder address: attach this address to the
  // owner media (one media, multiple addresses). Same address -> nothing to add.
  const dupAddress = job.titleAddress?.trim();
  if (
    dupAddress &&
    job.groupingKey &&
    owner?.groupingKey &&
    job.groupingKey !== owner.groupingKey
  ) {
    ctx.mergeDuplicateAddress(ownerJobId, dupAddress);
  }

  deps.jobState.setPhase(jobId, 'skipped');
  deps.jobState.updateJob(jobId, { existingMediaId: owner?.mediaId });
  deps.queue.markDone(jobId);
  ctx.emitUploadSkipped({
    jobId,
    batchId: job.batchId,
    fileName: job.file.name,
    contentHash: job.contentHash ?? '',
    existingMediaId: owner?.mediaId,
  });
  ctx.emitBatchProgress(job.batchId);
  ctx.drainQueue();
  return 'skipped';
}
