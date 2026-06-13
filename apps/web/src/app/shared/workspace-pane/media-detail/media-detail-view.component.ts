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

/** Stable state: parent shell — loading skeleton, error alert, or ready content. @see docs/specs/ui/media-detail/media-detail-view.md */
export type MediaDetailPaneLayout = 'narrow' | 'medium' | 'wide';
export type MediaDetailViewState = 'loading' | 'error' | 'ready';

function resolvePaneLayout(widthPx: number): MediaDetailPaneLayout {
  if (widthPx < 480) {
    return 'narrow';
  }
  if (widthPx <= 720) {
    return 'medium';
  }
  return 'wide';
}
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
import {
  GeocodingService,
  type ForwardGeocodeResult,
} from '../../../core/geocoding/geocoding.service';
import { detectCoordinates } from '../../../core/search/coordinate-detection';
import { MediaLocationUpdateService } from '../../../core/media-location-update/media-location-update.service';
import { MediaLocationsService } from '../../../core/media-locations/media-locations.service';
import {
  locationDisplaySnapshotFromRows,
  mergeLocationDisplayIntoMediaRecord,
} from '../../../core/media-locations/media-locations.helpers';
import type { MediaItemLocationRow } from '../../../core/media-locations/media-locations.types';
import { buildLocationUpdateFailureToast } from '../../../core/media-location-update/location-update-toast.util';
import type {
  DetailEditingField,
  MediaRecord,
  MetadataEntry,
  SelectOption,
} from './media-detail-view.types';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { QuickInfoChipsComponent } from '../../../shared/quick-info-chips/quick-info-chips.component';
import { MetadataSectionComponent } from './metadata-section/metadata-section.component';
import { DetailActionsComponent } from './detail-actions/detail-actions.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import {
  coerceLocationCoordinate,
  legacyMediaHasGps,
} from '../../../core/media-locations/media-locations.helpers';
import { MapZoomOrchestratorService } from '../../../core/map-zoom/map-zoom-orchestrator.service';
import {
  buildInfoChips,
  canCreateProjectOption,
  filterProjectOptions,
  formatCaptureDate,
  formatCoordinate,
  formatUploadDate,
  isImageLikeMedia,
  needsAddressResolutionAfterGps,
  hasValidGpsCoordinates,
  prepareLocationPatchAfterGpsChange,
  mergeMediaLocationPatch,
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
import type { ExifLocationAddState } from './media-detail-exif-location-add.state';
import { MediaDetailLocationSectionComponent } from './media-detail-location-section/media-detail-location-section.component';
import { ImageDetailProjectMembershipHelper } from './media-detail-project-membership.helper';
import { MediaDetailDataFacade } from '../../../core/media-detail-data/media-detail-data.facade';
import { MediaDetailLocationSyncService } from '../../../core/media-detail-data/media-detail-location-sync.service';
import { MediaDetailMetadataHelper } from './media-detail-metadata.helper';
import {
  addressSnapshotToSuggestion,
  EMPTY_ADDRESS_SUGGESTION,
  MediaDetailFieldsHelper,
  snapshotAddressFields,
} from './media-detail-fields.helper';
import {
  getDetailDestructiveConfirmCopy,
  type DetailDestructiveConfirmState,
} from './media-detail-destructive-confirm';
import { MediaDetailMediaEventsHelper } from './media-detail-media-events.helper';
import { MediaDetailUploadHelper } from './media-detail-upload.helper';
import { MediaDetailDeleteHelper } from './media-detail-delete.helper';
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
import type {
  MediaLocationLinkedPayload,
  MediaLocationReplaceFromGeocodePayload,
  MediaLocationReplaceFromTextPayload,
  MediaLocationReplaceLinkedPayload,
} from './media-detail-location-section/media-detail-location-section.component';
import type {
  MediaLocationCopyField,
  MediaLocationRowSavePayload,
} from './media-location-row/media-location-row.component';
/** @deprecated Legacy single-field save; retained until address-field flows are fully removed. */
interface AddressFieldSaveEvent {
  field: string;
  value: string;
  suggestion?: import('../../../core/address-field-suggest/address-field-suggest.types').AddressFieldSuggestion;
}
import type {
  AddressFieldKind,
  AddressFieldMeta,
  AddressFieldVerification,
} from '../../../core/address-field-suggest/address-field-suggest.types';
import type { ReconciliationOffer } from '../../../core/address-reconciliation/address-reconciliation.types';
import {
  collectLocationFieldChanges,
  type LocationHighlightField,
} from './media-detail-location-highlight.util';

export type { MediaRecord, MetadataEntry } from './media-detail-view.types';

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
    '[attr.data-pane-layout]': 'paneLayout()',
    '[attr.data-state]': 'viewState()',
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
  private readonly toastService = inject(ToastService);
  private readonly projectsService = inject(ProjectsService);
  private readonly actionEngineService = inject(ActionEngineService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  private readonly locationResolverService = inject(LocationResolverService);
  private readonly addressReconciliationService = inject(AddressReconciliationService);
  private readonly mediaLocationUpdateService = inject(MediaLocationUpdateService);
  private readonly mediaLocationsService = inject(MediaLocationsService);
  private readonly mapZoom = inject(MapZoomOrchestratorService);
  private readonly mediaDetailLocationSync = inject(MediaDetailLocationSyncService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly mediaId = input<string | null>(null);
  readonly paneWidth = input<number | null>(null);
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

  readonly media = signal<MediaRecord | null>(null);
  readonly metadata = signal<MetadataEntry[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private readonly measuredPaneWidth = signal(0);
  private resizeObserver: ResizeObserver | null = null;

  readonly paneLayout = computed((): MediaDetailPaneLayout => {
    const explicit = this.paneWidth();
    const width = explicit != null && explicit > 0 ? explicit : this.measuredPaneWidth();
    return resolvePaneLayout(width > 0 ? width : 720);
  });

  readonly viewState = computed((): MediaDetailViewState => {
    if (this.loading()) {
      return 'loading';
    }
    if (this.error()) {
      return 'error';
    }
    return 'ready';
  });
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
  /** Multi-location rows for Location section. @see core/media-locations/README.md */
  readonly locations = signal<MediaItemLocationRow[]>([]);
  /** First linked `locations.id` by sort_order — avoids list RPC on field save. */
  readonly displayLocationId = signal<string | null>(null);
  /** Target row for next map pick (`UploadLocationMapPickRequest.locationRowId`). */
  private pendingMapPickLocationRowId: string | null = null;
  readonly metadataKeyDefinitions = signal<
    import('./media-detail-view.types').MetadataKeyDefinitionView[]
  >([]);
  readonly replaceError = signal<string | null>(null);
  readonly editDate = signal('');
  readonly editTime = signal('');
  readonly reconciliationOffer = signal<import('../../../core/address-reconciliation/address-reconciliation.types').ReconciliationOffer | null>(null);
  /** Reverse geocode in flight after GPS / map pick — spinners on address rows. */
  readonly addressFieldsResolving = signal(false);
  /** Forward geocode in flight after address edit — spinner on coordinates row. */
  readonly coordinatesResolving = signal(false);
  /** Location rows that briefly flash primary after a successful update. */
  readonly highlightedLocationFields = signal<ReadonlySet<LocationHighlightField>>(new Set());
  /** EXIF row → add location pipeline. @see media-detail-inline-section.md */
  private readonly exifLocationAddResolving = signal(false);
  readonly acceptTypes = Array.from(ALLOWED_MIME_TYPES).join(',');
  private locationHighlightTimer: ReturnType<typeof setTimeout> | null = null;
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

  readonly hasPhoto = computed(() => !!this.media()?.storage_path);

  readonly detailMediaIdentity = computed(() => this.media()?.id ?? this.mediaId() ?? '');

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

  readonly hasCoordinates = computed(() => hasValidGpsCoordinates(this.media()));

  readonly exifLocationAddState = computed((): ExifLocationAddState => {
    if (this.exifLocationAddResolving()) {
      return 'resolving';
    }
    const media = this.media();
    if (media?.exif_latitude != null && media?.exif_longitude != null) {
      return 'idle';
    }
    return 'hidden';
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

  readonly isImageLike = computed(() =>
    isImageLikeMedia(
      this.mediaType(),
      this.mediaMimeType(),
      this.media()?.storage_path ?? null,
    ),
  );

  readonly infoChips = computed(() =>
    buildInfoChips({
      media: this.media(),
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
      media: this.media,
      metadata: this.metadata,
      loading: this.loading,
      error: this.error,
      projectOptions: this.projectOptions,
      metadataKeyDefinitions: this.metadataKeyDefinitions,
    },
    computed: {
      mediaType: () => this.mediaType(),
      mediaMimeType: () => this.mediaMimeType(),
    },
  });

  private readonly metadataHelper = new MediaDetailMetadataHelper({
    services: {
      metadata: this.metadataService,
    },
    signals: {
      media: this.media,
      mediaId: () => this.mediaId(),
      metadata: this.metadata,
      saving: this.saving,
    },
  });

  private readonly fieldsHelper = new MediaDetailFieldsHelper({
    services: {
      supabase: this.supabaseService,
      toastService: this.toastService,
      mediaLocations: this.mediaLocationsService,
      mediaLocationUpdate: this.mediaLocationUpdateService,
    },
    signals: {
      media: this.media,
      editingField: this.editingField,
      saving: this.saving,
      editDate: this.editDate,
      editTime: this.editTime,
      displayLocationId: this.displayLocationId,
      locations: this.locations,
    },
    callbacks: {
      syncDisplayFromRows: (rows) => this.applyLocationDisplayFromRows(rows),
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
      media: this.media,
      activeJobId: this.activeJobId,
    },
    callbacks: {
      t: this.t,
    },
  });

  private readonly uploadHelper = new MediaDetailUploadHelper({
    services: {
      uploadService: this.uploadService,
      uploadManager: this.uploadManager,
    },
    signals: {
      media: this.media,
      replaceError: this.replaceError,
      activeJobId: this.activeJobId,
    },
    callbacks: {
      findJobForFailure: (event) => {
        const job = this.uploadManager.jobs().find((candidate) => candidate.id === event.jobId);
        return job?.targetMediaId === this.mediaId();
      },
    },
  });

  private readonly deleteHelper = new MediaDetailDeleteHelper({
    services: {
      mediaDeleteUndo: this.mediaDeleteUndo,
    },
    signals: {
      mediaId: () => this.mediaId(),
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
      const patch = {
        latitude: evt.lat,
        longitude: evt.lng,
        location_unresolved: false,
        ...evt.address,
      };
      const targetMediaId = mediaId;
      // Patch signals after the effect completes — writing `media` inside this effect breaks the page.
      if (evt.locationRowId) {
        queueMicrotask(() => void this.handleExternalLocationRowSync(targetMediaId, evt.locationRowId!, patch));
      } else {
        queueMicrotask(() => this.handleExternalLocationSync(targetMediaId, patch));
      }
    });

    this.uploadManager.imageReplaced$
      .pipe(
        takeUntilDestroyed(),
        filter((event) => event.mediaId === this.mediaId()),
      )
      .subscribe((event) => void this.handleImageReplaced(event));

    this.uploadManager.imageAttached$
      .pipe(
        takeUntilDestroyed(),
        filter((event) => event.mediaId === this.mediaId()),
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

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? 0;
        this.measuredPaneWidth.set(width);
      });
      this.resizeObserver.observe(this.elementRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.abortController?.abort();
    if (this.locationHighlightTimer) {
      clearTimeout(this.locationHighlightTimer);
      this.locationHighlightTimer = null;
    }
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
    this.error.set(null);
    this.loading.set(false);
    this.saving.set(false);
    this.showContextMenu.set(false);
    this.destructiveConfirm.set(null);
    this.editingField.set(null);
    this.locations.set([]);
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
    this.media.set(mergeMediaLocationPatch(current, patch));
  }

  private static readonly LOCATION_FIELD_FLASH_MS = 3200;

  private flashLocationFields(fields: readonly LocationHighlightField[]): void {
    if (fields.length === 0) {
      return;
    }
    if (this.locationHighlightTimer) {
      clearTimeout(this.locationHighlightTimer);
    }
    // Reset so repeated updates replay the animation; run after spinners hide values.
    this.highlightedLocationFields.set(new Set());
    queueMicrotask(() => {
      this.highlightedLocationFields.set(new Set(fields));
      this.locationHighlightTimer = setTimeout(() => {
        this.highlightedLocationFields.set(new Set());
        this.locationHighlightTimer = null;
      }, MediaDetailViewComponent.LOCATION_FIELD_FLASH_MS);
    });
  }

  /** Map-pick / external coordinate save — in-place patch only, no `loadMedia`. */
  private handleExternalLocationSync(
    mediaId: string,
    patch: MediaLocationAddressPatch & {
      latitude?: number | null;
      longitude?: number | null;
      location_unresolved?: boolean;
      gps_assignment_allowed?: boolean;
    },
  ): void {
    if (this.mediaId() !== mediaId) {
      return;
    }
    const current = this.media();
    if (!current) {
      return;
    }
    this.mediaDetailLocationSync.clearPending(mediaId);
    const updatesGps = patch.latitude !== undefined && patch.longitude !== undefined;
    if (updatesGps) {
      // GPS changed — always re-fetch address lines (old street/city must not block refresh).
      this.addressFieldsResolving.set(true);
    }
    this.applyLocationPatch(prepareLocationPatchAfterGpsChange(current, patch));
    if (!updatesGps) {
      return;
    }
    void this.syncLocationFieldsAfterGps(mediaId, current);
  }

  /** Refresh structured address + coords from DB after GPS assignment (keeps spinners, no full reload). */
  private async syncLocationFieldsAfterGps(
    mediaId: string,
    snapshotBefore?: MediaRecord,
  ): Promise<void> {
    const before = snapshotBefore ?? this.media();
    let fieldsToFlash: LocationHighlightField[] = [];
    try {
      const mediaItemId = this.mediaItemId();
      if (mediaItemId) {
        await this.locationResolverService.resolvePendingMediaItem(mediaItemId);
      }
      const signal = this.abortController?.signal ?? new AbortController().signal;
      let refresh = await this.dataFacade.refreshMediaLocationFields(mediaId, signal);

      const media = this.media();
      if (
        media &&
        hasValidGpsCoordinates(media) &&
        needsAddressResolutionAfterGps(media) &&
        media.latitude != null &&
        media.longitude != null
      ) {
        const result = await this.mediaLocationUpdateService.updateFromCoordinates(media.id, {
          lat: media.latitude,
          lng: media.longitude,
        });
        if (result.ok) {
          this.applyLocationPatch({
            latitude: result.lat ?? media.latitude,
            longitude: result.lng ?? media.longitude,
            location_unresolved: false,
            ...result.address,
          });
          refresh = await this.dataFacade.refreshMediaLocationFields(mediaId, signal);
        }
      }

      if (refresh.applied && refresh.locationStatus) {
        this.mediaLocationStatus.set(refresh.locationStatus);
      }
      if (refresh.applied && hasValidGpsCoordinates(this.media())) {
        this.mediaLocationStatus.set('resolved');
      }

      const after = this.media();
      if (before && after) {
        fieldsToFlash = collectLocationFieldChanges(before, after);
      }
    } finally {
      this.addressFieldsResolving.set(false);
      if (fieldsToFlash.length > 0) {
        queueMicrotask(() => this.flashLocationFields(fieldsToFlash));
      }
    }
  }

  private applyPendingLocationSyncIfAny(mediaId: string): void {
    const pending = this.mediaDetailLocationSync.consumePending(mediaId);
    if (!pending) {
      return;
    }
    queueMicrotask(() =>
      this.handleExternalLocationSync(pending.mediaId, {
        latitude: pending.lat,
        longitude: pending.lng,
        location_unresolved: false,
        ...pending.address,
      }),
    );
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

    this.addressFieldsResolving.set(true);
    await this.syncLocationFieldsAfterGps(mediaId);
  }

  private async loadMedia(id: string): Promise<void> {
    this.abortController?.abort();
    this.abortController = new AbortController();
    await this.dataFacade.loadMedia(id, this.abortController.signal);
    if (this.abortController.signal.aborted) {
      return;
    }

    await this.reloadLocations(id);

    this.applyPendingLocationSyncIfAny(id);

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
    const patch: Partial<MediaRecord> = { address_field_meta: meta };

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
  async clearAddressField(field: AddressFieldKind): Promise<void> {
    await this.executeClearAddressField(field);
  }

  async saveAddressField(event: AddressFieldSaveEvent): Promise<void> {
    const saved = await this.fieldsHelper.saveImageField(event.field, event.value);
    if (!saved) {
      return;
    }

    const addressFields: readonly string[] = ['street', 'city', 'district', 'country'];
    if (!addressFields.includes(event.field)) {
      return;
    }

    const field = event.field as AddressFieldKind;
    const newFieldMeta = event.suggestion
      ? { source: 'geocoder' as const, verified: true }
      : { source: 'user' as const, verified: false };

    await this.persistAddressFieldMeta(field, newFieldMeta);

    if (event.value.trim()) {
      void this.resolveGpsFromAddressFields();
    }
  }

  private async persistAddressFieldMeta(
    field: AddressFieldKind,
    verification: AddressFieldVerification,
  ): Promise<void> {
    const mediaItem = this.media();
    if (!mediaItem) {
      return;
    }

    const updatedMeta = { ...(mediaItem.address_field_meta ?? {}), [field]: verification };
    await this.supabaseService.client
      .from('media_items')
      .update({ address_field_meta: updatedMeta })
      .or(`id.eq.${mediaItem.id},source_image_id.eq.${mediaItem.id}`);

    this.media.update((current) =>
      current ? { ...current, address_field_meta: updatedMeta } : current,
    );
  }

  private static readonly ADDRESS_FIELD_LABEL_KEYS: Record<
    AddressFieldKind,
    { key: string; fallback: string }
  > = {
    street: { key: 'workspace.imageDetail.field.street', fallback: 'Street' },
    city: { key: 'workspace.imageDetail.field.city', fallback: 'City' },
    district: { key: 'workspace.imageDetail.field.district', fallback: 'District' },
    country: { key: 'workspace.imageDetail.field.country', fallback: 'Country' },
  };

  private async executeClearAddressField(field: AddressFieldKind): Promise<void> {
    const img = this.media();
    if (!img) {
      return;
    }

    const previousValue = img[field];
    if (!previousValue?.trim()) {
      return;
    }

    const previousMeta = img.address_field_meta?.[field];
    const label = MediaDetailViewComponent.ADDRESS_FIELD_LABEL_KEYS[field];

    const cleared = await this.fieldsHelper.saveImageField(field, '');
    if (!cleared) {
      this.toastService.show({
        message: this.t(
          'workspace.imageDetail.toast.addressFieldClearFailed',
          'Could not clear field',
        ),
        type: 'error',
      });
      return;
    }

    await this.persistAddressFieldMeta(field, { source: 'user', verified: false });

    const fieldLabel = this.t(label.key, label.fallback);
    this.showUndoToast(
      this.t('workspace.imageDetail.toast.addressFieldCleared', `${fieldLabel} removed`),
      async () => {
        const restored = await this.fieldsHelper.saveImageField(field, previousValue);
        if (!restored) {
          return;
        }
        if (previousMeta) {
          await this.persistAddressFieldMeta(field, previousMeta);
        }
      },
    );
  }

  /** Forward-geocode composed address lines and update active coordinates (address → GPS). */
  private async resolveGpsFromAddressFields(): Promise<void> {
    const media = this.media();
    if (!media) {
      return;
    }

    const query = this.fullAddress().trim();
    if (!query) {
      return;
    }

    const before = media;
    let fieldsToFlash: LocationHighlightField[] = [];
    this.coordinatesResolving.set(true);
    try {
      const suggestion = await this.geocodingService.forward(query);
      if (!suggestion) {
        return;
      }

      const result = await this.mediaLocationUpdateService.updateFromAddressSuggestion(
        media.id,
        suggestion,
      );
      if (!result.ok) {
        this.toastService.show({
          ...buildLocationUpdateFailureToast(result.error, {
            file: 'media-detail-view.component.ts',
            fn: 'resolveGpsFromAddressFields',
          }),
        });
        return;
      }

      const patch = locationPatchFromForwardGeocode(suggestion);
      if (result.address) {
        Object.assign(patch, result.address);
      }
      this.applyLocationPatch(patch);
      await this.fieldsHelper.persistAddressFieldMetaFromGeocode(suggestion);

      const signal = this.abortController?.signal ?? new AbortController().signal;
      await this.dataFacade.refreshMediaLocationFields(media.id, signal);

      const after = this.media();
      if (after) {
        fieldsToFlash = collectLocationFieldChanges(before, after);
      }
      this.mediaLocationStatus.set('resolved');
    } finally {
      this.coordinatesResolving.set(false);
      if (fieldsToFlash.length > 0) {
        queueMicrotask(() => this.flashLocationFields(fieldsToFlash));
      }
    }
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
    if (!media || !hasValidGpsCoordinates(media)) return;
    this.mapZoom.requestZoom({
      source: 'media-detail-actions',
      mediaId: media.id,
      lat: media.latitude,
      lng: media.longitude,
      zoomMode,
    });
  }

  async revertCoordinatesToExif(): Promise<void> {
    await this.executeRevertCoordinates();
  }

  async clearCoordinates(): Promise<void> {
    await this.executeClearCoordinates();
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

    const before = media;
    let resolved = suggestion;
    if (!Number.isFinite(suggestion.lat) || !Number.isFinite(suggestion.lng)) {
      const query = suggestion.addressLabel?.trim() || this.fullAddress().trim();
      if (!query) {
        await this.fieldsHelper.applyAddressSuggestion(suggestion);
        return;
      }
      const forward = await this.geocodingService.forward(query);
      if (!forward) {
        await this.fieldsHelper.applyAddressSuggestion(suggestion);
        return;
      }
      resolved = forward;
    }

    this.saving.set(true);
    this.addressFieldsResolving.set(true);
    this.coordinatesResolving.set(true);
    let fieldsToFlash: LocationHighlightField[] = [];
    try {
      const result = await this.mediaLocationUpdateService.updateFromAddressSuggestion(
        media.id,
        resolved,
      );
      if (!result.ok) {
        this.toastService.show({
          ...buildLocationUpdateFailureToast(result.error, {
            file: 'media-detail-view.component.ts',
            fn: 'applyAddressSuggestion',
          }),
        });
        return;
      }

      const patch = locationPatchFromForwardGeocode(resolved);
      if (result.lat !== undefined) {
        patch.latitude = result.lat;
      }
      if (result.lng !== undefined) {
        patch.longitude = result.lng;
      }
      if (result.address) {
        Object.assign(patch, result.address);
      }

      this.applyLocationPatch(patch);
      await this.fieldsHelper.persistAddressFieldMetaFromGeocode(resolved);

      const signal = this.abortController?.signal ?? new AbortController().signal;
      await this.dataFacade.refreshMediaLocationFields(media.id, signal);

      const after = this.media();
      if (after) {
        fieldsToFlash = collectLocationFieldChanges(before, after);
      }
      this.mediaLocationStatus.set('resolved');
      this.editingField.set(null);
    } finally {
      this.saving.set(false);
      this.addressFieldsResolving.set(false);
      this.coordinatesResolving.set(false);
      if (fieldsToFlash.length > 0) {
        queueMicrotask(() => this.flashLocationFields(fieldsToFlash));
      }
    }
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

  private async executeClearCoordinates(): Promise<void> {
    const img = this.media();
    if (!img) {
      return;
    }

    const undoSnapshot = {
      latitude: img.latitude,
      longitude: img.longitude,
      location_status: this.mediaLocationStatus(),
    };
    const cleared = await this.fieldsHelper.clearActiveCoordinates({ suppressToast: true });
    if (!cleared) {
      return;
    }

    const status = this.media()?.location_status;
    if (status) {
      this.mediaLocationStatus.set(status);
    }

    this.showUndoToast(
      this.t('workspace.imageDetail.toast.coordinatesCleared', 'Coordinates removed'),
      async () => {
        await this.fieldsHelper.restoreCoordinates(
          undoSnapshot.latitude,
          undoSnapshot.longitude,
          { location_status: undoSnapshot.location_status },
        );
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
    this.addressFieldsResolving.set(true);
    const result = await this.mediaLocationUpdateService.updateFromCoordinates(media.id, coords);
    if (!result.ok) {
      this.saving.set(false);
      this.addressFieldsResolving.set(false);
      this.toastService.show({
        ...buildLocationUpdateFailureToast(result.error, {
          file: 'media-detail-view.component.ts',
          fn: 'saveCoordinatesFromInput',
        }),
      });
      return;
    }

    const patch = prepareLocationPatchAfterGpsChange(media, {
      latitude: result.lat ?? coords.lat,
      longitude: result.lng ?? coords.lng,
      location_unresolved: false,
      ...result.address,
    });
    this.applyLocationPatch(patch);
    await this.syncLocationFieldsAfterGps(media.id);
    this.editingField.set(null);
    this.saving.set(false);
    this.toastService.show({
      message: this.t('upload.location.update.success', 'Location updated.'),
      type: 'success',
      dedupe: true,
    });
  }

  requestMapLocationPick(locationRowId?: string): void {
    const media = this.media();
    if (!media) {
      return;
    }

    this.editingField.set(null);
    this.pendingMapPickLocationRowId = locationRowId ?? null;

    // Spec link: docs/specs/ui/media-detail/media-detail-actions.md -> change-location-map action availability.
    this.locationMapPickRequested.emit({
      mediaId: media.id,
      fileName: media.id,
      locationRowId,
    });
  }

  onLocationShowOnMap(locationRowId: string): void {
    const media = this.media();
    if (!media) {
      return;
    }
    const row = this.locations().find((item) => item.id === locationRowId);
    const fromRow =
      row && legacyMediaHasGps(row.latitude, row.longitude)
        ? {
            lat: coerceLocationCoordinate(row.latitude)!,
            lng: coerceLocationCoordinate(row.longitude)!,
          }
        : null;
    const fromMedia = hasValidGpsCoordinates(media)
      ? {
          lat: coerceLocationCoordinate(media.latitude)!,
          lng: coerceLocationCoordinate(media.longitude)!,
        }
      : null;
    const target = fromRow ?? fromMedia;
    if (!target) {
      return;
    }
    this.mapZoom.requestZoom({
      source: 'media-detail-location-row',
      mediaId: media.id,
      lat: target.lat,
      lng: target.lng,
      locationId: locationRowId,
      zoomMode: 'house',
    });
  }

  /** Loads location rows and syncs display projection onto `media()`. */
  async reloadLocations(mediaId: string): Promise<void> {
    this.mediaLocationsService.invalidateListCache(mediaId);
    const result = await this.mediaLocationsService.listForMedia(mediaId);
    if (result.ok && 'rows' in result) {
      this.locations.set(result.rows);
      this.applyLocationDisplayFromRows(result.rows);
    }
  }

  private applyLocationDisplayFromRows(rows: readonly MediaItemLocationRow[]): void {
    const snapshot = locationDisplaySnapshotFromRows(rows);
    this.displayLocationId.set(snapshot?.displayLocationId ?? null);
    const current = this.media();
    if (!current) {
      return;
    }
    this.media.set(mergeLocationDisplayIntoMediaRecord(current, snapshot));
  }

  /** After row CRUD: one list fetch, then patch `locations` + `media()` from same snapshot. */
  private async refreshMediaAfterLocationMutation(mediaId: string): Promise<void> {
    await this.reloadLocations(mediaId);
  }

  async onExifToLocationRequested(): Promise<void> {
    const media = this.media();
    if (!media || media.exif_latitude == null || media.exif_longitude == null) {
      return;
    }
    if (this.exifLocationAddResolving()) {
      return;
    }
    const previousLocationIds = new Set(this.locations().map((row) => row.id));
    this.exifLocationAddResolving.set(true);
    this.saving.set(true);
    const result = await this.mediaLocationsService.addFromExifCoordinates(media.id, {
      lat: media.exif_latitude,
      lng: media.exif_longitude,
    });
    this.saving.set(false);
    this.exifLocationAddResolving.set(false);
    if (!result.ok) {
      this.toastService.show({ message: result.error, type: 'warning' });
      return;
    }
    await this.refreshMediaAfterLocationMutation(media.id);
    const addedRow = result.ok && 'row' in result ? result.row : undefined;
    const alreadyLinked = addedRow ? previousLocationIds.has(addedRow.id) : false;
    if (alreadyLinked) {
      this.toastService.show({
        message: this.t(
          'location.picker.already_linked',
          'This address is already linked to this media.',
        ),
        type: 'success',
        dedupe: true,
      });
      return;
    }
    if (result.reverseGeocodeFailed) {
      this.toastService.show({
        message: this.t(
          'workspace.imageDetail.toast.exifLocationGeocodeFailed',
          'Address could not be resolved; location saved with GPS coordinates only',
        ),
        type: 'warning',
        dedupe: true,
      });
    }
    this.toastService.show({
      message: this.t(
        'workspace.imageDetail.toast.exifLocationAdded',
        'Location added from EXIF coordinates',
      ),
      type: 'success',
      dedupe: true,
    });
  }

  async onLocationAddFromText(label: string): Promise<void> {
    const media = this.media();
    if (!media) return;
    this.saving.set(true);
    const result = await this.mediaLocationsService.addFromFreeText(media.id, label);
    this.saving.set(false);
    if (!result.ok) {
      this.toastService.show({ message: result.error, type: 'warning' });
      return;
    }
    await this.refreshMediaAfterLocationMutation(media.id);
    this.toastService.show({
      message: this.t('location.toast.added', 'Location added'),
      type: 'success',
      dedupe: true,
    });
  }

  async onLocationAddFromGeocode(suggestion: ForwardGeocodeResult): Promise<void> {
    const media = this.media();
    if (!media) return;
    this.saving.set(true);
    const result = await this.mediaLocationsService.addFromGeocodeSuggestion(media.id, suggestion);
    this.saving.set(false);
    if (!result.ok) {
      this.toastService.show({ message: result.error, type: 'warning' });
      return;
    }
    await this.refreshMediaAfterLocationMutation(media.id);
    this.toastService.show({
      message: this.t('location.toast.added', 'Location added'),
      type: 'success',
      dedupe: true,
    });
  }

  async onLocationLinked(payload: MediaLocationLinkedPayload): Promise<void> {
    const media = this.media();
    if (!media) return;
    this.saving.set(true);
    const result = await this.mediaLocationsService.linkExistingLocation(media.id, payload.locationId);
    this.saving.set(false);
    if (!result.ok) {
      this.toastService.show({ message: result.error, type: 'warning' });
      return;
    }
    await this.refreshMediaAfterLocationMutation(media.id);
    this.toastService.show({
      message: payload.alreadyLinked
        ? this.t('location.picker.already_linked', 'This address is already linked to this media.')
        : this.t('location.picker.linked', 'Location linked'),
      type: 'success',
      dedupe: true,
    });
  }

  async onLocationReplaceLinked(payload: MediaLocationReplaceLinkedPayload): Promise<void> {
    const media = this.media();
    if (!media) return;
    this.saving.set(true);
    const result = await this.mediaLocationsService.replaceWithExistingLocation(
      media.id,
      payload.previousLocationId,
      payload.locationId,
    );
    this.saving.set(false);
    if (!result.ok) {
      this.toastService.show({ message: result.error, type: 'warning' });
      return;
    }
    await this.refreshMediaAfterLocationMutation(media.id);
    this.toastService.show({
      message: payload.alreadyLinked
        ? this.t('location.picker.already_linked', 'This address is already linked to this media.')
        : this.t('location.toast.changed', 'Location changed'),
      type: 'success',
      dedupe: true,
    });
  }

  async onLocationReplaceFromText(payload: MediaLocationReplaceFromTextPayload): Promise<void> {
    const media = this.media();
    if (!media) return;
    this.saving.set(true);
    const result = await this.mediaLocationsService.replaceLocationLinkFromFreeText(
      media.id,
      payload.previousLocationId,
      payload.label,
    );
    this.saving.set(false);
    if (!result.ok) {
      this.toastService.show({ message: result.error, type: 'warning' });
      return;
    }
    await this.refreshMediaAfterLocationMutation(media.id);
    this.toastService.show({
      message: this.t('location.toast.changed', 'Location changed'),
      type: 'success',
      dedupe: true,
    });
  }

  async onLocationReplaceFromGeocode(payload: MediaLocationReplaceFromGeocodePayload): Promise<void> {
    const media = this.media();
    if (!media) return;
    this.saving.set(true);
    const result = await this.mediaLocationsService.replaceLocationLinkFromGeocode(
      media.id,
      payload.previousLocationId,
      payload.suggestion,
    );
    this.saving.set(false);
    if (!result.ok) {
      this.toastService.show({ message: result.error, type: 'warning' });
      return;
    }
    await this.refreshMediaAfterLocationMutation(media.id);
    this.toastService.show({
      message: this.t('location.toast.changed', 'Location changed'),
      type: 'success',
      dedupe: true,
    });
  }

  async onLocationRowSave(payload: MediaLocationRowSavePayload): Promise<void> {
    const media = this.media();
    if (!media) return;
    this.saving.set(true);
    const result = await this.mediaLocationsService.updateLocation({
      locationId: payload.locationId,
      street: payload.street,
      house_number: payload.house_number,
      staircase: payload.staircase,
      door: payload.door,
      floor: payload.floor,
      postcode: payload.postcode,
      extra_information: payload.extra_information,
    });
    this.saving.set(false);
    if (!result.ok) {
      this.toastService.show({ message: result.error, type: 'warning' });
      return;
    }
    await this.refreshMediaAfterLocationMutation(media.id);
  }

  async onLocationRowDelete(locationId: string): Promise<void> {
    const media = this.media();
    if (!media) return;
    this.saving.set(true);
    const del = await this.mediaLocationsService.deleteLocation(locationId);
    if (!del.ok) {
      this.saving.set(false);
      this.toastService.show({ message: del.error, type: 'warning' });
      return;
    }
    await this.refreshMediaAfterLocationMutation(media.id);
    this.saving.set(false);
  }

  async onLocationCopyField(action: MediaLocationCopyField): Promise<void> {
    await navigator.clipboard.writeText(action.value).catch(() => undefined);
    this.toastService.show({
      message: this.t('workspace.mediaDetail.toast.copied', 'Copied'),
      type: 'success',
      duration: 1800,
    });
  }

  private async handleExternalLocationRowSync(
    mediaId: string,
    _locationRowId: string,
    patch: MediaLocationAddressPatch & {
      latitude?: number | null;
      longitude?: number | null;
      location_unresolved?: boolean;
    },
  ): Promise<void> {
    if (this.mediaId() !== mediaId) {
      return;
    }
    await this.reloadLocations(mediaId);
    const current = this.media();
    if (!current) {
      return;
    }
    this.applyLocationPatch(prepareLocationPatchAfterGpsChange(current, patch));
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
    const refresh = await this.dataFacade.refreshMediaLocationFields(currentMediaId, signal);
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

    const refresh = await this.dataFacade.refreshMediaLocationFields(id, signal);
    if (refresh.applied && refresh.locationStatus) {
      this.mediaLocationStatus.set(refresh.locationStatus);
    }
  }
}
