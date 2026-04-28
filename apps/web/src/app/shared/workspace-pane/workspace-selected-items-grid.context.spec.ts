import { describe, expect, it } from 'vitest';
import {
  WS_GRID_THUMBNAIL_ACTION_IDS,
  WS_GRID_THUMBNAIL_CONTEXT,
} from './workspace-selected-items-grid.component';

describe('Workspace selected-items grid context contract', () => {
  it('uses ws_grid_thumbnail as explicit context id', () => {
    expect(WS_GRID_THUMBNAIL_CONTEXT).toBe('ws_grid_thumbnail');
  });

  it('exposes complete ws_grid_thumbnail action set', () => {
    expect(WS_GRID_THUMBNAIL_ACTION_IDS).toEqual([
      'open_in_media',
      'zoom_house',
      'zoom_street',
      'copy_address',
      'copy_gps',
      'open_google_maps',
      'assign_to_project',
      'resolve_location',
      'change_location_map',
      'change_location_address',
      'remove_from_project',
      'delete_media',
      'download',
      'share_link',
      'copy_link',
      'native_share',
    ]);
  });
});
