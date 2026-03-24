import type { SettingsSection } from './settings-overlay.component';

/**
 * Factory to build localized settings sections list.
 * Extracted for file-size compliance (max 120 lines per component).
 */
export function buildSettingsSectionList(
  t: (key: string, fallback: string) => string,
): ReadonlyArray<SettingsSection> {
  return [
    {
      id: 'general',
      icon: 'tune',
      title: t('settings.overlay.section.general.title', 'General'),
      subtitle: t('settings.overlay.section.general.subtitle', 'Language, density, and defaults'),
    },
    {
      id: 'appearance',
      icon: 'palette',
      title: t('settings.overlay.section.appearance.title', 'Appearance'),
      subtitle: t('settings.overlay.section.appearance.subtitle', 'Theme and visual behavior'),
    },
    {
      id: 'notifications',
      icon: 'notifications',
      title: t('settings.overlay.section.notifications.title', 'Notifications'),
      subtitle: t('settings.overlay.section.notifications.subtitle', 'In-app status and alerts'),
    },
    {
      id: 'map',
      icon: 'map',
      title: t('settings.overlay.section.map.title', 'Map Preferences'),
      subtitle: t('settings.overlay.section.map.subtitle', 'Map behaviors and helper layers'),
    },
    {
      id: 'search',
      icon: 'manage_search',
      title: t('settings.overlay.section.search.title', 'Search Tuning'),
      subtitle: t('settings.overlay.section.search.subtitle', 'Ranking and fallback tuning'),
    },
    {
      id: 'data',
      icon: 'storage',
      title: t('settings.overlay.section.data.title', 'Data and Privacy'),
      subtitle: t('settings.overlay.section.data.subtitle', 'Retention and telemetry'),
    },
    {
      id: 'account',
      icon: 'person',
      title: t('settings.overlay.section.account.title', 'Account'),
      subtitle: t('settings.overlay.section.account.subtitle', 'Identity and sign-in context'),
    },
    {
      id: 'invite-management',
      icon: 'qr_code_2',
      title: t('settings.overlay.section.invites.title', 'Invite Management'),
      subtitle: t('settings.overlay.section.invites.subtitle', 'Role-scoped QR and share links'),
    },
  ];
}
