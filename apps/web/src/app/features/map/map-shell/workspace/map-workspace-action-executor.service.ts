import { Injectable } from '@angular/core';
import type { MapMenuActionId, MarkerMenuActionId } from './map-workspace-actions.types';

export interface MapActionHandlers {
  createMarkerHere: () => void;
  zoomHouse: () => void;
  zoomStreet: () => void;
  copyAddress: () => Promise<void> | void;
  copyGps: () => Promise<void> | void;
  openGoogleMaps: () => void;
}

export interface MarkerActionHandlers {
  openDetailsOrSelection: () => void;
  openInMedia: () => Promise<void> | void;
  zoomHouse: () => void;
  zoomStreet: () => void;
  assignToProject: () => Promise<void> | void;
  resolveLocation: () => Promise<void> | void;
  changeLocationMap: () => Promise<void> | void;
  changeLocationAddress: () => Promise<void> | void;
  copyAddress: () => Promise<void> | void;
  copyGps: () => Promise<void> | void;
  openGoogleMaps: () => void;
  removeFromProject: () => Promise<void> | void;
  deleteMedia: () => Promise<void> | void;
}

@Injectable({ providedIn: 'root' })
export class MapWorkspaceActionExecutorService {
  async executeMapAction(actionId: MapMenuActionId, handlers: MapActionHandlers): Promise<void> {
    switch (actionId) {
      case 'create_marker_here':
        handlers.createMarkerHere();
        return;
      case 'zoom_house':
        handlers.zoomHouse();
        return;
      case 'zoom_street':
        handlers.zoomStreet();
        return;
      case 'copy_address':
        await handlers.copyAddress();
        return;
      case 'copy_gps':
        await handlers.copyGps();
        return;
      case 'open_google_maps':
        handlers.openGoogleMaps();
        return;
      default:
        return;
    }
  }

  async executeMarkerAction(
    actionId: MarkerMenuActionId,
    handlers: MarkerActionHandlers,
  ): Promise<void> {
    switch (actionId) {
      case 'open_details_or_selection':
        handlers.openDetailsOrSelection();
        return;
      case 'open_in_media':
        await handlers.openInMedia();
        return;
      case 'zoom_house':
        handlers.zoomHouse();
        return;
      case 'zoom_street':
        handlers.zoomStreet();
        return;
      case 'assign_to_project':
        await handlers.assignToProject();
        return;
      case 'resolve_location':
        await handlers.resolveLocation();
        return;
      case 'change_location_map':
        await handlers.changeLocationMap();
        return;
      case 'change_location_address':
        await handlers.changeLocationAddress();
        return;
      case 'copy_address':
        await handlers.copyAddress();
        return;
      case 'copy_gps':
        await handlers.copyGps();
        return;
      case 'open_google_maps':
        handlers.openGoogleMaps();
        return;
      case 'remove_from_project':
        await handlers.removeFromProject();
        return;
      case 'delete_media':
        await handlers.deleteMedia();
        return;
      default:
        return;
    }
  }
}
