import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { ImageRecord } from '../map/workspace-pane/media-detail-view.types';
import type { CardVariant } from '../../shared/ui-primitives/card-variant.types';
import { MediaErrorComponent } from './media-error.component';
import { MediaEmptyComponent } from './media-empty.component';
import { WorkspaceSelectionService } from '../../core/workspace-selection.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ItemGridComponent } from '../../shared/item-grid/item-grid.component';
import { ItemStateFrameComponent } from '../../shared/item-grid/item-state-frame.component';
import type { ItemDisplayMode } from '../../shared/item-grid/item.component';
import { MEDIA_ITEM_ACTION_CONTEXT, MediaItemComponent } from './media-item.component';
import { MediaItemRenderSurfaceComponent } from './media-item-render-surface.component';

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
})
export class MediaContentComponent implements AfterViewInit {
  private static readonly LOADING_VIEWPORT_MULTIPLIER = 2;

  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly i18nService = inject(I18nService);
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private resizeObserver: ResizeObserver | null = null;

  readonly loading = input.required<boolean>();
  readonly error = input.required<boolean>();
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

  isSelected(mediaId: string): boolean {
    return this.workspaceSelectionService.isSelected(mediaId);
  }

  onSelectionToggled(mediaId: string): void {
    this.workspaceSelectionService.toggle(mediaId, { additive: true });
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
