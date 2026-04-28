/**
 * AuthenticatedAppLayoutComponent — owns horizontal split: main router-outlet + workspace pane.
 * @see docs/specs/ui/workspace/workspace-pane.md § Layout host
 */
import {
  Component,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { WorkspacePaneComponent } from '../shared/workspace-pane/shell/workspace-pane.component';
import { WorkspacePaneShellComponent } from '../shared/workspace-pane/shell/workspace-pane-shell.component';
import { UploadPanelComponent } from '../features/upload/upload-panel.component';
import { MapShellState } from '../features/map/map-shell/map-shell.state';
import { WorkspacePaneObserverAdapter } from '../core/workspace-pane/workspace-pane-observer.adapter';
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
  imports: [RouterOutlet, WorkspacePaneComponent, WorkspacePaneShellComponent, UploadPanelComponent],
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
  private readonly router = inject(Router);

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
      const id = this.workspacePaneObserver.detailImageId$();
      if (this.shellState.detailMediaId() !== id) {
        this.shellState.detailMediaId.set(id);
      }
    });

    afterNextRender(() => {
      const isJsdom =
        typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom');
      if (isJsdom) {
        return;
      }
      this.restoreWorkspacePaneWidthPreference();
    });
  }

  openDetailView(mediaId: string): void {
    if (!this.shellState.photoPanelOpen()) {
      this.shellState.workspacePaneWidth.set(this.getWorkspacePaneOpeningWidth());
    }
    this.shellState.detailMediaId.set(mediaId);
    this.workspacePaneObserver.setDetailImageId(mediaId);
    this.shellState.photoPanelOpen.set(true);
  }

  closeDetailView(): void {
    this.shellState.detailMediaId.set(null);
    this.workspacePaneObserver.setDetailImageId(null);
  }

  closeWorkspacePane(): void {
    this.mapLayoutEffects.getMapEffects()?.onWorkspacePaneClosing();
    this.shellState.photoPanelOpen.set(false);
    this.shellState.detailMediaId.set(null);
    this.workspacePaneObserver.setDetailImageId(null);
    this.workspacePaneObserver.setOpen(false);
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
    setTimeout(() => this.mapLayoutEffects.getMapEffects()?.invalidateMapSize() ?? void 0, 0);
  }

  onWorkspaceWidthChange(newWidth: number): void {
    const clampedWidth = this.clampWorkspacePaneWidth(newWidth);
    this.shellState.workspacePaneWidth.set(clampedWidth);
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
    this.shellState.detailAddressSearchRequest.set(null);
  }

  onZoomToLocationRequested(event: {
    mediaId: string;
    lat: number;
    lng: number;
    zoomMode?: 'house' | 'street';
  }): void {
    const mapFx = this.mapLayoutEffects.getMapEffects();
    if (mapFx) {
      mapFx.onZoomToLocation(event);
      return;
    }
    void this.router.navigate(['/map'], {
      state: {
        mapFocus: { mediaId: event.mediaId, lat: event.lat, lng: event.lng },
      },
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
    this.mapLayoutEffects.getMapEffects()?.onUploadLocationMapPickRequested(event);
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
    this.shellState.workspacePaneWidth.set(clampedWidth);
  }

  private persistWorkspacePaneWidthPreference(width: number): void {
    this.preferredWorkspacePaneWidth.set(width);
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(WORKSPACE_PANE_WIDTH_STORAGE_KEY, String(width));
  }
}
