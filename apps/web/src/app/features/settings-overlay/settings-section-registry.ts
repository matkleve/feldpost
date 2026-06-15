/**
 * Settings overlay section registry — visibility policies and composition helpers.
 * @see docs/specs/ui/settings-overlay/settings-section-registry.md
 */

import type { SettingsSection } from './settings-overlay.component';

export type SettingsSectionVisibility = 'all-members' | 'admin-only';

export interface SettingsSectionRegistryEntry {
  id: string;
  icon: string;
  titleKey: string;
  titleFallback: string;
  subtitleKey: string;
  subtitleFallback: string;
  visibility: SettingsSectionVisibility;
}

export function buildSettingsSectionRegistry(): readonly SettingsSectionRegistryEntry[] {
  return [
    {
      id: 'general',
      icon: 'tune',
      titleKey: 'settings.overlay.section.general.title',
      titleFallback: 'General',
      subtitleKey: 'settings.overlay.section.general.subtitle',
      subtitleFallback: 'Language, density, and defaults',
      visibility: 'all-members',
    },
    {
      id: 'appearance',
      icon: 'palette',
      titleKey: 'settings.overlay.section.appearance.title',
      titleFallback: 'Appearance',
      subtitleKey: 'settings.overlay.section.appearance.subtitle',
      subtitleFallback: 'Theme and visual behavior',
      visibility: 'all-members',
    },
    {
      id: 'notifications',
      icon: 'notifications',
      titleKey: 'settings.overlay.section.notifications.title',
      titleFallback: 'Notifications',
      subtitleKey: 'settings.overlay.section.notifications.subtitle',
      subtitleFallback: 'In-app status and alerts',
      visibility: 'all-members',
    },
    {
      id: 'map',
      icon: 'map',
      titleKey: 'settings.overlay.section.map.title',
      titleFallback: 'Map Preferences',
      subtitleKey: 'settings.overlay.section.map.subtitle',
      subtitleFallback: 'Map behaviors and helper layers',
      visibility: 'all-members',
    },
    {
      id: 'search-tuning',
      icon: 'manage_search',
      titleKey: 'settings.search_tuning.section.title',
      titleFallback: 'Search Tuning',
      subtitleKey: 'settings.search_tuning.section.description',
      subtitleFallback: 'Org-wide geocoder ranking and filters',
      visibility: 'admin-only',
    },
    {
      id: 'data',
      icon: 'storage',
      titleKey: 'settings.overlay.section.data.title',
      titleFallback: 'Data and Privacy',
      subtitleKey: 'settings.overlay.section.data.subtitle',
      subtitleFallback: 'Retention and telemetry',
      visibility: 'all-members',
    },
    {
      id: 'account',
      icon: 'person',
      titleKey: 'settings.overlay.section.account.title',
      titleFallback: 'Account',
      subtitleKey: 'settings.overlay.section.account.subtitle',
      subtitleFallback: 'Identity and sign-in context',
      visibility: 'all-members',
    },
  ];
}

export function filterSettingsSectionsForViewer(
  registry: readonly SettingsSectionRegistryEntry[],
  isOrgAdmin: boolean,
): readonly SettingsSectionRegistryEntry[] {
  return registry.filter(
    (entry) => entry.visibility === 'all-members' || (entry.visibility === 'admin-only' && isOrgAdmin),
  );
}

export function isKnownSettingsSectionId(
  sectionId: string,
  visibleRegistry: readonly SettingsSectionRegistryEntry[],
): boolean {
  return visibleRegistry.some((entry) => entry.id === sectionId);
}

export function toSettingsSection(
  entry: SettingsSectionRegistryEntry,
  t: (key: string, fallback: string) => string,
): SettingsSection {
  return {
    id: entry.id,
    icon: entry.icon,
    title: t(entry.titleKey, entry.titleFallback),
    subtitle: t(entry.subtitleKey, entry.subtitleFallback),
  };
}
