import type {
  OnDestroy} from '@angular/core';
import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { filter } from 'rxjs';
import { HLM_BUTTON_IMPORTS } from '../../ui/button';
import type { DateSaveEvent } from './captured-date-editor.component';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { MetadataService } from '../../../core/metadata/metadata.service';
import { UploadService, ALLOWED_MIME_TYPES } from '../../../core/upload/upload.service';
import { ProjectsService } from '../../../core/projects/projects.service';
import type {
  ImageAttachedEvent,
  ImageReplacedEvent,
  UploadFailedEvent} from '../../../core/upload/upload-manager.service';
import {
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
import type { ForwardGeocodeResult } from '../../../core/geocoding/geocoding.service';
import { detectCoordinates } from '../../../core/search/coordinate-detection';
import { MediaLocationUpdateService } from '../../../core/media-location-update/media-location-update.service';
import { buildLocationUpdateFailureToast } from '../../../core/media-location-update/location-update-toast.util';
import type {
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
  needsAddressResolutionAfterGps,
  mergeImageLocationPatch,
  locationPatchFromForwardGeocode,
  resolveDisplayTitle,
  resolveFullAddress,
  resolveFileFormatLabel,
  resolveMediaTypeChipLabel,
  resolveProjectName,
} from './media-detail-view.utils';
import { MediaDetailHeaderComponent } from './media-detail-header/media-detail-header.component';
import { MediaDetailMediaViewerComponent } from './media-detail-media-viewer/media-detail-media-viewer.component';
import { MediaDetailInlineSectionComponent } from './media-detail-inline-section/media-detail-inline-section.component';
import { MediaDetailLocationSectionComponent } from './media-detail-location-section/media-detail-location-section.component';
import { ImageDetailProjectMembershipHelper } from './media-detail-project-membership.helper';
import { MediaDetailDataFacade } from '../../../core/media-detail-data/media-detail-data.facade';
import { MediaDetailLocationSyncService } from '../../../core/media-detail-data/media-detail-location-sync.service';
import { ImageDetailMetadataHelper } from './media-detail-metadata.helper';
import {
  addressSnapshotToSuggestion,
  EMPTY_ADDRESS_SUGGESTION,
  ImageDetailFieldsHelper,
  snapshotAddressFields,
} from './media-detail-fields.helper';
import {
  getDetailDestructiveConfirmCopy,
  type DetailDestructiveConfirmState,
} from './media-detail-destructive-confirm';
import { MediaDetailMediaEventsHelper } from './media-detail-media-events.helper';
import { ImageDetailUploadHelper } from './media-detail-upload.helper';
import { ImageDetailDeleteHelper } from './media-detail-delete.helper';
import { MediaDeleteUndoService } from '../../../core/media-delete/media-delete-undo.service';
import { ActionEngineService } from '../../../core/action/action-engine.service';
import { ACTION_CONTEXT_IDS } from '../../../core/action/action-context-ids';
import type { ResolvedAction } from '../../../core/action/action-types';
import { WORKSPACE_SINGLE_ACTION_DEFINITIONS } from '../footer/workspace-detail-actions.registry';
import type { WorkspaceSingleActionId } from '../footer/workspace-detail-actions.types';
import type { MediaLocationAddressPatch } from '../../../core/media-location-update/media-location-update.types';
import type { UploadLocationMapPickRequest } from '../../../core/workspace-pane/workspace-pane-shell-events.types';
import { WorkspaceSelectionService } from '../../../core/workspace-selection/workspace-selection.service';
import { WorkspacePaneObserverAdapter } from '../../../core/workspace-pane/workspace-pane-observer.adapter';
import { LocationResolverService } from '../../../core/location-resolver/location-resolver.service';
import { AddressReconciliationService } from '../../../core/address-reconciliation/address-reconciliation.service';
import type { AddressFieldSaveEvent } from './media-detail-location-section/media-detail-location-section.component';
import type {
  AddressFieldKind,
  AddressFieldMeta,
} from '../../../core/address-field-suggest/address-field-suggest.types';
import type { ReconciliationOffer } from '../../../core/address-reconciliation/address-reconciliation.types';

export type { ImageRecord, MetadataEntry } from './media-detail-view.types';

@Component({
  selector: 'app-media-detail-view',
  standalone: true,
  imports: [
    ConfirmDialogComponent,
    QuickInfoChipsComponent,
    MetadataSectionComponent,
    DetailActionsComponent,
    MediaDetailHeaderComponent,
    MediaDetailMediaViewerComponent,
    MediaDetailInlineSectionComponent,
    MediaDetailLocationSectionComponent,
    ...HLM_BUTTON_IMPORTS,
  ],
  templateUrl: './media-detail-view.component.html',
  styleUrls: ['./media-detail-view.component.scss', './media-detail-view.component.part2.scss'],
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
  private readonly mediaDeleteUndo = inject(MediaDeleteUndoService);
  private readonly mediaDownloadService = inject(MediaDownloadService);
  private readonly mediaOrchestrator = inject(MediaDownloadService);
  private readonly toastService = inject(ToastService);
  private readonly projectsService = inject(ProjectsService);
  private readonly actionEngineService = inject(ActionEngineService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  private readonly locationResolverService = inject(LocationResolverService);
  private readonly addressReconciliationService = inject(AddressReconciliationService);
  private readonly mediaLocationUpdateService = inject(MediaLocationUpdateService);
  private readonly mediaDetailLocationSync = inject(MediaDetailLocationSyncService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

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
  readonly destructiveConfirm = signal<DetailDestructiveConfirmState | null>(null);
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
  readonly metadataKeyDefinitions = signal<
    import('./media-detail-view.types').MetadataKeyDefinitionView[]
  >([]);
  readonly fullResPreloaded = signal(false);
  readonly detailSlotWidthRem = signal<number | null>(null);
  readonly detailSlotHeightRem = signal<number | null>(null);
  readonly replaceError = signal<string | null>(null);
  readonly editDate = signal('');
  readonly editTime = signal('');
  readonly reconciliationOffer = signal<import('../../../core/address-reconciliation/address-reconciliation.types').ReconciliationOffer | null>(null);
  readonly addressResolving = signal(false);
  readonly acceptTypes = Array.from(ALLOWED_MIME_TYPES).join(',');
  private readonly activeJobId = signal<string | null>(null);

  private abortController: AbortController | null = null;
  private lastAddressSearchRequestId = 0;
  private readonly pendingLocationRetryAttempted = new Set<string>();
  private readonly reconciliationAttempted = new Set<string>();
  private lastHandledLocationSyncSeq = 0;
  private ignoreOutsideDismissUntil = 0;

  private static readonly TEXT_EDITING_FIELDS = new Set<DetailEditingField>([
    'address_label',
    'street',
    'city',
    'district',
    'country',
  ]);

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

  readonly mediaTypeChipLabel = computed(() =>
    resolveMediaTypeChipLabel(this.media(), this.mediaType(), this.mediaMimeType(), this.t),
  );

  readonly fileFormatLabel = computed(() =>
    resolveFileFormatLabel(this.media()?.storage_path ?? null, this.mediaMimeType(), this.t),
  );

  readonly detailViewLabel = computed(() =>
    this.t('workspace.imageDetail.section.details', 'Details'),
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

  readonly isImageLike = computed(() =>
    isImageLikeMedia(
      this.mediaType(),
      this.mediaMimeType(),
      this.media()?.storage_path ?? null,
    ),
  );

  readonly canOpenLightbox = computed(() => {
    if (!(this.fullResUrl() || this.thumbnailUrl())) return false;
    return this.isImageLike();
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
      mediaTypeChipLabel: this.mediaTypeChipLabel(),
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
    // Spec link: docs/specs/ui/media-detail/media-detail-actions.md -> action surface parity in detail menus.
    this.actionEngineService.resolveActions(WORKSPACE_SINGLE_ACTION_DEFINITIONS, {
      contextType: ACTION_CONTEXT_IDS.wsFooter,
      hasCoordinates: this.hasCoordinates(),
      hasAddress: this.hasAddress(),
    }),
  );

  readonly workspaceHeaderActions = computed(() => this.workspaceSingleActions());

  readonly destructiveConfirmCopy = computed(() => {
    const state = this.destructiveConfirm();
    if (!state) {
      return null;
    }
    return getDetailDestructiveConfirmCopy(state, this.t);
  });

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

  private readonly dataFacade = new MediaDetailDataFacade({
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
      metadataKeyDefinitions: this.metadataKeyDefinitions,
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
      mediaDeleteUndo: this.mediaDeleteUndo,
    },
    signals: {
      imageId: () => this.mediaId(),
      destructiveConfirm: this.destructiveConfirm,
      showContextMenu: this.showContextMenu,
    },
    callbacks: {
      onDeleted: () => this.closed.emit(),
      onRestored: () => {
        const mediaId = this.mediaId();
        if (!mediaId) {
          return;
        }
        void this.workspaceView.loadImagesByIdsOrdered([mediaId]).then((images) => {
          if (images.length === 0) {
            return;
          }
          this.workspaceView.updateRawImages((existing) => {
            const existingIds = new Set(existing.map((image) => image.id));
            const restored = images.filter((image) => !existingIds.has(image.id));
            return restored.length > 0 ? [...existing, ...restored] : existing;
          });
        });
      },
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

    effect(() => {
      const evt = this.mediaDetailLocationSync.lastEvent();
      const mediaId = this.mediaId();
      if (!evt || !mediaId || evt.mediaId !== mediaId || evt.seq === this.lastHandledLocationSyncSeq) {
        return;
      }
      this.lastHandledLocationSyncSeq = evt.seq;
      this.applyLocationPatch({
        latitude: evt.lat,
        longitude: evt.lng,
        ...evt.address,
      });
      void this.finishLocationFieldsIfNeeded(mediaId);
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
    this.destructiveConfirm.set(null);
    this.editingField.set(null);
    this.activeJobId.set(null);
    this.replaceError.set(null);
    this.pendingLocationRetryAttempted.clear();
    // reconciliationAttempted is intentionally NOT cleared on reset to persist
    // per-session suppression across detail panel open/close cycles.
  }

  private applyLocationPatch(
    patch: MediaLocationAddressPatch & {
      latitude?: number | null;
      longitude?: number | null;
      location_unresolved?: boolean;
      gps_assignment_allowed?: boolean;
    },
  ): void {
    const current = this.media();
    if (!current) {
      return;
    }
    this.media.set(mergeImageLocationPatch(current, patch));
  }

  /** Silent location/address refresh — no full detail reload or loading skeleton. */
  private async finishLocationFieldsIfNeeded(mediaId: string): Promise<void> {
    const img = this.media();
    const mediaItemId = this.mediaItemId();
    const status = this.locationResolverService.normalizeLocationStatus(this.mediaLocationStatus());
    const needsResolver =
      !!mediaItemId &&
      !!img &&
      (status === 'pending' || needsAddressResolutionAfterGps(img));

    if (!needsResolver) {
      return;
    }

    this.addressResolving.set(true);
    try {
      const signal = this.abortController?.signal ?? new AbortController().signal;
      const result = await this.locationResolverService.resolvePendingMediaItem(mediaItemId);
      if (!result.changed || signal.aborted) {
        return;
      }
      const refresh = await this.dataFacade.refreshImageLocationFields(mediaId, signal);
      if (refresh.applied && refresh.locationStatus) {
        this.mediaLocationStatus.set(refresh.locationStatus);
      }
    } finally {
      this.addressResolving.set(false);
    }
  }

  private async loadMedia(id: string): Promise<void> {
    this.abortController?.abort();
    this.abortController = new AbortController();
    await this.dataFacade.loadImage(id, this.abortController.signal);
    if (this.abortController.signal.aborted) {
      return;
    }

    await this.retryPendingLocationOnceOnOpen(id, this.abortController.signal);

    if (!this.abortController.signal.aborted) {
      void this.runReconciliationOnOpen(id);
    }
  }

  /**
   * Run address reconciliation once per session per media item on detail open.
   * @see docs/specs/service/location-resolver/address-reconciliation.md#detail-open-flow
   */
  private async runReconciliationOnOpen(id: string): Promise<void> {
    if (this.reconciliationAttempted.has(id)) return;
    this.reconciliationAttempted.add(id);

    const mediaItem = this.media();
    if (!mediaItem) return;

    const offer = await this.addressReconciliationService.reconcileOnDetailOpen(mediaItem);
    if (!offer) return;

    // Values already match geocoder — persist verification without a banner.
    if (offer.verificationOnly) {
      await this.addressReconciliationService.applyOffer(offer.mediaItemId, offer, 'apply');
      this.patchMediaFromReconciliationOffer(offer);
      return;
    }

    this.showReconciliationPrompt(offer);
  }

  /**
   * Show a reconciliation prompt inline in the detail view for the given offer.
   * This is shared between detail-open and per-row resolve flows.
   * @see docs/specs/service/location-resolver/address-reconciliation.md#prompt-ui-contract
   */
  private showReconciliationPrompt(
    offer: import('../../../core/address-reconciliation/address-reconciliation.types').ReconciliationOffer,
  ): void {
    this.reconciliationOffer.set(offer);
  }

  async onReconciliationApply(): Promise<void> {
    const offer = this.reconciliationOffer();
    if (!offer) return;
    this.reconciliationOffer.set(null);
    await this.addressReconciliationService.applyOffer(offer.mediaItemId, offer, 'apply');
    this.patchMediaFromReconciliationOffer(offer);
    void this.loadMedia(offer.mediaItemId);
  }

  /** Merge verification meta (and any changed values) into the in-memory media row. */
  private patchMediaFromReconciliationOffer(offer: ReconciliationOffer): void {
    const mediaItem = this.media();
    if (!mediaItem) return;

    const meta: AddressFieldMeta = { ...(mediaItem.address_field_meta ?? {}) };
    const patch: Partial<ImageRecord> = { address_field_meta: meta };

    for (const fieldOffer of offer.fields) {
      meta[fieldOffer.field] = { source: 'geocoder', verified: true };
      if (fieldOffer.changed) {
        (patch as Record<string, string | null>)[fieldOffer.field] = fieldOffer.suggestedValue;
      }
    }

    this.media.set({ ...mediaItem, ...patch });
  }

  async onReconciliationSuppress(): Promise<void> {
    const offer = this.reconciliationOffer();
    if (!offer) return;
    this.reconciliationOffer.set(null);
    await this.addressReconciliationService.applyOffer(offer.mediaItemId, offer, 'suppress');
  }

  async onReconciliationRetry(): Promise<void> {
    const offer = this.reconciliationOffer();
    if (!offer) return;
    this.reconciliationOffer.set(null);
    this.reconciliationAttempted.delete(offer.mediaItemId);
    void this.runReconciliationOnOpen(offer.mediaItemId);
  }

  onReconciliationDismiss(): void {
    this.reconciliationOffer.set(null);
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

  async applyDetailProjectsSelection(next: Set<string>): Promise<void> {
    const previous = this.selectedProjectIds();
    for (const projectId of next) {
      if (!previous.has(projectId)) {
        await this.toggleProjectMembership(projectId);
      }
    }
    for (const projectId of previous) {
      if (!next.has(projectId)) {
        await this.toggleProjectMembership(projectId);
      }
    }
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

  /**
   * Save an address field with optional verification metadata.
   * Called from MediaDetailLocationSectionComponent.fieldSaveRequested.
   * @see docs/specs/ui/media-detail/address-field-editing.md
   */
  async saveAddressField(event: AddressFieldSaveEvent): Promise<void> {
    await this.fieldsHelper.saveImageField(event.field, event.value);

    // Write verification metadata when field is a known address component
    const addressFields: readonly string[] = ['street', 'city', 'district', 'country'];
    if (!addressFields.includes(event.field)) return;

    const mediaItem = this.media();
    if (!mediaItem) return;

    const field = event.field as AddressFieldKind;
    const existingMeta = mediaItem.address_field_meta ?? {};
    const newFieldMeta = event.suggestion
      ? { source: 'geocoder' as const, verified: true }
      : { source: 'user' as const, verified: false };

    const updatedMeta = { ...existingMeta, [field]: newFieldMeta };
    await this.supabaseService.client
      .from('media_items')
      .update({ address_field_meta: updatedMeta })
      .or(`id.eq.${mediaItem.id},source_image_id.eq.${mediaItem.id}`);

    this.media.set({ ...mediaItem, address_field_meta: updatedMeta });
  }

  /**
   * Handle per-row "Resolve address field" button click.
   * Runs field-scoped reconciliation and shows offer if confident.
   * @see docs/specs/service/location-resolver/address-reconciliation.md
   */
  async onAddressFieldResolveRequested(field: string): Promise<void> {
    const mediaItem = this.media();
    if (!mediaItem) return;

    const offer = await this.addressReconciliationService.reconcileField(
      mediaItem,
      field as AddressFieldKind,
    );

    if (!offer) {
      this.toastService.show({
        message: this.t('workspace.reconciliation.toast.notFound', 'No suggestion found'),
        type: 'info',
        dedupe: true,
      });
      return;
    }

    // Single-field ISO / match-only: confirm immediately without a banner.
    if (offer.verificationOnly && offer.fields.length === 1) {
      await this.addressReconciliationService.applyOffer(offer.mediaItemId, offer, 'apply');
      this.patchMediaFromReconciliationOffer(offer);
      return;
    }

    this.showReconciliationPrompt(offer);
  }

  onDetailFieldEditRequested(field: Exclude<DetailEditingField, null>): void {
    this.markIgnoreOutsideDismiss();
    this.editingField.set(field);
  }

  onTitleEditRequested(): void {
    this.markIgnoreOutsideDismiss();
    this.editingField.set('address_label');
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (Date.now() < this.ignoreOutsideDismissUntil) {
      return;
    }

    const field = this.editingField();
    if (!field) {
      return;
    }

    const target = event.target as Node | null;
    if (!target || this.isTargetInsideActiveEditor(target, field)) {
      return;
    }

    this.dismissEditingField(field);
  }

  private markIgnoreOutsideDismiss(): void {
    this.ignoreOutsideDismissUntil = Date.now() + 250;
  }

  private isTargetInsideActiveEditor(target: Node, field: DetailEditingField): boolean {
    const root = this.elementRef.nativeElement;
    const editor = root.querySelector(`[data-detail-active-editor="${field}"]`);
    return !!editor?.contains(target);
  }

  private dismissEditingField(field: NonNullable<DetailEditingField>): void {
    const root = this.elementRef.nativeElement;

    if (field === 'address_label') {
      const input = root.querySelector(
        '[data-detail-active-editor="address_label"] input',
      ) as HTMLInputElement | null;
      input?.blur();
      return;
    }

    this.editingField.set(null);
  }

  async saveMetadata(entry: MetadataEntry, newValue: string): Promise<void> {
    await this.metadataHelper.saveMetadata(entry, newValue);
  }

  async addMetadata(
    keyName: string,
    keyType: 'text' | 'number' | 'date',
    value: string,
  ): Promise<void> {
    await this.metadataHelper.addMetadata(keyName, keyType, value);
  }

  async removeMetadata(entry: MetadataEntry): Promise<void> {
    await this.executeRemoveMetadata(entry);
  }

  zoomToLocation(zoomMode: 'house' | 'street' = 'street'): void {
    const media = this.media();
    if (!media || media.latitude == null || media.longitude == null) return;
    // Spec link: docs/specs/ui/media-detail/media-detail-actions.md -> separate zoom_house and zoom_street behaviors.
    this.zoomToLocationRequested.emit({
      mediaId: media.id,
      lat: media.latitude,
      lng: media.longitude,
      zoomMode,
    });
  }

  async revertCoordinatesToExif(): Promise<void> {
    await this.executeRevertCoordinates();
  }

  async clearAddress(): Promise<void> {
    await this.executeClearAddress();
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

  cancelDestructiveConfirm(): void {
    this.destructiveConfirm.set(null);
  }

  onDestructiveConfirmed(): void {
    const state = this.destructiveConfirm();
    if (!state) {
      return;
    }

    this.destructiveConfirm.set(null);

    switch (state.kind) {
      case 'delete_media':
        void this.executeDelete();
        return;
      case 'remove_from_projects':
        void this.executeRemoveFromAllProjects();
        return;
    }
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
        this.confirmRemoveFromAllProjects();
        return;
      case 'delete_media':
        this.confirmDelete();
        return;
      default:
        return;
    }
  }

  onThumbnailContextRequested(): void {
    // Spec link: docs/specs/ui/media-detail/media-detail-media-viewer.md -> right-click should open detail context actions.
    this.showContextMenu.set(true);
  }

  openCapturedAtEditor(): void {
    this.markIgnoreOutsideDismiss();
    this.fieldsHelper.openCapturedAtEditor();
  }

  async saveCapturedAt(event: DateSaveEvent): Promise<void> {
    await this.fieldsHelper.saveCapturedAt(event);
  }

  protected formatCoord(value: number | null): string {
    return formatCoordinate(value);
  }

  openAddressSearch(): void {
    this.markIgnoreOutsideDismiss();
    this.editingField.set('address_search');
  }

  async applyAddressSuggestion(suggestion: ForwardGeocodeResult): Promise<void> {
    const media = this.media();
    if (!media) return;

    const hasCoordinates = Number.isFinite(suggestion.lat) && Number.isFinite(suggestion.lng);
    if (!hasCoordinates) {
      await this.fieldsHelper.applyAddressSuggestion(suggestion);
      return;
    }

    this.saving.set(true);
    this.addressResolving.set(true);
    const result = await this.mediaLocationUpdateService.updateFromAddressSuggestion(
      media.id,
      suggestion,
    );
    if (!result.ok) {
      this.saving.set(false);
      this.addressResolving.set(false);
      this.toastService.show({
        ...buildLocationUpdateFailureToast(result.error, {
          file: 'media-detail-view.component.ts',
          fn: 'applyAddressSuggestion',
        }),
      });
      return;
    }

    this.applyLocationPatch(locationPatchFromForwardGeocode(suggestion));
    await this.fieldsHelper.persistAddressFieldMetaFromGeocode(suggestion);
    this.mediaLocationStatus.set('resolved');
    this.editingField.set(null);
    this.saving.set(false);
    this.addressResolving.set(false);
  }

  onChipClicked(index: number): void {
    switch (this.infoChips()[index]?.action) {
      case 'project':
        this.onDetailFieldEditRequested('project_ids');
        this.projectSearch.set('');
        break;
      case 'captured_at':
        this.openCapturedAtEditor();
        break;
      case 'coordinates':
        this.copyCoordinates();
        break;
    }
  }

  openProjectPicker(): void {
    this.onDetailFieldEditRequested('project_ids');
    this.projectSearch.set('');
  }

  onFileSelected(event: Event | File): void {
    this.uploadHelper.onFileSelected(event);
  }

  confirmRemoveFromAllProjects(): void {
    this.closeContextMenu();
    const memberships = Array.from(this.selectedProjectIds());
    if (memberships.length === 0) {
      this.toastService.show({
        message: this.t('workspace.imageDetail.toast.noProjectMembership', 'No project assigned.'),
        type: 'info',
      });
      return;
    }
    this.destructiveConfirm.set({ kind: 'remove_from_projects' });
  }

  private async executeClearAddress(): Promise<void> {
    const img = this.media();
    if (!img) {
      return;
    }

    const snapshot = snapshotAddressFields(img);
    await this.fieldsHelper.applyAddressSuggestion(EMPTY_ADDRESS_SUGGESTION);
    this.showUndoToast(
      this.t('workspace.imageDetail.toast.addressCleared', 'Address removed'),
      async () => {
        await this.fieldsHelper.applyAddressSuggestion(addressSnapshotToSuggestion(snapshot));
      },
    );
  }

  private async executeRevertCoordinates(): Promise<void> {
    const img = this.media();
    if (!img) {
      return;
    }

    const undoSnapshot = {
      latitude: img.latitude,
      longitude: img.longitude,
    };
    const reverted = await this.fieldsHelper.revertCoordinatesToExif({ suppressToast: true });
    if (!reverted) {
      return;
    }

    this.showUndoToast(
      this.t('workspace.imageDetail.toast.coordinatesReverted', 'Coordinates reverted to EXIF'),
      async () => {
        await this.fieldsHelper.restoreCoordinates(
          undoSnapshot.latitude,
          undoSnapshot.longitude,
        );
      },
    );
  }

  private async executeRemoveMetadata(entry: MetadataEntry): Promise<void> {
    await this.metadataHelper.removeMetadata(entry);
    this.showUndoToast(
      this.t('workspace.imageDetail.toast.metadataRemoved', 'Metadata removed'),
      async () => {
        await this.metadataHelper.addMetadata(entry.key, entry.keyType as 'text' | 'number' | 'date', entry.value);
      },
    );
  }

  private async executeRemoveFromAllProjects(): Promise<void> {
    const memberships = Array.from(this.selectedProjectIds());
    if (memberships.length === 0) {
      return;
    }

    const snapshot = [...memberships];
    for (const projectId of snapshot) {
      await this.projectMembershipHelper.toggleProjectMembership(projectId);
    }

    this.showUndoToast(
      this.t(
        'workspace.imageDetail.toast.removedFromProjects',
        'Removed from all projects',
      ),
      async () => {
        for (const projectId of snapshot) {
          if (!this.selectedProjectIds().has(projectId)) {
            await this.projectMembershipHelper.toggleProjectMembership(projectId);
          }
        }
      },
    );
  }

  private showUndoToast(message: string, onUndo: () => void | Promise<void>): void {
    this.toastService.show({
      message,
      type: 'success',
      duration: 5000,
      dedupe: false,
      action: {
        label: this.t('media.delete.toast.undo', 'Undo'),
        onClick: () => {
          void onUndo();
        },
      },
    });
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

    // Spec link: docs/specs/ui/media-detail/media-detail-actions.md -> action parity with single marker menu.
    this.workspaceSelectionService.setSingle(media.id);
    this.workspacePaneObserver.setDetailImageId(media.id);
    this.workspacePaneObserver.setOpen(true);
    await this.router.navigate(['/media']);
  }

  async saveCoordinatesFromInput(raw: string): Promise<void> {
    const media = this.media();
    if (!media) {
      return;
    }

    const coords = detectCoordinates(raw.trim());
    if (!coords) {
      this.toastService.show({
        message: this.t(
          'workspace.imageDetail.toast.coordinatesInvalid',
          'Could not read coordinates. Use a decimal pair like 47.3769, 8.5417.',
        ),
        type: 'warning',
        duration: 3200,
      });
      return;
    }

    this.saving.set(true);
    const result = await this.mediaLocationUpdateService.updateFromCoordinates(media.id, coords);
    if (!result.ok) {
      this.saving.set(false);
      this.toastService.show({
        ...buildLocationUpdateFailureToast(result.error, {
          file: 'media-detail-view.component.ts',
          fn: 'saveCoordinatesFromInput',
        }),
      });
      return;
    }

    this.applyLocationPatch({
      latitude: result.lat ?? coords.lat,
      longitude: result.lng ?? coords.lng,
      ...result.address,
    });
    this.mediaLocationStatus.set('resolved');
    this.editingField.set(null);
    await this.finishLocationFieldsIfNeeded(media.id);
    this.saving.set(false);
    this.toastService.show({
      message: this.t('upload.location.update.success', 'Location updated.'),
      type: 'success',
      dedupe: true,
    });
  }

  requestMapLocationPick(): void {
    const media = this.media();
    if (!media) {
      return;
    }

    this.editingField.set(null);

    // Spec link: docs/specs/ui/media-detail/media-detail-actions.md -> change-location-map action availability.
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

    // Spec link: docs/specs/ui/media-detail/media-detail-actions.md -> copy-address action in detail context menu.
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

    // Spec link: docs/specs/ui/media-detail/media-detail-actions.md -> open-google-maps action parity.
    const url = `https://www.google.com/maps?q=${media.latitude},${media.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private showAlreadyOpenDetailsInfo(): void {
    // Spec link: docs/specs/ui/media-detail/media-detail-actions.md -> keep single-marker action parity in detail menu.
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

    const signal = this.abortController?.signal ?? new AbortController().signal;
    const refresh = await this.dataFacade.refreshImageLocationFields(currentMediaId, signal);
    if (refresh.applied && refresh.locationStatus) {
      this.mediaLocationStatus.set(refresh.locationStatus);
    }
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

    const refresh = await this.dataFacade.refreshImageLocationFields(id, signal);
    if (refresh.applied && refresh.locationStatus) {
      this.mediaLocationStatus.set(refresh.locationStatus);
    }
  }
}
