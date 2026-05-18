/**
 * Per-section anchor definitions for settings detail TOC and deep-link targets.
 * Intentionally separate from `SettingsSection` / rail list — see plan: settings nav + surface.
 * @see docs/specs/ui/settings-overlay/settings-overlay.md
 */

export interface SettingsSectionAnchorDef {
  /** URL subsection slug (lowercase); must match `AppComponent.normalizeSubsection` output. */
  readonly subsectionSlug: string;
  /** i18n key for the TOC label. */
  readonly labelKey: string;
  readonly labelFallback: string;
}

/** Stable DOM id for scroll targets: `settings-{sectionId}-{subsectionSlug}`. */
export function settingsDetailAnchorDomId(sectionId: string, subsectionSlug: string): string {
  return `settings-${sectionId}-${subsectionSlug}`;
}

export const SETTINGS_SECTION_ANCHORS: Readonly<
  Record<string, readonly SettingsSectionAnchorDef[]>
> = {
  general: [
    {
      subsectionSlug: 'language',
      labelKey: 'settings.overlay.toc.general.language',
      labelFallback: 'Language',
    },
    {
      subsectionSlug: 'density',
      labelKey: 'settings.overlay.toc.general.density',
      labelFallback: 'Density',
    },
  ],
  appearance: [
    {
      subsectionSlug: 'theme',
      labelKey: 'settings.overlay.toc.appearance.theme',
      labelFallback: 'Theme mode',
    },
  ],
  notifications: [
    {
      subsectionSlug: 'in-app',
      labelKey: 'settings.overlay.toc.notifications.inApp',
      labelFallback: 'In-app notifications',
    },
    {
      subsectionSlug: 'upload-failures',
      labelKey: 'settings.overlay.toc.notifications.uploadFailures',
      labelFallback: 'Upload failure alerts',
    },
  ],
  map: [
    {
      subsectionSlug: 'auto-locate',
      labelKey: 'settings.overlay.toc.map.autoLocate',
      labelFallback: 'Auto-locate after login',
    },
    {
      subsectionSlug: 'grid-overlay',
      labelKey: 'settings.overlay.toc.map.gridOverlay',
      labelFallback: 'Grid helper overlay',
    },
    {
      subsectionSlug: 'marker-motion',
      labelKey: 'settings.overlay.toc.map.markerMotion',
      labelFallback: 'Marker motion',
    },
  ],
  search: [
    {
      subsectionSlug: 'bias',
      labelKey: 'settings.overlay.toc.search.bias',
      labelFallback: 'Search bias',
    },
    {
      subsectionSlug: 'radius',
      labelKey: 'settings.overlay.toc.search.radius',
      labelFallback: 'Default radius',
    },
  ],
  data: [
    {
      subsectionSlug: 'cache',
      labelKey: 'settings.overlay.toc.data.cache',
      labelFallback: 'Local cache retention',
    },
    {
      subsectionSlug: 'telemetry',
      labelKey: 'settings.overlay.toc.data.telemetry',
      labelFallback: 'Diagnostics telemetry',
    },
  ],
  account: [
    {
      subsectionSlug: 'profile',
      labelKey: 'settings.overlay.toc.account.profile',
      labelFallback: 'Profile',
    },
    {
      subsectionSlug: 'password',
      labelKey: 'settings.overlay.toc.account.password',
      labelFallback: 'Password',
    },
    {
      subsectionSlug: 'mfa',
      labelKey: 'settings.overlay.toc.account.mfa',
      labelFallback: 'Two-factor authentication',
    },
    {
      subsectionSlug: 'session',
      labelKey: 'settings.overlay.toc.account.session',
      labelFallback: 'Sessions',
    },
    {
      subsectionSlug: 'delete',
      labelKey: 'settings.overlay.toc.account.delete',
      labelFallback: 'Delete account',
    },
  ],
  'invite-management': [
    {
      subsectionSlug: 'role',
      labelKey: 'settings.overlay.toc.invites.role',
      labelFallback: 'Target role',
    },
    {
      subsectionSlug: 'qr',
      labelKey: 'settings.overlay.toc.invites.qr',
      labelFallback: 'QR code and link',
    },
    {
      subsectionSlug: 'share',
      labelKey: 'settings.overlay.toc.invites.share',
      labelFallback: 'Share actions',
    },
  ],
};
