import type { SettingsSection } from './settings-overlay.component';
import {
  buildSettingsSectionRegistry,
  filterSettingsSectionsForViewer,
  toSettingsSection,
} from './settings-section-registry';

/**
 * Factory to build localized settings sections list for the current viewer.
 * @see docs/specs/ui/settings-overlay/settings-section-registry.md
 */
export function buildSettingsSectionList(
  t: (key: string, fallback: string) => string,
  isOrgAdmin: boolean,
): ReadonlyArray<SettingsSection> {
  const registry = buildSettingsSectionRegistry();
  const visible = filterSettingsSectionsForViewer(registry, isOrgAdmin);
  return visible.map((entry) => toSettingsSection(entry, t));
}

export {
  buildSettingsSectionRegistry,
  filterSettingsSectionsForViewer,
  isKnownSettingsSectionId,
} from './settings-section-registry';
