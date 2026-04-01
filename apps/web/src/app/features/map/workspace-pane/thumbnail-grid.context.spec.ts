import { describe, expect, it } from 'vitest';
import {
  WS_GRID_THUMBNAIL_ACTION_IDS,
  WS_GRID_THUMBNAIL_CONTEXT,
} from './thumbnail-grid.component';

describe('Thumbnail Grid Context Contract', () => {
  it('uses ws_grid_thumbnail as explicit context id', () => {
    expect(WS_GRID_THUMBNAIL_CONTEXT).toBe('ws_grid_thumbnail');
  });

  it('exposes only thumbnail destructive actions', () => {
    expect(WS_GRID_THUMBNAIL_ACTION_IDS).toEqual(['remove_from_project', 'delete_media']);
  });
});
