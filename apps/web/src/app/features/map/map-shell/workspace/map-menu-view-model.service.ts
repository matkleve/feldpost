import { Injectable, computed, inject } from '@angular/core';
import { ActionEngineService } from '../../../../core/action/action-engine.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { MapShellState } from '../component/map-shell.state';
import { MapProjectActionsService } from './map-project-actions.service';
import { MapWorkspaceContextResolverService } from './map-workspace-context-resolver.service';
import {
  MAP_MENU_ACTION_DEFINITIONS,
  MARKER_MENU_ACTION_DEFINITIONS,
} from './map-workspace-actions.registry';
import { RADIUS_SELECTION_ACTION_DEFINITIONS } from '../radius/radius-selection-actions.registry';
import type { ResolvedAction } from '../../../../core/action/action-types';
import type { RadiusActionContext, MapMenuActionId, MarkerMenuActionId, RadiusMenuActionId } from './map-workspace-actions.types';

@Injectable({ providedIn: 'root' })
export class MapMenuViewModelService {
  private readonly state = inject(MapShellState);
  private readonly actionEngineService = inject(ActionEngineService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly mapProjectActionsService = inject(MapProjectActionsService);
  private readonly mapWorkspaceContextResolverService = inject(MapWorkspaceContextResolverService);

  private readonly mapMenuContext = computed(() =>
    this.mapWorkspaceContextResolverService.resolveMapContext(this.state.mapContextMenuCoords()),
  );
  readonly mapMenuActions = computed<ReadonlyArray<ResolvedAction<MapMenuActionId>>>(() => {
    const context = this.mapMenuContext();
    if (!context) return [];
    return this.actionEngineService.resolveActions(MAP_MENU_ACTION_DEFINITIONS, context);
  });
  readonly mapPrimaryActions = computed(() =>
    this.mapMenuActions().filter((action) => action.section === 'primary'),
  );
  readonly mapSecondaryActions = computed(() =>
    this.mapMenuActions().filter((action) => action.section === 'secondary'),
  );

  private readonly radiusMenuContext = computed<RadiusActionContext>(() => ({
    contextType: 'radius_selection',
    count: this.mapProjectActionsService.getActiveSelectionImageIds(
      this.workspaceViewService.rawImages(),
    ).length,
    mediaIds: this.mapProjectActionsService.getActiveSelectionImageIds(
      this.workspaceViewService.rawImages(),
    ),
  }));
  readonly radiusMenuActions = computed<ReadonlyArray<ResolvedAction<RadiusMenuActionId>>>(() =>
    this.actionEngineService.resolveActions(
      RADIUS_SELECTION_ACTION_DEFINITIONS,
      this.radiusMenuContext(),
    ),
  );
  readonly radiusPrimaryActions = computed(() =>
    this.radiusMenuActions().filter((action) => action.section === 'primary'),
  );
  readonly radiusDestructiveActions = computed(() =>
    this.radiusMenuActions().filter((action) => action.section === 'destructive'),
  );

  private readonly markerMenuContext = computed(() =>
    this.mapWorkspaceContextResolverService.resolveMarkerContext(this.state.markerContextMenuPayload()),
  );
  readonly markerMenuActions = computed<ReadonlyArray<ResolvedAction<MarkerMenuActionId>>>(() => {
    const context = this.markerMenuContext();
    if (!context) return [];
    return this.actionEngineService.resolveActions(MARKER_MENU_ACTION_DEFINITIONS, context);
  });
  readonly markerPrimaryActions = computed(() =>
    this.markerMenuActions().filter((action) => action.section === 'primary'),
  );
  readonly markerSecondaryActions = computed(() =>
    this.markerMenuActions().filter((action) => action.section === 'secondary'),
  );
  readonly markerDestructiveActions = computed(() =>
    this.markerMenuActions().filter((action) => action.section === 'destructive'),
  );

  readonly anyContextMenuOpen = computed(
    () => this.state.mapContextMenuOpen() || this.state.radiusContextMenuOpen() || this.state.markerContextMenuOpen(),
  );
}
