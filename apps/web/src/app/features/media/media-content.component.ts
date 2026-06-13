import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { AfterViewInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MapZoomOrchestratorService } from '../../core/map-zoom/map-zoom-orchestrator.service';
import type { MediaRecord } from '../../core/media-query/media-query.types';
import type { CardVariant } from '../../shared/ui-primitives/card-variant.types';
import { MediaErrorComponent } from './media-error.component';
import { MediaEmptyComponent } from './media-empty.component';
import { WorkspaceSelectionService } from '../../core/workspace-selection/workspace-selection.service';
import { WorkspaceViewService } from '../../core/workspace-view/workspace-view.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ItemGridComponent } from '../../shared/item-grid/item-grid.component';
import type { ItemContextActionEvent } from '../../shared/item-grid/item.component';
import type { ItemDisplayMode } from '../../shared/item-grid/item.component';
import { MEDIA_ITEM_ACTION_CONTEXT, MediaItemComponent } from '../../shared/media-item/media-item.component';
import { GroupHeaderComponent } from '../../shared/ui-primitives/group-header.component';
import {
  isMediaGalleryRenderRowHidden,
  type MediaGalleryRenderRow,
} from '../../core/media-query/media-gallery-view.helpers';
import type { PreviewGenerationStatus } from '../../core/media/preview-generation-status.types';
import { MediaThumbnailRealtimeService } from '../../core/media-thumbnail/media-thumbnail-realtime.service';
import type { ZoomToLocationEvent } from '../upload/upload-panel/upload-panel-row-handlers';

export type MediaContentState = 'loading' | 'error' | 'ready';

type MediaContentGridSlot = {
  readonly trackId: string;
  readonly item: MediaRecord | null;
  readonly placeholderId: number;
  readonly exiting: boolean;
};

type MediaPreviewPatch = {
  thumbnail_path?: string | null;
  preview_generation_status?: PreviewGenerationStatus | null;
};

function applyMediaPreviewPatch(item: MediaRecord, patch: MediaPreviewPatch | undefined): MediaRecord {
  if (!patch) {
    return item;
  }
  return {
    ...item,
    ...(patch.thumbnail_path !== undefined ? { thumbnail_path: patch.thumbnail_path } : {}),
    ...(patch.preview_generation_status !== undefined
      ? { preview_generation_status: patch.preview_generation_status }
      : {}),
  };
}

@Component({
  selector: 'app-media-content',
  standalone: true,
  imports: [
    ItemGridComponent,
    MediaItemComponent,
    MediaErrorComponent,
    MediaEmptyComponent,
    GroupHeaderComponent,
  ],
  templateUrl: './media-content.component.html',
  styleUrl: './media-content.component.scss',
  host: {
    '[class.media-content]': 'true',
  },
})
export class MediaContentComponent implements AfterViewInit {
  private static readonly LOADING_VIEWPORT_MULTIPLIER = 2;
  private static readonly PLACEHOLDER_EXIT_DURATION_MS = 180;

  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly i18nService = inject(I18nService);
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly thumbnailRealtime = inject(MediaThumbnailRealtimeService);
  private readonly mapZoom = inject(MapZoomOrchestratorService);
  private resizeObserver: ResizeObserver | null = null;
  private readonly itemPreviewPatches = signal<ReadonlyMap<string, MediaPreviewPatch>>(new Map());
  private placeholderExitTimer: ReturnType<typeof setTimeout> | null = null;

  readonly state = input.required<MediaContentState>();
  readonly items = input.required<MediaRecord[]>();

  /** Merges Realtime `thumbnail_path` updates into flat grid rows (no polling). */
  readonly gridItems = computed(() => {
    const patches = this.itemPreviewPatches();
    return this.items().map((item) => applyMediaPreviewPatch(item, patches.get(item.id)));
  });

  /** Grouped /media layout must apply the same patches as {@link gridItems}. */
  readonly displayRenderRows = computed(() => {
    const patches = this.itemPreviewPatches();
    const rows = this.renderRows();
    if (patches.size === 0) {
      return rows;
    }
    return rows.map((row) => {
      if (row.type !== 'grid') {
        return row;
      }
      return {
        ...row,
        items: row.items.map((item) => applyMediaPreviewPatch(item, patches.get(item.id))),
      };
    });
  });
  /** Flattened header + grid rows for grouped gallery layout (used when state is ready). */
  /** @see docs/specs/component/item-grid/item-grid.md#wiring */
  readonly renderRows = input<readonly MediaGalleryRenderRow[]>([]);
  /** Group collapse keys shared with WorkspaceViewService for consistent toolbar behavior. */
  /** @see docs/specs/service/workspace-view/workspace-view-system.md */
  readonly collapsedGroupHeadings = input<ReadonlySet<string>>(new Set());
  readonly emptyReason = input<'auth-required' | 'no-results'>('no-results');
  /** When false and list is ready, show end-of-list copy (full gallery load has no more pages). */
  readonly hasMore = input(false);
  readonly loadingMore = input(false);
  readonly cardVariant = input<CardVariant>('medium');
  readonly projectNameFor = input.required<(projectId: string | null) => string>();
  readonly containerWidthPx = signal<number>(0);
  readonly viewportHeightPx = signal<number>(0);

  readonly mediaItemActionContext = MEDIA_ITEM_ACTION_CONTEXT;
  readonly loadingPlaceholderCount = computed(() => {
    const mode = this.itemMode();
    const viewportHeight = Math.max(this.viewportHeightPx(), 720);
    const width = Math.max(this.containerWidthPx(), 960);
    const gapPx = 12;

    if (mode === 'row') {
      const rowHeightPx = 48;
      return Math.max(
        6,
        Math.ceil(
          (viewportHeight * MediaContentComponent.LOADING_VIEWPORT_MULTIPLIER) / rowHeightPx,
        ),
      );
    }

    const columnMinPx = this.resolveColumnMinPx(mode);
    const columns = Math.max(1, Math.floor((width + gapPx) / (columnMinPx + gapPx)));
    const rowHeightPx = columnMinPx + gapPx;
    const rows = Math.max(
      1,
      Math.ceil((viewportHeight * MediaContentComponent.LOADING_VIEWPORT_MULTIPLIER) / rowHeightPx),
    );
    return columns * rows;
  });
  readonly loadingPlaceholderIds = computed(() =>
    Array.from({ length: this.loadingPlaceholderCount() }, (_, index) => index + 1),
  );
  readonly loadingPlaceholderSnapshotCount = signal(0);
  readonly placeholderExitActive = signal(false);
  readonly useGroupedRenderLayout = computed(
    () => this.state() === 'ready' && this.renderRows().length > 0,
  );
  readonly showGrid = computed(
    () =>
      this.state() === 'loading' ||
      this.useGroupedRenderLayout() ||
      this.items().length > 0 ||
      this.placeholderExitActive(),
  );
  readonly showEmptyState = computed(
    () =>
      this.state() === 'ready' &&
      !this.useGroupedRenderLayout() &&
      this.items().length === 0 &&
      !this.placeholderExitActive(),
  );
  /** Visible grid order for shift-range selection (grouped rows preserve on-screen order). */
  readonly orderedVisibleMediaIds = computed(() => {
    if (this.useGroupedRenderLayout()) {
      return this.displayRenderRows()
        .filter((row): row is Extract<MediaGalleryRenderRow, { type: 'grid' }> => row.type === 'grid')
        .flatMap((row) => row.items.map((item) => item.id));
    }

    return this.gridSlots()
      .map((slot) => slot.item?.id)
      .filter((id): id is string => typeof id === 'string');
  });

  readonly showListEnd = computed(() => {
    if (this.state() !== 'ready' || this.hasMore() || this.loadingMore()) {
      return false;
    }

    if (this.useGroupedRenderLayout()) {
      return this.renderRows().some((row) => row.type === 'grid' && row.items.length > 0);
    }

    return this.items().length > 0;
  });
  readonly gridRole = computed<string | null>(() =>
    this.state() === 'ready' &&
    (this.useGroupedRenderLayout() || this.items().length > 0)
      ? 'listbox'
      : null,
  );
  readonly gridSlots = computed<MediaContentGridSlot[]>(() => {
    const state = this.state();
    if (state === 'error') {
      return [];
    }

    if (state === 'loading') {
      return this.loadingPlaceholderIds().map((placeholderId) => ({
        trackId: `placeholder-${placeholderId}`,
        item: null,
        placeholderId,
        exiting: false,
      }));
    }

    const items = this.gridItems();
    const includePlaceholderTail =
      this.placeholderExitActive() && this.loadingPlaceholderSnapshotCount() > items.length;
    const totalSlots = includePlaceholderTail
      ? this.loadingPlaceholderSnapshotCount()
      : items.length;

    return Array.from({ length: totalSlots }, (_, index) => {
      const item = items[index] ?? null;
      const placeholderId = index + 1;

      if (item) {
        return {
          trackId: `item-${item.id}`,
          item,
          placeholderId,
          exiting: false,
        };
      }

      return {
        trackId: `placeholder-${placeholderId}`,
        item: null,
        placeholderId,
        exiting: includePlaceholderTail,
      };
    });
  });

  readonly itemMode = computed<ItemDisplayMode>(() => {
    switch (this.cardVariant()) {
      case 'row':
        return 'row';
      case 'small':
        return 'grid-sm';
      case 'medium':
        return 'grid-md';
      case 'large':
        return 'grid-lg';
      default:
        return 'grid-md';
    }
  });

  readonly itemClicked = output<string>();
  readonly zoomToLocationRequested = output<ZoomToLocationEvent>();
  readonly retry = output<void>();

  private readonly loadingTransitionEffect = effect(
    () => {
      const state = this.state();
      const itemCount = this.items().length;
      const placeholderCount = this.loadingPlaceholderIds().length;

      if (state === 'loading') {
        this.clearPlaceholderExitTimer();
        this.placeholderExitActive.set(false);
        this.loadingPlaceholderSnapshotCount.set(placeholderCount);
        return;
      }

      if (state !== 'ready') {
        this.clearPlaceholderExitTimer();
        this.placeholderExitActive.set(false);
        return;
      }

      const snapshotCount = this.loadingPlaceholderSnapshotCount();
      if (snapshotCount > itemCount) {
        if (!this.placeholderExitActive()) {
          this.placeholderExitActive.set(true);
          this.schedulePlaceholderExit();
        }
        return;
      }

      this.clearPlaceholderExitTimer();
      this.placeholderExitActive.set(false);
    },
    { allowSignalWrites: true },
  );

  ngAfterViewInit(): void {
    this.thumbnailRealtime.connect(this.destroyRef);
    this.thumbnailRealtime.updates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ mediaId, thumbnailPath, previewGenerationStatus }) => {
        this.itemPreviewPatches.update((current) => {
          const next = new Map(current);
          next.set(mediaId, {
            thumbnail_path: thumbnailPath,
            preview_generation_status: previewGenerationStatus,
          });
          return next;
        });
      });

    this.updateViewportMetrics();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.updateViewportMetrics);
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updateViewportMetrics());
      this.resizeObserver.observe(this.hostElement.nativeElement);
    }

    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      this.clearPlaceholderExitTimer();
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', this.updateViewportMetrics);
      }
    });
  }

  t(key: string, fallback: string): string {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  }

  onItemPointerClick(
    mediaId: string,
    modifiers: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
  ): void {
    const result = this.workspaceSelectionService.applyGridPointerSelection(
      this.orderedVisibleMediaIds(),
      mediaId,
      modifiers,
    );

    if (result === 'open-item') {
      this.itemClicked.emit(mediaId);
    }
  }

  onItemContextActionRequested(event: ItemContextActionEvent): void {
    if (event.actionId !== 'zoom_house' && event.actionId !== 'zoom_street') {
      return;
    }

    const item =
      this.gridItems().find((row) => row.id === event.itemId) ??
      this.items().find((row) => row.id === event.itemId);
    this.mapZoom.requestZoom({
      source: 'media-page-context-action',
      mediaId: event.itemId,
      lat: event.lat ?? item?.latitude,
      lng: event.lng ?? item?.longitude,
      zoomMode: event.actionId === 'zoom_street' ? 'street' : 'house',
    });
  }

  isSelected(mediaId: string): boolean {
    return this.workspaceSelectionService.isSelected(mediaId);
  }

  onSelectionToggled(mediaId: string, selected: boolean): void {
    const currentlySelected = this.workspaceSelectionService.isSelected(mediaId);
    if (currentlySelected === selected) {
      return;
    }

    this.workspaceSelectionService.toggle(mediaId, { additive: true });
    this.workspaceSelectionService.setRangeAnchor(mediaId);
  }

  isRowHidden(index: number): boolean {
    return isMediaGalleryRenderRowHidden(
      this.renderRows(),
      index,
      this.collapsedGroupHeadings(),
    );
  }

  onGroupToggle(heading: string): void {
    this.workspaceViewService.toggleGroupCollapsed(heading);
  }

  private readonly updateViewportMetrics = (): void => {
    const host = this.hostElement.nativeElement;
    const width = host.clientWidth;
    this.containerWidthPx.set(width > 0 ? width : 960);

    if (typeof window !== 'undefined' && Number.isFinite(window.innerHeight)) {
      this.viewportHeightPx.set(window.innerHeight);
    }
  };

  private schedulePlaceholderExit(): void {
    if (this.placeholderExitTimer !== null) {
      return;
    }

    this.placeholderExitTimer = setTimeout(() => {
      this.placeholderExitTimer = null;
      this.placeholderExitActive.set(false);
    }, MediaContentComponent.PLACEHOLDER_EXIT_DURATION_MS);
  }

  private clearPlaceholderExitTimer(): void {
    if (this.placeholderExitTimer !== null) {
      clearTimeout(this.placeholderExitTimer);
      this.placeholderExitTimer = null;
    }
  }

  private resolveColumnMinPx(mode: ItemDisplayMode): number {
    switch (mode) {
      case 'grid-sm':
        return 128;
      case 'grid-lg':
        return 208;
      case 'card':
        return 224;
      case 'grid-md':
      default:
        return 160;
    }
  }
}
