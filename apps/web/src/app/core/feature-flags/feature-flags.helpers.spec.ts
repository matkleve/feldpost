import { describe, expect, it } from 'vitest';
import { FEATURE_FLAG_NAMES, resolveFlag } from './feature-flags.helpers';

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

  it('defaults shellGridLayout to false', () => {
    expect(resolveFlag('shellGridLayout', { query: null, stored: null }).value).toBe(false);
  });

  it('resolves an unknown name to false and does not throw', () => {
    expect(resolveFlag('notAFlag', { query: null, stored: null }).value).toBe(false);
  });

  it('keeps the union to one flag', () => {
    expect(FEATURE_FLAG_NAMES).toEqual(['shellGridLayout']);
  });

  it('returns the same value when read twice', () => {
    const sources = { query: 'shellGridLayout', stored: 'false' as const };
    expect(resolveFlag('shellGridLayout', sources)).toEqual(resolveFlag('shellGridLayout', sources));
  });
});
