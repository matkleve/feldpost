import { describe, expect, it } from 'vitest';
import { WidgetsCatalogAdapter } from './adapters/widgets-catalog.adapter';
import {
  WIDGET_CATALOG_IDS,
  WIDGET_PERMISSION_ACTIONS,
  addInstalls,
  findWidget,
  overviewState,
  widgetPermissionKey,
} from './widgets.helpers';

describe('widget catalog', () => {
  const entries = new WidgetsCatalogAdapter().entries();

  it('lists the named ids in order', () => {
    expect(entries.map((entry) => entry.id)).toEqual([...WIDGET_CATALOG_IDS]);
  });

  it('reads a known id and misses an unknown id', () => {
    expect(findWidget(entries, 'vehicles')?.placement).toBe('unplaced');
    expect(findWidget(entries, 'missing')).toBeNull();
  });

  it('marks fixed entries as on the rail', () => {
    expect(overviewState(entries[0])).toBe('on-rail');
    expect(overviewState(entries[3])).toBe('not-added');
  });

  it('does not install, including when the organization does not allow it', () => {
    expect(addInstalls(entries[5])).toBe(false);
    expect(addInstalls({ ...entries[5], allowed: false })).toBe(false);
  });

  it('names role keys as widget.<id>.<action>', () => {
    expect(widgetPermissionKey('storage-locations', 'open')).toBe('widget.storage-locations.open');
    expect(WIDGET_PERMISSION_ACTIONS).toEqual(['open', 'view', 'create', 'edit', 'delete']);
  });
});
