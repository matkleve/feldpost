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
import { UploadPanelItemComponent } from './upload-panel-item.component';
import type { ExifCoords } from '../../core/upload/upload.service';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
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
import { dropzoneLabelText } from './upload-panel-helpers';
import {
  UiButtonDirective,
  UiInputControlDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';
import { ChipComponent } from '../../shared/components/chip/chip.component';
import { I18nService } from '../../core/i18n/i18n.service';
import { ProjectSelectDialogComponent } from '../../shared/project-select-dialog/project-select-dialog.component';
import { PaneFooterComponent } from '../../shared/pane-footer/pane-footer.component';
import {
  SegmentedSwitchComponent,
  type SegmentedSwitchOption,
} from '../../shared/segmented-switch/segmented-switch.component';
import { DEFAULT_FILE_TYPE_CHIPS } from './upload-panel.constants';
import { UploadPanelJobActionsService } from './upload-panel-job-actions.service';
import { UploadPanelBulkActionsService } from './upload-panel-bulk-actions.service';
import { UploadPanelViewModelService } from './upload-panel-view-model.service';
import { UploadPanelJobFileActionsService } from './upload-panel-job-file-actions.service';
import { UploadPanelDialogActionsService } from './upload-panel-dialog-actions.service';
import { UploadPanelMenuActionRouterService } from './upload-panel-menu-action-router.service';
import { UploadPanelRegistrationService } from './upload-panel-registration.service';
import { UploadPanelRowInteractionsService } from './upload-panel-row-interactions.service';
import { UploadPanelSetupService } from './upload-panel-setup.service';
import type {
  ImageUploadedEvent,
  UploadLocationMapPickRequest,
  UploadLocationPreviewEvent,
} from './upload-panel.types';
import type { UploadLocationRequirementMode } from '../../core/upload/upload-manager.types';
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
    UploadPanelRowInteractionsService,
    UploadPanelSetupService,
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
  private readonly setup = inject(UploadPanelSetupService);
  private readonly rowInteractions = inject(UploadPanelRowInteractionsService);
  readonly actionHandlers = this.jobActions;
  readonly inputHandlers = this.inputs;
  readonly laneHandlers = this.lanes;
  readonly rowHandlers = this.rows;
  readonly rowInteractionHandlers = this.rowInteractions;
  readonly bulkHandlers = this.bulkActions;
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

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
  readonly locationRequirementMode = this.signals.locationRequirementMode;
  readonly locationModeSwitchOptions = computed<ReadonlyArray<SegmentedSwitchOption>>(() => [
    {
      id: 'required',
      type: 'icon-only',
      icon: 'verified_user',
      label: this.t('upload.location.mode.required', 'Location required'),
      title: this.t('upload.location.mode.required', 'Location required'),
      ariaLabel: this.t('upload.location.mode.required', 'Location required'),
    },
    {
      id: 'optional',
      type: 'icon-only',
      icon: 'gpp_maybe',
      label: this.t('upload.location.mode.optional', 'Location not required'),
      title: this.t('upload.location.mode.optional', 'Location not required'),
      ariaLabel: this.t('upload.location.mode.optional', 'Location not required'),
    },
  ]);
  readonly effectiveLane = this.signals.effectiveLane;
  readonly laneJobs = this.signals.laneJobs;
  readonly prioritizedUploadedJobIds = signal<Set<string>>(new Set());
  readonly dropzoneLabelText = (): string => dropzoneLabelText(this.t);

  readonly laneSwitchOptions = this.viewModel.laneSwitchOptions;
  readonly visibleLaneJobs = this.viewModel.visibleLaneJobs;
  readonly issueAttentionPulse = this.lifecycle.issueAttentionPulse;
  readonly fileTypeChips = DEFAULT_FILE_TYPE_CHIPS;
  readonly documentFallbackLabel = documentFallbackLabel;
  readonly trackByJobId = trackByJobId;
  readonly selectedUploadJobIds = signal<Set<string>>(new Set());
  readonly selectedUploadJobs = this.viewModel.selectedUploadJobs;
  readonly hasSelectedUploadJobs = this.viewModel.hasSelectedUploadJobs;
  readonly hasRetryableSelection = this.viewModel.hasRetryableSelection;
  readonly canDownloadSelectedUploads = this.viewModel.canDownloadSelectedUploads;
  private readonly dialogSignals = inject(UploadPanelDialogSignals);
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
    this.setup.initialize({
      imageUploaded: (event) => this.imageUploaded.emit(event),
      placementRequested: (jobId) => this.placementRequested.emit(jobId),
      zoomToLocationRequested: (event) => this.zoomToLocationRequested.emit(event),
      locationMapPickRequested: (event) => this.locationMapPickRequested.emit(event),
      locationPreviewRequested: (event) => this.locationPreviewRequested.emit(event),
      locationPreviewCleared: () => this.locationPreviewCleared.emit(),
      selectedUploadJobIds: this.selectedUploadJobIds,
      prioritizedUploadedJobIds: this.prioritizedUploadedJobIds,
      dismissFile: (jobId) => this.dismissFile(jobId),
    });
  }

  // Public API used by map-shell pending-placement flow.
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

  onLocationModeValueChange(value: string | null): void {
    if (value === 'required' || value === 'optional') {
      this.signals.setLocationRequirementMode(value);
    }
  }

  locationModeLabel(): string {
    return this.locationRequirementMode() === 'required'
      ? this.t('upload.location.mode.required', 'Location required')
      : this.t('upload.location.mode.optional', 'Location not required');
  }
}
