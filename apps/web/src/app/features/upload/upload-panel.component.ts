/**
 * UploadPanelComponent — drag-and-drop / file-picker upload UI.
 *
 * Ground rules:
 *  - Ultra-thin UI coordinator that delegates to injected services.
 *  - All signals & computed exposed via UploadPanelSignalsService
 *  - All subscriptions & lifecycle via UploadPanelLifecycleService
 *  - Component only bridges template events to services.
 */

import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadPanelItemComponent, type UploadItemMenuAction } from './upload-panel-item.component';
import type { ForwardGeocodeResult } from '../../core/geocoding.service';
import type { ExifCoords } from '../../core/upload/upload.service';
import {
  UploadManagerService,
  type UploadJob,
  type UploadPhase,
} from '../../core/upload/upload-manager.service';
import { UploadPanelSignalsService } from './upload-panel-signals.service';
import { UploadPanelDialogSignals } from './upload-panel-dialog-signals.service';
import { UploadPanelLifecycleService } from './upload-panel-lifecycle.service';
import { UploadPanelInputHandlersService } from './upload-panel-input-handlers';
import { UploadPanelLaneHandlersService } from './upload-panel-lane-handlers';
import {
  UploadPanelRowHandlersService,
  type ZoomToLocationEvent,
} from './upload-panel-row-handlers';
import { documentFallbackLabel, trackByJobId } from './upload-panel-utils';
import { dropzoneLabelText, isUploadLane } from './upload-panel-helpers';
import {
  UiButtonDirective,
  UiInputControlDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';
import { ChipComponent } from '../../shared/components/chip/chip.component';
import { I18nService } from '../../core/i18n/i18n.service';
import { ProjectSelectDialogComponent } from '../../shared/project-select-dialog/project-select-dialog.component';
import { PaneFooterComponent } from '../../shared/pane-footer/pane-footer.component';
import { SegmentedSwitchComponent } from '../../shared/segmented-switch/segmented-switch.component';
import type { UploadLane } from './upload-phase.helpers';
import { DEFAULT_FILE_TYPE_CHIPS } from './upload-panel.constants';
import {
  UploadPanelJobActionsService,
  type DuplicateResolutionChoice,
} from './upload-panel-job-actions.service';
import { UploadPanelBulkActionsService } from './upload-panel-bulk-actions.service';
import { UploadPanelViewModelService } from './upload-panel-view-model.service';
import { UploadPanelJobFileActionsService } from './upload-panel-job-file-actions.service';
import { UploadPanelDialogActionsService } from './upload-panel-dialog-actions.service';
import { UploadPanelMenuActionRouterService } from './upload-panel-menu-action-router.service';
import { UploadPanelRegistrationService } from './upload-panel-registration.service';
import type {
  ImageUploadedEvent,
  UploadLocationMapPickRequest,
  UploadLocationPreviewEvent,
} from './upload-panel.types';
export type {
  ImageUploadedEvent,
  UploadLocationMapPickRequest,
  UploadLocationPreviewEvent,
} from './upload-panel.types';

@Component({
  selector: 'app-upload-panel',
  standalone: true,
  imports: [
    CommonModule,
    UploadPanelItemComponent,
    ChipComponent,
    SegmentedSwitchComponent,
    UiButtonDirective,
    UiInputControlDirective,
    ProjectSelectDialogComponent,
    PaneFooterComponent,
  ],
  providers: [
    UploadPanelDialogSignals,
    UploadPanelJobActionsService,
    UploadPanelJobFileActionsService,
    UploadPanelDialogActionsService,
    UploadPanelMenuActionRouterService,
    UploadPanelBulkActionsService,
    UploadPanelViewModelService,
    UploadPanelRegistrationService,
  ],
  templateUrl: './upload-panel.component.html',
  styleUrl: './upload-panel.component.scss',
})
export class UploadPanelComponent {
  // Services
  private readonly uploadManager = inject(UploadManagerService);
  private readonly i18nService = inject(I18nService);
  private readonly signals = inject(UploadPanelSignalsService);
  private readonly lifecycle = inject(UploadPanelLifecycleService);
  private readonly inputs = inject(UploadPanelInputHandlersService);
  private readonly lanes = inject(UploadPanelLaneHandlersService);
  private readonly rows = inject(UploadPanelRowHandlersService);
  private readonly jobActions = inject(UploadPanelJobActionsService);
  private readonly bulkActions = inject(UploadPanelBulkActionsService);
  private readonly viewModel = inject(UploadPanelViewModelService);
  private readonly registration = inject(UploadPanelRegistrationService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  // Component I/O
  readonly visible = input<boolean>(false);
  readonly embeddedInPane = input<boolean>(false);
  readonly imageUploaded = output<ImageUploadedEvent>();
  readonly placementRequested = output<string>();
  readonly zoomToLocationRequested = output<ZoomToLocationEvent>();
  readonly locationPreviewRequested = output<UploadLocationPreviewEvent>();
  readonly locationPreviewCleared = output<void>();
  readonly locationMapPickRequested = output<UploadLocationMapPickRequest>();

  // Delegate all signals to signals service
  readonly jobs = this.signals.jobs;
  readonly batches = this.signals.batches;
  readonly activeBatch = this.signals.activeBatch;
  readonly folderImportSupported = this.signals.folderImportSupported;
  readonly isUploading = this.signals.isUploading;
  readonly laneCounts = this.signals.laneCounts;
  readonly scanning = this.signals.scanning;
  readonly scanningLabel = this.signals.scanningLabel;
  readonly hasAwaitingPlacement = this.signals.hasAwaitingPlacement;
  readonly showProgressBoard = this.signals.showProgressBoard;
  readonly isDragging = this.inputs.isDragging;
  readonly priorityWorkflowEnabled = computed(() => this.embeddedInPane());
  readonly selectedLane = this.signals.selectedLane;
  readonly effectiveLane = this.signals.effectiveLane;
  readonly laneJobs = this.signals.laneJobs;
  readonly prioritizedUploadedJobIds = signal<Set<string>>(new Set());

  dropzoneLabelText(): string {
    return dropzoneLabelText(this.t);
  }

  readonly laneSwitchOptions = this.viewModel.laneSwitchOptions;
  readonly visibleLaneJobs = this.viewModel.visibleLaneJobs;
  readonly issueAttentionPulse = this.lifecycle.issueAttentionPulse;
  readonly fileTypeChips = DEFAULT_FILE_TYPE_CHIPS;
  readonly selectedUploadJobIds = signal<Set<string>>(new Set());
  readonly selectedUploadJobs = this.viewModel.selectedUploadJobs;
  readonly hasSelectedUploadJobs = this.viewModel.hasSelectedUploadJobs;
  readonly hasRetryableSelection = this.viewModel.hasRetryableSelection;
  readonly canDownloadSelectedUploads = this.viewModel.canDownloadSelectedUploads;

  // Dialog state delegated to UploadPanelDialogSignals service
  private readonly dialogSignals = inject(UploadPanelDialogSignals);

  // Expose dialog signals to template
  readonly projectSelectionDialogOpen = this.dialogSignals.projectSelectionDialogOpen;
  readonly projectSelectionDialogTitle = this.dialogSignals.projectSelectionDialogTitle;
  readonly projectSelectionDialogMessage = this.dialogSignals.projectSelectionDialogMessage;
  readonly projectSelectionDialogOptions = this.dialogSignals.projectSelectionDialogOptions;
  readonly projectSelectionDialogSelectedId = this.dialogSignals.projectSelectionDialogSelectedId;
  readonly locationAddressDialogOpen = this.dialogSignals.locationAddressDialogOpen;
  readonly locationAddressDialogQuery = this.dialogSignals.locationAddressDialogQuery;
  readonly locationAddressDialogLoading = this.dialogSignals.locationAddressDialogLoading;
  readonly locationAddressDialogSuggestions = this.dialogSignals.locationAddressDialogSuggestions;
  readonly duplicateResolutionDialogOpen = this.dialogSignals.duplicateResolutionDialogOpen;
  readonly duplicateResolutionApplyToBatch = this.dialogSignals.duplicateResolutionApplyToBatch;

  constructor() {
    // Bridge component outputs to lifecycle service
    this.lifecycle.setImageUploadedCallback((event) => this.imageUploaded.emit(event));
    this.lifecycle.setPlacementRequestedCallback((jobId) => this.placementRequested.emit(jobId));
    this.lifecycle.setAutoSwitchCallback(() => this.lanes.setSelectedLane('issues'));
    this.lifecycle.initializeSubscriptions();

    this.registration.register({
      uploadManagerJobs: this.uploadManager.jobs,
      jobs: this.jobs,
      selectedUploadJobIds: this.selectedUploadJobIds,
      jobActions: {
        imageUploaded: (event) => this.imageUploaded.emit(event),
        placementRequested: (jobId) => this.placementRequested.emit(jobId),
        locationMapPickRequested: (event) => this.locationMapPickRequested.emit(event),
        locationPreviewRequested: (event) => this.locationPreviewRequested.emit(event),
        locationPreviewCleared: () => this.locationPreviewCleared.emit(),
        setLane: (lane) => this.selectedLane.set(lane),
        selectedUploadJobIds: this.selectedUploadJobIds,
        prioritizedUploadedJobIds: this.prioritizedUploadedJobIds,
      },
      viewModel: {
        t: this.t,
        laneCounts: this.laneCounts,
        effectiveLane: this.effectiveLane,
        laneJobs: this.laneJobs,
        issueAttentionPulse: this.issueAttentionPulse,
        prioritizedUploadedJobIds: this.prioritizedUploadedJobIds,
        jobs: this.jobs,
        selectedUploadJobIds: this.selectedUploadJobIds,
        canZoomToJob: (job) => this.canZoomToJob(job),
      },
      bulkActions: {
        selectedUploadJobIds: this.selectedUploadJobIds,
        selectedUploadJobs: () => this.selectedUploadJobs(),
        setLane: (lane) => this.selectedLane.set(lane),
        retryFile: (jobId) => this.retryFile(jobId),
        dismissFile: (jobId) => this.dismissFile(jobId),
        cancelJob: (jobId) => this.uploadManager.cancelJob(jobId),
        canZoomToJob: (job) => this.canZoomToJob(job),
        downloadUploadedJob: (job) => this.jobActions.downloadUploadedJob(job),
      },
    });
  }

  // ── Input handlers (delegated to inputs service) ────────────────────────

  onDragOver(event: DragEvent): void {
    this.inputs.onDragOver(event);
  }
  onDragLeave(event: DragEvent): void {
    this.inputs.onDragLeave(event);
  }
  onDrop(event: DragEvent): void {
    this.inputs.onDrop(event);
    this.selectedLane.set('uploading');
  }
  onFileInputChange(event: Event): void {
    this.inputs.onFileInputChange(event);
    this.selectedLane.set('uploading');
  }
  onCaptureInputChange(event: Event): void {
    this.inputs.onCaptureInputChange(event);
    this.selectedLane.set('uploading');
  }
  openFilePicker(input: HTMLInputElement): void {
    this.inputs.openFilePicker(input);
  }
  openCapturePicker(event: MouseEvent, input: HTMLInputElement): void {
    this.inputs.openCapturePicker(event, input);
  }
  onDropZoneKeydown(event: KeyboardEvent, input: HTMLInputElement): void {
    this.inputs.onDropZoneKeydown(event, input);
  }
  async onSelectFolder(event: MouseEvent, folderInput: HTMLInputElement): Promise<void> {
    await this.inputs.onSelectFolder(event, folderInput);
  }
  onFolderInputChange(event: Event): void {
    this.inputs.onFolderInputChange(event);
    this.selectedLane.set('uploading');
  }

  // ── Lane handlers (delegated to lanes service) ──────────────────────────

  setSelectedLane(lane: UploadLane): void {
    this.lanes.setSelectedLane(lane);
  }

  onLaneSwitchValueChange(value: string | null): void {
    if (!value || !isUploadLane(value)) {
      return;
    }
    this.setSelectedLane(value);
  }

  // ── Row handlers (delegated to rows service) ────────────────────────────

  requestPlacement(jobId: string, phase: UploadPhase, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const job = this.uploadManager.jobs().find((entry) => entry.id === jobId);
    if (!job || job.phase !== 'missing_data') return;
    this.placementRequested.emit(jobId);
  }

  canZoomToJob(job: UploadJob): boolean {
    return this.rows.canZoomToJob(job);
  }
  isRowInteractive(job: UploadJob): boolean {
    return this.rows.isRowInteractive(job);
  }

  onRowMainClick(job: UploadJob): void {
    if (job.phase === 'missing_data') {
      this.placementRequested.emit(job.id);
      return;
    }
    if (!this.canZoomToJob(job)) return;
    this.zoomToLocationRequested.emit({
      imageId: job.imageId!,
      lat: job.coords!.lat,
      lng: job.coords!.lng,
    });
  }

  onRowMainKeydown(job: UploadJob, event: KeyboardEvent): void {
    if (!this.isRowInteractive(job)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.onRowMainClick(job);
  }

  placeFile(key: string, coords: ExifCoords): void {
    this.rows.placeFile(key, coords);
  }
  dismissFile(jobId: string): void {
    this.rows.dismissFile(jobId);
    this.selectedUploadJobIds.update((selected) => {
      if (!selected.has(jobId)) {
        return selected;
      }

      const next = new Set(selected);
      next.delete(jobId);
      return next;
    });
  }
  retryFile(jobId: string): void {
    this.rows.retryFile(jobId);
  }

  documentFallbackLabel(job: UploadJob): string | null {
    return documentFallbackLabel(job);
  }

  trackByJobId(idx: number, job: UploadJob): string {
    return trackByJobId(idx, job);
  }

  onRowSelectionChanged(event: { jobId: string; selected: boolean }): void {
    this.bulkActions.onRowSelectionChanged(event);
  }

  clearSelectedUploads(): void {
    this.bulkActions.clearSelectedUploads();
  }

  async retrySelectedUploads(): Promise<void> {
    await this.bulkActions.retrySelectedUploads();
  }

  async downloadSelectedUploads(): Promise<void> {
    await this.bulkActions.downloadSelectedUploads();
  }

  removeSelectedUploads(): void {
    this.bulkActions.removeSelectedUploads();
  }

  async onMenuActionSelected(event: {
    job: UploadJob;
    action: UploadItemMenuAction;
  }): Promise<void> {
    await this.jobActions.handleMenuAction(event.job, event.action);
  }

  isJobPrioritized(job: UploadJob): boolean {
    return this.prioritizedUploadedJobIds().has(job.id);
  }

  onLocationAddressDialogQueryInput(query: string): void {
    this.jobActions.onLocationAddressDialogQueryInput(query);
  }

  onLocationAddressDialogClose(): void {
    this.jobActions.onLocationAddressDialogClose();
  }

  onLocationAddressSuggestionHover(suggestion: ForwardGeocodeResult): void {
    this.jobActions.onLocationAddressSuggestionHover(suggestion);
  }

  onLocationAddressSuggestionHoverEnd(): void {
    this.jobActions.onLocationAddressSuggestionHoverEnd();
  }

  async onLocationAddressSuggestionApply(suggestion: ForwardGeocodeResult): Promise<void> {
    await this.jobActions.onLocationAddressSuggestionApply(suggestion);
  }

  onProjectSelectionDialogSelected(projectId: string): void {
    this.jobActions.onProjectSelectionDialogSelected(projectId);
  }

  async onProjectSelectionDialogConfirmed(projectId: string): Promise<void> {
    await this.jobActions.onProjectSelectionDialogConfirmed(projectId);
  }

  onProjectSelectionDialogCancelled(): void {
    this.jobActions.onProjectSelectionDialogCancelled();
  }

  onDuplicateResolutionApplyToBatchChange(event: Event): void {
    this.jobActions.onDuplicateResolutionApplyToBatchChange(event);
  }

  async onDuplicateResolutionChoice(choice: DuplicateResolutionChoice): Promise<void> {
    await this.jobActions.onDuplicateResolutionChoice(choice);
  }
}
