/**
 * UploadPanelComponent — drag-and-drop / file-picker upload UI.
 *
 * Ground rules:
 *  - Ultra-thin UI coordinator that delegates to injected services.
 *  - All signals & computed exposed via UploadPanelSignalsService
 *  - All subscriptions & lifecycle via UploadPanelLifecycleService
 *  - Component only bridges template events to services.
 */

import {
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadPanelItemComponent } from './upload-panel-item.component';
import type { ExifCoords } from '../../../core/upload/upload.service';
import { UploadManagerService } from '../../../core/upload/upload-manager.service';
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
import {
  alternateUploadLocationRequirementMode,
  dropzoneLabelText,
  locationModeToggleAriaLabel,
  nonEmptyLocalized,
} from './upload-panel-helpers';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { HLM_INPUT_IMPORTS } from '../../../shared/ui/input';
import { HLM_SWITCH_IMPORTS } from '../../../shared/ui/switch';
import { ChipComponent } from '../../../shared/components/chip/chip.component';
import { HlmMenuItemDirective } from '../../../shared/ui/menu';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ProjectSelectDialogComponent } from '../../../shared/project-select-dialog/project-select-dialog.component';
import { BrnToggleGroupImports } from '@spartan-ng/brain/toggle-group';
import { HLM_TOGGLE_GROUP_IMPORTS } from '../../../shared/ui/toggle-group';
import { PaneFooterComponent } from '../../../shared/pane-chrome/footer/pane-footer.component';
import { toggleOptionLayout } from '../../../shared/ui/toggle-group/toggle-group-option.helpers';
import { DEFAULT_FILE_TYPE_GROUPS } from './upload-panel-file-type-groups';
import type {
  UploadFileTypeGroup,
  UploadFileTypeGroupId,
} from './upload-panel-file-type-groups';
import { DEFAULT_UPLOAD_FILE_INPUT_ACCEPT } from './upload-panel-file-accept';
import type { UploadFileTypeChip } from './upload-panel.constants';
import {
  fileTypeGroupPickAriaLabel,
  fileTypeMemberPickAriaLabel,
} from './upload-panel-file-type-pick-labels';
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
    ...BrnToggleGroupImports,
    ...HLM_TOGGLE_GROUP_IMPORTS,
    ...HLM_BUTTON_IMPORTS,
    ...HLM_INPUT_IMPORTS,
    ...HLM_SWITCH_IMPORTS,
    HlmMenuItemDirective,
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
/**
 * Upload panel — dual-mode floating/embedded surface.
 *
 * MODE 1 (map floating): shown via `visible` input above the map at z-index 200,
 * no backdrop, anchored under the upload button zone.
 * MODE 2 (embedded in workspace pane): `embeddedInPane=true`, always visible in the
 * Upload tab, inline layout — never an overlay.
 *
 * TODO(brn-sheet): BrnSheet was evaluated for the map floating mode but deferred.
 * Reasons: (1) BrnSheet uses CDK overlay semantics that conflict with the
 * z-index 200 stacking plane and no-backdrop requirement; (2) the embedded pane
 * mode cannot use an overlay; (3) migrating would require either splitting the
 * component or adding CDK `attachTo`/`positionStrategy` non-trivially.
 * Re-evaluate when the map zone overlay contract is redesigned.
 * @see docs/MIGRATION_PLAN.md — Upload panel decision 2026-05-13
 */
export class UploadPanelComponent implements OnDestroy {
  /** Template helper: icon/text layout for lane and location toggles. */
  readonly optLayout = toggleOptionLayout;

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
  private readonly destroyRef = inject(DestroyRef);
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
  readonly detailRequested = output<string>();
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
  private readonly locationModeRowPreview = signal(false);
  readonly locationModeDisplayMode = computed(() => {
    const current = this.locationRequirementMode();
    return this.locationModeRowPreview()
      ? alternateUploadLocationRequirementMode(current)
      : current;
  });
  readonly locationModeToggleAria = computed(() =>
    locationModeToggleAriaLabel(this.locationModeDisplayMode(), (key, fallback) =>
      this.t(key, fallback),
    ),
  );
  readonly effectiveLane = this.signals.effectiveLane;
  readonly laneJobs = this.signals.laneJobs;
  readonly prioritizedUploadedJobIds = signal<Set<string>>(new Set());
  readonly dropzoneLabelText = (): string => dropzoneLabelText(this.t);
  readonly dropzonePickAriaLabel = (): string =>
    nonEmptyLocalized(
      this.t('auto.0103.drag_files_here_or_click_to_select', 'Drag files here or click to select'),
      'Drag files here or click to select',
    );
  readonly panelTitleText = (): string =>
    nonEmptyLocalized(this.t('upload.panel.title', 'Upload Panel'), 'Upload Panel');
  readonly panelSubtitleText = (): string =>
    nonEmptyLocalized(
      this.t('upload.panel.subtitle', 'You can upload things here.'),
      'You can upload things here.',
    );
  readonly uploadFolderLabelText = (): string =>
    nonEmptyLocalized(this.t('auto.0367.upload_folder', 'Upload folder'), 'Upload folder');
  readonly takePhotoLabelText = (): string =>
    nonEmptyLocalized(this.t('auto.0349.take_photo', 'Take photo'), 'Take photo');

  readonly laneSwitchOptions = this.viewModel.laneSwitchOptions;
  readonly visibleLaneJobs = this.viewModel.visibleLaneJobs;
  readonly issueAttentionPulse = this.lifecycle.issueAttentionPulse;
  readonly fileTypeGroups = DEFAULT_FILE_TYPE_GROUPS;
  readonly defaultFileInputAccept = DEFAULT_UPLOAD_FILE_INPUT_ACCEPT;
  private readonly pinnedFileTypeGroupId = signal<UploadFileTypeGroupId | null>(null);
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
  readonly pendingLocationPickMediaId = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.visible()) {
        this.clearPinnedFileTypeGroup();
        this.pendingLocationPickMediaId.set(null);
      }
    });

    this.laneHandlers.register({
      clearSelection: () => this.selectedUploadJobIds.set(new Set()),
    });

    this.setup.initialize({
      destroyRef: this.destroyRef,
      imageUploaded: (event) => {
        if (this.pendingLocationPickMediaId() === event.id) {
          this.pendingLocationPickMediaId.set(null);
        }
        this.imageUploaded.emit(event);
      },
      placementRequested: (jobId) => this.placementRequested.emit(jobId),
      detailRequested: (mediaId) => this.detailRequested.emit(mediaId),
      zoomToLocationRequested: (event) => this.zoomToLocationRequested.emit(event),
      locationMapPickRequested: (event) => {
        this.pendingLocationPickMediaId.set(event.mediaId);
        this.locationMapPickRequested.emit(event);
      },
      locationPreviewRequested: (event) => this.locationPreviewRequested.emit(event),
      locationPreviewCleared: () => this.locationPreviewCleared.emit(),
      selectedUploadJobIds: this.selectedUploadJobIds,
      prioritizedUploadedJobIds: this.prioritizedUploadedJobIds,
      dismissFile: (jobId) => this.dismissFile(jobId),
    });
  }

  ngOnDestroy(): void {
    this.setup.clearHostCallbacks();
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

  onLocationModeRowPreviewStart(): void {
    this.locationModeRowPreview.set(true);
  }

  onLocationModeRowPreviewEnd(): void {
    this.locationModeRowPreview.set(false);
  }

  toggleLocationRequirementMode(): void {
    const next = alternateUploadLocationRequirementMode(this.locationRequirementMode());
    this.signals.setLocationRequirementMode(next);
    this.locationModeRowPreview.set(false);
  }

  onDropzoneClick(_event: MouseEvent, fileInput: HTMLInputElement): void {
    if (this.pinnedFileTypeGroupId()) {
      this.clearPinnedFileTypeGroup();
      return;
    }
    this.inputHandlers.openFilePicker(fileInput);
  }

  isFileTypeGroupExpanded(groupId: UploadFileTypeGroupId): boolean {
    return this.pinnedFileTypeGroupId() === groupId;
  }

  onPickFileTypeGroup(
    fileInput: HTMLInputElement,
    group: UploadFileTypeGroup,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    this.pinFileTypeGroup(group.id);
    this.inputHandlers.openFilePicker(fileInput, {
      extensions: group.members.map((member) => member.extension),
    });
  }

  onPickFileTypeMember(
    fileInput: HTMLInputElement,
    group: UploadFileTypeGroup,
    member: UploadFileTypeChip,
    event: MouseEvent,
  ): void {
    event.stopPropagation();
    this.pinFileTypeGroup(group.id);
    this.inputHandlers.openFilePicker(fileInput, { extensions: [member.extension] });
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.pinnedFileTypeGroupId()) {
      this.clearPinnedFileTypeGroup();
    }
  }

  private pinFileTypeGroup(groupId: UploadFileTypeGroupId): void {
    this.pinnedFileTypeGroupId.set(groupId);
  }

  private clearPinnedFileTypeGroup(): void {
    this.pinnedFileTypeGroupId.set(null);
  }

  fileTypeGroupPickAriaLabel(group: UploadFileTypeGroup): string {
    return fileTypeGroupPickAriaLabel(group, (key, fallback) => this.t(key, fallback));
  }

  fileTypeMemberPickAriaLabel(member: UploadFileTypeChip): string {
    return fileTypeMemberPickAriaLabel(member, (key, fallback) => this.t(key, fallback));
  }
}
