import { UrlSegment } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { mapShellMatcher, mediaShellMatcher, projectsShellMatcher } from './authenticated-shell-matchers';

function seg(...paths: string[]): UrlSegment[] {
  return paths.map((path, index) => new UrlSegment(path, { index }));
}

describe('authenticated-shell-matchers', () => {
  describe('mediaShellMatcher', () => {
    it('matches /media', () => {
      expect(mediaShellMatcher(seg('media'))).toEqual({ consumed: seg('media') });
    });

    it('matches /media/settings/general/language', () => {
      const segments = seg('media', 'settings', 'general', 'language');
      expect(mediaShellMatcher(segments)).toEqual({ consumed: segments });
    });
  });

  describe('mapShellMatcher', () => {
    it('matches /map/settings/map/marker-motion', () => {
      const segments = seg('map', 'settings', 'map', 'marker-motion');
      expect(mapShellMatcher(segments)).toEqual({ consumed: segments });
    });

    it('rejects /media', () => {
      expect(mapShellMatcher(seg('media'))).toBeNull();
    });
  });

  describe('projectsShellMatcher', () => {
    it('matches projects list settings', () => {
      const segments = seg('projects', 'settings');
      expect(projectsShellMatcher(segments)).toEqual({ consumed: segments });
    });

    it('matches projects list settings with section', () => {
      const segments = seg('projects', 'settings', 'general');
      expect(projectsShellMatcher(segments)).toEqual({ consumed: segments });
    });

    it('matches project detail', () => {
      const segments = seg('projects', 'uuid-abc');
      expect(projectsShellMatcher(segments)).toEqual({ consumed: segments });
    });

    it('matches project detail settings', () => {
      const segments = seg('projects', 'uuid-abc', 'settings', 'account');
      expect(projectsShellMatcher(segments)).toEqual({ consumed: segments });
    });

    it('does not treat settings as projectId', () => {
      expect(projectsShellMatcher(seg('projects', 'settings', 'uuid-abc'))).toBeNull();
    });
  });
});
