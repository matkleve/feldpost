import type { UrlMatchResult, UrlSegment } from '@angular/router';
import { normalizeSettingsSection } from '../core/settings-pane/settings-url.helpers';

function consumeAll(segments: UrlSegment[]): UrlMatchResult {
  return { consumed: segments };
}

function isValidSettingsTail(segments: UrlSegment[], settingsIndex: number): boolean {
  const tailLength = segments.length - settingsIndex - 1;
  if (tailLength === 0) {
    return true;
  }

  if (tailLength > 2) {
    return false;
  }

  const section = normalizeSettingsSection(segments[settingsIndex + 1]?.path ?? null);
  return section !== null;
}

/**
 * Matches `map`, `map/settings`, `map/settings/:section`, `map/settings/:section/:subsection`.
 * @see docs/specs/page/settings-routes.md
 */
export function mapShellMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments.length === 0 || segments[0].path !== 'map') {
    return null;
  }

  if (segments.length === 1) {
    return consumeAll(segments);
  }

  if (segments[1].path === 'settings') {
    return consumeAll(segments);
  }

  return null;
}

/**
 * Matches `media` and `media/settings/...` suffixes.
 */
export function mediaShellMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments.length === 0 || segments[0].path !== 'media') {
    return null;
  }

  if (segments.length === 1) {
    return consumeAll(segments);
  }

  if (segments[1].path === 'settings') {
    return consumeAll(segments);
  }

  return null;
}

/**
 * Matches projects list, project detail, and settings suffixes on either.
 * Disambiguates `projects/settings` from `projects/:projectId`.
 */
export function projectsShellMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments.length === 0 || segments[0].path !== 'projects') {
    return null;
  }

  if (segments.length === 1) {
    return consumeAll(segments);
  }

  if (segments[1].path === 'settings') {
    if (!isValidSettingsTail(segments, 1)) {
      return null;
    }
    return consumeAll(segments);
  }

  if (segments.length === 2) {
    return consumeAll(segments);
  }

  if (segments.length >= 3 && segments[2].path === 'settings') {
    if (!isValidSettingsTail(segments, 2)) {
      return null;
    }
    return consumeAll(segments);
  }

  return null;
}

/**
 * Matches `colleagues` and `colleagues/settings/...` suffixes.
 */
export function colleaguesShellMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments.length === 0 || segments[0].path !== 'colleagues') {
    return null;
  }

  if (segments.length === 1) {
    return consumeAll(segments);
  }

  if (segments[1].path === 'settings') {
    return consumeAll(segments);
  }

  return null;
}

/**
 * Matches `organization`, `organization/:section`, and settings suffixes.
 */
export function organizationShellMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments.length === 0 || segments[0].path !== 'organization') {
    return null;
  }

  if (segments.length === 1) {
    return consumeAll(segments);
  }

  if (segments[1].path === 'settings') {
    if (!isValidSettingsTail(segments, 1)) {
      return null;
    }
    return consumeAll(segments);
  }

  if (segments.length === 2) {
    return consumeAll(segments);
  }

  if (segments.length >= 3 && segments[2].path === 'settings') {
    if (!isValidSettingsTail(segments, 2)) {
      return null;
    }
    return consumeAll(segments);
  }

  return null;
}
