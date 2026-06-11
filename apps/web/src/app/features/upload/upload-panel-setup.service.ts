import { DestroyRef, Injectable, inject, type WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '../../core/i18n/i18n.service';
import { UploadManagerService, type UploadJob } from '../../core/upload/upload-manager.service';
import { UploadPanelLifecycleService } from './upload-panel-lifecycle.service';
import { UploadPanelRegistrationService } from './upload-panel-registration.service';
import {
  UploadPanelRowInteractionsService,
  type UploadPanelRowInteractionsRegisterOptions,
} from './upload-panel-row-interactions.service';
import { UploadPanelLaneHandlersService } from './upload-panel-lane-handlers';
import { UploadPanelRowHandlersService } from './upload-panel-row-handlers';
import { UploadPanelJobActionsService } from './upload-panel-job-actions.service';
import { UploadPanelViewModelService } from './upload-panel-view-model.service';
import { UploadPanelDialogActionsService } from './upload-panel-dialog-actions.service';
import { UploadPanelSignalsService } from './upload-panel-signals.service';
import type {
  ImageUploadedEvent,
  UploadLocationMapPickRequest,
  UploadLocationPreviewEvent,
} from './upload-panel.types';

export interface UploadPanelSetupOptions {
  destroyRef: DestroyRef;
  imageUploaded: (event: ImageUploadedEvent) => void;
  placementRequested: (jobId: string) => void;
  detailRequested: UploadPanelRowInteractionsRegisterOptions['detailRequested'];
  zoomToLocationRequested: UploadPanelRowInteractionsRegisterOptions['zoomToLocationRequested'];
  locationMapPickRequested: (event: UploadLocationMapPickRequest) => void;
  locationPreviewRequested: (event: UploadLocationPreviewEvent) => void;
  locationPreviewCleared: () => void;
  selectedUploadJobIds: WritableSignal<Set<string>>;
  prioritizedUploadedJobIds: WritableSignal<Set<string>>;
  dismissFile: (jobId: string) => void;
}

@Injectable()
export class UploadPanelSetupService {
  // ── Core dependencies ──────────────────────────────────────────────────────
  // I18n for translated labels; Upload manager (root orchestrator);
  // Panels signals, lifecycle, registration for wiring event callbacks.
  private readonly i18nService = inject(I18nService);
  private readonly uploadManager = inject(UploadManagerService);
  private readonly signals = inject(UploadPanelSignalsService);
  private readonly lifecycle = inject(UploadPanelLifecycleService);
  private readonly registration = inject(UploadPanelRegistrationService);
  private readonly rowInteractions = inject(UploadPanelRowInteractionsService);
  private readonly lanes = inject(UploadPanelLaneHandlersService);
  private readonly rows = inject(UploadPanelRowHandlersService);
  private readonly jobActions = inject(UploadPanelJobActionsService);
  private readonly viewModel = inject(UploadPanelViewModelService);
  private readonly dialogActions = inject(UploadPanelDialogActionsService);

  private readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  /**
   * initialize() — Wire all event callbacks and register panel state graph.
   * Connects UploadManager observable events to UploadPanel component callbacks,
   * sets up row/lane interaction handlers, and registers the view model signal graph.
   */
  initialize(options: UploadPanelSetupOptions): void {
    this.lifecycle.setImageUploadedCallback((event) => options.imageUploaded(event));
    this.lifecycle.setPlacementRequestedCallback((jobId) => options.placementRequested(jobId));
    this.lifecycle.initializeSubscriptions(options.destroyRef);

    this.uploadManager.duplicateDetected$
      .pipe(takeUntilDestroyed(options.destroyRef))
      .subscribe((event) => {
        const job = this.uploadManager.jobs().find((entry) => entry.id === event.jobId);
        if (job) {
          this.dialogActions.openDuplicateResolutionDialog(job);
        }
      });

    this.rowInteractions.register({
      placementRequested: options.placementRequested,
      detailRequested: options.detailRequested,
      zoomToLocationRequested: options.zoomToLocationRequested,
    });

    this.registration.register({
      uploadManagerJobs: this.uploadManager.jobs,
      jobs: this.signals.jobs,
      selectedUploadJobIds: options.selectedUploadJobIds,
      jobActions: {
        imageUploaded: options.imageUploaded,
        placementRequested: options.placementRequested,
        locationMapPickRequested: options.locationMapPickRequested,
        locationPreviewRequested: options.locationPreviewRequested,
        locationPreviewCleared: options.locationPreviewCleared,
        setLane: (lane) => this.lanes.setSelectedLane(lane),
        selectedUploadJobIds: options.selectedUploadJobIds,
        prioritizedUploadedJobIds: options.prioritizedUploadedJobIds,
      },
      viewModel: {
        t: this.t,
        laneCounts: this.signals.laneCounts,
        effectiveLane: this.signals.effectiveLane,
        laneJobs: this.signals.laneJobs,
        issueAttentionPulse: this.lifecycle.issueAttentionPulse,
        prioritizedUploadedJobIds: options.prioritizedUploadedJobIds,
        jobs: this.signals.jobs,
        selectedUploadJobIds: options.selectedUploadJobIds,
        canZoomToJob: (job: UploadJob) => this.rows.canZoomToJob(job),
      },
      bulkActions: {
        selectedUploadJobIds: options.selectedUploadJobIds,
        selectedUploadJobs: () => this.viewModel.selectedUploadJobs(),
        setLane: (lane) => this.lanes.setSelectedLane(lane),
        retryFile: (jobId) => this.rows.retryFile(jobId),
        dismissFile: options.dismissFile,
        cancelJob: (jobId) => this.uploadManager.cancelJob(jobId),
        canZoomToJob: (job: UploadJob) => this.rows.canZoomToJob(job),
        downloadUploadedJob: (job: UploadJob) => this.jobActions.downloadUploadedJob(job),
      },
    });
  }

  clearHostCallbacks(): void {
    this.lifecycle.clearHostCallbacks();
  }
}
