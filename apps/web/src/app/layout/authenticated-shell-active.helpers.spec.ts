import { describe, expect, it } from 'vitest';
import { resolveAuthenticatedActiveShell } from './authenticated-shell-active.helpers';

describe('resolveAuthenticatedActiveShell', () => {
  it('returns map for root path', () => {
    expect(resolveAuthenticatedActiveShell('/')).toBe('map');
  });

  it('returns map for map and map settings', () => {
    expect(resolveAuthenticatedActiveShell('/map')).toBe('map');
    expect(resolveAuthenticatedActiveShell('/map/settings/general')).toBe('map');
  });

  it('returns media for media routes', () => {
    expect(resolveAuthenticatedActiveShell('/media')).toBe('media');
    expect(resolveAuthenticatedActiveShell('/media/settings')).toBe('media');
  });

  it('returns projects for projects routes', () => {
    expect(resolveAuthenticatedActiveShell('/projects')).toBe('projects');
    expect(resolveAuthenticatedActiveShell('/projects/abc-123')).toBe('projects');
  });
});
