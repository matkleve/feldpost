import { Component, OnDestroy, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { DateSaveEvent } from './captured-date-editor.component';
import { SupabaseService } from '../../../core/supabase.service';
import { UploadService, ALLOWED_MIME_TYPES } from '../../../core/upload/upload.service';
import { ProjectsService } from '../../../core/projects/projects.service';
import {
  ImageAttachedEvent,
  ImageReplacedEvent,
  UploadFailedEvent,
  UploadManagerService,
} from '../../../core/upload/upload-manager.service';
import { WorkspaceViewService } from '../../../core/workspace-view.service';
import { ToastService } from '../../../core/toast.service';
import {
  PHOTO_NO_PHOTO_ICON,
  PHOTO_PLACEHOLDER_ICON,
  PhotoLoadService,
} from '../../../core/photo-load.service';
import type { PhotoLoadState } from '../../../core/photo-load.model';
import { ForwardGeocodeResult } from '../../../core/geocoding.service';
import {
  DetailEditingField,
  ImageRecord,
  MetadataEntry,
  SelectOption,
} from './image-detail-view.types';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import {
  QuickInfoChipsComponent,
} from '../../../shared/quick-info-chips/quick-info-chips.component';
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
} from './image-detail-view.utils';
import { ImageDetailHeaderComponent } from './image-detail-header/image-detail-header.component';
import { ImageDetailPhotoViewerComponent } from './image-detail-photo-viewer/image-detail-photo-viewer.component';
import { ImageDetailInlineSectionComponent } from './image-detail-inline-section/image-detail-inline-section.component';
import { ImageDetailProjectMembershipHelper } from './image-detail-project-membership.helper';
import { ImageDetailDataFacade } from './image-detail-data.facade';
import { ImageDetailMetadataHelper } from './image-detail-metadata.helper';
import { ImageDetailFieldsHelper } from './image-detail-fields.helper';
import { ImageDetailPhotoEventsHelper } from './image-detail-photo-events.helper';
import { ImageDetailUploadHelper } from './image-detail-upload.helper';
import { ImageDetailDeleteHelper } from './image-detail-delete.helper';

export type { ImageRecord, MetadataEntry } from './image-detail-view.types';

@Component({
  selector: 'app-image-detail-view',
  standalone: true,
  imports: [
    ConfirmDialogComponent,
    QuickInfoChipsComponent,
    MetadataSectionComponent,
    DetailActionsComponent,
    ImageDetailHeaderComponent,
    ImageDetailPhotoViewerComponent,
    ImageDetailInlineSectionComponent,
  ],
  templateUrl: './image-detail-view.component.html',
  styleUrl: './image-detail-view.component.scss',
  host: {
    '[style.--placeholder-icon]': 'placeholderIconUrl',
    '[style.--no-photo-icon]': 'noPhotoIconUrl',
  },
})
export class ImageDetailViewComponent implements OnDestroy {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly placeholderIconUrl = `url("${PHOTO_PLACEHOLDER_ICON}")`;
  readonly noPhotoIconUrl = `url("${PHOTO_NO_PHOTO_ICON}")`;

  private readonly supabaseService = inject(SupabaseService);
  private readonly uploadService = inject(UploadService);
  private readonly uploadManager = inject(UploadManagerService);
  private readonly workspaceView = inject(WorkspaceViewService);
  private readonly photoLoad = inject(PhotoLoadService);
  private readonly toastService = inject(ToastService);
  private readonly projectsService = inject(ProjectsService);

  readonly imageId = input<string | null>(null);
  readonly closed = output<void>();
  readonly zoomToLocationRequested = output<{ imageId: string; lat: number; lng: number }>();

  readonly image = signal<ImageRecord | null>(null);
  readonly metadata = signal<MetadataEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showContextMenu = signal(false);
  readonly showDeleteConfirm = signal(false);
  readonly saving = signal(false);
  readonly projectOptions = signal<SelectOption[]>([]);
  readonly selectedProjectIds = signal<Set<string>>(new Set());
  readonly primaryProjectId = signal<string | null>(null);
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
  readonly replaceError = signal<string | null>(null);
  readonly editDate = signal('');
  readonly editTime = signal('');
  readonly acceptTypes = Array.from(ALLOWED_MIME_TYPES).join(',');
  private readonly activeJobId = signal<string | null>(null);

  private abortController: AbortController | null = null;

  readonly thumbState = computed<PhotoLoadState>(() => {
    const id = this.imageId();
    return id ? this.photoLoad.getLoadState(id, 'thumb')() : 'idle';
  });

  readonly fullState = computed<PhotoLoadState>(() => {
    const id = this.imageId();
    return id ? this.photoLoad.getLoadState(id, 'full')() : 'idle';
  });

  readonly hasPhoto = computed(() => !!this.image()?.storage_path);

  readonly replacing = computed(() => {
    const jobId = this.activeJobId();
    if (!jobId) return false;
    const job = this.uploadManager.jobs().find((candidate) => candidate.id === jobId);
    return !!job && job.phase !== 'complete' && job.phase !== 'error' && job.phase !== 'skipped';
  });

  readonly isCorrected = computed(() => {
    const img = this.image();
    if (!img || img.latitude == null || img.exif_latitude == null) return false;
    return img.latitude !== img.exif_latitude || img.longitude !== img.exif_longitude;
  });

  readonly hasCoordinates = computed(() => {
    const img = this.image();
    return img?.latitude != null && img?.longitude != null;
  });

  readonly displayTitle = computed(() => resolveDisplayTitle(this.image(), this.t));

  readonly mediaTypeLabel = computed(() =>
    resolveMediaTypeLabel(this.image(), this.mediaType(), this.mediaMimeType(), this.t),
  );

  readonly detailViewLabel = computed(
    () => `${this.mediaTypeLabel()} ${this.t('workspace.imageDetail.detailsSuffix', 'details')}`,
  );

  readonly captureDate = computed(() => formatCaptureDate(this.image(), this.i18nService.locale()));

  readonly uploadDate = computed(() => formatUploadDate(this.image(), this.i18nService.locale()));

  readonly projectName = computed(() => {
    const image = this.image();
    return resolveProjectName(
      this.projectOptions(),
      this.selectedProjectIds(),
      this.primaryProjectId(),
      image?.project_id ?? null,
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
      mime === 'image/tiff' ||
      mime === 'application/msword' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  readonly canAssignMultipleProjects = computed(() => {
    const locationStatus = this.mediaLocationStatus();
    if (locationStatus === 'no_gps' || locationStatus === 'unresolved') return false;
    const img = this.image();
    if (!img) return true;
    if (img.location_unresolved) return false;
    return img.latitude != null && img.longitude != null;
  });

  readonly primarySelectorVisible = computed(() => !this.canAssignMultipleProjects());

  readonly fullAddress = computed(() => resolveFullAddress(this.image()));

  readonly isImageLoading = computed(() => {
    const thumb = this.thumbState();
    const full = this.fullState();
    if (thumb === 'no-photo') return false;
    if (thumb === 'error' && full === 'error') return false;
    if (thumb === 'loaded' || this.fullResPreloaded()) return false;
    return true;
  });

  readonly imageReady = computed(() => {
    if (this.fullResPreloaded()) return true;
    return this.thumbState() === 'loaded' && !!this.thumbnailUrl();
  });

  readonly canOpenLightbox = computed(() => {
    if (!(this.fullResUrl() || this.thumbnailUrl())) return false;
    return isImageLikeMedia(
      this.mediaType(),
      this.mediaMimeType(),
      this.image()?.storage_path ?? null,
    );
  });

  readonly infoChips = computed(() =>
    buildInfoChips({
      image: this.image(),
      projectName: this.projectName(),
      selectedProjectCount: this.selectedProjectIds().size,
      captureDate: this.captureDate(),
      isCorrected: this.isCorrected(),
      t: this.t,
    }),
  );

  private readonly projectMembershipHelper = new ImageDetailProjectMembershipHelper({
    supabase: this.supabaseService,
    projectsService: this.projectsService,
    toastService: this.toastService,
    t: this.t,
    image: this.image,
    selectedProjectIds: this.selectedProjectIds,
    primaryProjectId: this.primaryProjectId,
    mediaItemId: this.mediaItemId,
    mediaType: this.mediaType,
    mediaMimeType: this.mediaMimeType,
    mediaLocationStatus: this.mediaLocationStatus,
    projectOptions: this.projectOptions,
    projectSearch: this.projectSearch,
    canAssignMultipleProjects: () => this.canAssignMultipleProjects(),
    primarySelectorVisible: () => this.primarySelectorVisible(),
  });

  private readonly dataFacade = new ImageDetailDataFacade({
    services: {
      supabase: this.supabaseService,
      photoLoad: this.photoLoad,
      projectMemberships: this.projectMembershipHelper,
    },
    signals: {
      image: this.image,
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
    },
  });

  private readonly metadataHelper = new ImageDetailMetadataHelper({
    services: {
      supabase: this.supabaseService,
    },
    signals: {
      image: this.image,
      imageId: () => this.imageId(),
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
      image: this.image,
      editingField: this.editingField,
      saving: this.saving,
      editDate: this.editDate,
      editTime: this.editTime,
    },
    helpers: {
      t: this.t,
    },
  });

  private readonly photoEventsHelper = new ImageDetailPhotoEventsHelper({
    services: {
      photoLoad: this.photoLoad,
      workspaceView: this.workspaceView,
      toastService: this.toastService,
    },
    signals: {
      image: this.image,
      fullResPreloaded: this.fullResPreloaded,
      activeJobId: this.activeJobId,
    },
    callbacks: {
      reloadSignedUrlsForCurrentImage: () => this.reloadSignedUrlsForCurrentImage(),
      t: this.t,
    },
  });

  private readonly uploadHelper = new ImageDetailUploadHelper({
    services: {
      uploadService: this.uploadService,
      uploadManager: this.uploadManager,
    },
    signals: {
      image: this.image,
      replaceError: this.replaceError,
      activeJobId: this.activeJobId,
    },
    callbacks: {
      findJobForFailure: (event) => {
        const job = this.uploadManager.jobs().find((candidate) => candidate.id === event.jobId);
        return job?.targetImageId === this.imageId();
      },
    },
  });

  private readonly deleteHelper = new ImageDetailDeleteHelper({
    services: {
      supabase: this.supabaseService,
    },
    signals: {
      imageId: () => this.imageId(),
      showDeleteConfirm: this.showDeleteConfirm,
      showContextMenu: this.showContextMenu,
    },
    callbacks: {
      onDeleted: () => this.closed.emit(),
    },
  });

  constructor() {
    effect(() => {
      const id = this.imageId();
      if (id) {
        void this.loadImage(id);
      } else {
        this.reset();
      }
    });

    this.uploadManager.imageReplaced$
      .pipe(
        takeUntilDestroyed(),
        filter((event) => event.imageId === this.imageId()),
      )
      .subscribe((event) => void this.handleImageReplaced(event));

    this.uploadManager.imageAttached$
      .pipe(
        takeUntilDestroyed(),
        filter((event) => event.imageId === this.imageId()),
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
    this.image.set(null);
    this.metadata.set([]);
    this.selectedProjectIds.set(new Set());
    this.primaryProjectId.set(null);
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
  }

  private async loadImage(id: string): Promise<void> {
    this.abortController?.abort();
    this.abortController = new AbortController();
    await this.dataFacade.loadImage(id, this.abortController.signal);
  }

  private async reloadSignedUrlsForCurrentImage(): Promise<void> {
    const img = this.image();
    if (!img?.storage_path) return;
    const signal = this.abortController?.signal ?? new AbortController().signal;
    await this.dataFacade.loadSignedUrls(img, signal);
  }

  close(): void {
    this.closed.emit();
  }

  async toggleProjectMembership(projectId: string): Promise<void> {
    await this.projectMembershipHelper.toggleProjectMembership(projectId);
  }

  isPrimaryProject(projectId: string): boolean {
    return this.primaryProjectId() === projectId;
  }

  async setPrimaryProject(projectId: string): Promise<void> {
    await this.projectMembershipHelper.setPrimaryProject(projectId);
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

  zoomToLocation(): void {
    const img = this.image();
    if (!img || img.latitude == null || img.longitude == null) return;
    this.zoomToLocationRequested.emit({ imageId: img.id, lat: img.latitude, lng: img.longitude });
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
    const img = this.image();
    if (!img || img.latitude == null || img.longitude == null) return;
    const text = `${img.latitude.toFixed(6)}, ${img.longitude.toFixed(6)}`;
    navigator.clipboard.writeText(text).catch(() => {
      /* clipboard may be unavailable */
    });
    this.toastService.show({
      message: this.t('workspace.imageDetail.toast.coordinatesCopied', 'Coordinates copied'),
      type: 'info',
      duration: 2000,
    });
    this.showContextMenu.set(false);
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

  private async handleImageReplaced(event: ImageReplacedEvent): Promise<void> {
    await this.photoEventsHelper.handleImageReplaced(event);
  }

  private async handleImageAttached(event: ImageAttachedEvent): Promise<void> {
    await this.photoEventsHelper.handleImageAttached(event);
  }
}
