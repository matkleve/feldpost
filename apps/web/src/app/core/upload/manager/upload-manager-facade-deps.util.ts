/**
 * Factory for UploadManagerService actionDeps / submitDeps wiring.
 * @see upload-manager.service.ts
 */

import type { FilenameParserService } from '../../filename-parser/filename-parser.service';
import type { FolderScanService } from '../../folder-scan/folder-scan.service';
import type { MediaPreviewService } from '../../media-preview/media-preview.service';
import type { ProjectsService } from '../../projects/projects.service';
import type { UploadAddressResolutionOrchestrator } from '../address-resolution/upload-address-resolution.orchestrator';
import type { UploadBatchService } from '../support/upload-batch.service';
import type { UploadJobStateService } from '../support/upload-job-state.service';
import { TERMINAL_PHASES, phaseLabel } from '../support/upload-job-state.service';
import type { UploadLocationConfigService } from '../location/upload-location-config.service';
import type { UploadLocationResolutionService } from '../location/upload-location-resolution.service';
import type { UploadManagerPipelineHostService } from './upload-manager-pipeline-host.service';
import type { UploadManagerActionsDeps } from './upload-manager-actions.util';
import type { UploadManagerSubmitDeps } from './upload-manager-submit.util';
import type { UploadPreResolveWaveService } from '../support/upload-pre-resolve-wave.service';
import type { UploadQueueService } from '../support/upload-queue.service';
import type { PipelineContext, UploadJob } from '../upload-manager.types';

export interface UploadManagerFacadeDepsInput {
  jobState: UploadJobStateService;
  batchService: UploadBatchService;
  queue: UploadQueueService;
  folderScan: FolderScanService;
  filenameParser: FilenameParserService;
  mediaPreview: MediaPreviewService;
  projects: ProjectsService;
  locationConfig: UploadLocationConfigService;
  locationResolution: UploadLocationResolutionService;
  addressOrchestrator: UploadAddressResolutionOrchestrator;
  preResolveWave: UploadPreResolveWaveService;
  pipelineHost: UploadManagerPipelineHostService;
  getPipelineCtx: () => PipelineContext;
  removeUploadResidue: (
    storagePath: string | undefined,
    mediaId: string | undefined,
  ) => Promise<{ errors: string[] }>;
  hydrateDeferredPreviews: (jobs: ReadonlyArray<UploadJob>) => void;
  revokeLocalMediaUrl: (mediaId: string) => void;
}

export function buildUploadManagerActionDeps(
  input: UploadManagerFacadeDepsInput,
): UploadManagerActionsDeps {
  return {
    findJob: (jobId) => input.jobState.findJob(jobId) ?? undefined,
    snapshotJobs: () => input.jobState.snapshot(),
    updateJob: (jobId, patch) => input.jobState.updateJob(jobId, patch),
    transitionTo: (jobId, phase, options) => input.jobState.transitionTo(jobId, phase, options),
    addJobs: (jobs) => input.jobState.addJobs(jobs),
    removeJob: (jobId) => input.jobState.removeJob(jobId),
    removeTerminalJobs: () => input.jobState.removeTerminalJobs(),
    addBatch: (batch) => input.batchService.addBatch(batch),
    updateBatch: (batchId, patch) => input.batchService.updateBatch(batchId, patch),
    createImmediatePreviewUrl: (file) => input.mediaPreview.createImmediatePreviewUrl(file),
    createDeferredPreviewUrl: (file) => input.mediaPreview.createDeferredPreviewUrl(file),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
    isTerminalPhase: (phase) => TERMINAL_PHASES.has(phase),
    queuedLabel: phaseLabel('queued'),
    abortJobRequest: (jobId) => input.pipelineHost.abortJobRequest(jobId),
    markDone: (jobId) => input.queue.markDone(jobId),
    removeUploadResidue: (storagePath, mediaId) => input.removeUploadResidue(storagePath, mediaId),
    revokeLocalMediaUrl: (mediaId) => input.revokeLocalMediaUrl(mediaId),
    drainQueue: () => input.pipelineHost.drainQueue(input.getPipelineCtx()),
  };
}

export function buildUploadManagerSubmitDeps(
  input: UploadManagerFacadeDepsInput,
): UploadManagerSubmitDeps {
  return {
    addBatch: (batch) => input.batchService.addBatch(batch),
    updateBatch: (batchId, patch) => input.batchService.updateBatch(batchId, patch),
    addJobs: (jobs) => input.jobState.addJobs(jobs),
    createImmediatePreviewUrl: (file) => input.mediaPreview.createImmediatePreviewUrl(file),
    hydrateDeferredPreviews: (jobs) => input.hydrateDeferredPreviews(jobs),
    drainQueue: () => input.pipelineHost.drainQueue(input.getPipelineCtx()),
    scanDirectory: (dirHandle) => input.folderScan.scanDirectory(dirHandle),
    scanProgress$: input.folderScan.scanProgress$,
    extractAddressFromFolderName: (folderName) => {
      const parsed = input.filenameParser.extractAddress(folderName);
      if (!parsed || parsed.confidence !== 'high') {
        return undefined;
      }
      return parsed.address;
    },
    extractAddressFromFolderPathSegments: (segments, traversalOrder, requireHighConfidence) => {
      const orderedSegments =
        traversalOrder === 'root-to-leaf' ? [...segments] : [...segments].reverse();

      for (const segment of orderedSegments) {
        const parsed = input.filenameParser.extractAddress(segment);
        if (!parsed) {
          continue;
        }
        if (!requireHighConfidence || parsed.confidence === 'high') {
          return parsed.address;
        }
      }
      return undefined;
    },
    getLocationConfig: () => input.locationConfig.getConfig(),
    loadProjects: () => input.projects.loadProjects(),
    createProject: async (name: string) => {
      const draftProject = await input.projects.createDraftProject();
      if (!draftProject) {
        return undefined;
      }
      const renamed = await input.projects.renameProject(draftProject.id, name);
      return renamed ? draftProject.id : undefined;
    },
    queuedLabel: phaseLabel('queued'),
    // Per chunk: build Search Objects, then register that chunk's trays **before** its jobs drain.
    // Registration must stay here — a job that reaches the queue before its group is registered has
    // already left the phase from which it can be marked `awaiting_disambiguation`. Only tray
    // *presentation* is deferred to the end of the batch (G4), by the wave service.
    // @see docs/specs/service/media-upload-service/upload-manager-pipeline.chunked-classification.supplement.md
    classifyBatch: async (batchId, options) => {
      await input.addressOrchestrator.classifyBatch(batchId, options);
      await input.locationResolution.registerLayerPackageGroupsAfterClassify(batchId);
    },
    beginBatchClassification: (batchId, totalJobCount) => {
      // Armed with the FULL batch count before any chunk runs, so the wave cannot complete while
      // later chunks are still arriving.
      input.preResolveWave.resetWave(batchId, totalJobCount);
      input.preResolveWave.beginClassification(batchId);
    },
    finalizeBatchClassification: async (batchId) => {
      input.preResolveWave.endClassification(batchId);
      return Promise.resolve();
    },
  };
}
