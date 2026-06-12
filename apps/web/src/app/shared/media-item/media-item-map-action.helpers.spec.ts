import {
  MAP_LOCATION_SEARCH_THRESHOLD,
  mapPickerShowsSearch,
  mapZoomAffordanceFromTargetCount,
} from './media-item-map-action.helpers';

describe('media-item-map-action helpers', () => {
  it('noop when zero zoomable targets', () => {
    expect(mapZoomAffordanceFromTargetCount(0)).toBe('noop');
    expect(mapPickerShowsSearch(0)).toBe(false);
  });

  it('direct zoom when one target', () => {
    expect(mapZoomAffordanceFromTargetCount(1)).toBe('direct-zoom');
  });

  it('picker without search for 2–5 targets', () => {
    expect(mapZoomAffordanceFromTargetCount(2)).toBe('picker');
    expect(mapZoomAffordanceFromTargetCount(MAP_LOCATION_SEARCH_THRESHOLD)).toBe('picker');
    expect(mapPickerShowsSearch(MAP_LOCATION_SEARCH_THRESHOLD)).toBe(false);
  });

  it('picker with search when more than threshold', () => {
    expect(mapZoomAffordanceFromTargetCount(MAP_LOCATION_SEARCH_THRESHOLD + 1)).toBe(
      'picker-with-search',
    );
    expect(mapPickerShowsSearch(MAP_LOCATION_SEARCH_THRESHOLD + 1)).toBe(true);
  });
});
