import type { ACTION_CONTEXT_IDS } from '../../core/action/action-context-ids';

export interface WorkspaceSingleActionContext {
  contextType: typeof ACTION_CONTEXT_IDS.wsFooter;
  hasCoordinates: boolean;
  // Spec link: docs/specs/ui/media-detail/media-detail-actions.md -> address-dependent action enablement.
  hasAddress: boolean;
}

export type WorkspaceSingleActionId =
  | 'open_details_or_selection'
  | 'open_in_media'
  | 'zoom_house'
  | 'zoom_street'
  | 'copy_address'
  | 'open_google_maps'
  | 'assign_to_project'
  | 'resolve_location'
  | 'change_location_map'
  | 'change_location_address'
  | 'copy_gps'
  | 'remove_from_project'
  | 'delete_media';
