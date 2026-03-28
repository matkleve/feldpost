/**
 * UploadPanelComponent — drag-and-drop / file-picker upload UI.
 *
 * Ground rules:
 *  - Ultra-thin UI coordinator that delegates to injected services.
 *  - All signals & computed exposed via UploadPanelSignalsService
 *  - All subscriptions & lifecycle via UploadPanelLifecycleService
 *  - Component only bridges template events to services.
 */

import { Component, effect, inject, input, output, signal } from '@angular/core';
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
  UiTabDirective,
  UiTabListDirective,
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
    UiTabListDirective,
    UiTabDirective,
    UiButtonDirective,
    UiInputControlDirective,
    ProjectSelectDialogComponent,
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
  readonly dotItems = this.signals.dotItems;
  readonly scanning = this.signals.scanning;
  readonly scanningLabel = this.signals.scanningLabel;
  readonly hasAwaitingPlacement = this.signals.hasAwaitingPlacement;
  readonly showProgressBoard = this.signals.showProgressBoard;
  readonly showLastUpload = this.signals.showLastUpload;
  readonly lastUploadLabel = this.signals.lastUploadLabel;
  readonly isDragging = this.inputs.isDragging;
  readonly selectedLane = this.signals.selectedLane;
  readonly effectiveLane = this.signals.effectiveLane;
  readonly laneJobs = this.signals.laneJobs;
  readonly issueAttentionPulse = this.lifecycle.issueAttentionPulse;
  readonly fileTypeChips = DEFAULT_FILE_TYPE_CHIPS;
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

  private pendingProjectAssignmentJob = signal<UploadJob | null>(null);
  private pendingLocationAddressJob = signal<UploadJob | null>(null);
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
  onDotClick(jobId: string): void {
    this.lanes.onDotClick(jobId);
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

  async onMenuActionSelected(event: {
    job: UploadJob;
    action: UploadItemMenuAction;
  }): Promise<void> {
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

    if (event.action === 'change_location_map') {
      this.requestLocationPickOnMap(event.job);
      return;
    }

    if (event.action === 'change_location_address') {
      this.openLocationAddressDialog(event.job);
    }
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
    if (!job?.imageId) {
      this.onLocationAddressDialogClose();
      return;
    }

    const result = await this.mediaLocationUpdateService.updateFromAddressSuggestion(
      job.imageId,
      suggestion,
    );
    if (!result.ok || typeof result.lat !== 'number' || typeof result.lng !== 'number') {
      this.toastService.show({
        message: this.t(
          'upload.location.update.failed',
          'Standort konnte nicht aktualisiert werden.',
        ),
        type: 'error',
        dedupe: true,
      });
      return;
    }

    this.imageUploaded.emit({ id: job.imageId, lat: result.lat, lng: result.lng });
    this.toastService.show({
      message: this.t('upload.location.update.success', 'Standort wurde aktualisiert.'),
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

    if (!job?.imageId || !selected) {
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

  private async openProjectAssignmentForJob(job: UploadJob): Promise<void> {
    if (!job.imageId) {
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

  private requestLocationPickOnMap(job: UploadJob): void {
    if (!job.imageId) {
      return;
    }

    this.locationMapPickRequested.emit({ imageId: job.imageId, fileName: job.file.name });
    this.toastService.show({
      message: this.t(
        'upload.location.mapPick.hint',
        'Karte anklicken, um den Standort zu setzen.',
      ),
      type: 'info',
      dedupe: true,
    });
  }

  private openLocationAddressDialog(job: UploadJob): void {
    if (!job.imageId) {
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
}
