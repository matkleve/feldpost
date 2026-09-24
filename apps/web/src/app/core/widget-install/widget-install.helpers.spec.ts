import { describe, expect, it } from 'vitest';
import { effectiveWidgetIds } from './widget-install.helpers';

describe('effectiveWidgetIds', () => {
  it('gives a person with no rows Map and Media only', () => {
    expect(effectiveWidgetIds({ policies: [], userRows: [] })).toEqual(['map', 'media']);
  });

  it('keeps Projects, Colleagues, and Organization when those rows are on', () => {
    expect(
      effectiveWidgetIds({
        policies: [],
        userRows: [
          { widgetId: 'map', installed: true },
          { widgetId: 'media', installed: true },
          { widgetId: 'projects', installed: true },
          { widgetId: 'colleagues', installed: true },
          { widgetId: 'organization', installed: true },
        ],
      }),
    ).toEqual(['map', 'media', 'projects', 'colleagues', 'organization']);
  });

  it('leaves a widget off when the user turned it off and the org preinstalls again', () => {
    expect(
      effectiveWidgetIds({
        policies: [{ widgetId: 'projects', allowed: true, preinstalled: true, locked: false }],
        userRows: [{ widgetId: 'projects', installed: false }],
      }),
    ).toEqual(['map', 'media']);
  });

  it('turns a widget back on when the user row is installed', () => {
    expect(
      effectiveWidgetIds({
        policies: [{ widgetId: 'projects', allowed: true, preinstalled: false, locked: false }],
        userRows: [{ widgetId: 'projects', installed: true }],
      }),
    ).toContain('projects');
  });

  it('keeps a locked preinstalled widget on when the user row is off', () => {
    expect(
      effectiveWidgetIds({
        policies: [{ widgetId: 'projects', allowed: true, preinstalled: true, locked: true }],
        userRows: [{ widgetId: 'projects', installed: false }],
      }),
    ).toContain('projects');
  });

  it('hides a widget the organization does not allow', () => {
    expect(
      effectiveWidgetIds({
        policies: [{ widgetId: 'projects', allowed: false, preinstalled: false, locked: false }],
        userRows: [{ widgetId: 'projects', installed: true }],
      }),
    ).not.toContain('projects');
  });
});
