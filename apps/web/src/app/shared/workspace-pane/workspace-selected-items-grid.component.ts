/** IS OUTDATED, USE ITEM GRID, MOVE TO ARCHIVE WHEN NO WHERE IN USE ANYMORE */

import type { ElementRef, OnDestroy } from '@angular/core';
import {
  Component,
  HostListener,
  afterNextRender,
  computed,
  effect,
  input,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { WorkspaceViewService } from '../../core/workspace-view/workspace-view.service';
import { FilterService } from '../../core/filter/filter.service';
import { WorkspaceSelectionService } from '../../core/workspace-selection/workspace-selection.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { ToastService } from '../../core/toast/toast.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { GeocodingService } from '../../core/geocoding/geocoding.service';
import { MediaLocationUpdateService } from '../../core/media-location-update/media-location-update.service';
import { ShareSetService } from '../../core/share-set/share-set.service';
import { MediaDownloadService } from '../../core/media-download/media-download.service';
import { LocationResolverService } from '../../core/location-resolver/location-resolver.service';
import type {
  GroupedSection,
  WorkspaceImage,
} from '../../core/workspace-view/workspace-view.types';
import type { ThumbnailCardHoverEvent } from '../../core/workspace-pane/workspace-pane-thumbnail-hover.types';
import type { ItemContextActionEvent } from '../../shared/item-grid/item.component';
import {
  MEDIA_ITEM_ACTION_CONTEXT,
  MediaItemComponent,
} from '../media-item/media-item.component';
import { workspaceMediaToImageRecord } from './workspace-media-mapper';
import { GroupHeaderComponent } from '../../shared/ui-primitives/group-header.component';
import { DropdownShellComponent } from '../../shared/dropdown-trigger/dropdown-shell.component';
import {
  ProjectSelectDialogComponent,
  type ProjectSelectOption,
} from '../../shared/project-select-dialog/project-select-dialog.component';
import { TextInputDialogComponent } from '../../shared/text-input-dialog/text-input-dialog.component';
import { ItemGridComponent } from '../../shared/item-grid/item-grid.component';
import type { ItemDisplayMode } from '../../shared/item-grid/item.component';
import { ACTION_CONTEXT_IDS } from '../../core/action/action-context-ids';
import type { UploadLocationMapPickRequest } from '../../core/workspace-pane/workspace-pane-shell-events.types';

/** Flat renderable item â€” either a group header or a grid of images. */
type RenderItem =
  | { type: 'header'; heading: string; imageCount: number; level: number }
  | { type: 'grid'; images: WorkspaceImage[] };

type ThumbnailContextActionSection = 'primary' | 'secondary' | 'destructive';

type ThumbnailContextActionId =
  | 'open_in_media'
  | 'zoom_house'
  | 'zoom_street'
  | 'copy_address'
  | 'copy_gps'
  | 'open_google_maps'
  | 'assign_to_project'
  | 'resolve_location'
  | 'change_location_map'
  | 'change_location_address'
  | 'remove_from_project'
  | 'delete_media'
  | 'download'
  | 'share_link'
  | 'copy_link'
  | 'native_share';

export const WS_GRID_THUMBNAIL_CONTEXT = ACTION_CONTEXT_IDS.wsGridThumbnail;

export const WS_GRID_THUMBNAIL_ACTION_IDS: ReadonlyArray<ThumbnailContextActionId> = [
  'open_in_media',
  'zoom_house',
  'zoom_street',
  'copy_address',
  'copy_gps',
  'open_google_maps',
  'assign_to_project',
  'resolve_location',
  'change_location_map',
  'change_location_address',
  'remove_from_project',
  'delete_media',
  'download',
  'share_link',
  'copy_link',
  'native_share',
];

type ThumbnailContextActionDefinition = {
  id: ThumbnailContextActionId;
  icon: string;
  section: ThumbnailContextActionSection;
  labelKey: string;
  fallbackLabel: string;
  visibleWhen: (context: {
    targetCount: number;
    locationKnown: boolean;
    deviceSupportsNativeShare: boolean;
  }) => boolean;
};

const THUMBNAIL_CONTEXT_ACTION_DEFINITIONS: ReadonlyArray<ThumbnailContextActionDefinition> = [
  {
    id: 'open_in_media',
    icon: 'open_in_new',
    section: 'primary',
    labelKey: 'workspace.thumbnailGrid.menu.action.openInMedia',
    fallbackLabel: 'Open in media',
    visibleWhen: (context) => context.targetCount === 1,
  },
  {
    id: 'zoom_house',
    icon: 'center_focus_strong',
    section: 'primary',
    labelKey: 'workspace.thumbnailGrid.menu.action.zoomHouse',
    fallbackLabel: 'Hierhin zoomen (Hausnaehe)',
    visibleWhen: (context) => context.targetCount === 1 && context.locationKnown,
  },
  {
    id: 'zoom_street',
    icon: 'zoom_in',
    section: 'primary',
    labelKey: 'workspace.thumbnailGrid.menu.action.zoomStreet',
    fallbackLabel: 'Hierhin zoomen (Strassennaehe)',
    visibleWhen: (context) => context.targetCount === 1 && context.locationKnown,
  },
  {
    id: 'copy_address',
    icon: 'content_copy',
    section: 'primary',
    labelKey: 'workspace.thumbnailGrid.menu.action.copyAddress',
    fallbackLabel: 'Adresse kopieren',
    visibleWhen: (context) => context.targetCount === 1 && context.locationKnown,
  },
  {
    id: 'copy_gps',
    icon: 'content_copy',
    section: 'primary',
    labelKey: 'workspace.thumbnailGrid.menu.action.copyGps',
    fallbackLabel: 'GPS kopieren',
    visibleWhen: (context) => context.targetCount === 1 && context.locationKnown,
  },
  {
    id: 'open_google_maps',
    icon: 'open_in_new',
    section: 'primary',
    labelKey: 'workspace.thumbnailGrid.menu.action.openGoogleMaps',
    fallbackLabel: 'In Google Maps oeffnen',
    visibleWhen: (context) => context.targetCount === 1 && context.locationKnown,
  },
  {
    id: 'assign_to_project',
    icon: 'folder_open',
    section: 'primary',
    labelKey: 'workspace.thumbnailGrid.menu.action.assignToProject',
    fallbackLabel: 'Projekt hinzufuegen...',
    visibleWhen: (context) => context.targetCount > 0,
  },
  {
    id: 'resolve_location',
    icon: 'travel_explore',
    section: 'primary',
    labelKey: 'workspace.thumbnailGrid.menu.action.resolveLocation',
    fallbackLabel: 'Standort aufloesen',
    visibleWhen: (context) => context.targetCount === 1,
  },
  {
    id: 'change_location_map',
    icon: 'pin_drop',
    section: 'primary',
    labelKey: 'workspace.thumbnailGrid.menu.action.changeLocationMap',
    fallbackLabel: 'Change GPS location',
    visibleWhen: (context) => context.targetCount === 1,
  },
  {
    id: 'change_location_address',
    icon: 'search',
    section: 'primary',
    labelKey: 'workspace.thumbnailGrid.menu.action.changeLocationAddress',
    fallbackLabel: 'Change address',
    visibleWhen: (context) => context.targetCount > 0,
  },
  {
    id: 'download',
    icon: 'folder_zip',
    section: 'secondary',
    labelKey: 'workspace.thumbnailGrid.menu.action.download',
    fallbackLabel: 'Export ZIP',
    visibleWhen: (context) => context.targetCount > 0,
  },
  {
    id: 'share_link',
    icon: 'share',
    section: 'secondary',
    labelKey: 'workspace.thumbnailGrid.menu.action.shareLink',
    fallbackLabel: 'Share link',
    visibleWhen: (context) => context.targetCount > 0,
  },
  {
    id: 'copy_link',
    icon: 'content_copy',
    section: 'secondary',
    labelKey: 'workspace.thumbnailGrid.menu.action.copyLink',
    fallbackLabel: 'Copy link',
    visibleWhen: (context) => context.targetCount > 0,
  },
  {
    id: 'native_share',
    icon: 'ios_share',
    section: 'secondary',
    labelKey: 'workspace.thumbnailGrid.menu.action.nativeShare',
    fallbackLabel: 'Share',
    visibleWhen: (context) => context.targetCount > 0 && context.deviceSupportsNativeShare,
  },
  {
    id: 'remove_from_project',
    icon: 'remove_circle_outline',
    section: 'destructive',
    labelKey: 'upload.item.menu.destructive.removeFromProject',
    fallbackLabel: 'Remove from project',
    visibleWhen: (context) => context.targetCount > 0,
  },
  {
    id: 'delete_media',
    icon: 'delete',
    section: 'destructive',
    labelKey: 'workspace.imageDetail.action.delete',
    fallbackLabel: 'Delete media',
    visibleWhen: (context) => context.targetCount > 0,
  },
];

@Component({
  selector: 'app-workspace-selected-items-grid',
  templateUrl: './workspace-selected-items-grid.component.html',
  styleUrl: './workspace-selected-items-grid.component.scss',
  imports: [
    MediaItemComponent,
    ItemGridComponent,
    GroupHeaderComponent,
    DropdownShellComponent,
    ProjectSelectDialogComponent,
    TextInputDialogComponent,
  ],
})
export class WorkspaceSelectedItemsGridComponent implements OnDestroy {
  protected readonly viewService = inject(WorkspaceViewService);
  protected readonly selectionService = inject(WorkspaceSelectionService);
  private readonly filterService = inject(FilterService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly toastService = inject(ToastService);
  private readonly i18nService = inject(I18nService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly mediaLocationUpdateService = inject(MediaLocationUpdateService);
  private readonly locationResolverService = inject(LocationResolverService);
  private readonly shareSetService = inject(ShareSetService);
  private readonly mediaDownloadService = inject(MediaDownloadService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);
  readonly currentLanguage = this.i18nService.language;

  readonly MEDIA_ITEM_ACTION_CONTEXT = MEDIA_ITEM_ACTION_CONTEXT;
  readonly workspaceMediaToImageRecord = workspaceMediaToImageRecord;

  readonly thumbnailCardSizePx = computed(() => {
    switch (this.viewService.thumbnailSizePreset()) {
      case 'row':
        return 96;
      case 'small':
        return 96;
      case 'large':
        return 160;
      default:
        return 128;
    }
  });

  readonly linkedHoveredMediaIds = input<Set<string>>(new Set());
  readonly thumbnailClicked = output<string>();
  readonly zoomToLocationRequested = output<{ mediaId: string; lat: number; lng: number }>();
  readonly hoverStarted = output<ThumbnailCardHoverEvent>();
  readonly hoverEnded = output<string>();
  readonly locationMapPickRequested = output<UploadLocationMapPickRequest>();

  private readonly scrollContainerRef = viewChild<ElementRef<HTMLElement>>('scrollContainer');
  private signBatchTimer: ReturnType<typeof setTimeout> | null = null;
  readonly maxColumns = signal(1);
  readonly thumbnailContextMenuOpen = signal(false);
  readonly thumbnailContextMenuPosition = signal<{ x: number; y: number } | null>(null);
  readonly thumbnailContextMenuMediaId = signal<string | null>(null);
  readonly projectDialogOpen = signal(false);
  readonly projectOptions = signal<ReadonlyArray<ProjectSelectOption>>([]);
  readonly projectDialogSelectedId = signal<string | null>(null);
  readonly addressDialogOpen = signal(false);

  readonly sections = computed(() => this.viewService.groupedSections());

  readonly hasGrouping = computed(() => this.viewService.activeGroupings().length > 0);
  readonly itemGridMode = computed<ItemDisplayMode>(() => {
    switch (this.viewService.thumbnailSizePreset()) {
      case 'row':
        return 'row';
      case 'small':
        return 'grid-sm';
      case 'large':
        return 'grid-lg';
      case 'medium':
      default:
        return 'grid-md';
    }
  });

  /** Flatten grouped sections into a linear list of headers + grids. */
  readonly renderItems = computed<RenderItem[]>(() => {
    const items: RenderItem[] = [];
    const flatten = (sections: GroupedSection[]) => {
      for (const section of sections) {
        if (section.heading) {
          items.push({
            type: 'header',
            heading: section.heading,
            imageCount: section.imageCount,
            level: section.headingLevel,
          });
        }
        if (section.subGroups && section.subGroups.length > 0) {
          flatten(section.subGroups);
        } else if (section.images.length > 0) {
          items.push({ type: 'grid', images: section.images });
        }
      }
    };
    flatten(this.sections());
    return items;
  });

  readonly flatImages = computed(() => {
    const sections = this.sections();
    if (sections.length === 1 && !sections[0].heading) {
      return sections[0].images;
    }
    return sections.flatMap((s) => s.images);
  });

  readonly skeletonCards = Array.from({ length: 12 }, (_, i) => i);
  readonly languageTick = computed(() => this.currentLanguage());
  readonly targetMediaIds = computed(() => Array.from(this.selectionService.selectedMediaIds()));
  readonly targetCount = computed(() => this.targetMediaIds().length);
  readonly primaryTargetImage = computed<WorkspaceImage | null>(() => {
    const preferredId = this.thumbnailContextMenuMediaId();
    const selected = this.selectionService.selectedMediaIds();
    const images = this.viewService.rawImages();

    if (preferredId && selected.has(preferredId)) {
      return images.find((image) => image.id === preferredId) ?? null;
    }

    return images.find((image) => selected.has(image.id)) ?? null;
  });
  readonly targetLocationKnown = computed(() => {
    const image = this.primaryTargetImage();
    return !!image && Number.isFinite(image.latitude) && Number.isFinite(image.longitude);
  });

  readonly thumbnailContextActions = computed<
    ReadonlyArray<{
      id: ThumbnailContextActionId;
      icon: string;
      section: ThumbnailContextActionSection;
      label: string;
      disabled: boolean;
    }>
  >(() => {
    const context = {
      targetCount: this.targetCount(),
      locationKnown: this.targetLocationKnown(),
      deviceSupportsNativeShare: typeof navigator !== 'undefined' && 'share' in navigator,
    };

    return THUMBNAIL_CONTEXT_ACTION_DEFINITIONS.filter((definition) =>
      definition.visibleWhen(context),
    ).map((definition) => ({
      id: definition.id,
      icon: definition.icon,
      section: definition.section,
      label: this.t(definition.labelKey, definition.fallbackLabel),
      disabled: context.targetCount <= 0,
    }));
  });

  readonly thumbnailPrimaryActions = computed(() =>
    this.thumbnailContextActions().filter((action) => action.section === 'primary'),
  );
  readonly thumbnailSecondaryActions = computed(() =>
    this.thumbnailContextActions().filter((action) => action.section === 'secondary'),
  );
  readonly thumbnailDestructiveActions = computed(() =>
    this.thumbnailContextActions().filter((action) => action.section === 'destructive'),
  );

  constructor() {
    afterNextRender(() => {
      this.scheduleThumbnailSigning();
      this.updateMaxColumns();
    });

    effect(() => {
      const flat = this.flatImages();
      const grouped = this.sections();
      const preset = this.viewService.thumbnailSizePreset();
      void flat;
      void grouped;
      void preset;
      this.scheduleThumbnailSigning();
    });
  }

  ngOnDestroy(): void {
    if (this.signBatchTimer) {
      clearTimeout(this.signBatchTimer);
    }
  }

  isUnderfilled(itemCount: number): boolean {
    if (this.viewService.thumbnailSizePreset() === 'row') return false;
    if (this.viewService.thumbnailSizePreset() === 'large') return false;
    return itemCount > 0 && itemCount < this.maxColumns();
  }

  isCollapsed(heading: string): boolean {
    return this.viewService.collapsedGroups().has(heading);
  }

  /**
   * Check if an item should be hidden because any ancestor header is collapsed.
   * For headers: hidden if any preceding header at a lower level is collapsed.
   * For grids:  hidden if the nearest header or any of its ancestors is collapsed.
   */
  isItemHidden(index: number): boolean {
    const items = this.renderItems();
    const item = items[index];

    // Top-level headers are never hidden
    if (item.type === 'header' && item.level === 0) return false;

    // Walk backward collecting ancestors.
    // contextLevel starts at the item's own level (header) or Infinity (grid).
    let contextLevel = item.type === 'header' ? item.level : Infinity;

    for (let i = index - 1; i >= 0; i--) {
      const prev = items[i];
      if (prev.type === 'header' && prev.level < contextLevel) {
        if (this.isCollapsed(prev.heading)) return true;
        contextLevel = prev.level;
        if (contextLevel === 0) break;
      }
    }
    return false;
  }

  clearFilters(): void {
    this.filterService.clearAll();
    this.viewService.selectedProjectIds.set(new Set());
  }

  onScroll(): void {
    this.scheduleThumbnailSigning();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateMaxColumns();
  }

  onMediaItemSelectedChange(imageId: string, selected: boolean): void {
    const currentlySelected = this.selectionService.isSelected(imageId);
    if (currentlySelected === selected) {
      return;
    }
    this.selectionService.toggle(imageId, { additive: false });
  }

  onCellHoverStarted(img: WorkspaceImage): void {
    if (!Number.isFinite(img.latitude) || !Number.isFinite(img.longitude)) {
      return;
    }
    this.hoverStarted.emit({ mediaId: img.id, lat: img.latitude, lng: img.longitude });
  }

  onWorkspaceCellContextMenu(event: Event, mediaId: string): void {
    if (!(event instanceof MouseEvent)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const selected = this.selectionService.selectedMediaIds();
    if (!selected.has(mediaId)) {
      this.selectionService.clearSelection();
      this.selectionService.toggle(mediaId, { additive: true });
    }

    this.thumbnailContextMenuMediaId.set(mediaId);
    this.thumbnailContextMenuPosition.set({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 232)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 360)),
    });
    this.thumbnailContextMenuOpen.set(true);
  }

  onMediaItemContextAction(img: WorkspaceImage, event: ItemContextActionEvent): void {
    if (event.actionId === 'zoom_house' || event.actionId === 'zoom_street') {
      if (!Number.isFinite(img.latitude) || !Number.isFinite(img.longitude)) {
        return;
      }
      this.zoomToLocationRequested.emit({
        mediaId: img.id,
        lat: img.latitude,
        lng: img.longitude,
      });
      return;
    }
    if (event.actionId === 'open_in_media') {
      this.thumbnailClicked.emit(img.id);
    }
  }

  closeThumbnailContextMenu(): void {
    this.thumbnailContextMenuOpen.set(false);
  }

  async onThumbnailContextActionSelected(actionId: ThumbnailContextActionId): Promise<void> {
    switch (actionId) {
      case 'open_in_media':
        this.openInMedia();
        break;
      case 'zoom_house':
      case 'zoom_street':
        this.zoomToPrimaryTarget();
        break;
      case 'copy_address':
        await this.copyPrimaryAddress();
        break;
      case 'copy_gps':
        await this.copyPrimaryGps();
        break;
      case 'open_google_maps':
        this.openPrimaryInGoogleMaps();
        break;
      case 'assign_to_project':
        await this.openProjectDialog();
        break;
      case 'resolve_location':
        await this.resolvePrimaryLocationStatus();
        break;
      case 'change_location_map':
        this.requestMapLocationPickForPrimaryTarget();
        break;
      case 'change_location_address':
        this.openAddressDialog();
        break;
      case 'download':
        await this.downloadSelectionZip();
        break;
      case 'share_link':
        await this.createShareLink(false);
        break;
      case 'copy_link':
        await this.createShareLink(true);
        break;
      case 'native_share':
        await this.nativeShareLink();
        break;
      case 'remove_from_project':
        await this.removeSelectedFromProject();
        break;
      case 'delete_media':
        await this.deleteSelectedMedia();
        break;
      default:
        break;
    }

    this.closeThumbnailContextMenu();
  }

  onProjectDialogSelected(projectId: string): void {
    this.projectDialogSelectedId.set(projectId);
  }

  closeProjectDialog(): void {
    this.projectDialogOpen.set(false);
    this.projectDialogSelectedId.set(null);
  }

  openAddressDialog(): void {
    if (this.targetCount() <= 0) {
      return;
    }
    this.addressDialogOpen.set(true);
  }

  closeAddressDialog(): void {
    this.addressDialogOpen.set(false);
  }

  async confirmAddressDialog(addressQuery: string): Promise<void> {
    const addressText = addressQuery.trim();
    if (!addressText) {
      return;
    }

    const suggestion = await this.geocodingService.forward(addressText);
    if (!suggestion) {
      this.toastService.show({
        message: this.t('workspace.export.error.addressNotFound', 'Address could not be resolved.'),
        type: 'warning',
      });
      return;
    }

    const selectedMediaItemIds = await this.resolveSelectedMediaItemIds();
    if (selectedMediaItemIds.length === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.noImagesSelected', 'No images selected.'),
        type: 'warning',
      });
      this.closeAddressDialog();
      return;
    }

    let updatedCount = 0;
    for (const mediaItemId of selectedMediaItemIds) {
      const result = await this.mediaLocationUpdateService.updateFromAddressSuggestion(
        mediaItemId,
        {
          lat: suggestion.lat,
          lng: suggestion.lng,
          addressLabel: suggestion.addressLabel,
          city: suggestion.city,
          district: suggestion.district,
          street: suggestion.street,
          streetNumber: suggestion.streetNumber,
          zip: suggestion.zip,
          country: suggestion.country,
        },
      );
      if (result.ok) {
        updatedCount += 1;
      }
    }

    if (updatedCount === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.addressUpdateFailed', 'Address update failed.'),
        type: 'error',
      });
      return;
    }

    const selectedImageIds = this.selectionService.selectedMediaIds();
    this.viewService.rawImages.update((images) =>
      images.map((image) =>
        selectedImageIds.has(image.id)
          ? {
              ...image,
              latitude: suggestion.lat,
              longitude: suggestion.lng,
              addressLabel: suggestion.addressLabel,
              city: suggestion.city,
              district: suggestion.district,
              street: suggestion.street,
              streetNumber: suggestion.streetNumber,
              zip: suggestion.zip,
              country: suggestion.country,
            }
          : image,
      ),
    );

    this.toastService.show({
      message: this.t('workspace.export.success.addressUpdated', 'Address updated.'),
      type: 'success',
    });
    this.closeAddressDialog();
  }

  async confirmProjectDialog(projectId: string): Promise<void> {
    const selectedMediaItemIds = await this.resolveSelectedMediaItemIds();
    if (selectedMediaItemIds.length === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.noImagesSelected', 'No images selected.'),
        type: 'warning',
      });
      this.closeProjectDialog();
      return;
    }

    const rows = selectedMediaItemIds.map((mediaItemId) => ({
      media_item_id: mediaItemId,
      project_id: projectId,
    }));
    const { error } = await this.supabaseService.client
      .from('media_projects')
      .upsert(rows, { onConflict: 'media_item_id,project_id', ignoreDuplicates: true });

    if (error) {
      this.toastService.show({ message: error.message, type: 'error' });
      return;
    }

    this.toastService.show({
      message: this.t('workspace.export.success.projectAssigned', 'Assigned to project.'),
      type: 'success',
    });
    this.closeProjectDialog();
  }

  private scheduleThumbnailSigning(): void {
    if (this.signBatchTimer) clearTimeout(this.signBatchTimer);
    this.signBatchTimer = setTimeout(() => {
      const images =
        this.flatImages().length > 0
          ? this.flatImages()
          : this.sections().flatMap((s) => this.collectImages(s));
      const unsigned = images.filter((img) => !img.signedThumbnailUrl && !img.thumbnailUnavailable);
      if (unsigned.length > 0) {
        void this.viewService.batchSignThumbnails(unsigned.slice(0, 50));
      }
    }, 200);
  }

  private collectImages(section: GroupedSection): WorkspaceImage[] {
    const result = [...section.images];
    if (section.subGroups) {
      for (const sub of section.subGroups) {
        result.push(...this.collectImages(sub));
      }
    }
    return result;
  }

  private updateMaxColumns(): void {
    const host = this.scrollContainerRef()?.nativeElement;
    if (!host) return;

    const measured = host.clientWidth;
    if (measured <= 0) {
      this.maxColumns.set(1);
      return;
    }

    const styles = getComputedStyle(host);
    const gapValue = styles.getPropertyValue('--spacing-2').trim();
    const gap = Number.parseFloat(gapValue || '8') || 8;
    const cardWidth = this.thumbnailCardSizePx();
    const columns = Math.max(1, Math.floor((measured + gap) / (cardWidth + gap)));
    this.maxColumns.set(columns);
  }

  private openInMedia(): void {
    const target = this.primaryTargetImage();
    if (!target) {
      return;
    }
    this.thumbnailClicked.emit(target.id);
  }

  private zoomToPrimaryTarget(): void {
    const target = this.primaryTargetImage();
    if (!target) {
      return;
    }
    if (!Number.isFinite(target.latitude) || !Number.isFinite(target.longitude)) {
      return;
    }

    this.zoomToLocationRequested.emit({
      mediaId: target.id,
      lat: target.latitude,
      lng: target.longitude,
    });
  }

  private async copyPrimaryAddress(): Promise<void> {
    const target = this.primaryTargetImage();
    if (!target || !Number.isFinite(target.latitude) || !Number.isFinite(target.longitude)) {
      return;
    }

    const reverse = await this.geocodingService.reverse(target.latitude, target.longitude);
    const address = reverse?.addressLabel?.trim();
    if (!address) {
      this.toastService.show({
        message: this.t(
          'workspace.thumbnailGrid.menu.error.addressMissing',
          'Address could not be resolved.',
        ),
        type: 'warning',
      });
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      this.toastService.show({
        message: this.t(
          'workspace.export.error.clipboardUnavailable',
          'Clipboard is not available.',
        ),
        type: 'error',
      });
      return;
    }

    await navigator.clipboard.writeText(address);
    this.toastService.show({
      message: this.t('workspace.thumbnailGrid.menu.success.addressCopied', 'Address copied.'),
      type: 'success',
      dedupe: true,
    });
  }

  private async copyPrimaryGps(): Promise<void> {
    const target = this.primaryTargetImage();
    if (!target || !Number.isFinite(target.latitude) || !Number.isFinite(target.longitude)) {
      return;
    }

    const gpsText = `${target.latitude.toFixed(6)}, ${target.longitude.toFixed(6)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(gpsText);
      this.toastService.show({
        message: this.t('workspace.thumbnailGrid.menu.success.gpsCopied', 'GPS copied.'),
        type: 'success',
        dedupe: true,
      });
      return;
    }

    this.toastService.show({
      message: gpsText,
      type: 'info',
      dedupe: true,
    });
  }

  private openPrimaryInGoogleMaps(): void {
    const target = this.primaryTargetImage();
    if (
      !target ||
      !Number.isFinite(target.latitude) ||
      !Number.isFinite(target.longitude) ||
      typeof window === 'undefined'
    ) {
      return;
    }

    window.open(
      `https://www.google.com/maps?q=${target.latitude},${target.longitude}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  private requestMapLocationPickForPrimaryTarget(): void {
    const target = this.primaryTargetImage();
    if (!target) {
      return;
    }

    this.locationMapPickRequested.emit({
      mediaId: target.id,
      fileName: target.storagePath || target.id,
    });
  }

  private async resolvePrimaryLocationStatus(): Promise<void> {
    const target = this.primaryTargetImage();
    if (!target) {
      return;
    }

    const result = await this.locationResolverService.resolvePendingMediaItem(target.id);
    if (result.status === 'resolved') {
      this.toastService.show({
        message: this.t('workspace.thumbnailGrid.menu.success.locationResolved', 'Location resolved.'),
        type: 'success',
        dedupe: true,
      });
      return;
    }

    if (result.status === 'unresolvable') {
      this.toastService.show({
        message: this.t(
          'workspace.thumbnailGrid.menu.warning.locationUnresolvable',
          'Location could not be resolved (terminal).',
        ),
        type: 'warning',
        dedupe: true,
      });
      return;
    }

    this.toastService.show({
      message: this.t(
        'workspace.thumbnailGrid.menu.info.locationNotPending',
        'Location is already resolved or not retry-eligible.',
      ),
      type: 'info',
      dedupe: true,
    });
  }

  private async downloadSelectionZip(): Promise<void> {
    const selectedImages = this.viewService
      .rawImages()
      .filter((img) => this.selectionService.selectedMediaIds().has(img.id));
    if (selectedImages.length === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.noImagesSelected', 'No images selected.'),
        type: 'warning',
      });
      return;
    }

    const firstProject = selectedImages.find((img) => !!img.projectName)?.projectName;
    const zipTitle = this.mediaDownloadService.buildDefaultTitle({
      selectedProjectName: firstProject,
      selectedCount: selectedImages.length,
    });

    await this.mediaDownloadService.exportSelectionAsZip(selectedImages, zipTitle);
    this.toastService.show({
      message: this.t('workspace.export.success.zipStarted', 'ZIP download started.'),
      type: 'success',
    });
  }

  private async createShareLink(copyToClipboard: boolean): Promise<string | null> {
    const selectedIds = this.targetMediaIds();
    if (selectedIds.length === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.noImagesSelected', 'No images selected.'),
        type: 'error',
      });
      return null;
    }

    try {
      const result = await this.shareSetService.createOrReuseShareSet(selectedIds);
      const url = `${window.location.origin}/?share=${result.token}`;

      if (copyToClipboard) {
        if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
          this.toastService.show({
            message: this.t(
              'workspace.export.error.clipboardUnavailable',
              'Clipboard is not available.',
            ),
            type: 'error',
          });
          return url;
        }

        await navigator.clipboard.writeText(url);
        this.toastService.show({
          message: this.t('workspace.export.success.linkCopied', 'Share link copied.'),
          type: 'success',
          dedupe: true,
        });
      }

      return url;
    } catch (error) {
      this.toastService.show({
        message:
          error instanceof Error
            ? error.message
            : this.t(
                'workspace.export.error.linkCreateFailed',
                'Freigabelink konnte nicht erstellt werden.',
              ),
        type: 'error',
      });
      return null;
    }
  }

  private async nativeShareLink(): Promise<void> {
    const url = await this.createShareLink(false);
    if (!url || typeof navigator === 'undefined' || !('share' in navigator)) {
      return;
    }

    try {
      await navigator.share({
        title: this.t('workspace.export.share.title', 'Workspace export'),
        text: this.t('workspace.export.share.text', 'Shared media selection'),
        url,
      });
    } catch {
      // No-op: user may cancel native share.
    }
  }

  private async openProjectDialog(): Promise<void> {
    const { data, error } = await this.supabaseService.client
      .from('projects')
      .select('id,name')
      .order('name', { ascending: true });

    if (error || !Array.isArray(data) || data.length === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.noProjectsAvailable', 'No projects available.'),
        type: 'warning',
      });
      return;
    }

    this.projectOptions.set(
      data
        .filter(
          (row): row is { id: string; name: string } =>
            typeof row.id === 'string' && typeof row.name === 'string' && row.name.length > 0,
        )
        .map((row) => ({ id: row.id, name: row.name })),
    );
    this.projectDialogSelectedId.set(this.projectOptions()[0]?.id ?? null);
    this.projectDialogOpen.set(true);
  }

  private async resolveSelectedMediaItemIds(): Promise<string[]> {
    const selectedIds = Array.from(this.selectionService.selectedMediaIds());
    if (selectedIds.length === 0) {
      return [];
    }

    const idList = selectedIds.join(',');
    const { data, error } = await this.supabaseService.client
      .from('media_items')
      .select('id,source_image_id')
      .or(`id.in.(${idList}),source_image_id.in.(${idList})`);

    if (error || !Array.isArray(data)) {
      return [];
    }

    return Array.from(
      new Set(
        data
          .map((row) => (typeof row.id === 'string' ? row.id : null))
          .filter((id): id is string => !!id),
      ),
    );
  }

  private async removeSelectedFromProject(): Promise<void> {
    const selectedMediaItemIds = await this.resolveSelectedMediaItemIds();
    if (selectedMediaItemIds.length === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.noImagesSelected', 'No images selected.'),
        type: 'warning',
      });
      return;
    }

    const { error } = await this.supabaseService.client
      .from('media_projects')
      .delete()
      .in('media_item_id', selectedMediaItemIds);

    if (error) {
      this.toastService.show({ message: error.message, type: 'error' });
      return;
    }

    const selectedImageIds = this.selectionService.selectedMediaIds();
    this.viewService.rawImages.update((images) =>
      images.map((image) =>
        selectedImageIds.has(image.id)
          ? {
              ...image,
              projectId: null,
              projectName: null,
            }
          : image,
      ),
    );

    this.toastService.show({
      message: this.t(
        'upload.item.menu.project.remove.success',
        'Removed from project successfully.',
      ),
      type: 'success',
    });
  }

  private async deleteSelectedMedia(): Promise<void> {
    const selectedMediaItemIds = await this.resolveSelectedMediaItemIds();
    if (selectedMediaItemIds.length === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.noImagesSelected', 'No images selected.'),
        type: 'warning',
      });
      return;
    }

    const selectedIds = this.selectionService.selectedMediaIds();
    const { error } = await this.supabaseService.client
      .from('media_items')
      .delete()
      .in('id', selectedMediaItemIds);

    if (error) {
      this.toastService.show({ message: error.message, type: 'error' });
      return;
    }

    this.viewService.rawImages.update((images) =>
      images.filter((image) => !selectedIds.has(image.id)),
    );
    this.selectionService.clearSelection();
    this.toastService.show({
      message: this.t('workspace.export.success.deleted', 'Selected media deleted.'),
      type: 'success',
    });
  }
}
