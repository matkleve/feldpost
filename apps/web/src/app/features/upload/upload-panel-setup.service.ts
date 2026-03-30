import { Injectable, inject, type WritableSignal } from '@angular/core';
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
import { UploadPanelSignalsService } from './upload-panel-signals.service';
import type {
  ImageUploadedEvent,
  UploadLocationMapPickRequest,
  UploadLocationPreviewEvent,
} from './upload-panel.types';

export interface UploadPanelSetupOptions {
  imageUploaded: (event: ImageUploadedEvent) => void;
  placementRequested: (jobId: string) => void;
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

  private readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  initialize(options: UploadPanelSetupOptions): void {
    this.lifecycle.setImageUploadedCallback((event) => options.imageUploaded(event));
    this.lifecycle.setPlacementRequestedCallback((jobId) => options.placementRequested(jobId));
    this.lifecycle.setAutoSwitchCallback(() => this.lanes.setSelectedLane('issues'));
    this.lifecycle.initializeSubscriptions();

    this.rowInteractions.register({
      placementRequested: options.placementRequested,
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
}
