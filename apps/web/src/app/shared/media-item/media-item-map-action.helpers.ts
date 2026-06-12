/** Show search when location pick list exceeds this count. @see media-item-map-action.md */
export const MAP_LOCATION_SEARCH_THRESHOLD = 5;

/** Tile map affordance after zoomable targets are resolved. @see media-locations.zoomable-map-contract.supplement.md §3 */
export type MapZoomAffordance = 'noop' | 'direct-zoom' | 'picker' | 'picker-with-search';

export function mapZoomAffordanceFromTargetCount(targetCount: number): MapZoomAffordance {
  if (targetCount <= 0) {
    return 'noop';
  }
  if (targetCount === 1) {
    return 'direct-zoom';
  }
  if (targetCount > MAP_LOCATION_SEARCH_THRESHOLD) {
    return 'picker-with-search';
  }
  return 'picker';
}

export function mapPickerShowsSearch(targetCount: number): boolean {
  return targetCount > MAP_LOCATION_SEARCH_THRESHOLD;
}
