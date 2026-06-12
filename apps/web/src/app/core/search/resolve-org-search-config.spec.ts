import { describe, expect, it } from 'vitest';
import { resolveOrgSearchConfig } from './resolve-org-search-config';
import { SEARCH_TUNING_SYSTEM_DEFAULTS } from './search-tuning.defaults';

describe('resolveOrgSearchConfig', () => {
  it('returns system defaults when org row is missing', () => {
    const cfg = resolveOrgSearchConfig('org-1', null, null);
    expect(cfg.resolver.contextDistanceMaxMeters).toBe(
      SEARCH_TUNING_SYSTEM_DEFAULTS.resolver.contextDistanceMaxMeters,
    );
  });

  it('merges org overrides over defaults', () => {
    const cfg = resolveOrgSearchConfig('org-1', { resolver: { contextDistanceMaxMeters: 50_000 } }, 1);
    expect(cfg.resolver.contextDistanceMaxMeters).toBe(50_000);
    expect(cfg.resolver.minQueryLength).toBe(
      SEARCH_TUNING_SYSTEM_DEFAULTS.resolver.minQueryLength,
    );
  });

  it('ignores unknown keys without throwing', () => {
    const cfg = resolveOrgSearchConfig(
      'org-1',
      { unknown: { foo: 1 } } as never,
      1,
    );
    expect(cfg.orchestrator.debounceMs).toBe(SEARCH_TUNING_SYSTEM_DEFAULTS.orchestrator.debounceMs);
  });
});
