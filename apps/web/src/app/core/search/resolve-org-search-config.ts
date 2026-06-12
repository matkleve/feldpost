/**
 * Merge system defaults with org overrides — sole source of runtime tuning config.
 * @see docs/specs/ui/search-bar/search-tuning-settings.md
 */

import { SEARCH_TUNING_SYSTEM_DEFAULTS } from './search-tuning.defaults';
import type { SearchTuningConfig, SearchTuningValuesJson } from './search-tuning.types';

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  'orchestrator',
  'resolver',
  'scoring',
  'query',
  'provider',
]);

/**
 * Named contract: resolveOrgSearchConfig(orgId) — orgId is for logging only today;
 * merge input is values_json from the org row (or null).
 */
export function resolveOrgSearchConfig(
  _orgId: string | null,
  valuesJson: SearchTuningValuesJson | null | undefined,
  settingsVersion: number | null | undefined,
): SearchTuningConfig {
  const base = structuredClone(SEARCH_TUNING_SYSTEM_DEFAULTS);
  if (!valuesJson || typeof valuesJson !== 'object' || Array.isArray(valuesJson)) {
    return base;
  }

  const version = settingsVersion ?? base.settingsVersion;
  base.settingsVersion = version;

  for (const key of Object.keys(valuesJson)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      console.warn('[search-tuning] ignored unknown values_json key', { key, version });
      continue;
    }
    const section = valuesJson[key as keyof SearchTuningValuesJson];
    if (!section || typeof section !== 'object') continue;
    Object.assign(base[key as keyof SearchTuningConfig] as object, section);
  }

  return base;
}
