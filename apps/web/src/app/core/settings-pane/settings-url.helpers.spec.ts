import { describe, expect, it } from 'vitest';
import {
  buildSettingsUrl,
  parseSettingsUrl,
  primaryPathSegments,
  resolveShellBasePath,
  stripSettingsSuffix,
} from './settings-url.helpers';

describe('settings-url.helpers', () => {
  it('parses suffix settings on media shell', () => {
    const parsed = parseSettingsUrl('/media/settings/general/language');
    expect(parsed).toEqual({
      shellSegments: ['media'],
      section: 'general',
      subsection: 'language',
    });
  });

  it('parses suffix settings on map shell', () => {
    const parsed = parseSettingsUrl('/map/settings/map/marker-motion');
    expect(parsed?.section).toBe('map');
    expect(parsed?.subsection).toBe('marker-motion');
    expect(resolveShellBasePath(parsed!.shellSegments)).toBe('/map');
  });

  it('parses legacy top-level settings as map shell', () => {
    const parsed = parseSettingsUrl('/settings/account/profile');
    expect(parsed?.shellSegments).toEqual([]);
    expect(parsed?.section).toBe('account');
    expect(parsed?.subsection).toBe('profile');
  });

  it('parses projects shell with project id', () => {
    const parsed = parseSettingsUrl('/projects/abc-123/settings/general');
    expect(resolveShellBasePath(parsed!.shellSegments)).toBe('/projects/abc-123');
  });

  it('buildSettingsUrl uses /map prefix for empty shell', () => {
    expect(buildSettingsUrl([], 'general', 'language')).toBe('/map/settings/general/language');
  });

  it('stripSettingsSuffix removes settings trail', () => {
    expect(stripSettingsSuffix('/media/settings/general')).toBe('/media');
    expect(stripSettingsSuffix('/map/settings/map/marker-motion')).toBe('/map');
  });

  it('primaryPathSegments ignores query and hash', () => {
    expect(primaryPathSegments('/media?x=1#hash')).toEqual(['media']);
  });
});
