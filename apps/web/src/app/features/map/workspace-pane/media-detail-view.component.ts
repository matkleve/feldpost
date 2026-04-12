import {
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { filter } from 'rxjs';
import { DateSaveEvent } from './captured-date-editor.component';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { MetadataService } from '../../../core/metadata/metadata.service';
import { UploadService, ALLOWED_MIME_TYPES } from '../../../core/upload/upload.service';
import { ProjectsService } from '../../../core/projects/projects.service';
import {
  ImageAttachedEvent,
  ImageReplacedEvent,
  UploadFailedEvent,
  UploadManagerService,
} from '../../../core/upload/upload-manager.service';
import { WorkspaceViewService } from '../../../core/workspace-view/workspace-view.service';
import { ToastService } from '../../../core/toast/toast.service';
import {
  MEDIA_NO_MEDIA_ICON,
  MEDIA_PLACEHOLDER_ICON,
  MediaDownloadService,
} from '../../../core/media-download/media-download.service';
import type { MediaTier } from '../../../core/media/media-renderer.types';
import type { MediaLoadState } from '../../../core/media-download/media-download.types';
import { ForwardGeocodeResult } from '../../../core/geocoding/geocoding.service';
import {
  DetailEditingField,
  ImageRecord,
  MetadataEntry,
  SelectOption,
} from './media-detail-view.types';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { QuickInfoChipsComponent } from '../../../shared/quick-info-chips/quick-info-chips.component';
import { MetadataSectionComponent } from './metadata-section/metadata-section.component';
import { DetailActionsComponent } from './detail-actions/detail-actions.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import {
  buildInfoChips,
  canCreateProjectOption,
  filterProjectOptions,
  formatCaptureDate,
  formatCoordinate,
  formatUploadDate,
  isImageLikeMedia,
  resolveDisplayTitle,
  resolveFullAddress,
  resolveMediaTypeLabel,
  resolveProjectName,
} from './media-detail-view.utils';
import { ImageDetailHeaderComponent } from './media-detail-header/media-detail-header.component';
import { MediaDetailMediaViewerComponent } from './media-detail-media-viewer/media-detail-media-viewer.component';
import { ImageDetailInlineSectionComponent } from './media-detail-inline-section/media-detail-inline-section.component';
import { ImageDetailProjectMembershipHelper } from './media-detail-project-membership.helper';
import { ImageDetailDataFacade } from './media-detail-data.facade';
import { ImageDetailMetadataHelper } from './media-detail-metadata.helper';
import { ImageDetailFieldsHelper } from './media-detail-fields.helper';
import { MediaDetailMediaEventsHelper } from './media-detail-media-events.helper';
import { ImageDetailUploadHelper } from './media-detail-upload.helper';
import { ImageDetailDeleteHelper } from './media-detail-delete.helper';
import { ActionEngineService } from '../../action-system/action-engine.service';
import { ACTION_CONTEXT_IDS } from '../../action-system/action-context-ids';
import type { ResolvedAction } from '../../action-system/action-types';
import { WORKSPACE_SINGLE_ACTION_DEFINITIONS } from './workspace-detail-actions.registry';
import type { WorkspaceSingleActionId } from './workspace-detail-actions.types';
import type { UploadLocationMapPickRequest } from '../../upload/upload-panel.component';
import { WorkspaceSelectionService } from '../../../core/workspace-selection/workspace-selection.service';
import { WorkspacePaneObserverAdapter } from '../../../core/workspace-pane-observer.adapter';
import { LocationResolverService } from '../../../core/location-resolver/location-resolver.service';

export type { ImageRecord, MetadataEntry } from './media-detail-view.types';

@Component({
  selector: 'app-media-detail-view',
  standalone: true,
  imports: [
    ConfirmDialogComponent,
    QuickInfoChipsComponent,
    MetadataSectionComponent,
    DetailActionsComponent,
    ImageDetailHeaderComponent,
    MediaDetailMediaViewerComponent,
    ImageDetailInlineSectionComponent,
  ],
  templateUrl: './media-detail-view.component.html',
  styleUrl: './media-detail-view.component.scss',
  host: {
    '[style.--placeholder-icon]': 'placeholderIconUrl',
    '[style.--no-photo-icon]': 'noPhotoIconUrl',
  },
})
export class MediaDetailViewComponent implements OnDestroy {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly placeholderIconUrl = `url("${MEDIA_PLACEHOLDER_ICON}")`;
  readonly noPhotoIconUrl = `url("${MEDIA_NO_MEDIA_ICON}")`;

  private readonly supabaseService = inject(SupabaseService);
  private readonly metadataService = inject(MetadataService);
  private readonly uploadService = inject(UploadService);
  private readonly uploadManager = inject(UploadManagerService);
  private readonly workspaceView = inject(WorkspaceViewService);
  private readonly mediaDownloadService = inject(MediaDownloadService);
  private readonly mediaOrchestrator = inject(MediaDownloadService);
  private readonly toastService = inject(ToastService);
  private readonly projectsService = inject(ProjectsService);
  private readonly actionEngineService = inject(ActionEngineService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  private readonly locationResolverService = inject(LocationResolverService);
  private readonly router = inject(Router);

  readonly mediaId = input<string | null>(null);
  readonly addressSearchRequestImageId = input<string | null>(null);
  readonly addressSearchRequestId = input(0);
  readonly closed = output<void>();
  readonly addressSearchRequestConsumed = output<number>();
  readonly zoomToLocationRequested = output<{
    mediaId: string;
    lat: number;
    lng: number;
    zoomMode?: 'house' | 'street';
  }>();
  readonly locationMapPickRequested = output<UploadLocationMapPickRequest>();

  readonly media = signal<ImageRecord | null>(null);
  readonly metadata = signal<MetadataEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showContextMenu = signal(false);
  readonly showDeleteConfirm = signal(false);
  readonly saving = signal(false);
  readonly projectOptions = signal<SelectOption[]>([]);
  readonly selectedProjectIds = signal<Set<string>>(new Set());
  readonly mediaItemId = signal<string | null>(null);
  readonly mediaType = signal<string | null>(null);
  readonly mediaMimeType = signal<string | null>(null);
  readonly mediaLocationStatus = signal<string | null>(null);
  readonly projectSearch = signal('');
  readonly editingField = signal<DetailEditingField>(null);
  readonly fullResUrl = signal<string | null>(null);
  readonly thumbnailUrl = signal<string | null>(null);
  readonly allMetadataKeyNames = signal<string[]>([]);
  readonly fullResPreloaded = signal(false);
  readonly detailSlotWidthRem = signal<number | null>(null);
  readonly detailSlotHeightRem = signal<number | null>(null);
  readonly replaceError = signal<string | null>(null);
  readonly editDate = signal('');
  readonly editTime = signal('');
  readonly acceptTypes = Array.from(ALLOWED_MIME_TYPES).join(',');
  private readonly activeJobId = signal<string | null>(null);

  private abortController: AbortController | null = null;
  private lastAddressSearchRequestId = 0;
  private readonly pendingLocationRetryAttempted = new Set<string>();

  readonly thumbState = computed<MediaLoadState>(() => {
    const id = this.mediaId();
    return id ? this.mediaDownloadService.getLoadState(id, 'thumb')() : 'idle';
  });

  readonly fullState = computed<MediaLoadState>(() => {
    const id = this.mediaId();
    return id ? this.mediaDownloadService.getLoadState(id, 'full')() : 'idle';
  });

  readonly image = this.media;

  readonly hasPhoto = computed(() => !!this.media()?.storage_path);

  readonly replacing = computed(() => {
    const jobId = this.activeJobId();
    if (!jobId) return false;
    const job = this.uploadManager.jobs().find((candidate) => candidate.id === jobId);
    return !!job && job.phase !== 'complete' && job.phase !== 'error' && job.phase !== 'skipped';
  });

  readonly isCorrected = computed(() => {
    const media = this.media();
    if (!media || media.latitude == null || media.exif_latitude == null) return false;
    return media.latitude !== media.exif_latitude || media.longitude !== media.exif_longitude;
  });

  readonly hasCoordinates = computed(() => {
    const media = this.media();
    return media?.latitude != null && media?.longitude != null;
  });

  readonly hasAddress = computed(() => this.fullAddress().trim().length > 0);

  readonly displayTitle = computed(() => resolveDisplayTitle(this.media(), this.t));

  readonly mediaTypeLabel = computed(() =>
    resolveMediaTypeLabel(this.media(), this.mediaType(), this.mediaMimeType(), this.t),
  );

  readonly detailViewLabel = computed(
    () => `${this.mediaTypeLabel()} ${this.t('workspace.mediaDetail.detailsSuffix', 'details')}`,
  );

  readonly captureDate = computed(() => formatCaptureDate(this.media(), this.i18nService.locale()));

  readonly uploadDate = computed(() => formatUploadDate(this.media(), this.i18nService.locale()));

  readonly projectName = computed(() => {
    const media = this.media();
    return resolveProjectName(
      this.projectOptions(),
      this.selectedProjectIds(),
      media?.project_id ?? null,
    );
  });

  readonly filteredProjectOptions = computed(() =>
    filterProjectOptions(this.projectOptions(), this.projectSearch()),
  );

  readonly projectCanCreate = computed(() =>
    canCreateProjectOption(
      this.projectSearch(),
      this.projectOptions(),
      this.canAssignMultipleProjects(),
      this.selectedProjectIds().size,
    ),
  );

  readonly isGpsAssignmentLocked = computed(() => {
    if (this.mediaType() === 'document') return true;
    const mime = this.mediaMimeType();
    if (!mime) return false;
    return (
      mime === 'application/pdf' ||
      mime === 'media/tiff' ||
      mime === 'application/msword' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  readonly canAssignMultipleProjects = computed(() => true);

  readonly fullAddress = computed(() => resolveFullAddress(this.media()));

  readonly isMediaLoading = computed(() => {
    const thumb = this.thumbState();
    const full = this.fullState();
    if (thumb === 'no-media') return false;
    if (thumb === 'error' && full === 'error') return false;
    if (thumb === 'loaded' || this.fullResPreloaded()) return false;
    return true;
  });

  readonly isImageLoading = this.isMediaLoading;

  readonly mediaReady = computed(() => {
    if (this.fullResPreloaded()) return true;
    return this.thumbState() === 'loaded' && !!this.thumbnailUrl();
  });

  readonly imageReady = computed(() => this.mediaReady());

  readonly canOpenLightbox = computed(() => {
    if (!(this.fullResUrl() || this.thumbnailUrl())) return false;
    return isImageLikeMedia(
      this.mediaType(),
      this.mediaMimeType(),
      this.media()?.storage_path ?? null,
    );
  });

  readonly requestedDetailTier = computed<MediaTier>(() => 'full');

  readonly effectiveDetailTier = computed<MediaTier>(() =>
    this.mediaOrchestrator.selectRequestedTierForSlot({
      requestedTier: this.requestedDetailTier(),
      slotWidthRem: this.detailSlotWidthRem(),
      slotHeightRem: this.detailSlotHeightRem(),
      context: 'detail',
    }),
  );

  readonly infoChips = computed(() =>
    buildInfoChips({
      image: this.media(),
      projectName: this.projectName(),
      selectedProjectCount: this.selectedProjectIds().size,
      captureDate: this.captureDate(),
      isCorrected: this.isCorrected(),
      t: this.t,
    }),
  );

  readonly workspaceSingleActions = computed<
    ReadonlyArray<ResolvedAction<WorkspaceSingleActionId>>
  >(() =>
    // Spec link: docs/element-specs/media-detail-actions.md -> action surface parity in detail menus.
    this.actionEngineService.resolveActions(WORKSPACE_SINGLE_ACTION_DEFINITIONS, {
      contextType: ACTION_CONTEXT_IDS.wsFooter,
      hasCoordinates: this.hasCoordinates(),
      hasAddress: this.hasAddress(),
    }),
  );

  readonly workspaceHeaderActions = computed(() => this.workspaceSingleActions());

  private readonly projectMembershipHelper = new ImageDetailProjectMembershipHelper({
    supabase: this.supabaseService,
    projectsService: this.projectsService,
    toastService: this.toastService,
    t: this.t,
    media: this.media,
    selectedProjectIds: this.selectedProjectIds,
    mediaItemId: this.mediaItemId,
    mediaType: this.mediaType,
    mediaMimeType: this.mediaMimeType,
    mediaLocationStatus: this.mediaLocationStatus,
    projectOptions: this.projectOptions,
    projectSearch: this.projectSearch,
    canAssignMultipleProjects: () => this.canAssignMultipleProjects(),
  });

  private readonly dataFacade = new ImageDetailDataFacade({
    services: {
      supabase: this.supabaseService,
      metadata: this.metadataService,
      mediaDownloadService: this.mediaDownloadService,
      projectMemberships: this.projectMembershipHelper,
    },
    signals: {
      image: this.media,
      metadata: this.metadata,
      loading: this.loading,
      error: this.error,
      fullResPreloaded: this.fullResPreloaded,
      fullResUrl: this.fullResUrl,
      thumbnailUrl: this.thumbnailUrl,
      projectOptions: this.projectOptions,
      allMetadataKeyNames: this.allMetadataKeyNames,
    },
    computed: {
      mediaType: () => this.mediaType(),
      mediaMimeType: () => this.mediaMimeType(),
      detailTier: () => this.effectiveDetailTier(),
    },
  });

  private readonly metadataHelper = new ImageDetailMetadataHelper({
    services: {
      metadata: this.metadataService,
    },
    signals: {
      image: this.media,
      imageId: () => this.mediaId(),
      metadata: this.metadata,
      saving: this.saving,
    },
  });

  private readonly fieldsHelper = new ImageDetailFieldsHelper({
    services: {
      supabase: this.supabaseService,
      toastService: this.toastService,
    },
    signals: {
      image: this.media,
      editingField: this.editingField,
      saving: this.saving,
      editDate: this.editDate,
      editTime: this.editTime,
    },
    helpers: {
      t: this.t,
    },
  });

  private readonly mediaEventsHelper = new MediaDetailMediaEventsHelper({
    services: {
      mediaDownloadService: this.mediaDownloadService,
      workspaceView: this.workspaceView,
      toastService: this.toastService,
    },
    signals: {
      image: this.media,
      fullResPreloaded: this.fullResPreloaded,
      activeJobId: this.activeJobId,
    },
    callbacks: {
      reloadSignedUrlsForCurrentMedia: () => this.reloadSignedUrlsForCurrentMedia(),
      t: this.t,
    },
  });

  private readonly uploadHelper = new ImageDetailUploadHelper({
    services: {
      uploadService: this.uploadService,
      uploadManager: this.uploadManager,
    },
    signals: {
      image: this.media,
      replaceError: this.replaceError,
      activeJobId: this.activeJobId,
    },
    callbacks: {
      findJobForFailure: (event) => {
        const job = this.uploadManager.jobs().find((candidate) => candidate.id === event.jobId);
        return job?.targetImageId === this.mediaId();
      },
    },
  });

  private readonly deleteHelper = new ImageDetailDeleteHelper({
    services: {
      supabase: this.supabaseService,
    },
    signals: {
      imageId: () => this.mediaId(),
      showDeleteConfirm: this.showDeleteConfirm,
      showContextMenu: this.showContextMenu,
    },
    callbacks: {
      onDeleted: () => this.closed.emit(),
    },
  });

  constructor() {
    effect(() => {
      const id = this.mediaId();
      if (id) {
        void this.loadMedia(id);
      } else {
        this.reset();
      }
    });

    effect(() => {
      const requestId = this.addressSearchRequestId();
      const requestImageId = this.addressSearchRequestImageId();
      const currentImageId = this.mediaId();
      if (
        requestId <= 0 ||
        requestId === this.lastAddressSearchRequestId ||
        !requestImageId ||
        requestImageId !== currentImageId
      ) {
        return;
      }

      this.lastAddressSearchRequestId = requestId;
      this.openAddressSearch();
      this.addressSearchRequestConsumed.emit(requestId);
    });

    this.uploadManager.imageReplaced$
      .pipe(
        takeUntilDestroyed(),
        filter((event) => event.imageId === this.mediaId()),
      )
      .subscribe((event) => void this.handleImageReplaced(event));

    this.uploadManager.imageAttached$
      .pipe(
        takeUntilDestroyed(),
        filter((event) => event.imageId === this.mediaId()),
      )
      .subscribe((event) => void this.handleImageAttached(event));

    this.uploadManager.uploadFailed$
      .pipe(
        takeUntilDestroyed(),
        filter((event: UploadFailedEvent) => this.uploadHelper.shouldHandleUploadFailure(event)),
      )
      .subscribe((event) => {
        this.toastService.show({
          message: this.uploadHelper.handleUploadFailed(event),
          type: 'error',
          dedupe: true,
        });
      });
  }

  ngOnDestroy(): void {
    this.abortController?.abort();
  }

  private reset(): void {
    this.media.set(null);
    this.metadata.set([]);
    this.selectedProjectIds.set(new Set());
    this.mediaItemId.set(null);
    this.mediaType.set(null);
    this.mediaMimeType.set(null);
    this.mediaLocationStatus.set(null);
    this.projectSearch.set('');
    this.fullResPreloaded.set(false);
    this.fullResUrl.set(null);
    this.thumbnailUrl.set(null);
    this.error.set(null);
    this.loading.set(false);
    this.saving.set(false);
    this.showContextMenu.set(false);
    this.showDeleteConfirm.set(false);
    this.editingField.set(null);
    this.activeJobId.set(null);
    this.replaceError.set(null);
    this.pendingLocationRetryAttempted.clear();
  }

  private async loadMedia(id: string): Promise<void> {
    this.abortController?.abort();
    this.abortController = new AbortController();
    await this.dataFacade.loadImage(id, this.abortController.signal);
    if (this.abortController.signal.aborted) {
      return;
    }

    await this.retryPendingLocationOnceOnOpen(id, this.abortController.signal);
  }

  private async reloadSignedUrlsForCurrentMedia(): Promise<void> {
    const media = this.media();
    if (!media?.storage_path) return;
    const signal = this.abortController?.signal ?? new AbortController().signal;
    await this.dataFacade.loadSignedUrls(media, signal);
  }

  onDetailSlotMeasured(slot: { widthRem: number; heightRem: number }): void {
    this.detailSlotWidthRem.set(slot.widthRem);
    this.detailSlotHeightRem.set(slot.heightRem);
  }

  close(): void {
    this.closed.emit();
  }

  async toggleProjectMembership(projectId: string): Promise<void> {
    await this.projectMembershipHelper.toggleProjectMembership(projectId);
  }

  setProjectSearch(value: string): void {
    this.projectMembershipHelper.setProjectSearch(value);
  }

  async createProjectFromSearch(): Promise<void> {
    await this.projectMembershipHelper.createProjectFromSearch();
  }

  async saveImageField(field: string, newValue: string): Promise<void> {
    await this.fieldsHelper.saveImageField(field, newValue);
  }

  async saveMetadata(entry: MetadataEntry, newValue: string): Promise<void> {
    await this.metadataHelper.saveMetadata(entry, newValue);
  }

  async addMetadata(keyName: string, value: string): Promise<void> {
    await this.metadataHelper.addMetadata(keyName, value);
  }

  async removeMetadata(entry: MetadataEntry): Promise<void> {
    await this.metadataHelper.removeMetadata(entry);
  }

  zoomToLocation(zoomMode: 'house' | 'street' = 'street'): void {
    const media = this.media();
    if (!media || media.latitude == null || media.longitude == null) return;
    // Spec link: docs/element-specs/media-detail-actions.md -> separate zoom_house and zoom_street behaviors.
    this.zoomToLocationRequested.emit({
      mediaId: media.id,
      lat: media.latitude,
      lng: media.longitude,
      zoomMode,
    });
  }

  async revertCoordinatesToExif(): Promise<void> {
    await this.fieldsHelper.revertCoordinatesToExif();
  }

  confirmDelete(): void {
    this.deleteHelper.confirmDelete();
  }

  async executeDelete(): Promise<void> {
    await this.deleteHelper.executeDelete();
  }

  cancelDelete(): void {
    this.deleteHelper.cancelDelete();
  }

  toggleContextMenu(): void {
    this.showContextMenu.update((value) => !value);
  }

  closeContextMenu(): void {
    this.showContextMenu.set(false);
  }

  copyCoordinates(): void {
    const media = this.media();
    if (!media || media.latitude == null || media.longitude == null) return;
    const text = `${media.latitude.toFixed(6)}, ${media.longitude.toFixed(6)}`;
    navigator.clipboard.writeText(text).catch(() => {
      /* clipboard may be unavailable */
    });
    this.toastService.show({
      message: this.t('workspace.mediaDetail.toast.coordinatesCopied', 'Coordinates copied'),
      type: 'info',
      duration: 2000,
    });
    this.showContextMenu.set(false);
  }

  onWorkspaceSingleActionSelected(actionId: WorkspaceSingleActionId): void {
    this.closeContextMenu();
    switch (actionId) {
      case 'open_details_or_selection':
        this.showAlreadyOpenDetailsInfo();
        return;
      case 'open_in_media':
        void this.openInMedia();
        return;
      case 'zoom_house':
        this.zoomToLocation('house');
        return;
      case 'zoom_street':
        this.zoomToLocation('street');
        return;
      case 'assign_to_project':
        this.openProjectPicker();
        return;
      case 'resolve_location':
        void this.resolveLocationFromContextAction();
        return;
      case 'change_location_map':
        this.requestMapLocationPick();
        return;
      case 'change_location_address':
        this.openAddressSearch();
        return;
      case 'copy_address':
        void this.copyAddress();
        return;
      case 'copy_gps':
        this.copyCoordinates();
        return;
      case 'open_google_maps':
        this.openInGoogleMaps();
        return;
      case 'remove_from_project':
        void this.removeFromAllProjects();
        return;
      case 'delete_media':
        this.confirmDelete();
        return;
      default:
        return;
    }
  }

  onThumbnailContextRequested(): void {
    // Spec link: docs/element-specs/media-detail-media-viewer.md -> right-click should open detail context actions.
    this.showContextMenu.set(true);
  }

  openCapturedAtEditor(): void {
    this.fieldsHelper.openCapturedAtEditor();
  }

  async saveCapturedAt(event: DateSaveEvent): Promise<void> {
    await this.fieldsHelper.saveCapturedAt(event);
  }

  protected formatCoord(value: number | null): string {
    return formatCoordinate(value);
  }

  openAddressSearch(): void {
    this.editingField.set('address_search');
  }

  async applyAddressSuggestion(suggestion: ForwardGeocodeResult): Promise<void> {
    await this.fieldsHelper.applyAddressSuggestion(suggestion);
  }

  onChipClicked(index: number): void {
    switch (index) {
      case 0:
        this.editingField.set('project_ids');
        this.projectSearch.set('');
        break;
      case 1:
        this.openCapturedAtEditor();
        break;
      case 2:
        this.copyCoordinates();
        break;
    }
  }

  openProjectPicker(): void {
    this.editingField.set('project_ids');
    this.projectSearch.set('');
  }

  onFileSelected(event: Event | File): void {
    this.uploadHelper.onFileSelected(event);
  }

  private async removeFromAllProjects(): Promise<void> {
    const memberships = Array.from(this.selectedProjectIds());
    if (memberships.length === 0) {
      this.toastService.show({
        message: this.t('workspace.imageDetail.toast.noProjectMembership', 'No project assigned.'),
        type: 'info',
      });
      this.showContextMenu.set(false);
      return;
    }

    for (const projectId of memberships) {
      await this.projectMembershipHelper.toggleProjectMembership(projectId);
    }

    this.toastService.show({
      message: this.t(
        'upload.item.menu.project.remove.success',
        'Removed from project successfully.',
      ),
      type: 'success',
    });
    this.showContextMenu.set(false);
  }

  private async handleImageReplaced(event: ImageReplacedEvent): Promise<void> {
    await this.mediaEventsHelper.handleImageReplaced(event);
  }

  private async handleImageAttached(event: ImageAttachedEvent): Promise<void> {
    await this.mediaEventsHelper.handleImageAttached(event);
  }

  private async openInMedia(): Promise<void> {
    const media = this.media();
    if (!media) {
      return;
    }

    // Spec link: docs/element-specs/media-detail-actions.md -> action parity with single marker menu.
    this.workspaceSelectionService.setSingle(media.id);
    this.workspacePaneObserver.setDetailImageId(media.id);
    this.workspacePaneObserver.setOpen(true);
    await this.router.navigate(['/media']);
  }

  private requestMapLocationPick(): void {
    const media = this.media();
    if (!media) {
      return;
    }

    // Spec link: docs/element-specs/media-detail-actions.md -> change-location-map action availability.
    this.locationMapPickRequested.emit({
      mediaId: media.id,
      fileName: media.id,
    });
  }

  private async copyAddress(): Promise<void> {
    const address = this.fullAddress().trim();
    if (!address) {
      this.toastService.show({
        message: this.t('workspace.mediaDetail.toast.addressMissing', 'No address available.'),
        type: 'warning',
        duration: 2200,
      });
      return;
    }

    // Spec link: docs/element-specs/media-detail-actions.md -> copy-address action in detail context menu.
    await navigator.clipboard.writeText(address).catch(() => {
      /* clipboard may be unavailable */
    });
    this.toastService.show({
      message: this.t('workspace.mediaDetail.toast.addressCopied', 'Address copied'),
      type: 'success',
      duration: 2000,
    });
  }

  private openInGoogleMaps(): void {
    const media = this.media();
    if (
      !media ||
      media.latitude == null ||
      media.longitude == null ||
      typeof window === 'undefined'
    ) {
      return;
    }

    // Spec link: docs/element-specs/media-detail-actions.md -> open-google-maps action parity.
    const url = `https://www.google.com/maps?q=${media.latitude},${media.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private showAlreadyOpenDetailsInfo(): void {
    // Spec link: docs/element-specs/media-detail-actions.md -> keep single-marker action parity in detail menu.
    this.toastService.show({
      message: this.t(
        'workspace.mediaDetail.toast.detailsAlreadyOpen',
        'Details are already open.',
      ),
      type: 'info',
      duration: 1800,
    });
  }

  private async resolveLocationFromContextAction(): Promise<void> {
    const mediaItemId = this.mediaItemId();
    if (!mediaItemId) {
      this.toastService.show({
        message: this.t(
          'workspace.mediaDetail.toast.locationResolveMissingMedia',
          'No media found.',
        ),
        type: 'warning',
        duration: 2200,
      });
      return;
    }

    const result = await this.locationResolverService.resolvePendingMediaItem(mediaItemId);
    if (result.status === 'resolved') {
      this.toastService.show({
        message: this.t('workspace.mediaDetail.toast.locationResolved', 'Location resolved.'),
        type: 'success',
        duration: 2200,
      });
    } else if (result.status === 'unresolvable') {
      this.toastService.show({
        message: this.t(
          'workspace.mediaDetail.toast.locationUnresolvable',
          'Location could not be resolved (terminal).',
        ),
        type: 'warning',
        duration: 2400,
      });
    } else {
      this.toastService.show({
        message: this.t(
          'workspace.mediaDetail.toast.locationResolveNotPending',
          'Location is already resolved or not retry-eligible.',
        ),
        type: 'info',
        duration: 2200,
      });
    }

    if (!result.changed) {
      return;
    }

    const currentMediaId = this.mediaId();
    if (!currentMediaId) {
      return;
    }

    await this.loadMedia(currentMediaId);
  }

  private async retryPendingLocationOnceOnOpen(id: string, signal: AbortSignal): Promise<void> {
    const mediaItemId = this.mediaItemId();
    if (!mediaItemId) {
      return;
    }

    const normalizedStatus = this.locationResolverService.normalizeLocationStatus(
      this.mediaLocationStatus(),
    );
    if (normalizedStatus !== 'pending') {
      return;
    }

    if (this.pendingLocationRetryAttempted.has(mediaItemId)) {
      return;
    }

    this.pendingLocationRetryAttempted.add(mediaItemId);
    const result = await this.locationResolverService.resolvePendingMediaItem(mediaItemId);
    if (signal.aborted || !result.changed) {
      return;
    }

    await this.dataFacade.loadImage(id, signal);
  }
}
