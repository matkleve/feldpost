import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { AfterViewInit } from '@angular/core';
import type { ImageRecord } from '../map/workspace-pane/media-detail-view.types';
import type { CardVariant } from '../../shared/ui-primitives/card-variant.types';
import { MediaErrorComponent } from './media-error.component';
import { MediaEmptyComponent } from './media-empty.component';
import { WorkspaceSelectionService } from '../../core/workspace-selection/workspace-selection.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ItemGridComponent } from '../../shared/item-grid/item-grid.component';
import { ItemStateFrameComponent } from '../../shared/item-grid/item-state-frame.component';
import type { ItemContextActionEvent } from '../../shared/item-grid/item.component';
import type { ItemDisplayMode } from '../../shared/item-grid/item.component';
import { MEDIA_ITEM_ACTION_CONTEXT, MediaItemComponent } from './media-item.component';
import { MediaItemRenderSurfaceComponent } from './media-item-render-surface.component';

export type MediaContentState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'app-media-content',
  standalone: true,
  imports: [
    ItemGridComponent,
    ItemStateFrameComponent,
    MediaItemRenderSurfaceComponent,
    MediaItemComponent,
    MediaErrorComponent,
    MediaEmptyComponent,
  ],
  templateUrl: './media-content.component.html',
  styleUrl: './media-content.component.scss',
  host: {
    '[class.media-content]': 'true',
    '(click)': 'onGridSurfaceClick($event)',
  },
})
export class MediaContentComponent implements AfterViewInit {
  private static readonly LOADING_VIEWPORT_MULTIPLIER = 2;

  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly i18nService = inject(I18nService);
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private resizeObserver: ResizeObserver | null = null;

  readonly state = input.required<MediaContentState>();
  readonly items = input.required<ImageRecord[]>();
  readonly emptyReason = input<'auth-required' | 'no-results'>('no-results');
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
      const rowHeightPx = 104;
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
  readonly retry = output<void>();

  ngAfterViewInit(): void {
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
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', this.updateViewportMetrics);
      }
    });
  }

  t(key: string, fallback: string): string {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  }

  private debugInteraction(
    stage: string,
    event: MouseEvent | null,
    extra: Record<string, unknown> = {},
  ): void {
    const target = event?.target instanceof Element ? event.target : null;
    const currentTarget = event?.currentTarget instanceof Element ? event.currentTarget : null;

    console.info('[media-content][interaction]', {
      stage,
      contentState: this.state(),
      itemCount: this.items().length,
      selectedCount: this.workspaceSelectionService.selectedMediaIds().size,
      eventType: event?.type ?? null,
      button: event?.button ?? null,
      buttons: event?.buttons ?? null,
      ctrlKey: event?.ctrlKey ?? false,
      metaKey: event?.metaKey ?? false,
      shiftKey: event?.shiftKey ?? false,
      altKey: event?.altKey ?? false,
      targetTag: target?.tagName ?? null,
      targetClass: target?.className ?? null,
      currentTargetTag: currentTarget?.tagName ?? null,
      currentTargetClass: currentTarget?.className ?? null,
      timestamp: Date.now(),
      ...extra,
    });
  }

  onItemOpened(mediaId: string): void {
    this.debugInteraction('item.opened.received', null, { mediaId });
    this.itemClicked.emit(mediaId);
  }

  onItemContextActionRequested(event: ItemContextActionEvent): void {
    this.debugInteraction('item.contextActionRequested.received', null, { event });
  }

  isSelected(mediaId: string): boolean {
    return this.workspaceSelectionService.isSelected(mediaId);
  }

  onSelectionToggled(mediaId: string, selected: boolean): void {
    this.debugInteraction('selection.toggle.requested', null, {
      mediaId,
      selected,
      selectedBefore: Array.from(this.workspaceSelectionService.selectedMediaIds()),
    });

    const current = this.workspaceSelectionService.selectedMediaIds();
    const next = new Set(current);

    if (selected) {
      next.add(mediaId);
    } else {
      next.delete(mediaId);
    }

    this.workspaceSelectionService.selectAllInScope(Array.from(next));

    this.debugInteraction('selection.toggle.applied', null, {
      mediaId,
      selected,
      selectedAfter: Array.from(this.workspaceSelectionService.selectedMediaIds()),
    });
  }

  onGridSurfaceClick(event: MouseEvent): void {
    this.debugInteraction('gridSurface.click.received', event);

    if (this.state() !== 'ready') {
      this.debugInteraction('gridSurface.click.ignored.notReady', event);
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      this.debugInteraction('gridSurface.click.ignored.nonElementTarget', event);
      return;
    }

    if (target.closest('app-media-item')) {
      this.debugInteraction('gridSurface.click.ignored.insideMediaItem', event);
      return;
    }

    this.debugInteraction('gridSurface.click.clearSelection', event, {
      selectedBefore: Array.from(this.workspaceSelectionService.selectedMediaIds()),
    });
    this.workspaceSelectionService.clearSelection();
    this.debugInteraction('gridSurface.click.selectionCleared', event);
  }

  private readonly updateViewportMetrics = (): void => {
    const host = this.hostElement.nativeElement;
    const width = host.clientWidth;
    this.containerWidthPx.set(width > 0 ? width : 960);

    if (typeof window !== 'undefined' && Number.isFinite(window.innerHeight)) {
      this.viewportHeightPx.set(window.innerHeight);
    }
  };

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
