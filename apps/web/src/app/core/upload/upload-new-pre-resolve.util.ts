/**
 * Pre-upload title extraction + address resolution (OD-4: before dedup).
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md
 */

import type { FilenameParserService } from '../filename-parser/filename-parser.service';
import type { UploadAddressResolutionOrchestrator } from './upload-address-resolution.orchestrator';
import type { UploadLocationResolutionService } from './upload-location-resolution.service';
import { hashAndCheckDedupForNewJob } from './upload-new-prepare-route.util';
import type { UploadJobStateService } from './upload-job-state.service';
import type { PipelineContext, UploadJob } from './upload-manager.types';
import type { UploadLocationConfigService } from './upload-location-config.service';
import type { UploadQueueService } from './upload-queue.service';
import type { UploadService } from './upload.service';
import type { ParsedExif } from './upload.service';

export type PreResolveDeps = {
  jobState: UploadJobStateService;
  queue: UploadQueueService;
  uploadService: UploadService;
  filenameParser: FilenameParserService;
  locationConfig: UploadLocationConfigService;
  locationResolution: UploadLocationResolutionService;
  addressOrchestrator: UploadAddressResolutionOrchestrator;
};

export type PreResolveOutcome = 'continue' | 'held' | 'dedup_skip';

function isAutoLocationEnabled(job: UploadJob): boolean {
  return job.locationRequirementMode !== 'optional';
}

/** Merge filename/folder title candidates onto the job (legacy fallback). */
export function mergeTitleCandidateOnJob(
  deps: Pick<PreResolveDeps, 'jobState' | 'filenameParser' | 'locationConfig'>,
  jobId: string,
  job: UploadJob,
): { titleAddress?: string; highConfidence: boolean } {
  const config = deps.locationConfig.getConfig();
  type TextSource = 'file' | 'folder';
  const parsed = deps.filenameParser.extractAddress(job.file.name);
  const inheritedTitleAddress = job.titleAddress?.trim();
  const parsedConfidenceScore = parsed ? (parsed.confidence === 'high' ? 1 : 0.5) : 0;

  const fileCandidate = parsed
    ? {
        address: parsed.address,
        source: 'file' as TextSource,
        score: parsedConfidenceScore,
      }
    : undefined;
  const folderCandidate = inheritedTitleAddress
    ? {
        address: inheritedTitleAddress,
        source: 'folder' as TextSource,
        score: 1,
      }
    : undefined;

  const mergedCandidate = config.filenameAlwaysOverridesFolder
    ? (fileCandidate ?? folderCandidate)
    : (folderCandidate ?? fileCandidate);

  if (!mergedCandidate) {
    return { highConfidence: false };
  }

  deps.jobState.updateJob(jobId, {
    titleAddress: mergedCandidate.address,
    titleAddressSource: mergedCandidate.source,
    locationSourceUsed: mergedCandidate.source,
  });

  return {
    titleAddress: mergedCandidate.address,
    highConfidence: mergedCandidate.score >= config.titleConfidenceThreshold,
  };
}

/**
 * Extract title, pre-upload resolution when needed, then dedup (OD-4).
 */
export async function runPreUploadLocationResolve(
  deps: PreResolveDeps,
  jobId: string,
  parsedExif: ParsedExif,
  ctx: PipelineContext,
): Promise<PreResolveOutcome> {
  const job = deps.jobState.findJob(jobId);
  if (!job) {
    return 'continue';
  }

  if (!isAutoLocationEnabled(job)) {
    deps.jobState.updateJob(jobId, { resolutionStatus: 'not_required' });
    const deduped = await hashAndCheckDedupForNewJob(deps, jobId, job, parsedExif, ctx);
    return deduped ? 'dedup_skip' : 'continue';
  }

  if (job.coords) {
    deps.jobState.updateJob(jobId, {
      resolutionStatus: 'not_required',
      locationSourceUsed: 'exif',
    });
    const deduped = await hashAndCheckDedupForNewJob(deps, jobId, job, parsedExif, ctx);
    return deduped ? 'dedup_skip' : 'continue';
  }

  deps.jobState.setPhase(jobId, 'extracting_title');

  if (job.groupingKey) {
    const orchestrated = await deps.locationResolution.applyPreResolveFromOrchestrator(jobId);
    if (orchestrated === 'held') {
      deps.queue.markDone(jobId);
      ctx.emitBatchProgress(job.batchId);
      ctx.drainQueue();
      return 'held';
    }
    if (orchestrated === 'partial') {
      const deduped = await hashAndCheckDedupForNewJob(
        deps,
        jobId,
        deps.jobState.findJob(jobId)!,
        parsedExif,
        ctx,
      );
      return deduped ? 'dedup_skip' : 'continue';
    }
    const current = deps.jobState.findJob(jobId)!;
    const deduped = await hashAndCheckDedupForNewJob(deps, jobId, current, parsedExif, ctx);
    return deduped ? 'dedup_skip' : 'continue';
  }

  const { titleAddress, highConfidence } = mergeTitleCandidateOnJob(deps, jobId, job);

  if (!highConfidence || !titleAddress?.trim()) {
    deps.jobState.updateJob(jobId, { resolutionStatus: 'not_required' });
    const current = deps.jobState.findJob(jobId)!;
    const deduped = await hashAndCheckDedupForNewJob(deps, jobId, current, parsedExif, ctx);
    return deduped ? 'dedup_skip' : 'continue';
  }

  const resolveOutcome = await deps.locationResolution.resolveJobTitleAddress(jobId);
  if (resolveOutcome === 'held') {
    deps.queue.markDone(jobId);
    ctx.emitBatchProgress(job.batchId);
    ctx.drainQueue();
    return 'held';
  }

  const current = deps.jobState.findJob(jobId)!;
  const deduped = await hashAndCheckDedupForNewJob(deps, jobId, current, parsedExif, ctx);
  return deduped ? 'dedup_skip' : 'continue';
}
