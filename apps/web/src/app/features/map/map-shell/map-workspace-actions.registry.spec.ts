import { describe, expect, it } from 'vitest';
import { ActionEngineService } from '../../action-system/action-engine.service';
import { MARKER_MENU_ACTION_DEFINITIONS } from './map-workspace-actions.registry';
import type { MarkerActionContext } from './map-workspace-actions.types';

function markerContext(overrides: Partial<MarkerActionContext>): MarkerActionContext {
  return {
    contextType: 'map_marker',
    markerKey: 'm1',
    count: 1,
    primaryMediaId: 'img-1',
    mediaIds: ['img-1'],
    coords: { lat: 48.2, lng: 16.37 },
    isMultiSelection: false,
    sourceCells: [{ lat: 48.2, lng: 16.37 }],
    ...overrides,
  };
}

describe('MARKER_MENU_ACTION_DEFINITIONS', () => {
  const actionEngine = new ActionEngineService();

  const resolve = (context: MarkerActionContext) =>
    actionEngine.resolveActions(MARKER_MENU_ACTION_DEFINITIONS, context).map((action) => action.id);

  it('shows single-location actions only for map_marker', () => {
    const ids = resolve(markerContext({}));

    expect(ids).toContain('copy_address');
    expect(ids).toContain('copy_gps');
    expect(ids).toContain('open_google_maps');
    expect(ids).toContain('change_location_address');
    expect(ids).toContain('change_location_map');
  });

  it('hides single-location actions for map_cluster', () => {
    const ids = resolve(
      markerContext({
        contextType: 'map_cluster',
        markerKey: 'c1',
        count: 15,
        primaryMediaId: null,
        mediaIds: [],
      }),
    );

    expect(ids).not.toContain('copy_address');
    expect(ids).not.toContain('copy_gps');
    expect(ids).not.toContain('open_google_maps');
    expect(ids).not.toContain('change_location_address');
    expect(ids).not.toContain('change_location_map');
    expect(ids).toContain('open_details_or_selection');
    expect(ids).toContain('assign_to_project');
  });

  it('hides single-location actions for map_multi', () => {
    const ids = resolve(
      markerContext({
        contextType: 'map_multi',
        markerKey: 'm2',
        count: 3,
        primaryMediaId: null,
        mediaIds: [],
        isMultiSelection: true,
        sourceCells: [
          { lat: 48.2, lng: 16.37 },
          { lat: 48.2007, lng: 16.3707 },
        ],
      }),
    );

    expect(ids).not.toContain('copy_address');
    expect(ids).not.toContain('copy_gps');
    expect(ids).not.toContain('open_google_maps');
    expect(ids).toContain('open_details_or_selection');
  });
});
