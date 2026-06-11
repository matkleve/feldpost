/**
 * Pre-upload title extraction + address resolution (OD-4: before dedup).
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md
 */

import type { FilenameParserService } from '../../../filename-parser/filename-parser.service';
import type { UploadAddressResolutionOrchestrator } from '../../address-resolution/upload-address-resolution.orchestrator';
import type { UploadLocationResolutionService } from '../../location/upload-location-resolution.service';
import {
  summarizeJobPlacement,
  uploadPlacementLog,
  uploadTraceDecision,
  uploadTraceEnter,
  uploadTraceExit,
} from '../../address-resolution/upload-address-resolution.debug';
import {
  buildChosenPlacementPatch,
  getExifMetadataCoords,
  resolvePlacementWithoutText,
} from '../../location/upload-location-precedence.helpers';
import { formatSearchObjectLabel } from '../../../location-path-parser/upload-search-object.builder';
import { isExifAuthoritativeOverWeakFilenameStreet } from '../../location/upload-location-resolution.helpers';
import { hashAndCheckDedupForNewJob, routeJobToMissingData } from './upload-new-prepare-route.util';
import { handleDedupSkip } from '../../support/upload-dedup-skip.util';
import type { UploadJobStateService } from '../../support/upload-job-state.service';
import type { PipelineContext, UploadJob } from '../../upload-manager.types';
import type { UploadLocationConfigService } from '../../location/upload-location-config.service';
import type { UploadQueueService } from '../../support/upload-queue.service';
import type { UploadService } from '../../upload.service';
import type { ParsedExif } from '../../upload.service';
import type { UploadPreResolveWaveService } from '../../support/upload-pre-resolve-wave.service';
import { computeContentHash, readFileHead } from '../../support/content-hash.util';

export type PreResolveDeps = {
  jobState: UploadJobStateService;
  queue: UploadQueueService;
  uploadService: UploadService;
  filenameParser: FilenameParserService;
  locationConfig: UploadLocationConfigService;
  locationResolution: UploadLocationResolutionService;
  addressOrchestrator: UploadAddressResolutionOrchestrator;
  preResolveWave?: UploadPreResolveWaveService;
};

export type PreResolveOutcome = 'continue' | 'held' | 'dedup_skip';

function isAutoLocationEnabled(job: UploadJob): boolean {
  return job.locationRequirementMode !== 'optional';
}

/** Merge filename/folder title candidates onto the job (legacy fallback). */
export function mergeTitleCandidateOnJob(
  deps: Pick<PreResolveDeps, 'jobState' | 'filenameParser' | 'locationConfig'> & {
    addressOrchestrator?: PreResolveDeps['addressOrchestrator'];
  },
  jobId: string,
  job: UploadJob,
): { titleAddress?: string; highConfidence: boolean } {
  const config = deps.locationConfig.getConfig();
  type TextSource = 'file' | 'folder';
  const parsed = deps.filenameParser.extractAddress(job.file.name);
  const inheritedTitleAddress = job.titleAddress?.trim();
  const parsedConfidenceScore = parsed ? (parsed.confidence === 'high' ? 1 : 0.5) : 0;

  // Search Object intake already set titleAddress + groupingKey — do not replace with IMG_* parse.
  if (job.groupingKey && inheritedTitleAddress) {
    const groupState = deps.addressOrchestrator?.getGroupState(job.batchId, job.groupingKey);
    const soLabel =
      groupState?.searchObject != null
        ? formatSearchObjectLabel(groupState.searchObject)
        : inheritedTitleAddress;
    if (
      groupState &&
      isExifAuthoritativeOverWeakFilenameStreet(groupState, (id) => deps.jobState.findJob(id))
    ) {
      uploadTraceDecision('pre-resolve', 'mergeTitle — keep SO title, low confidence (weak filename + EXIF)', {
        jobId,
        titleAddress: soLabel,
        groupingKey: job.groupingKey,
      });
      deps.jobState.updateJob(jobId, { titleAddress: soLabel, titleAddressSource: 'folder' });
      return { titleAddress: soLabel, highConfidence: false };
    }
    uploadTraceDecision('pre-resolve', 'mergeTitle — SO intake title, high confidence', {
      jobId,
      titleAddress: soLabel,
      groupingKey: job.groupingKey,
    });
    deps.jobState.updateJob(jobId, { titleAddress: soLabel, titleAddressSource: 'folder' });
    return { titleAddress: soLabel, highConfidence: true };
  }

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

  const fileMeetsThreshold =
    fileCandidate !== undefined && fileCandidate.score >= config.titleConfidenceThreshold;

  const mergedCandidate = (() => {
    if (!fileCandidate) {
      return folderCandidate;
    }
    if (!folderCandidate) {
      return fileCandidate;
    }
    if (fileMeetsThreshold && config.filenameAlwaysOverridesFolder) {
      return fileCandidate;
    }
    return folderCandidate;
  })();

  if (!mergedCandidate) {
    return { highConfidence: false };
  }

  deps.jobState.updateJob(jobId, {
    titleAddress: mergedCandidate.address,
    titleAddressSource: mergedCandidate.source,
  });

  return {
    titleAddress: mergedCandidate.address,
    highConfidence: mergedCandidate.score >= config.titleConfidenceThreshold,
  };
}

/** Step 3: hash + tag duplicate before geocode; job continues. */
async function tagDedupBeforeGeocode(
  deps: PreResolveDeps,
  jobId: string,
  job: UploadJob,
  parsedExif: ParsedExif,
  ctx: PipelineContext,
): Promise<void> {
  if (!deps.uploadService.isPhotoFile(job.file) || job.forceDuplicateUpload) {
    return;
  }
  if (job.contentHash) {
    return;
  }
  deps.jobState.setPhase(jobId, 'hashing');
  const fileHead = await readFileHead(job.file);
  const contentHash = await computeContentHash({
    fileHeadBytes: fileHead,
    fileSize: job.file.size,
    gpsCoords: parsedExif.coords
      ? { lat: parsedExif.coords.lat, lng: parsedExif.coords.lng }
      : undefined,
    capturedAt: parsedExif.capturedAt?.toISOString(),
    direction: parsedExif.direction,
  });
  deps.jobState.updateJob(jobId, { contentHash });
  deps.jobState.setPhase(jobId, 'dedup_check');
  const existingId = await ctx.checkDedupHash(contentHash);
  if (existingId) {
    deps.jobState.updateJob(jobId, { duplicateOfMediaId: existingId });
  }
}

async function finishPreResolveDedup(
  deps: PreResolveDeps,
  jobId: string,
  parsedExif: ParsedExif,
  ctx: PipelineContext,
): Promise<PreResolveOutcome> {
  const current = deps.jobState.findJob(jobId);
  if (!current) {
    return 'continue';
  }
  if (current.duplicateOfMediaId && !current.forceDuplicateUpload) {
    handleDedupSkip({
      jobId,
      job: current,
      contentHash: current.contentHash!,
      existingMediaId: current.duplicateOfMediaId,
      setPhase: (id, phase) => deps.jobState.setPhase(id, phase),
      updateJob: (id, patch) => deps.jobState.updateJob(id, patch),
      markDone: (id) => deps.queue.markDone(id),
      ctx,
    });
    return 'dedup_skip';
  }
  const deduped = await hashAndCheckDedupForNewJob(deps, jobId, current, parsedExif, ctx);
  return deduped ? 'dedup_skip' : 'continue';
}

function applyExifOnlyPlacement(
  deps: Pick<PreResolveDeps, 'jobState'>,
  jobId: string,
  job: UploadJob,
): void {
  const exifCoords = getExifMetadataCoords(job);
  if (!exifCoords) {
    return;
  }
  deps.jobState.updateJob(jobId, buildChosenPlacementPatch(job, 'exif', exifCoords));
  const after = deps.jobState.findJob(jobId);
  if (after) {
    uploadPlacementLog('P4', jobId, job.file.name, 'EXIF-only placement (Branch B)', {
      ...summarizeJobPlacement(after),
    });
  }
}

/**
 * Phase 3–4 after orchestrator or legacy geocode: placement, source tray, EXIF-only, or Branch A.
 * @returns held when job stops in tray or Issues
 */
async function completePlacementAfterLocationResolve(
  deps: PreResolveDeps,
  jobId: string,
  job: UploadJob,
  ctx: PipelineContext,
): Promise<PreResolveOutcome | null> {
  let current = deps.jobState.findJob(jobId);
  if (!current) {
    return null;
  }

  uploadPlacementLog('P1', jobId, current.file.name, 'complete placement pass', {
    ...summarizeJobPlacement(current),
  });

  if (current.coords) {
    uploadPlacementLog('P6', jobId, current.file.name, 'skip — placement already set', {
      locationSourceUsed: current.locationSourceUsed,
      coords: current.coords,
    });
    return null;
  }

  if (current.phase === 'awaiting_disambiguation') {
    deps.queue.markDone(jobId);
    ctx.emitBatchProgress(job.batchId);
    ctx.drainQueue();
    return 'held';
  }

  if (current.titleAddressCoords) {
    uploadPlacementLog('P3', jobId, current.file.name, 'text coords ready — source agreement', {
      titleAddressCoords: current.titleAddressCoords,
      exifMetadata: getExifMetadataCoords(current),
    });
    const held = deps.locationResolution.finalizePlacementForJob(jobId);
    const afterFinalize = deps.jobState.findJob(jobId);
    if (afterFinalize) {
      uploadPlacementLog('P4', jobId, current.file.name, held ? 'held — source tray' : 'text placement applied', {
        ...summarizeJobPlacement(afterFinalize),
      });
    }
    if (held) {
      deps.queue.markDone(jobId);
      ctx.emitBatchProgress(job.batchId);
      ctx.drainQueue();
      return 'held';
    }
    return null;
  }

  if (current.titleAddress?.trim()) {
    uploadPlacementLog('P2', jobId, current.file.name, 'forward geocode (text before EXIF)', {
      titleAddress: current.titleAddress,
      exifMetadata: getExifMetadataCoords(current),
    });
    const resolveOutcome = await deps.locationResolution.resolveJobTitleAddress(jobId);
    current = deps.jobState.findJob(jobId);
    if (!current) {
      return null;
    }
    if (resolveOutcome === 'held' || current.phase === 'awaiting_disambiguation') {
      deps.queue.markDone(jobId);
      ctx.emitBatchProgress(job.batchId);
      ctx.drainQueue();
      return 'held';
    }
    if (current.titleAddressCoords) {
      const held = deps.locationResolution.finalizePlacementForJob(jobId);
      if (held) {
        deps.queue.markDone(jobId);
        ctx.emitBatchProgress(job.batchId);
        ctx.drainQueue();
        return 'held';
      }
      return null;
    }
    uploadPlacementLog('P2', jobId, current.file.name, 'geocode finished without text coords', {
      resolveOutcome,
      ...summarizeJobPlacement(current),
    });
    if (resolvePlacementWithoutText(current) === 'exif') {
      applyExifOnlyPlacement(deps, jobId, current);
      return null;
    }
  }

  if (resolvePlacementWithoutText(current) === 'exif') {
    applyExifOnlyPlacement(deps, jobId, current);
    return null;
  }

  uploadPlacementLog('A', jobId, current.file.name, 'Branch A — no text coords, no EXIF', {
    ...summarizeJobPlacement(current),
  });
  routeJobToMissingData(deps, jobId, current, ctx);
  return 'held';
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

  try {
    return await runPreUploadLocationResolveInner(deps, jobId, parsedExif, ctx, job);
  } finally {
    deps.preResolveWave?.completeJob(job.batchId);
  }
}

async function runPreUploadLocationResolveInner(
  deps: PreResolveDeps,
  jobId: string,
  parsedExif: ParsedExif,
  ctx: PipelineContext,
  job: UploadJob,
): Promise<PreResolveOutcome> {
  uploadTraceEnter('pipeline', 'runPreUploadLocationResolve', {
    jobId,
    fileName: job.file.name,
    exifCoords: parsedExif.coords,
    groupingKey: job.groupingKey,
  });
  if (!isAutoLocationEnabled(job)) {
    uploadTraceDecision('pipeline', 'location optional — skip resolution');
    uploadTraceExit('pipeline', 'runPreUploadLocationResolve', 'not_required');
    deps.jobState.updateJob(jobId, { resolutionStatus: 'not_required' });
    return finishPreResolveDedup(deps, jobId, parsedExif, ctx);
  }

  deps.jobState.setPhase(jobId, 'extracting_title');

  const { highConfidence } = mergeTitleCandidateOnJob(deps, jobId, job);
  const jobAfterMerge = deps.jobState.findJob(jobId)!;
  uploadTraceDecision('pipeline', `title merge done — highConfidence=${highConfidence}`, {
    titleAddress: jobAfterMerge.titleAddress,
    groupingKey: jobAfterMerge.groupingKey,
  });

  await tagDedupBeforeGeocode(deps, jobId, jobAfterMerge, parsedExif, ctx);

  const jobAfterDedupTag = deps.jobState.findJob(jobId)!;
  if (jobAfterDedupTag.duplicateOfMediaId && !jobAfterDedupTag.forceDuplicateUpload) {
    uploadTraceDecision('pipeline', 'duplicate content detected — skip without resolving placement');
    uploadTraceExit('pipeline', 'runPreUploadLocationResolve', 'dedup_skip');
    return finishPreResolveDedup(deps, jobId, parsedExif, ctx);
  }

  if (highConfidence && jobAfterMerge.groupingKey) {
    uploadTraceDecision('pipeline', 'path — orchestrator pre-resolve (groupingKey)');
    const orchestrated = await deps.locationResolution.applyPreResolveFromOrchestrator(jobId);
    if (orchestrated === 'held') {
      uploadTraceExit('pipeline', 'runPreUploadLocationResolve', 'held (orchestrator)');
      deps.queue.markDone(jobId);
      ctx.emitBatchProgress(job.batchId);
      ctx.drainQueue();
      return 'held';
    }
    const placementHeld = await completePlacementAfterLocationResolve(
      deps,
      jobId,
      deps.jobState.findJob(jobId) ?? job,
      ctx,
    );
    if (placementHeld) {
      uploadTraceExit('pipeline', 'runPreUploadLocationResolve', 'held (placement)');
      return placementHeld;
    }
    uploadTraceExit('pipeline', 'runPreUploadLocationResolve', 'continue');
    return finishPreResolveDedup(deps, jobId, parsedExif, ctx);
  }

  if (highConfidence) {
    uploadTraceDecision('pipeline', 'path — high confidence without groupingKey');
    const placementHeld = await completePlacementAfterLocationResolve(
      deps,
      jobId,
      deps.jobState.findJob(jobId) ?? job,
      ctx,
    );
    if (placementHeld) {
      return placementHeld;
    }
    return finishPreResolveDedup(deps, jobId, parsedExif, ctx);
  }

  uploadTraceDecision('pipeline', 'path — low confidence, complete placement');
  const current = deps.jobState.findJob(jobId)!;
  const placementHeld = await completePlacementAfterLocationResolve(deps, jobId, current, ctx);
  if (placementHeld) {
    uploadTraceExit('pipeline', 'runPreUploadLocationResolve', 'held');
    return placementHeld;
  }
  uploadTraceExit('pipeline', 'runPreUploadLocationResolve', 'continue');
  return finishPreResolveDedup(deps, jobId, parsedExif, ctx);
}
