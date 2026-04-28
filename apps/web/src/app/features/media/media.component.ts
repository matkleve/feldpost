/**
 * MediaComponent — /media page shell.
 * Displays all media (images, videos, documents) with grid layout.
 * Workspace pane is mounted by AuthenticatedAppLayoutComponent (global split), not here.
 *
 * Flat host-owned layout:
 * app-media host > content-clamp stack > header + content
 */
import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { auditTime, merge } from 'rxjs';
import { VStackComponent } from '../../shared/containers';
import { MediaPageHeaderComponent, type MediaPageHeaderState } from './media-page-header.component';
import { MediaContentComponent, type MediaContentState } from './media-content.component';
import { CardVariantSwitchComponent } from '../../shared/ui-primitives/card-variant-switch.component';
import type { SelectedItemsContextPort } from '../../core/workspace-pane/workspace-pane-context.port';
import { WorkspacePaneObserverAdapter } from '../../core/workspace-pane/workspace-pane-observer.adapter';
import { WorkspaceSelectionService } from '../../core/workspace-selection/workspace-selection.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { CardVariantSettingsService } from '../../shared/ui-primitives/card-variant-settings.service';
import { CARD_VARIANTS, type CardVariant } from '../../shared/ui-primitives/card-variant.types';
import type { ImageRecord } from '../../core/media-query/media-query.types';
import { MediaQueryService } from '../../core/media-query/media-query.service';
import { PaneToolbarComponent } from '../../shared/pane-toolbar/pane-toolbar.component';
import { AuthService } from '../../core/auth/auth.service';
import { UploadManagerService } from '../../core/upload/upload-manager.service';

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [
    VStackComponent,
    MediaPageHeaderComponent,
    MediaContentComponent,
    CardVariantSwitchComponent,
    PaneToolbarComponent,
  ],
  templateUrl: './media.component.html',
  styleUrl: './media.component.scss',
  host: {
    'data-i18n-skip': '',
  },
})
export class MediaComponent implements OnDestroy {
  private static readonly DEFAULT_CONTAINER_WIDTH_PX = 960;
  private static readonly GRID_GAP_PX = 12;
  private static readonly ROW_BATCH_MULTIPLIER = 3;
  private static readonly SCROLL_PREFETCH_PX = 600;
  private static readonly MIN_RESET_LOADING_MS = 220;

  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  protected readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly mediaQueryService = inject(MediaQueryService);
  private readonly i18nService = inject(I18nService);
  private readonly cardVariantSettings = inject(CardVariantSettingsService);
  private readonly authService = inject(AuthService);
  private readonly uploadManager = inject(UploadManagerService);

  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly initialLoadSettled = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly mediaItems = signal<ImageRecord[]>([]);
  readonly mediaTotalCount = signal<number | null>(null);
  readonly nextOffset = signal(0);
  readonly projectNameById = signal<ReadonlyMap<string, string>>(new Map<string, string>());
  readonly cardVariant = signal<CardVariant>(this.cardVariantSettings.getVariant('media'));
  readonly allowedCardVariants = CARD_VARIANTS;
  readonly projectNameForFn = (projectId: string | null): string => this.projectNameFor(projectId);
  private readonly lastResolvedAuthUserId = signal<string | null | undefined>(undefined);
  readonly emptyReason = computed<'auth-required' | 'no-results'>(() => {
    if (!this.authService.loading() && !this.authService.user()) {
      return 'auth-required';
    }

    return 'no-results';
  });
  readonly hasMore = computed(() => {
    const total = this.mediaTotalCount();
    if (typeof total !== 'number') {
      return false;
    }

    return this.mediaItems().length < total;
  });
  readonly headerState = computed<MediaPageHeaderState>(() =>
    this.loading() ? 'loading' : 'ready',
  );
  readonly contentState = computed<MediaContentState>(() => {
    if (!this.initialLoadSettled()) {
      return 'loading';
    }

    if (this.loading()) {
      return 'loading';
    }
    if (this.loadError()) {
      return 'error';
    }
    return 'ready';
  });

  constructor() {
    // Bind media context to workspace pane
    const mediaSelectedItemsContext: SelectedItemsContextPort = {
      contextKey: 'media',
      selectedMediaIds$: this.workspaceSelectionService.selectedMediaIds,
      requestOpenDetail: (mediaId: string) => this.onMediaItemClicked(mediaId),
      requestSetHover: (mediaId: string | null) =>
        this.workspacePaneObserver.setDetailImageId(mediaId),
    };

    this.workspacePaneObserver.onContextRebind(mediaSelectedItemsContext);

    effect(() => {
      this.cardVariantSettings.setVariant('media', this.cardVariant());
    });

    effect(() => {
      const userId = this.authService.user()?.id ?? null;
      if (this.lastResolvedAuthUserId() === userId) {
        return;
      }

      this.lastResolvedAuthUserId.set(userId);
      this.initialLoadSettled.set(false);
      this.loadError.set(null);
      this.resetPagination();
      void this.loadMediaPage({ reset: true, includeCount: true });
    });

    merge(
      this.uploadManager.batchComplete$,
      this.uploadManager.imageUploaded$,
      this.uploadManager.imageReplaced$,
      this.uploadManager.imageAttached$,
    )
      .pipe(auditTime(300), takeUntilDestroyed())
      .subscribe(() => {
        this.initialLoadSettled.set(false);
        this.loadError.set(null);
        this.resetPagination();
        void this.loadMediaPage({ reset: true, includeCount: true });
      });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }

    const documentElement = document.documentElement;
    const nearBottom =
      window.scrollY + window.innerHeight >=
      documentElement.scrollHeight - MediaComponent.SCROLL_PREFETCH_PX;

    if (!nearBottom) {
      return;
    }

    void this.loadMediaPage({ reset: false, includeCount: false });
  }

  ngOnDestroy(): void {
    this.workspacePaneObserver.onRouteLeave('media');
  }

  t(key: string, fallback: string): string {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  }

  private debugInteraction(stage: string, extra: Record<string, unknown> = {}): void {
    console.info('[media-page][interaction]', {
      stage,
      mediaCount: this.mediaItems().length,
      totalCount: this.mediaTotalCount(),
      cardVariant: this.cardVariant(),
      loading: this.loading(),
      loadingMore: this.loadingMore(),
      selectedIds: Array.from(this.workspaceSelectionService.selectedMediaIds()),
      timestamp: Date.now(),
      ...extra,
    });
  }

  onMediaItemClicked(mediaId: string): void {
    // Open detail view in workspace pane without mutating selection state.
    this.debugInteraction('itemClicked.received', { mediaId });
    this.workspacePaneObserver.setDetailImageId(mediaId);
    this.debugInteraction('workspacePane.setDetailImageId.called', { mediaId });
  }

  onRetryLoad(): void {
    this.initialLoadSettled.set(false);
    this.loadError.set(null);
    this.resetPagination();
    void this.loadMediaPage({ reset: true, includeCount: true });
  }

  projectNameFor(projectId: string | null): string {
    if (!projectId) {
      return this.t('workspace.quickFilter.chip.noProject', 'No project');
    }

    return (
      this.projectNameById().get(projectId) ??
      this.t('workspace.quickFilter.chip.noProject', 'No project')
    );
  }

  async loadMediaPage(options: { reset: boolean; includeCount: boolean }): Promise<void> {
    if (this.loading() || this.loadingMore()) {
      return;
    }

    if (!options.reset && !this.hasMore()) {
      return;
    }

    const resetLoadStartedAtMs = options.reset ? Date.now() : null;

    if (options.reset) {
      this.loading.set(true);
    } else {
      this.loadingMore.set(true);
    }

    try {
      const batchInsertSize = this.resolveBatchInsertSize();
      const result = await this.mediaQueryService.loadCurrentUserMedia({
        offset: this.nextOffset(),
        limit: batchInsertSize,
        includeCount: options.includeCount,
      });

      if (options.reset) {
        this.mediaItems.set(result.items);
      } else {
        const existingIds = new Set(this.mediaItems().map((item) => item.id));
        const nextItems = result.items.filter((item) => !existingIds.has(item.id));
        this.mediaItems.update((current) => [...current, ...nextItems]);
      }

      if (result.totalCount !== null) {
        this.mediaTotalCount.set(result.totalCount);
      }

      this.nextOffset.set(this.mediaItems().length);

      const mergedProjectMap = new Map(this.projectNameById());
      for (const [projectId, projectName] of result.projectNameById.entries()) {
        mergedProjectMap.set(projectId, projectName);
      }
      this.projectNameById.set(mergedProjectMap);
    } catch {
      this.loadError.set(this.t('media.page.error', 'Failed to load media'));
      if (options.reset) {
        this.mediaItems.set([]);
        this.mediaTotalCount.set(null);
        this.projectNameById.set(new Map<string, string>());
      }
    } finally {
      if (resetLoadStartedAtMs !== null) {
        await this.ensureResetLoadingWindow(resetLoadStartedAtMs);
        this.initialLoadSettled.set(true);
      }

      this.loading.set(false);
      this.loadingMore.set(false);

      if (options.reset && this.hasMore()) {
        void this.loadMediaPage({ reset: false, includeCount: false });
        return;
      }

      if (this.hasMore() && this.isNearBottomForPrefetch()) {
        void this.loadMediaPage({ reset: false, includeCount: false });
      }
    }
  }

  private async ensureResetLoadingWindow(startedAtMs: number): Promise<void> {
    const elapsedMs = Date.now() - startedAtMs;
    const remainingMs = MediaComponent.MIN_RESET_LOADING_MS - elapsedMs;

    if (remainingMs <= 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, remainingMs);
    });
  }

  private isNearBottomForPrefetch(): boolean {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return false;
    }

    const documentElement = document.documentElement;
    return (
      window.scrollY + window.innerHeight >=
      documentElement.scrollHeight - MediaComponent.SCROLL_PREFETCH_PX
    );
  }

  private resetPagination(): void {
    this.nextOffset.set(0);
    this.mediaItems.set([]);
    this.mediaTotalCount.set(null);
    this.projectNameById.set(new Map<string, string>());
  }

  // Resolves deterministic /media batch size contract: current columns x 3.
  // @see docs/specs/component/item-grid/item-grid.md#actions
  private resolveBatchInsertSize(): number {
    const mode = this.cardVariant();
    if (mode === 'row') {
      return MediaComponent.ROW_BATCH_MULTIPLIER;
    }

    const columnMin = this.resolveColumnMinPx(mode);
    const width = this.resolveMediaContainerWidthPx();
    const columns = Math.max(
      1,
      Math.floor((width + MediaComponent.GRID_GAP_PX) / (columnMin + MediaComponent.GRID_GAP_PX)),
    );
    return columns * 3;
  }

  // Uses rendered media container width when available, with stable fallback for first-load fetches.
  // @see docs/specs/component/item-grid/item-grid.md#actions
  private resolveMediaContainerWidthPx(): number {
    if (typeof document !== 'undefined') {
      const container = document.querySelector('.media-content');
      if (container instanceof HTMLElement && container.clientWidth > 0) {
        return container.clientWidth;
      }
    }

    if (
      typeof window !== 'undefined' &&
      Number.isFinite(window.innerWidth) &&
      window.innerWidth > 0
    ) {
      return window.innerWidth;
    }

    return MediaComponent.DEFAULT_CONTAINER_WIDTH_PX;
  }

  // Mirrors item-grid mode column minimums used by media-content placeholder geometry.
  // @see docs/specs/component/item-grid/item-grid.md#data
  private resolveColumnMinPx(variant: CardVariant): number {
    switch (variant) {
      case 'small':
        return 128;
      case 'large':
        return 208;
      case 'row':
        return 1;
      case 'medium':
      default:
        return 160;
    }
  }
}
