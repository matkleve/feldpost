import { primaryPathSegments } from '../core/settings-pane/settings-url.helpers';

export type AuthenticatedActiveShell = 'map' | 'media' | 'projects' | 'colleagues' | 'organization';

/**
 * Resolves which authenticated shell is active from the primary router URL.
 * Empty path is the map root (`/`).
 */
export function resolveAuthenticatedActiveShell(url: string): AuthenticatedActiveShell {
  const segments = primaryPathSegments(url);
  if (segments.length === 0) {
    return 'map';
  }

  const head = segments[0];
  if (head === 'media') {
    return 'media';
  }

  if (head === 'projects') {
    return 'projects';
  }

  if (head === 'colleagues') {
    return 'colleagues';
  }

  if (head === 'organization') {
    return 'organization';
  }

  return 'map';
}
