import {
  FEATURE_FLAG_DEFAULTS,
  FEATURE_FLAG_NAMES,
  type FeatureFlagName,
  type FlagSources,
  type ResolvedFlag,
} from './feature-flags.types';

export { FEATURE_FLAG_NAMES };

/**
 * Query, then localStorage, then the typed default.
 * An unknown name resolves to false and does not throw.
 * @see docs/specs/service/feature-flags/feature-flags.md
 */
export function resolveFlag(name: string, sources: FlagSources): ResolvedFlag {
  const fromQuery = queryOverride(name, sources.query);
  if (fromQuery !== null) {
    return { value: fromQuery, persist: fromQuery };
  }

  if (sources.stored === 'true' || sources.stored === 'false') {
    return { value: sources.stored === 'true', persist: null };
  }

  return { value: defaultFor(name), persist: null };
}

function queryOverride(name: string, query: string | null): boolean | null {
  if (query === null || query === '') return null;
  let found: boolean | null = null;
  for (const token of query.split(',')) {
    const trimmed = token.trim();
    if (trimmed === name) found = true;
    else if (trimmed === `-${name}`) found = false;
  }
  return found;
}

/** Nav writes the rail width until the grid shell is on. Then the grid host writes it. */
export function sidebarWidthOwner(shellGridLayout: boolean): 'nav' | 'grid-shell' {
  return shellGridLayout ? 'grid-shell' : 'nav';
}

/** Preserves the `ff` query when auth redirects would otherwise drop it. */
export function featureFlagRouterQueryParams(): { ff: string } | Record<string, never> {
  if (typeof window === 'undefined') return {};
  const ff = new URLSearchParams(window.location.search).get('ff');
  return ff ? { ff } : {};
}

function defaultFor(name: string): boolean {
  if ((FEATURE_FLAG_NAMES as readonly string[]).includes(name)) {
    return FEATURE_FLAG_DEFAULTS[name as FeatureFlagName];
  }
  return false;
}
