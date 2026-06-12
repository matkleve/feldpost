export const ACTION_CONTEXT_IDS = {
  mapPoint: 'map_point',
  mapMarker: 'map_marker',
  mapCluster: 'map_cluster',
  wsFooter: 'ws_footer',
  wsGridThumbnail: 'ws_grid_thumbnail',
  uploadItem: 'upload_item',
} as const;

export type ActionContextId = (typeof ACTION_CONTEXT_IDS)[keyof typeof ACTION_CONTEXT_IDS];
