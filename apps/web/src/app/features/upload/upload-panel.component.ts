/**
 * UploadPanelComponent — drag-and-drop / file-picker upload UI.
 *
 * Ground rules:
 *  - Ultra-thin UI coordinator that delegates to injected services.
 *  - All signals & computed exposed via UploadPanelSignalsService
 *  - All subscriptions & lifecycle via UploadPanelLifecycleService
 *  - Component only bridges template events to services.
 */

import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UploadPanelItemComponent, type UploadItemMenuAction } from './upload-panel-item.component';
import type { ForwardGeocodeResult, GeocoderSearchResult } from '../../core/geocoding.service';
import { GeocodingService } from '../../core/geocoding.service';
import type { ExifCoords } from '../../core/upload/upload.service';
import {
  UploadManagerService,
  type UploadJob,
  type UploadPhase,
} from '../../core/upload/upload-manager.service';
import type { UploadLane } from './upload-phase.helpers';
import { UploadPanelSignalsService } from './upload-panel-signals.service';
import { UploadPanelLifecycleService } from './upload-panel-lifecycle.service';
import { UploadPanelInputHandlersService } from './upload-panel-input-handlers';
import { UploadPanelLaneHandlersService } from './upload-panel-lane-handlers';
import {
  UploadPanelRowHandlersService,
  type ZoomToLocationEvent,
} from './upload-panel-row-handlers';
import { UploadService } from '../../core/upload/upload.service';
import { documentFallbackLabel, trackByJobId } from './upload-panel-utils';
import {
  UiButtonDirective,
  UiInputControlDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';
import { ChipComponent, type ChipVariant } from '../../shared/components/chip/chip.component';
import { I18nService } from '../../core/i18n/i18n.service';
import { fileTypeBadge, resolveFileType } from '../../core/media/file-type-registry';
import { ToastService } from '../../core/toast.service';
import { MapProjectActionsService } from '../map/map-shell/map-project-actions.service';
import { MapProjectDialogService } from '../map/map-shell/map-project-dialog.service';
import {
  ProjectSelectDialogComponent,
  type ProjectSelectOption,
} from '../../shared/project-select-dialog/project-select-dialog.component';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { ProjectsService } from '../../core/projects/projects.service';
import { WorkspacePaneObserverAdapter } from '../../core/workspace-pane-observer.adapter';
import { WorkspaceSelectionService } from '../../core/workspace-selection.service';
import { MediaLocationUpdateService } from '../../core/media-location-update.service';
import { PaneFooterComponent } from '../../shared/pane-footer/pane-footer.component';
import {
  SegmentedSwitchComponent,
  type SegmentedSwitchOption,
} from '../../shared/segmented-switch/segmented-switch.component';
import { getIssueKind } from './upload-phase.helpers';

export interface ImageUploadedEvent {
  id: string;
  lat: number;
  lng: number;
  direction?: number;
  thumbnailUrl?: string;
}

export interface UploadLocationPreviewEvent {
  lat: number;
  lng: number;
}

export interface UploadLocationMapPickRequest {
  imageId: string;
  fileName: string;
}

type UploadFileTypeChip = {
  type: string;
  icon: string;
  variant: ChipVariant;
  order: number;
};

type DuplicateResolutionChoice = 'use_existing' | 'upload_anyway' | 'reject';

const UPLOAD_LANES = ['uploading', 'uploaded', 'issues'] as const;

const DEFAULT_FILE_TYPE_EXTENSIONS: ReadonlyArray<string> = [
  'jpg',
  'png',
  'heic',
  'webp',
  'mp4',
  'mov',
  'webm',
  'pdf',
  'docx',
  'odt',
  'odg',
  'txt',
  'xlsx',
  'ods',
  'csv',
  'pptx',
  'odp',
];

const DEFAULT_FILE_TYPE_CHIPS: ReadonlyArray<UploadFileTypeChip> = DEFAULT_FILE_TYPE_EXTENSIONS.map(
  (ext, index) => {
    const definition = resolveFileType({ extension: ext });
    return {
      type: fileTypeBadge({ extension: ext }) ?? ext.toUpperCase(),
      icon: definition.category === 'unknown' ? 'description' : definition.icon,
      variant: toChipVariant(definition.category),
      order: index + 1,
    };
  },
);

function toChipVariant(category: string): ChipVariant {
  switch (category) {
    case 'image':
      return 'filetype-image';
    case 'video':
      return 'filetype-video';
    case 'spreadsheet':
      return 'filetype-spreadsheet';
    case 'presentation':
      return 'filetype-presentation';
    case 'document':
      return 'filetype-document';
    default:
      return 'default';
  }
}

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
  private readonly uploadService = inject(UploadService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly mediaLocationUpdateService = inject(MediaLocationUpdateService);
  private readonly toastService = inject(ToastService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly projectsService = inject(ProjectsService);
  private readonly mapProjectActionsService = inject(MapProjectActionsService);
  private readonly mapProjectDialogService = inject(MapProjectDialogService);
  private readonly router = inject(Router);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
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

  readonly laneSwitchOptions = computed<SegmentedSwitchOption[]>(() => {
    const counts = this.laneCounts();
    return [
      {
        id: 'uploading',
        label: this.t('upload.panel.lane.uploading', 'Uploading'),
        icon: 'cloud_upload',
        type: 'icon-only',
        ariaLabel: `${this.t('upload.panel.lane.uploading', 'Uploading')} (${counts.uploading})`,
        title: this.t('upload.panel.lane.uploading', 'Uploading'),
      },
      {
        id: 'uploaded',
        label: this.t('upload.panel.lane.uploaded', 'Uploaded'),
        icon: 'check_circle',
        type: 'icon-only',
        ariaLabel: `${this.t('upload.panel.lane.uploaded', 'Uploaded')} (${counts.uploaded})`,
        title: this.t('upload.panel.lane.uploaded', 'Uploaded'),
      },
      {
        id: 'issues',
        label: this.t('upload.panel.lane.issues', 'Issues'),
        icon: 'warning_amber',
        type: 'icon-with-text',
        ariaLabel: `${this.t('upload.panel.lane.issues', 'Issues')} (${counts.issues})`,
        attention:
          this.issueAttentionPulse() && counts.issues > 0 && this.effectiveLane() !== 'issues',
      },
    ];
  });

  readonly visibleLaneJobs = computed(() => {
    const jobs = this.laneJobs();
    if (this.effectiveLane() !== 'uploaded') {
      return jobs;
    }

    const prioritizedIds = this.prioritizedUploadedJobIds();
    if (prioritizedIds.size === 0) {
      return jobs;
    }

    return [...jobs].sort((a, b) => {
      const aPrio = prioritizedIds.has(a.id) ? 1 : 0;
      const bPrio = prioritizedIds.has(b.id) ? 1 : 0;
      return bPrio - aPrio;
    });
  });
  readonly issueAttentionPulse = this.lifecycle.issueAttentionPulse;
  readonly fileTypeChips = DEFAULT_FILE_TYPE_CHIPS;
  readonly selectedUploadJobIds = signal<Set<string>>(new Set());
  readonly selectedUploadJobs = computed(() => {
    const selected = this.selectedUploadJobIds();
    if (selected.size === 0) {
      return [] as UploadJob[];
    }

    return this.jobs().filter((job) => selected.has(job.id));
  });
  readonly hasSelectedUploadJobs = computed(() => this.selectedUploadJobs().length > 0);
  readonly hasRetryableSelection = computed(() =>
    this.selectedUploadJobs().some((job) => this.isRetryableJob(job)),
  );
  readonly canDownloadSelectedUploads = computed(() => {
    const jobs = this.selectedUploadJobs();
    if (jobs.length === 0) {
      return false;
    }

    return jobs.every((job) => !!job.imageId && !!job.storagePath && this.canZoomToJob(job));
  });
  readonly projectSelectionDialogOpen = signal(false);
  readonly projectSelectionDialogTitle = signal(
    this.t('auto.0013.add_to_project', 'Add to project'),
  );
  readonly projectSelectionDialogMessage = signal('');
  readonly projectSelectionDialogOptions = signal<ReadonlyArray<ProjectSelectOption>>([]);
  readonly projectSelectionDialogSelectedId = signal<string | null>(null);
  readonly locationAddressDialogOpen = signal(false);
  readonly locationAddressDialogQuery = signal('');
  readonly locationAddressDialogLoading = signal(false);
  readonly locationAddressDialogSuggestions = signal<ForwardGeocodeResult[]>([]);
  readonly duplicateResolutionDialogOpen = signal(false);
  readonly duplicateResolutionApplyToBatch = signal(false);

  private pendingProjectAssignmentJob = signal<UploadJob | null>(null);
  private pendingLocationAddressJob = signal<UploadJob | null>(null);
  private pendingDuplicateResolutionJob = signal<UploadJob | null>(null);
  private locationAddressSearchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly projectDialogSignals = {
    projectSelectionDialogOpen: this.projectSelectionDialogOpen,
    projectSelectionDialogTitle: this.projectSelectionDialogTitle,
    projectSelectionDialogMessage: this.projectSelectionDialogMessage,
    projectSelectionDialogOptions: this.projectSelectionDialogOptions,
    projectSelectionDialogSelectedId: this.projectSelectionDialogSelectedId,
    projectNameDialogOpen: signal(false),
    projectNameDialogTitle: signal(''),
    projectNameDialogMessage: signal(''),
    projectNameDialogInitialValue: signal(''),
  };

  constructor() {
    effect(() => {
      const jobs = this.uploadManager.jobs();
      void jobs; // Track reactivity
    });

    effect(() => {
      const existingIds = new Set(this.jobs().map((job) => job.id));
      const selected = this.selectedUploadJobIds();
      if (selected.size === 0) {
        return;
      }

      const next = new Set<string>();
      for (const id of selected) {
        if (existingIds.has(id)) {
          next.add(id);
        }
      }

      if (next.size !== selected.size) {
        this.selectedUploadJobIds.set(next);
      }
    });

    // Bridge component outputs to lifecycle service
    this.lifecycle.setImageUploadedCallback((event) => this.imageUploaded.emit(event));
    this.lifecycle.setPlacementRequestedCallback((jobId) => this.placementRequested.emit(jobId));
    this.lifecycle.setAutoSwitchCallback(() => this.lanes.setSelectedLane('issues'));
    this.lifecycle.initializeSubscriptions();
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
    if (!value || !this.isUploadLane(value)) {
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
    this.selectedLane.set('uploading');
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
    this.selectedUploadJobIds.update((selected) => {
      const next = new Set(selected);
      if (event.selected) {
        next.add(event.jobId);
      } else {
        next.delete(event.jobId);
      }
      return next;
    });
  }

  clearSelectedUploads(): void {
    this.selectedUploadJobIds.set(new Set());
  }

  async retrySelectedUploads(): Promise<void> {
    for (const job of this.selectedUploadJobs()) {
      if (this.isRetryableJob(job)) {
        this.retryFile(job.id);
      }
    }
    this.clearSelectedUploads();
    this.selectedLane.set('uploading');
  }

  async downloadSelectedUploads(): Promise<void> {
    for (const job of this.selectedUploadJobs()) {
      if (job.imageId && job.storagePath && this.canZoomToJob(job)) {
        await this.downloadUploadedJob(job);
      }
    }
  }

  removeSelectedUploads(): void {
    for (const job of this.selectedUploadJobs()) {
      if (this.isTerminalJob(job.phase)) {
        this.dismissFile(job.id);
      } else {
        this.uploadManager.cancelJob(job.id);
      }
    }

    this.clearSelectedUploads();
  }

  async onMenuActionSelected(event: {
    job: UploadJob;
    action: UploadItemMenuAction;
  }): Promise<void> {
    if (event.action === 'view_progress' || event.action === 'view_file_details') {
      this.toastService.show({
        message: event.job.statusLabel,
        type: 'info',
        dedupe: true,
      });
      return;
    }

    if (event.action === 'open_existing_media') {
      await this.openExistingDuplicateInMedia(event.job);
      return;
    }

    if (event.action === 'upload_anyway') {
      this.openDuplicateResolutionDialog(event.job);
      return;
    }

    if (event.action === 'change_location_map') {
      this.requestLocationPickOnMap(event.job);
      return;
    }

    if (event.action === 'place_on_map') {
      const issueKind = getIssueKind(event.job);
      if (issueKind === 'missing_gps' || issueKind === 'document_unresolved') {
        this.placementRequested.emit(event.job.id);
        return;
      }
      this.requestLocationPickOnMap(event.job);
      return;
    }

    if (event.action === 'change_location_address') {
      this.openLocationAddressDialog(event.job);
      return;
    }

    if (event.action === 'retry') {
      this.retryFile(event.job.id);
      this.selectedLane.set('uploading');
      return;
    }

    if (event.action === 'open_project') {
      await this.openUploadedJobProject(event.job);
      return;
    }

    if (event.action === 'open_in_media') {
      await this.openUploadedJobInMedia(event.job);
      return;
    }

    if (event.action === 'add_to_project') {
      await this.openProjectAssignmentForJob(event.job);
      return;
    }

    if (event.action === 'download') {
      await this.downloadUploadedJob(event.job);
      return;
    }

    if (event.action === 'cancel_upload') {
      this.uploadManager.cancelJob(event.job.id);
      return;
    }

    if (event.action === 'remove_from_project') {
      await this.removeUploadedJobFromProject(event.job);
      return;
    }

    if (event.action === 'dismiss') {
      this.dismissFile(event.job.id);
      return;
    }

    if (event.action === 'toggle_priority') {
      this.toggleJobPriority(event.job);
    }
  }

  isJobPrioritized(job: UploadJob): boolean {
    return this.prioritizedUploadedJobIds().has(job.id);
  }

  onLocationAddressDialogQueryInput(query: string): void {
    this.locationAddressDialogQuery.set(query);
    if (this.locationAddressSearchTimeout) {
      clearTimeout(this.locationAddressSearchTimeout);
      this.locationAddressSearchTimeout = null;
    }

    if (!query.trim()) {
      this.locationAddressDialogLoading.set(false);
      this.locationAddressDialogSuggestions.set([]);
      this.locationPreviewCleared.emit();
      return;
    }

    this.locationAddressSearchTimeout = setTimeout(() => {
      void this.searchLocationAddress(query);
    }, 280);
  }

  onLocationAddressDialogClose(): void {
    this.locationAddressDialogOpen.set(false);
    this.locationAddressDialogQuery.set('');
    this.locationAddressDialogSuggestions.set([]);
    this.pendingLocationAddressJob.set(null);
    this.locationPreviewCleared.emit();
  }

  onLocationAddressSuggestionHover(suggestion: ForwardGeocodeResult): void {
    this.locationPreviewRequested.emit({ lat: suggestion.lat, lng: suggestion.lng });
  }

  onLocationAddressSuggestionHoverEnd(): void {
    this.locationPreviewCleared.emit();
  }

  async onLocationAddressSuggestionApply(suggestion: ForwardGeocodeResult): Promise<void> {
    const job = this.pendingLocationAddressJob();
    if (!job) {
      this.onLocationAddressDialogClose();
      return;
    }

    if (!job.imageId && job.phase === 'missing_data') {
      this.placeFile(job.id, { lat: suggestion.lat, lng: suggestion.lng });
      this.toastService.show({
        message: this.t('upload.location.update.success', 'Location updated.'),
        type: 'success',
        dedupe: true,
      });
      this.onLocationAddressDialogClose();
      return;
    }

    if (!job.imageId) {
      this.onLocationAddressDialogClose();
      return;
    }

    const result = await this.mediaLocationUpdateService.updateFromAddressSuggestion(
      job.imageId,
      suggestion,
    );
    if (!result.ok || typeof result.lat !== 'number' || typeof result.lng !== 'number') {
      this.toastService.show({
        message: this.t('upload.location.update.failed', 'Location could not be updated.'),
        type: 'error',
        dedupe: true,
      });
      return;
    }

    this.imageUploaded.emit({ id: job.imageId, lat: result.lat, lng: result.lng });
    this.toastService.show({
      message: this.t('upload.location.update.success', 'Location updated.'),
      type: 'success',
      dedupe: true,
    });
    this.onLocationAddressDialogClose();
  }

  onProjectSelectionDialogSelected(projectId: string): void {
    this.mapProjectDialogService.setProjectSelectionSelectedId(
      this.projectDialogSignals,
      projectId,
    );
  }

  async onProjectSelectionDialogConfirmed(projectId: string): Promise<void> {
    const job = this.pendingProjectAssignmentJob();
    const selected =
      this.projectSelectionDialogOptions().find((option) => option.id === projectId) ?? null;
    this.mapProjectDialogService.confirmProjectSelection(this.projectDialogSignals, projectId);

    if (!job || !selected) {
      this.pendingProjectAssignmentJob.set(null);
      return;
    }

    if (!job.imageId && job.phase === 'missing_data') {
      this.uploadManager.assignJobToProject(job.id, projectId);
      this.toastService.show({
        message: this.mapProjectActionsService.formatProjectAssignmentSuccess(selected.name, 1),
        type: 'success',
        dedupe: true,
      });
      this.pendingProjectAssignmentJob.set(null);
      this.selectedLane.set('uploading');
      return;
    }

    if (!job.imageId) {
      this.pendingProjectAssignmentJob.set(null);
      return;
    }

    const ok = await this.projectsService.addMediaToProject(job.imageId, projectId);
    if (ok) {
      this.toastService.show({
        message: this.mapProjectActionsService.formatProjectAssignmentSuccess(selected.name, 1),
        type: 'success',
        dedupe: true,
      });
    } else {
      this.toastService.show({
        message: this.t(
          'workspace.imageDetail.toast.membershipUpdateFailed',
          'Could not update project memberships.',
        ),
        type: 'error',
        dedupe: true,
      });
    }

    this.pendingProjectAssignmentJob.set(null);
  }

  onProjectSelectionDialogCancelled(): void {
    this.mapProjectDialogService.cancelProjectSelection(this.projectDialogSignals);
    this.pendingProjectAssignmentJob.set(null);
  }

  onDuplicateResolutionApplyToBatchChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.duplicateResolutionApplyToBatch.set(target.checked);
  }

  async onDuplicateResolutionChoice(choice: DuplicateResolutionChoice): Promise<void> {
    const job = this.pendingDuplicateResolutionJob();
    if (!job) {
      this.closeDuplicateResolutionDialog();
      return;
    }

    const jobs = this.resolveDuplicateResolutionTargets(
      job,
      this.duplicateResolutionApplyToBatch(),
    );

    if (choice === 'upload_anyway') {
      for (const entry of jobs) {
        this.uploadManager.forceDuplicateUpload(entry.id);
      }
      this.selectedLane.set('uploading');
      this.closeDuplicateResolutionDialog();
      return;
    }

    if (choice === 'use_existing') {
      await this.openExistingDuplicateInMedia(job);
      for (const entry of jobs) {
        this.dismissFile(entry.id);
      }
      this.closeDuplicateResolutionDialog();
      return;
    }

    for (const entry of jobs) {
      this.dismissFile(entry.id);
    }
    this.closeDuplicateResolutionDialog();
  }

  private async openProjectAssignmentForJob(job: UploadJob): Promise<void> {
    if (!job.imageId && job.phase !== 'missing_data') {
      return;
    }

    const optionsResult = await this.mapProjectActionsService.loadProjectOptions(
      this.supabaseService.client,
    );
    if (!optionsResult.ok) {
      this.toastService.show({
        message: this.t('map.shell.toast.projectAssignmentFailed', 'Project assignment failed.'),
        type: optionsResult.reason === 'empty' ? 'warning' : 'error',
        dedupe: true,
      });
      return;
    }

    this.pendingProjectAssignmentJob.set(job);
    void this.mapProjectDialogService.openProjectSelectionDialog(
      this.projectDialogSignals,
      optionsResult.options,
      this.t('auto.0013.add_to_project', 'Add to project'),
      job.file.name,
    );
  }

  private openDuplicateResolutionDialog(job: UploadJob): void {
    this.pendingDuplicateResolutionJob.set(job);
    this.duplicateResolutionApplyToBatch.set(false);
    this.duplicateResolutionDialogOpen.set(true);
  }

  private closeDuplicateResolutionDialog(): void {
    this.pendingDuplicateResolutionJob.set(null);
    this.duplicateResolutionApplyToBatch.set(false);
    this.duplicateResolutionDialogOpen.set(false);
  }

  private resolveDuplicateResolutionTargets(
    seed: UploadJob,
    applyToBatch: boolean,
  ): ReadonlyArray<UploadJob> {
    if (!applyToBatch || !seed.existingImageId) {
      return [seed];
    }

    return this.jobs().filter(
      (job) => job.phase === 'skipped' && job.existingImageId === seed.existingImageId,
    );
  }

  private async downloadUploadedJob(job: UploadJob): Promise<void> {
    if (!job.storagePath) {
      this.toastService.show({
        message: 'Download nicht verfuegbar.',
        type: 'warning',
        dedupe: true,
      });
      return;
    }

    const result = await this.uploadService.getSignedUrl(job.storagePath);
    if (!('url' in result)) {
      this.toastService.show({
        message:
          typeof result.error === 'string'
            ? result.error
            : result.error instanceof Error
              ? result.error.message
              : 'Download fehlgeschlagen.',
        type: 'error',
        dedupe: true,
      });
      return;
    }

    if (typeof document === 'undefined') {
      return;
    }

    const link = document.createElement('a');
    link.href = result.url;
    link.download = job.file.name;
    link.rel = 'noopener';
    link.click();
  }

  private async openUploadedJobInMedia(job: UploadJob): Promise<void> {
    if (!job.imageId) {
      return;
    }

    this.workspaceSelectionService.setSingle(job.imageId);
    this.workspacePaneObserver.setDetailImageId(job.imageId);
    this.workspacePaneObserver.setOpen(true);

    await this.router.navigate(['/media']);
  }

  private async openExistingDuplicateInMedia(job: UploadJob): Promise<void> {
    if (!job.existingImageId) {
      return;
    }

    this.workspaceSelectionService.setSingle(job.existingImageId);
    this.workspacePaneObserver.setDetailImageId(job.existingImageId);
    this.workspacePaneObserver.setOpen(true);

    await this.router.navigate(['/media']);
  }

  private async openUploadedJobProject(job: UploadJob): Promise<void> {
    if (!job.projectId) {
      this.toastService.show({
        message: this.t('upload.item.menu.project.unavailable', 'No project assigned.'),
        type: 'warning',
        dedupe: true,
      });
      return;
    }

    await this.router.navigate(['/projects', job.projectId]);
  }

  private async removeUploadedJobFromProject(job: UploadJob): Promise<void> {
    if (!job.imageId || !job.projectId) {
      this.toastService.show({
        message: this.t('upload.item.menu.project.unavailable', 'No project assigned.'),
        type: 'warning',
        dedupe: true,
      });
      return;
    }

    const ok = await this.projectsService.removeMediaFromProject(job.imageId, job.projectId);
    if (!ok) {
      this.toastService.show({
        message: this.t('upload.item.menu.project.remove.failed', 'Could not remove from project.'),
        type: 'error',
        dedupe: true,
      });
      return;
    }

    this.toastService.show({
      message: this.t('upload.item.menu.project.remove.success', 'Removed from project.'),
      type: 'success',
      dedupe: true,
    });
    this.dismissFile(job.id);
  }

  private toggleJobPriority(job: UploadJob): void {
    if (!job.imageId) {
      return;
    }

    const next = new Set(this.prioritizedUploadedJobIds());
    const had = next.has(job.id);
    if (had) {
      next.delete(job.id);
    } else {
      next.add(job.id);
    }
    this.prioritizedUploadedJobIds.set(next);

    this.toastService.show({
      message: had
        ? this.t('upload.item.menu.priority.removedToast', 'Priority removed.')
        : this.t('upload.item.menu.priority.addedToast', 'Upload prioritized.'),
      type: 'success',
      dedupe: true,
    });
  }

  private isRetryableJob(job: UploadJob): boolean {
    return job.phase === 'error' || job.phase === 'missing_data' || job.phase === 'skipped';
  }

  private isTerminalJob(phase: UploadPhase): boolean {
    return (
      phase === 'complete' || phase === 'error' || phase === 'missing_data' || phase === 'skipped'
    );
  }

  private requestLocationPickOnMap(job: UploadJob): void {
    if (!job.imageId) {
      return;
    }

    this.locationMapPickRequested.emit({ imageId: job.imageId, fileName: job.file.name });
    this.toastService.show({
      message: this.t('upload.location.mapPick.hint', 'Click on the map to set the location.'),
      type: 'info',
      dedupe: true,
    });
  }

  private openLocationAddressDialog(job: UploadJob): void {
    if (!job.imageId && job.phase !== 'missing_data') {
      return;
    }

    this.pendingLocationAddressJob.set(job);
    this.locationAddressDialogQuery.set('');
    this.locationAddressDialogSuggestions.set([]);
    this.locationAddressDialogLoading.set(false);
    this.locationAddressDialogOpen.set(true);
  }

  private async searchLocationAddress(query: string): Promise<void> {
    const normalized = query.trim();
    if (!normalized) {
      this.locationAddressDialogSuggestions.set([]);
      this.locationAddressDialogLoading.set(false);
      return;
    }

    this.locationAddressDialogLoading.set(true);
    const results = await this.geocodingService.search(normalized, { limit: 6 });
    this.locationAddressDialogLoading.set(false);
    this.locationAddressDialogSuggestions.set(this.mapSearchResultsToForwardSuggestions(results));
  }

  private mapSearchResultsToForwardSuggestions(
    results: readonly GeocoderSearchResult[],
  ): ForwardGeocodeResult[] {
    return results
      .map((result) => {
        if (!Number.isFinite(result.lat) || !Number.isFinite(result.lng)) {
          return null;
        }

        const address = result.address;
        return {
          lat: result.lat,
          lng: result.lng,
          addressLabel: result.displayName,
          city: address?.city ?? address?.town ?? address?.village ?? address?.municipality ?? null,
          district: null,
          street: address?.road ?? null,
          streetNumber: address?.house_number ?? null,
          zip: address?.postcode ?? null,
          country: address?.country ?? null,
        } as ForwardGeocodeResult;
      })
      .filter((entry): entry is ForwardGeocodeResult => entry !== null);
  }

  private isUploadLane(value: string): value is UploadLane {
    return (UPLOAD_LANES as readonly string[]).includes(value);
  }
}
