export type MapWorkspaceContextType =
  | 'map_marker'
  | 'map_cluster'
  | 'map_multi'
  | 'radius_selection'
  | 'workspace_single'
  | 'workspace_multi';

export interface MarkerContextPayload {
  markerKey: string;
  count: number;
  lat: number;
  lng: number;
  mediaId?: string;
  isMultiSelection?: boolean;
  sourceCells: Array<{ lat: number; lng: number }>;
}

export interface MarkerActionContext {
  contextType: 'map_marker' | 'map_cluster' | 'map_multi';
  markerKey: string;
  count: number;
  primaryMediaId: string | null;
  mediaIds: string[];
  coords: { lat: number; lng: number };
  isMultiSelection: boolean;
  sourceCells: Array<{ lat: number; lng: number }>;
}

export interface MapActionContext {
  contextType: 'map_point';
  count: number;
  primaryMediaId: string | null;
  mediaIds: string[];
  coords: { lat: number; lng: number };
  sourceCells: Array<{ lat: number; lng: number }>;
}

export interface RadiusActionContext {
  contextType: 'radius_selection';
  count: number;
  mediaIds: string[];
}

export type MapMenuActionId =
  | 'create_marker_here'
  | 'zoom_house'
  | 'zoom_street'
  | 'copy_address'
  | 'copy_gps'
  | 'open_google_maps';

export type MarkerMenuActionId =
  | 'open_details_or_selection'
  | 'open_in_media'
  | 'zoom_house'
  | 'zoom_street'
  | 'assign_to_project'
  | 'change_location_map'
  | 'change_location_address'
  | 'copy_address'
  | 'copy_gps'
  | 'open_google_maps'
  | 'remove_from_project'
  | 'delete_media';

export type RadiusMenuActionId =
  | 'open_selection'
  | 'assign_to_project'
  | 'remove_from_project'
  | 'delete_media';
