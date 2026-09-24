import { describe, expect, it } from 'vitest';
import {
  FEATURE_FLAG_NAMES,
  featureFlagRouterQueryParams,
  resolveFlag,
  sidebarWidthOwner,
} from './feature-flags.helpers';

describe('resolveFlag', () => {
  it('lets ?ff=shellGridLayout win over a stored false', () => {
    const resolved = resolveFlag('shellGridLayout', {
      query: 'shellGridLayout',
      stored: 'false',
    });
    expect(resolved.value).toBe(true);
    expect(resolved.persist).toBe(true);
  });

  it('lets ?ff=-shellGridLayout win over a stored true', () => {
    const resolved = resolveFlag('shellGridLayout', {
      query: '-shellGridLayout',
      stored: 'true',
    });
    expect(resolved.value).toBe(false);
    expect(resolved.persist).toBe(false);
  });

  it('uses localStorage when the query is absent', () => {
    expect(resolveFlag('shellGridLayout', { query: null, stored: 'true' }).value).toBe(true);
    expect(resolveFlag('shellGridLayout', { query: null, stored: 'true' }).persist).toBeNull();
  });

  it('defaults shellGridLayout to true', () => {
    expect(resolveFlag('shellGridLayout', { query: null, stored: null }).value).toBe(true);
  });

  it('resolves an unknown name to false and does not throw', () => {
    expect(resolveFlag('notAFlag', { query: null, stored: null }).value).toBe(false);
  });

  it('keeps the union to one flag', () => {
    expect(FEATURE_FLAG_NAMES).toEqual(['shellGridLayout']);
  });

  it('leaves rail-width writing on nav while the grid flag is off', () => {
    expect(sidebarWidthOwner(false)).toBe('nav');
  });

  it('moves rail-width writing to the grid host when the flag is on', () => {
    expect(sidebarWidthOwner(true)).toBe('grid-shell');
  });

  it('returns the same value when read twice', () => {
    const sources = { query: 'shellGridLayout', stored: 'false' as const };
    expect(resolveFlag('shellGridLayout', sources)).toEqual(resolveFlag('shellGridLayout', sources));
  });
});

describe('featureFlagRouterQueryParams', () => {
  it('returns ff when present in the location search', () => {
    const original = window.location.href;
    window.history.replaceState({}, '', '/?ff=shellGridLayout');
    expect(featureFlagRouterQueryParams()).toEqual({ ff: 'shellGridLayout' });
    window.history.replaceState({}, '', original);
  });
});

describe('featureFlagRouterQueryParams', () => {
  it('returns ff when present on window.location', () => {
    const original = window.location.href;
    window.history.replaceState({}, '', '/?ff=shellGridLayout');
    expect(featureFlagRouterQueryParams()).toEqual({ ff: 'shellGridLayout' });
    window.history.replaceState({}, '', original);
  });

  it('returns empty when ff is absent', () => {
    const original = window.location.href;
    window.history.replaceState({}, '', '/map');
    expect(featureFlagRouterQueryParams()).toEqual({});
    window.history.replaceState({}, '', original);
  });
});
