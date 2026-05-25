/**
 * AuthenticatedAppLayoutComponent — owns horizontal split: main router-outlet + workspace pane.
 * @see docs/specs/ui/workspace/workspace-pane.md § Layout host
 */
import {
  Component,
  Injector,
  afterNextRender,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { MapShellComponent } from '../features/map/map-shell/map-shell.component';
import {
  resolveAuthenticatedActiveShell,
  type AuthenticatedActiveShell,
} from './authenticated-shell-active.helpers';
import { ShareLinkRestoreService } from '../core/share-set/share-link-restore.service';
import type { ShareLinkRestoreResult } from '../core/share-set/share-link-restore.types';
import { ShareUrlSyncService } from '../core/share-set/share-url-sync.service';
import { I18nService } from '../core/i18n/i18n.service';
import { ToastService } from '../core/toast/toast.service';
import { NavComponent } from '../features/nav/nav.component';
import { DragDividerComponent } from '../shared/workspace-pane/shell/drag-divider/drag-divider.component';
import { WorkspacePaneComponent } from '../shared/workspace-pane/shell/workspace-pane.component';
import { UploadPanelComponent } from '../features/upload/upload-panel.component';
import { MapShellState } from '../features/map/map-shell/map-shell.state';
import { WorkspacePaneObserverAdapter } from '../core/workspace-pane/workspace-pane-observer.adapter';
import { MapZoomOrchestratorService } from '../core/map-zoom/map-zoom-orchestrator.service';
import { WorkspacePaneLayoutMapEffectsService } from '../core/workspace-pane/workspace-pane-layout-map-effects.service';
import {
  WORKSPACE_PANE_SHELL_HOST,
  type WorkspacePaneShellHost,
} from '../core/workspace-pane/workspace-pane-shell-host.token';
import { WorkspaceViewService } from '../core/workspace-view/workspace-view.service';
import { WorkspaceSelectionService } from '../core/workspace-selection/workspace-selection.service';
import type { WorkspacePaneTab } from '../core/workspace-pane/workspace-pane-host.port';
import type {
  ImageUploadedEvent,
  UploadLocationMapPickRequest,
  UploadLocationPreviewEvent,
} from '../core/workspace-pane/workspace-pane-shell-events.types';
import type { ThumbnailCardHoverEvent } from '../core/workspace-pane/workspace-pane-thumbnail-hover.types';

const WORKSPACE_PANE_WIDTH_STORAGE_KEY = 'sitesnap.settings.layout.workspacePaneWidth';

@Component({
  selector: 'app-authenticated-app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    MapShellComponent,
    NavComponent,
    DragDividerComponent,
    WorkspacePaneComponent,
    UploadPanelComponent,
  ],
  templateUrl: './authenticated-app-layout.component.html',
  styleUrl: './authenticated-app-layout.component.scss',
  providers: [
    MapShellState,
    { provide: WORKSPACE_PANE_SHELL_HOST, useExisting: AuthenticatedAppLayoutComponent },
  ],
})
export class AuthenticatedAppLayoutComponent implements WorkspacePaneShellHost {
  private readonly shellState = inject(MapShellState);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly mapLayoutEffects = inject(WorkspacePaneLayoutMapEffectsService);
  private readonly mapZoomOrchestrator = inject(MapZoomOrchestratorService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly shareLinkRestoreService = inject(ShareLinkRestoreService);
  private readonly shareUrlSyncService = inject(ShareUrlSyncService);
  private readonly toastService = inject(ToastService);
  private readonly i18nService = inject(I18nService);
  private readonly injector = inject(Injector);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly activeShell = computed(() => resolveAuthenticatedActiveShell(this.currentUrl()));
  readonly mapShellVisible = computed(() => this.activeShell() === 'map');

  private previousActiveShell: AuthenticatedActiveShell | null = null;

  private readonly preferredWorkspacePaneWidth = signal<number | null>(null);

  readonly photoPanelOpen = this.shellState.photoPanelOpen;
  readonly workspacePaneWidth = this.shellState.workspacePaneWidth;
  readonly detailMediaId = this.shellState.detailMediaId;
  readonly detailAddressSearchRequest = this.shellState.detailAddressSearchRequest;
  readonly linkedHoveredWorkspaceMediaIds = this.shellState.linkedHoveredWorkspaceMediaIds;
  readonly workspacePaneActiveTab = this.workspacePaneObserver.activeTab$;

  private get viewportWidth(): number {
    return typeof window !== 'undefined' ? window.innerWidth : 1280;
  }

  readonly workspacePaneMinWidth = computed(() => this.viewportWidth * 0.25);
  readonly workspacePaneMaxWidth = computed(() => this.viewportWidth * 0.75);
  readonly workspacePaneDefaultWidth = computed(() => this.viewportWidth * 0.618);

  constructor() {
    effect(() => {
      const shell = this.activeShell();
      const prev = this.previousActiveShell;

      if (prev === 'map' && shell !== 'map') {
        this.workspacePaneObserver.onRouteLeave('map');
      }

      if (prev !== 'map' && shell === 'map') {
        afterNextRender(
          () => {
            this.mapLayoutEffects.getMapEffects()?.invalidateMapSize();
          },
          { injector: this.injector },
        );
      }

      this.previousActiveShell = shell;
    });

    effect(() => {
      const id = this.workspacePaneObserver.detailImageId$();
      if (this.shellState.detailMediaId() !== id) {
        this.shellState.setDetailMediaId(id);
      }
      // Open the workspace pane when a detail view is requested from any page context
      // (e.g. media page) that calls workspacePaneObserver.setDetailImageId() directly
      // rather than going through openDetailView().
      // @see docs/specs/ui/workspace/workspace-view-system.md
      if (id != null && !this.shellState.photoPanelOpen()) {
        this.shellState.setWorkspacePaneWidth(this.getWorkspacePaneOpeningWidth());
        this.shellState.setPhotoPanelOpen(true);
      }
    });

    effect(() => {
      const scopeMediaIds = this.getOrderedScopeMediaIds();
      const detailMediaId = this.workspacePaneObserver.detailImageId$();
      this.shareUrlSyncService.scheduleSync({
        routeSnapshot: this.route.snapshot,
        scopeMediaIds,
        detailMediaId,
      });
    });

    afterNextRender(() => {
      const isJsdom =
        typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom');
      if (isJsdom) {
        return;
      }
      this.restoreWorkspacePaneWidthPreference();
      void this.tryRestoreShareLinkFromRoute();
    });

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const lastNavigation = this.router.lastSuccessfulNavigation();
        const internalUrlSyncNavigation = Boolean(
          lastNavigation?.extras.state?.['shareUrlSync'],
        );
        if (internalUrlSyncNavigation) {
          return;
        }
        void this.tryRestoreShareLinkFromRoute();
      });
  }

  openDetailView(mediaId: string): void {
    if (!this.shellState.photoPanelOpen()) {
      this.shellState.setWorkspacePaneWidth(this.getWorkspacePaneOpeningWidth());
    }
    this.shellState.setDetailMediaId(mediaId);
    this.workspacePaneObserver.setDetailImageId(mediaId);
    this.shellState.setPhotoPanelOpen(true);
  }

  closeDetailView(): void {
    this.shellState.setDetailMediaId(null);
    this.workspacePaneObserver.setDetailImageId(null);
  }

  closeWorkspacePane(): void {
    this.mapLayoutEffects.getMapEffects()?.onWorkspacePaneClosing();
    this.shellState.setPhotoPanelOpen(false);
    this.shellState.setDetailMediaId(null);
    this.workspacePaneObserver.setDetailImageId(null);
    this.workspacePaneObserver.setOpen(false);
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
    setTimeout(() => this.mapLayoutEffects.getMapEffects()?.invalidateMapSize() ?? void 0, 0);
  }

  onWorkspaceWidthChange(newWidth: number): void {
    // Snap-close: dragging the divider below half of minWidth closes the pane.
    // @see docs/specs/ui/workspace/workspace-pane.md §Actions #2
    if (newWidth < this.workspacePaneMinWidth() * 0.5) {
      this.closeWorkspacePane();
      return;
    }
    const clampedWidth = this.clampWorkspacePaneWidth(newWidth);
    this.shellState.setWorkspacePaneWidth(clampedWidth);
    this.persistWorkspacePaneWidthPreference(clampedWidth);
    this.mapLayoutEffects.getMapEffects()?.invalidateMapSize();
  }

  onWorkspacePaneActiveTabChange(tab: WorkspacePaneTab): void {
    this.workspacePaneObserver.setActiveTab(tab);
  }

  onDetailAddressSearchRequestConsumed(requestId: number): void {
    const currentRequest = this.shellState.detailAddressSearchRequest();
    if (!currentRequest || currentRequest.requestId !== requestId) {
      return;
    }
    this.shellState.setDetailAddressSearchRequest(null);
  }

  onZoomToLocationRequested(event: {
    mediaId: string;
    lat: number;
    lng: number;
    zoomMode?: 'house' | 'street';
  }): void {
    this.mapZoomOrchestrator.requestZoom({
      source: 'layout-bubble',
      mediaId: event.mediaId,
      lat: event.lat,
      lng: event.lng,
      zoomMode: event.zoomMode,
    });
  }

  onImageUploadedFromWorkspacePane(event: ImageUploadedEvent): void {
    this.mapLayoutEffects.getMapEffects()?.onImageUploaded(event);
  }

  enterPlacementModeFromWorkspacePane(key: string): void {
    const mapFx = this.mapLayoutEffects.getMapEffects();
    if (mapFx) {
      mapFx.enterPlacementMode(key);
      return;
    }
    void this.router.navigate(['/map']);
  }

  onUploadLocationPreviewRequestedFromWorkspacePane(event: UploadLocationPreviewEvent): void {
    this.mapLayoutEffects.getMapEffects()?.onUploadLocationPreviewRequested(event);
  }

  onUploadLocationPreviewClearedFromWorkspacePane(): void {
    this.mapLayoutEffects.getMapEffects()?.onUploadLocationPreviewCleared();
  }

  onUploadLocationMapPickRequestedFromWorkspacePane(event: UploadLocationMapPickRequest): void {
    const mapFx = this.mapLayoutEffects.getMapEffects();
    if (mapFx) {
      mapFx.onUploadLocationMapPickRequested(event);
      return;
    }

    void this.router.navigate(['/map'], {
      state: {
        locationMapPickNav: {
          request: event,
          returnUrl: this.router.url,
        },
      },
    });
  }

  onWorkspaceItemHoverStartedFromPane(event: ThumbnailCardHoverEvent): void {
    this.mapLayoutEffects.getMapEffects()?.onWorkspaceItemHoverStarted(event);
  }

  onWorkspaceItemHoverEndedFromPane(mediaId: string): void {
    this.mapLayoutEffects.getMapEffects()?.onWorkspaceItemHoverEnded(mediaId);
  }

  private clampWorkspacePaneWidth(width: number): number {
    return Math.min(Math.max(width, this.workspacePaneMinWidth()), this.workspacePaneMaxWidth());
  }

  private getWorkspacePaneOpeningWidth(): number {
    const preferredWidth = this.preferredWorkspacePaneWidth();
    if (typeof preferredWidth === 'number') {
      return this.clampWorkspacePaneWidth(preferredWidth);
    }
    return this.workspacePaneDefaultWidth();
  }

  private restoreWorkspacePaneWidthPreference(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const rawValue = window.localStorage.getItem(WORKSPACE_PANE_WIDTH_STORAGE_KEY);
    if (!rawValue) {
      return;
    }

    const parsedWidth = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsedWidth)) {
      return;
    }

    const clampedWidth = this.clampWorkspacePaneWidth(parsedWidth);
    this.preferredWorkspacePaneWidth.set(clampedWidth);
    this.shellState.setWorkspacePaneWidth(clampedWidth);
  }

  private persistWorkspacePaneWidthPreference(width: number): void {
    this.preferredWorkspacePaneWidth.set(width);
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(WORKSPACE_PANE_WIDTH_STORAGE_KEY, String(width));
  }

  /** @see docs/specs/service/share-set/share-link-restore.md */
  private async tryRestoreShareLinkFromRoute(): Promise<void> {
    const result = await this.shareLinkRestoreService.restoreFromRoute(this.route.snapshot, this);
    this.applyShareLinkRestoreResult(result);
    if (result.shouldStripQueryParams) {
      await this.stripShareLinkQueryParams();
    }
    this.shareUrlSyncService.scheduleSync({
      routeSnapshot: this.route.snapshot,
      scopeMediaIds: this.getOrderedScopeMediaIds(),
      detailMediaId: this.workspacePaneObserver.detailImageId$(),
    });
  }

  private getOrderedScopeMediaIds(): string[] {
    const explicitSelection = Array.from(this.workspaceSelectionService.selectedMediaIds());
    if (explicitSelection.length > 0) {
      return explicitSelection;
    }
    const detailMediaId = this.workspacePaneObserver.detailImageId$();
    if (detailMediaId) {
      return [detailMediaId];
    }
    return this.workspaceViewService.rawImages().map((image) => image.id);
  }

  private applyShareLinkRestoreResult(result: ShareLinkRestoreResult): void {
    if (result.status === 'skipped') {
      return;
    }

    const t = (key: string, fallback: string): string => this.i18nService.t(key, fallback);

    switch (result.status) {
      case 'invalid':
        this.toastService.show({
          message: t(
            'share.restore.error.invalid',
            'Share link invalid, expired, or not accessible.',
          ),
          type: 'warning',
          dedupe: true,
        });
        return;
      case 'no-images':
        this.toastService.show({
          message: t(
            'share.restore.error.noImages',
            'Share link contains no available media.',
          ),
          type: 'warning',
          dedupe: true,
        });
        return;
      case 'error':
        this.toastService.show({
          message: t('share.restore.error.resolveFailed', 'Share link could not be resolved.'),
          type: 'error',
          dedupe: true,
        });
        return;
      case 'success':
        this.workspacePaneObserver.setActiveTab('selected-items');
        if (!result.detailMediaId) {
          this.closeDetailView();
          if (!this.shellState.photoPanelOpen()) {
            this.shellState.setWorkspacePaneWidth(this.getWorkspacePaneOpeningWidth());
          }
          this.shellState.setPhotoPanelOpen(true);
        }
        if (result.detailSkipped) {
          this.toastService.show({
            message: t(
              'share.restore.warning.mediaNotInSet',
              'That item is not in this shared set. Showing the group.',
            ),
            type: 'warning',
            dedupe: true,
          });
        }
        this.toastService.show({
          message: t(
            'share.restore.success.loaded',
            '{count} media loaded from share link.',
          ).replace('{count}', String(result.selectionIds.length)),
          type: 'success',
          dedupe: true,
        });
        return;
    }
  }

  private async stripShareLinkQueryParams(): Promise<void> {
    await this.router.navigate([], {
      queryParams: { share: null, media: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
