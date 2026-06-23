/* eslint-disable max-lines */

import {
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { UploadShellUiService } from '../../../upload/upload-shell/upload-shell-ui.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { FilterService } from '../../../../core/filter/filter.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import { MEDIA_PLACEHOLDER_ICON } from '../../../../core/media-download/media-download.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { SearchBarComponent } from '../../search-bar/search-bar.component';
import { MapFilterToolbarComponent } from '../../map-filter-toolbar/map-filter-toolbar.component';
import { MapSearchContextService } from '../handlers/map-search-context.service';
import { ProjectSelectDialogComponent } from '../../../../shared/project-select-dialog/project-select-dialog.component';
import { TextInputDialogComponent } from '../../../../shared/text-input-dialog/text-input-dialog.component';
import { BrnToggleGroupImports } from '@spartan-ng/brain/toggle-group';
import { HLM_TOGGLE_GROUP_IMPORTS } from '../../../../shared/ui/toggle-group';
import { DropdownShellComponent } from '../../../../shared/dropdown-trigger/shell/dropdown-shell.component';
import { HlmMenuItemDirective, HlmMenuSeparatorDirective } from '../../../../shared/ui/menu';
import { MapShellState } from './map-shell.state';
import { MapViewportCoordinatorService } from '../markers/map-viewport-coordinator.service';
import { MapContextMenuHandlerService } from '../context-menu/map-context-menu-handler.service';
import { MapContextMenuOpenService } from '../context-menu/map-context-menu-open.service';
import { MapShellBasemapService } from '../leaflet/map-shell-basemap.service';
import { MapFocusPayloadService } from '../context-menu/map-focus-payload.service';
import { LocationMapPickNavigationService } from '../../../../core/workspace-pane/location-map-pick-navigation.service';
import { MapShellGpsService } from '../leaflet/map-shell-gps.service';
import { MapShellSearchService } from '../leaflet/map-shell-search.service';
import { MapMarkerSelectionService } from '../markers/map-marker-selection.service';
import { WorkspacePaneObserverAdapter } from '../../../../core/workspace-pane/workspace-pane-observer.adapter';
import type { SelectedItemsContextPort } from '../../../../core/workspace-pane/workspace-pane-context.port';
import { WORKSPACE_PANE_SHELL_HOST } from '../../../../core/workspace-pane/workspace-pane-shell-host.token';
import { MapMenuViewModelService } from '../workspace/map-menu-view-model.service';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import { MapShellInstanceService } from './map-shell-instance.service';
import { MapWorkspacePaneEffectsService } from '../handlers/map-workspace-pane-effects.service';
import { MapPlacementService } from '../handlers/map-placement.service';
import { MapShellInitService } from '../handlers/map-shell-init.service';
import { getFirstMarkerKeyForMedia } from '../markers/marker-media-index.helpers';

@Component({
  selector: 'app-map-shell',
  imports: [
    SearchBarComponent,
    MapFilterToolbarComponent,
    ProjectSelectDialogComponent,
    TextInputDialogComponent,
    ...BrnToggleGroupImports,
    ...HLM_TOGGLE_GROUP_IMPORTS,
    DropdownShellComponent,
    HlmMenuItemDirective,
    HlmMenuSeparatorDirective,
    ...HLM_BUTTON_IMPORTS,
  ],
  templateUrl: './map-shell.component.html',
  styleUrl: './map-shell.component.scss',
  host: {
    '[style.--placeholder-icon]': 'placeholderIconUrl',
  },
})
export class MapShellComponent implements OnDestroy {
  private static readonly CONTEXT_MENU_SHEET_BREAKPOINT_PX = 768;

  readonly placeholderIconUrl = `url("${MEDIA_PLACEHOLDER_ICON}")`;

  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly filterService = inject(FilterService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18nService = inject(I18nService);
  private readonly router = inject(Router);
  readonly state = inject(MapShellState);
  private readonly mapViewportCoordinatorService = inject(MapViewportCoordinatorService);
  readonly mapContextMenuHandlerService = inject(MapContextMenuHandlerService);
  readonly mapContextMenuOpenService = inject(MapContextMenuOpenService);
  readonly basemapService = inject(MapShellBasemapService);
  private readonly mapFocusPayloadService = inject(MapFocusPayloadService);
  private readonly locationMapPickNavigationService = inject(LocationMapPickNavigationService);
  readonly gpsService = inject(MapShellGpsService);
  readonly searchService = inject(MapShellSearchService);
  private readonly markerSelectionService = inject(MapMarkerSelectionService);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  private readonly workspacePaneShellHost = inject(WORKSPACE_PANE_SHELL_HOST);
  readonly menuVm = inject(MapMenuViewModelService);
  readonly searchContext = inject(MapSearchContextService);
  readonly mapPlacementService = inject(MapPlacementService);
  private readonly mapShellInstance = inject(MapShellInstanceService);
  private readonly workspacePaneEffectsService = inject(MapWorkspacePaneEffectsService);
  private readonly uploadShellUi = inject(UploadShellUiService);
  private readonly mapShellInitService = inject(MapShellInitService);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  private readonly mapContainerRef = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  private readonly pendingMapFocus = signal<{ mediaId: string; lat: number; lng: number } | null>(
    this.mapFocusPayloadService.readMapFocusPayload(this.router),
  );
  private readonly pendingLocationMapPickNav = signal(
    this.locationMapPickNavigationService.readPayload(this.router),
  );

  private readonly mapSelectedItemsContext: SelectedItemsContextPort = {
    contextKey: 'map',
    selectedMediaIds$: this.workspaceSelectionService.selectedMediaIds,
    requestOpenDetail: (mediaId: string) => this.openDetailView(mediaId),
    requestSetHover: (mediaId: string | null) => {
      if (!mediaId) {
        this.markerSelectionService.setLinkedHoverMarkerFromWorkspace(null);
        return;
      }
      this.markerSelectionService.setLinkedHoverMarkerFromWorkspace(
        getFirstMarkerKeyForMedia(this.mapShellInstance.markersByMediaId, mediaId) ?? null,
      );
    },
  };

  constructor() {
    this.workspacePaneObserver.onContextRebind(this.mapSelectedItemsContext);
    this.workspacePaneEffectsService.register();

    let mapFilterEffectReady = false;
    effect(() => {
      this.workspaceViewService.filteredImageIds();
      this.workspaceViewService.selectedProjectIds();
      this.workspaceViewService.timeRange();
      this.filterService.rules();
      if (!mapFilterEffectReady) {
        mapFilterEffectReady = true;
        return;
      }
      this.mapViewportCoordinatorService.reapplyViewportMarkerFilter();
    });

    afterNextRender(() => {
      this.mapShellInitService.initOnFirstRender(this.mapContainerRef(), this.destroyRef, {
        openDetailView: (id) => this.openDetailView(id),
        closeWorkspacePane: () => this.workspacePaneShellHost.closeWorkspacePane(),
        onDetailAddressSearchRequestConsumed: (id) =>
          this.workspacePaneShellHost.onDetailAddressSearchRequestConsumed(id),
        getPendingMapFocus: () => this.pendingMapFocus(),
        clearPendingMapFocus: () => this.pendingMapFocus.set(null),
        getPendingLocationMapPickNav: () => this.pendingLocationMapPickNav(),
        clearPendingLocationMapPickNav: () => this.pendingLocationMapPickNav.set(null),
      });
    });
  }

  ngOnDestroy(): void {
    this.workspacePaneEffectsService.unregister();
    this.mapShellInitService.cleanup();
  }

  closeContextMenus(): void {
    this.state.closeAllContextMenus();
  }

  onMapMenuCloseRequested(): void {
    this.closeContextMenus();
    this.mapContainerRef()?.nativeElement?.focus();
  }

  toggleBasemap(): void {
    this.basemapService.toggle(this.mapShellInstance.map);
  }

  mapMenuPanelClass(viewportWidth?: number): string {
    return this.isContextMenuSheetViewport(viewportWidth)
      ? 'map-context-menu option-menu-surface map-context-menu--sheet'
      : 'map-context-menu option-menu-surface';
  }

  private isContextMenuSheetViewport(viewportWidth?: number): boolean {
    const resolvedViewportWidth =
      typeof viewportWidth === 'number'
        ? viewportWidth
        : typeof window !== 'undefined'
          ? window.innerWidth
          : 1280;
    return resolvedViewportWidth < MapShellComponent.CONTEXT_MENU_SHEET_BREAKPOINT_PX;
  }

  onQrInviteCommandRequested(): void {
    void this.router.navigateByUrl('/colleagues?tab=invites');
  }

  closeDetailView(): void {
    this.workspacePaneShellHost.closeDetailView();
  }

  openDetailView(mediaId: string): void {
    this.workspacePaneShellHost.openDetailView(mediaId);
  }

  toggleUploadPanel(): void {
    this.uploadShellUi.toggleUploadPanel();
  }
}
