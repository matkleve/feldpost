import { describe, expect, it } from 'vitest';
import {
  buildSettingsSectionRegistry,
  filterSettingsSectionsForViewer,
  isKnownSettingsSectionId,
} from './settings-section-registry';

describe('settings-section-registry', () => {
  const registry = buildSettingsSectionRegistry();

  it('includes search-tuning as admin-only', () => {
    const entry = registry.find((e) => e.id === 'search-tuning');
    expect(entry?.visibility).toBe('admin-only');
  });

  it('hides search-tuning from non-admin viewers', () => {
    const visible = filterSettingsSectionsForViewer(registry, false);
    expect(visible.some((e) => e.id === 'search-tuning')).toBe(false);
    expect(visible.some((e) => e.id === 'general')).toBe(true);
  });

  it('shows search-tuning to org admins', () => {
    const visible = filterSettingsSectionsForViewer(registry, true);
    expect(visible.some((e) => e.id === 'search-tuning')).toBe(true);
  });

  it('rejects unknown section ids', () => {
    const visible = filterSettingsSectionsForViewer(registry, true);
    expect(isKnownSettingsSectionId('search', visible)).toBe(false);
    expect(isKnownSettingsSectionId('search-tuning', visible)).toBe(true);
  });
});
