/**
 * UploadManagerService -- singleton, application-wide upload pipeline orchestrator.
 *
 * Coordinates the upload lifecycle by delegating to focused sub-services:
 *  - UploadJobStateService: job CRUD, phase transitions, events
 *  - UploadBatchService: batch tracking, progress computation
 *  - UploadQueueService: FIFO concurrency control (max 3)
 *  - UploadNewPipelineService: 'new' upload pipeline
 *  - UploadReplacePipelineService: 'replace' upload pipeline
 *  - UploadAttachPipelineService: 'attach' upload pipeline
 *  - FolderScanService: recursive directory scanning
 *
 * Ground rules:
 *  - providedIn: 'root' -- survives component lifecycle.
 *  - Signals for reactive state; Observables for domain events.
 *  - Delegates per-file work to pipeline services; never touches Leaflet.
 *  - Auth change (logout) cancels all active jobs.
 *  - beforeunload warning when uploads are in progress.
 */

import { Injectable, effect, inject } from '@angular/core';
import { Subject } from 'rxjs';
import type { Signal } from '@angular/core';
import type { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { FilenameParserService } from '../filename-parser/filename-parser.service';
import { FolderScanService } from '../folder-scan/folder-scan.service';
import { MediaPreviewService } from '../media-preview/media-preview.service';
import { ProjectsService } from '../projects/projects.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UploadAttachPipelineService } from './pipelines/attach/upload-attach-pipeline.service';
import { UploadBatchService } from './support/upload-batch.service';
import {
  assignUploadManagerJobToProject,
  attachUploadManagerFile,
  cancelUploadManagerBatch,
  cancelUploadManagerJob,
  dismissAllUploadManagerCompleted,
  dismissUploadManagerJob,
  forceUploadManagerDuplicateUpload,
  hydrateUploadManagerDeferredPreviews,
  placeUploadManagerJob,
  replaceUploadManagerFile,
  resolveUploadManagerConflict,
  retryUploadManagerJob,
  type UploadManagerActionsDeps,
} from './manager/upload-manager-actions.util';
import { checkUploadDedupHash } from './manager/upload-manager-dedup.util';
import { selectUploadManagerAddressCandidate } from './manager/upload-manager-select-address.util';
import { registerUploadManagerEffects } from './manager/upload-manager-effects.util';
import { emitUploadManagerBatchProgress } from './manager/upload-manager-lifecycle.util';
import { UploadManagerMissingDataService } from './manager/upload-manager-missing-data.service';
import { UploadManagerPipelineHostService } from './manager/upload-manager-pipeline-host.service';
import {
  buildUploadManagerActionDeps,
  buildUploadManagerSubmitDeps,
} from './manager/upload-manager-facade-deps.util';
import { createUploadManagerPipelineContext } from './manager/upload-manager-runtime.util';
import {
  submitUploadManagerFiles,
  submitUploadManagerFolder,
  submitUploadManagerWebkitFolder,
  type UploadManagerSubmitDeps,
} from './manager/upload-manager-submit.util';
import { UploadLocationConfigService } from './location/upload-location-config.service';
import { UploadAddressResolutionOrchestrator } from './address-resolution/upload-address-resolution.orchestrator';
import { UploadResolverTrayOrchestratorService } from '../upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.service';
import { UploadLocationResolutionService } from './location/upload-location-resolution.service';
import { UploadPreResolveWaveService } from './support/upload-pre-resolve-wave.service';
import { UploadJobStateService } from './support/upload-job-state.service';
import type { PipelineContext } from './upload-manager.types';
import { UploadNewPipelineService } from './pipelines/new/upload-new-pipeline.service';
import { UploadQueueService } from './support/upload-queue.service';
import { UploadReplacePipelineService } from './pipelines/replace/upload-replace-pipeline.service';
import type { ExifCoords } from './upload.service';

// -- Re-export types so existing consumers don't need to change imports ------------------------

export type {
  UploadPhase,
  UploadJobMode,
  UploadJob,
  SubmitOptions,
  ImageUploadedEvent,
  UploadFailedEvent,
  MissingDataEvent,
  UploadSkippedEvent,
  DuplicateDetectedEvent,
  DedupHashMatch,
  JobPhaseChangedEvent,
  BatchProgressEvent,
  BatchCompleteEvent,
  LocationConflictEvent,
  ImageReplacedEvent,
  ImageAttachedEvent,
  ConflictCandidate,
  ConflictResolution,
  UploadBatch,
  PipelineContext,
} from './upload-manager.types';

import type {
  UploadAddressCandidate,
  UploadJob,
  SubmitOptions,
  ImageUploadedEvent,
  MissingDataEvent,
  UploadSkippedEvent,
  DuplicateDetectedEvent,
  LocationConflictEvent,
  ImageReplacedEvent,
  ImageAttachedEvent,
  ConflictResolution,
  UploadBatch,
  UploadFailedEvent,
  JobPhaseChangedEvent,
  BatchProgressEvent,
  BatchCompleteEvent,
} from './upload-manager.types';

// -- Helpers ------------------------

export { TERMINAL_PHASES, ACTIVE_PHASES, phaseLabel } from './support/upload-job-state.service';

// -- Service ------------------------

@Injectable({ providedIn: 'root' })
export class UploadManagerService {
  private static readonly LOG_JOB_ID_PREFIX_LEN = '00000000'.length;

  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly jobState = inject(UploadJobStateService);
  private readonly batchService = inject(UploadBatchService);
  private readonly queue = inject(UploadQueueService);
  private readonly folderScan = inject(FolderScanService);
  private readonly filenameParser = inject(FilenameParserService);
  private readonly mediaPreview = inject(MediaPreviewService);
  private readonly projects = inject(ProjectsService);
  private readonly locationConfig = inject(UploadLocationConfigService);
  private readonly locationResolution = inject(UploadLocationResolutionService);
  private readonly trayOrchestrator = inject(UploadResolverTrayOrchestratorService);
  private readonly addressOrchestrator = inject(UploadAddressResolutionOrchestrator);
  private readonly preResolveWave = inject(UploadPreResolveWaveService);
  private readonly newPipeline = inject(UploadNewPipelineService);
  private readonly replacePipeline = inject(UploadReplacePipelineService);
  private readonly attachPipeline = inject(UploadAttachPipelineService);
  private readonly missingData = inject(UploadManagerMissingDataService);
  private readonly pipelineHost = inject(UploadManagerPipelineHostService);

  private readonly facadeDepsInput = {
    jobState: this.jobState,
    batchService: this.batchService,
    queue: this.queue,
    folderScan: this.folderScan,
    filenameParser: this.filenameParser,
    mediaPreview: this.mediaPreview,
    projects: this.projects,
    locationConfig: this.locationConfig,
    locationResolution: this.locationResolution,
    addressOrchestrator: this.addressOrchestrator,
    preResolveWave: this.preResolveWave,
    pipelineHost: this.pipelineHost,
    getPipelineCtx: () => this.pipelineCtx,
    supabaseRemove: (storagePath: string) => {
      this.supabase.client.storage.from('media').remove([storagePath]);
    },
    hydrateDeferredPreviews: (jobs: ReadonlyArray<UploadJob>) => this.hydrateDeferredPreviews(jobs),
  };

  private readonly actionDeps: UploadManagerActionsDeps = buildUploadManagerActionDeps(
    this.facadeDepsInput,
  );

  private readonly submitDeps: UploadManagerSubmitDeps = buildUploadManagerSubmitDeps(
    this.facadeDepsInput,
  );

  // -- Delegated state ------------------------

  readonly jobs: Signal<ReadonlyArray<UploadJob>> = this.jobState.jobs;
  readonly activeJobs: Signal<ReadonlyArray<UploadJob>> = this.jobState.activeJobs;
  readonly isBusy: Signal<boolean> = this.jobState.isBusy;
  readonly activeCount: Signal<number> = this.jobState.activeCount;
  readonly batches: Signal<ReadonlyArray<UploadBatch>> = this.batchService.batches;
  readonly activeBatch: Signal<UploadBatch | null> = this.batchService.activeBatch;

  /** Whether the File System Access API is available (Chromium only). */
  readonly isFolderImportSupported = this.folderScan.isSupported;

  // -- Events ------------------------

  private readonly _imageUploaded$ = new Subject<ImageUploadedEvent>();
  private readonly _missingData$ = new Subject<MissingDataEvent>();
  private readonly _uploadSkipped$ = new Subject<UploadSkippedEvent>();
  private readonly _duplicateDetected$ = new Subject<DuplicateDetectedEvent>();
  private readonly _locationConflict$ = new Subject<LocationConflictEvent>();
  private readonly _imageReplaced$ = new Subject<ImageReplacedEvent>();
  private readonly _imageAttached$ = new Subject<ImageAttachedEvent>();

  readonly imageUploaded$: Observable<ImageUploadedEvent> = this._imageUploaded$.asObservable();
  readonly uploadFailed$: Observable<UploadFailedEvent> = this.jobState.uploadFailed$;
  readonly missingData$: Observable<MissingDataEvent> = this._missingData$.asObservable();
  readonly uploadSkipped$: Observable<UploadSkippedEvent> = this._uploadSkipped$.asObservable();
  readonly duplicateDetected$: Observable<DuplicateDetectedEvent> =
    this._duplicateDetected$.asObservable();
  readonly jobPhaseChanged$: Observable<JobPhaseChangedEvent> = this.jobState.jobPhaseChanged$;
  readonly batchProgress$: Observable<BatchProgressEvent> = this.batchService.batchProgress$;
  readonly batchComplete$: Observable<BatchCompleteEvent> = this.batchService.batchComplete$;
  readonly locationConflict$: Observable<LocationConflictEvent> =
    this._locationConflict$.asObservable();
  readonly imageReplaced$: Observable<ImageReplacedEvent> = this._imageReplaced$.asObservable();
  readonly imageAttached$: Observable<ImageAttachedEvent> = this._imageAttached$.asObservable();

  // -- Intra-batch dedup registry ------------------------

  /**
   * Per-batch content-hash ownership: `${batchId} ${hash}` -> first jobId.
   * Lets a later job in the same batch detect a byte-identical sibling
   * deterministically (double folder pick) without a second server round-trip.
   */
  private readonly batchDedupClaims = new Map<string, string>();

  // -- Pipeline context ------------------------

  /** Shared context passed to pipeline services for manager-owned operations. */
  private readonly pipelineCtx: PipelineContext = createUploadManagerPipelineContext({
    failJob: (jobId, failedAt, error) =>
      this.pipelineHost.failJob(jobId, failedAt, error, this.pipelineCtx),
    emitBatchProgress: (batchId) => this.emitBatchProgress(batchId),
    drainQueue: () => this.pipelineHost.drainQueue(this.pipelineCtx),
    getAbortSignal: (jobId) => this.pipelineHost.getAbortSignal(jobId),
    checkDedupHash: (hash) => this.checkDedupHash(hash),
    claimBatchHash: (batchId, hash, jobId) => this.claimBatchHash(batchId, hash, jobId),
    getCurrentUserId: () => this.auth.user()?.id,
    emitUploadSkipped: (event) => this._uploadSkipped$.next(event),
    emitDuplicateDetected: (event) => this._duplicateDetected$.next(event),
    emitImageUploaded: (event) => this._imageUploaded$.next(event),
    emitImageReplaced: (event) => this._imageReplaced$.next(event),
    emitImageAttached: (event) => this._imageAttached$.next(event),
    emitMissingData: (event) => this._missingData$.next(event),
    emitLocationConflict: (event) => this._locationConflict$.next(event),
  });

  // -- beforeunload ------------------------

  private readonly beforeUnloadHandler = (event: BeforeUnloadEvent): void => {
    // Trigger the browser's native "Leave site?" confirmation while uploads are
    // in progress. registerUploadManagerEffects only attaches this listener
    // while isBusy() is true, so it never fires when no upload is active.
    event.preventDefault();
    event.returnValue = '';
  };

  constructor() {
    registerUploadManagerEffects({
      createEffect: (runner) => {
        effect(runner);
      },
      getUser: () => this.auth.user(),
      hasRunning: () => this.queue.hasRunning(),
      cancelAllActive: () => this.pipelineHost.cancelAllActive(),
      isBusy: () => this.isBusy(),
      addBeforeUnloadListener: (handler) => {
        window.addEventListener('beforeunload', handler);
      },
      removeBeforeUnloadListener: (handler) => {
        window.removeEventListener('beforeunload', handler);
      },
      beforeUnloadHandler: this.beforeUnloadHandler,
    });

    // Release a batch's intra-batch hash claims once it finishes.
    this.batchComplete$.subscribe((event) => this.clearBatchDedup(event.batchId));
  }

  // -- Public API ------------------------

  /**
   * Submit one or more files for upload. Returns immediately.
   * Each file becomes an UploadJob tracked in `jobs`.
   * Files are grouped into a single batch for aggregate tracking.
   *
   * @returns The batch ID for tracking aggregate progress.
   */
  async submit(files: File[], options?: SubmitOptions): Promise<string> {
    return submitUploadManagerFiles(files, options, this.submitDeps);
  }

  /**
   * Submit an entire folder for upload via the File System Access API.
   * Recursively scans the directory for supported image types,
   * creates a batch, and feeds files into the pipeline.
   *
   * Folder names in form "Project: [projectname]" are parsed case-insensitively
   * and the corresponding project is auto-assigned to all jobs in the batch.
   */
  async submitFolder(
    dirHandle: FileSystemDirectoryHandle,
    options?: SubmitOptions,
  ): Promise<string> {
    return submitUploadManagerFolder(dirHandle, options, this.submitDeps);
  }

  async submitWebkitFolder(
    scannedEntries: Parameters<typeof submitUploadManagerWebkitFolder>[0],
    rootFolderLabel: string | undefined,
    options?: SubmitOptions,
  ): Promise<string> {
    return submitUploadManagerWebkitFolder(
      scannedEntries,
      rootFolderLabel,
      options,
      this.submitDeps,
    );
  }

  /** Retry a failed job from the beginning. */
  retryJob(jobId: string): void {
    retryUploadManagerJob(jobId, this.actionDeps);
  }

  /** Remove a terminal job (complete / error / missing_data) from the list. */
  dismissJob(jobId: string): void {
    dismissUploadManagerJob(jobId, this.actionDeps);
  }

  /** Remove all terminal jobs from the list. */
  dismissAllCompleted(): void {
    dismissAllUploadManagerCompleted(this.actionDeps);
  }

  /** Cancel a pending or active job. Cleans up partial storage if needed. */
  cancelJob(jobId: string): void {
    cancelUploadManagerJob(jobId, this.actionDeps);
  }

  /** Cancel all non-terminal jobs in a batch. */
  cancelBatch(batchId: string): void {
    cancelUploadManagerBatch(batchId, this.actionDeps, (jobId) => this.cancelJob(jobId));
    this.batchService.releaseTrayOrchestratorForBatch(batchId);
    this.clearBatchDedup(batchId);
  }

  /**
   * Resolve a `missing_data` job by providing manual coordinates.
   * Moves the job back into the upload pipeline (Path A with manual coords).
   */
  placeJob(jobId: string, coords: ExifCoords): void {
    const job = this.jobState.findJob(jobId);
    if (job?.phase === 'missing_data' && job.mediaId) {
      void this.missingData.resolvePersistedMissingDataLocation(
        jobId,
        job.mediaId,
        coords,
        (batchId) => this.emitBatchProgress(batchId),
      );
      return;
    }

    placeUploadManagerJob(jobId, coords, this.actionDeps);
  }

  /**
   * Resolve an address-ambiguous issue using a concrete candidate.
   * Persists the selected textual label and re-queues the job with chosen coordinates.
   */
  /** After batch location gate (e.g. source-conflict Save), drain queued siblings. */
  kickQueueAfterLocationGate(): void {
    this.pipelineHost.kickQueueAfterLocationGate(this.pipelineCtx);
  }

  selectAddressCandidate(jobId: string, candidate: UploadAddressCandidate): void {
    selectUploadManagerAddressCandidate(jobId, candidate, {
      jobState: this.jobState,
      locationResolution: this.locationResolution,
      missingData: this.missingData,
      actionDeps: this.actionDeps,
      emitBatchProgress: (batchId) => this.emitBatchProgress(batchId),
    });
  }

  /**
   * Resolve a `missing_data` job by assigning it to a project context.
   * Used by document uploads that can proceed as project-bound items.
   */
  assignJobToProject(jobId: string, projectId: string): void {
    const job = this.jobState.findJob(jobId);
    if (job?.phase === 'missing_data' && job.mediaId) {
      void this.missingData.resolvePersistedMissingDataProject(
        jobId,
        job.mediaId,
        projectId,
        (batchId) => this.emitBatchProgress(batchId),
      );
      return;
    }

    assignUploadManagerJobToProject(jobId, projectId, this.actionDeps);
  }

  /**
   * Replace the photo file for an existing image row.
   * Pipeline: validating -> hashing -> dedup_check -> uploading -> replacing_record -> complete.
   *
   * @param mediaId  The existing image UUID whose file is being replaced.
   * @param file     The new photo file.
   * @returns        The job ID for tracking progress.
   */
  replaceFile(mediaId: string, file: File): string {
    return replaceUploadManagerFile(mediaId, file, this.actionDeps);
  }

  /**
   * Upload a photo to an existing image row that has no file (photoless datapoint).
   * Pipeline: validating -> parsing_exif -> hashing -> dedup_check -> uploading -> replacing_record -> enrichment -> complete.
   *
   * @param mediaId  The existing photoless image UUID.
   * @param file     The photo file to attach.
   * @returns        The job ID for tracking progress.
   */
  attachFile(mediaId: string, file: File): string {
    return attachUploadManagerFile(mediaId, file, this.actionDeps);
  }

  private hydrateDeferredPreviews(jobs: ReadonlyArray<UploadJob>): void {
    hydrateUploadManagerDeferredPreviews(jobs, this.actionDeps);
  }

  /**
   * Resolve a location conflict for a paused job.
   * Called when the user responds to the conflict popup.
   * Re-queues the job at the front of the concurrency queue.
   */
  resolveConflict(jobId: string, resolution: ConflictResolution): void {
    resolveUploadManagerConflict(jobId, resolution, this.actionDeps);
  }

  /**
   * Re-queue a duplicate-skipped job and bypass one dedup decision.
   * Used by the explicit user action "upload anyway".
   */
  forceDuplicateUpload(jobId: string): void {
    forceUploadManagerDuplicateUpload(jobId, this.actionDeps);
  }

  /** Emit batch progress and check for batch completion. */
  private emitBatchProgress(batchId: string): void {
    emitUploadManagerBatchProgress(batchId, {
      snapshotJobs: () => this.jobState.snapshot(),
      emitBatchProgress: (id, jobs) => this.batchService.emitBatchProgress(id, jobs),
      checkBatchComplete: (id, jobs) => this.batchService.checkBatchComplete(id, jobs),
    });
  }

  /**
   * Check a single content hash against the server.
   * Returns the existing image ID if found, or null.
   */
  private async checkDedupHash(contentHash: string) {
    return checkUploadDedupHash(this.supabase.client, contentHash);
  }

  /**
   * Claim `contentHash` for `jobId` within `batchId`. Returns the jobId that
   * already owns the hash in this batch (intra-batch duplicate), or null when
   * this job is the owner. Check-and-set is synchronous, so concurrent siblings
   * resolve deterministically by event-loop order.
   */
  private claimBatchHash(batchId: string, contentHash: string, jobId: string): string | null {
    const key = `${batchId} ${contentHash}`;
    const owner = this.batchDedupClaims.get(key);
    if (owner && owner !== jobId) {
      return owner;
    }
    this.batchDedupClaims.set(key, jobId);
    return null;
  }

  /** Drop a finished/cancelled batch's hash claims. */
  private clearBatchDedup(batchId: string): void {
    const prefix = `${batchId} `;
    for (const key of this.batchDedupClaims.keys()) {
      if (key.startsWith(prefix)) {
        this.batchDedupClaims.delete(key);
      }
    }
  }
}
