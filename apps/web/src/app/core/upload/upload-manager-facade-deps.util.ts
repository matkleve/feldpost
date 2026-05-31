/**
 * Factory for UploadManagerService actionDeps / submitDeps wiring.
 * @see upload-manager.service.ts
 */

import type { FilenameParserService } from '../filename-parser/filename-parser.service';
import type { FolderScanService } from '../folder-scan/folder-scan.service';
import type { MediaPreviewService } from '../media-preview/media-preview.service';
import type { ProjectsService } from '../projects/projects.service';
import type { UploadAddressResolutionOrchestrator } from './upload-address-resolution.orchestrator';
import type { UploadBatchService } from './upload-batch.service';
import type { UploadJobStateService } from './upload-job-state.service';
import { TERMINAL_PHASES, phaseLabel } from './upload-job-state.service';
import type { UploadLocationConfigService } from './upload-location-config.service';
import type { UploadLocationResolutionService } from './upload-location-resolution.service';
import type { UploadManagerPipelineHostService } from './upload-manager-pipeline-host.service';
import type { UploadManagerActionsDeps } from './upload-manager-actions.util';
import type { UploadManagerSubmitDeps } from './upload-manager-submit.util';
import type { UploadPreResolveWaveService } from './upload-pre-resolve-wave.service';
import type { UploadQueueService } from './upload-queue.service';
import type { PipelineContext, UploadJob } from './upload-manager.types';

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
  supabaseRemove: (storagePath: string) => void;
  hydrateDeferredPreviews: (jobs: ReadonlyArray<UploadJob>) => void;
}

export function buildUploadManagerActionDeps(
  input: UploadManagerFacadeDepsInput,
): UploadManagerActionsDeps {
  return {
    findJob: (jobId) => input.jobState.findJob(jobId) ?? undefined,
    snapshotJobs: () => input.jobState.snapshot(),
    updateJob: (jobId, patch) => input.jobState.updateJob(jobId, patch),
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
    removeStoragePath: (storagePath) => input.supabaseRemove(storagePath),
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
    classifyBatch: async (batchId) => {
      await input.addressOrchestrator.classifyBatch(batchId);
      input.locationResolution.registerLayerPackageGroupsAfterClassify(batchId);
      const jobCount = input.jobState.jobs().filter((j) => j.batchId === batchId).length;
      input.preResolveWave.resetWave(batchId, jobCount);
    },
  };
}
