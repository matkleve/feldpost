import type { SettingsPaneSectionId } from './settings-pane.service';

export interface ParsedSettingsUrl {
  /** Path segments before `settings` (empty = map root `/`). */
  readonly shellSegments: readonly string[];
  readonly section: SettingsPaneSectionId | null;
  readonly subsection: string | null;
}

const SETTINGS_SECTION_IDS: readonly SettingsPaneSectionId[] = [
  'general',
  'appearance',
  'notifications',
  'map',
  'search-tuning',
  'data',
  'account',
  'invite-management',
];

/** Primary outlet path segments (no leading slash, no query). */
export function primaryPathSegments(url: string): string[] {
  const path = url.split('?')[0]?.split('#')[0] ?? url;
  const trimmed = path.startsWith('/') ? path.slice(1) : path;
  if (trimmed.length === 0) {
    return [];
  }
  return trimmed.split('/').filter((segment) => segment.length > 0);
}

export function normalizeSettingsSection(section: string | null | undefined): SettingsPaneSectionId | null {
  if (!section) {
    return null;
  }

  return SETTINGS_SECTION_IDS.includes(section as SettingsPaneSectionId)
    ? (section as SettingsPaneSectionId)
    : null;
}

export function normalizeSettingsSubsection(subsection: string | null | undefined): string | null {
  if (!subsection) {
    return null;
  }

  const normalized = subsection.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Parses `/{shell}/settings/{section}/{subsection}` and legacy `/settings/...`.
 * @see docs/specs/page/settings-routes.md
 */
export function parseSettingsUrl(url: string): ParsedSettingsUrl | null {
  const segments = primaryPathSegments(url);
  if (segments.length === 0) {
    return null;
  }

  let shellSegments: string[];
  let settingsIndex: number;

  if (segments[0] === 'settings') {
    shellSegments = [];
    settingsIndex = 0;
  } else {
    settingsIndex = segments.indexOf('settings');
    if (settingsIndex < 0) {
      return null;
    }
    shellSegments = segments.slice(0, settingsIndex);
  }

  const section = normalizeSettingsSection(segments[settingsIndex + 1] ?? null);
  const subsection = normalizeSettingsSubsection(segments[settingsIndex + 2] ?? null);

  return { shellSegments, section, subsection };
}

/** Canonical shell base path (no settings suffix). */
export function resolveShellBasePath(shellSegments: readonly string[]): string {
  if (shellSegments.length === 0) {
    return '/';
  }

  if (shellSegments[0] === 'media') {
    return '/media';
  }

  if (shellSegments[0] === 'map') {
    return '/map';
  }

  if (shellSegments[0] === 'projects') {
    if (shellSegments.length >= 2) {
      return `/projects/${shellSegments[1]}`;
    }
    return '/projects';
  }

  if (shellSegments[0] === 'colleagues') {
    return '/colleagues';
  }

  if (shellSegments[0] === 'organization') {
    if (shellSegments.length >= 2) {
      return `/organization/${shellSegments[1]}`;
    }
    return '/organization';
  }

  return '/map';
}

/** Shell segments for the current app surface (ignores an optional `settings` suffix). */
export function resolveShellSegmentsFromUrl(url: string): readonly string[] {
  const parsed = parseSettingsUrl(url);
  if (parsed) {
    return parsed.shellSegments;
  }

  return primaryPathSegments(url);
}

export function buildSettingsUrl(
  shellSegments: readonly string[],
  section?: SettingsPaneSectionId | null,
  subsection?: string | null,
): string {
  const base = resolveShellBasePath(shellSegments);
  const shellPrefix = base === '/' ? '/map' : base;

  const parts = [shellPrefix.replace(/^\//, ''), 'settings'];
  if (section) {
    parts.push(section);
    const normalizedSubsection = normalizeSettingsSubsection(subsection ?? null);
    if (normalizedSubsection) {
      parts.push(normalizedSubsection);
    }
  }

  return `/${parts.join('/')}`;
}

/** Removes `/settings` and following segments; returns shell-only path. */
export function stripSettingsSuffix(url: string): string {
  const parsed = parseSettingsUrl(url);
  if (!parsed) {
    return url.split('?')[0]?.split('#')[0] ?? url;
  }

  return resolveShellBasePath(parsed.shellSegments);
}

export function isLegacyTopLevelSettingsUrl(url: string): boolean {
  const segments = primaryPathSegments(url);
  return segments[0] === 'settings';
}
