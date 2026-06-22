import { describe, expect, it } from 'vitest';
import {
  resolveAuthenticatedActiveShell,
  resolveMapShellDisplayed,
} from './authenticated-shell-active.helpers';

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

describe('resolveMapShellDisplayed', () => {
  it('shows map when active shell is map and navigation is idle', () => {
    expect(resolveMapShellDisplayed('map', null)).toBe(true);
  });

  it('hides map when active shell is not map and navigation is idle', () => {
    expect(resolveMapShellDisplayed('media', null)).toBe(false);
  });

  it('hides map immediately when navigation targets a non-map shell', () => {
    expect(resolveMapShellDisplayed('map', 'media')).toBe(false);
    expect(resolveMapShellDisplayed('map', 'projects')).toBe(false);
  });

  it('shows map immediately when navigation targets map while still on another shell', () => {
    expect(resolveMapShellDisplayed('media', 'map')).toBe(true);
  });

  it('keeps map visible when navigating within map routes', () => {
    expect(resolveMapShellDisplayed('map', 'map')).toBe(true);
  });
});
