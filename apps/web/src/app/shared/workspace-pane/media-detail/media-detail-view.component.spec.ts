/**
 * MediaDetailViewComponent — initial state, computed signals, formatCoord, close.
 *
 * Editing flows: media-detail-view.editing.spec.ts
 * UI actions:    media-detail-view.ui.spec.ts
 * Captured date: media-detail-view.captured-date.spec.ts
 * IE-10 replace: media-detail-view.replace-photo.spec.ts
 * Shared setup:  media-detail-view.spec-setup.ts
 */

import { formatCoordinate } from './media-detail-view.utils';
import {
  setup,
  MOCK_MEDIA,
  MOCK_CORRECTED_MEDIA,
} from './media-detail-view.spec-setup';

describe('MediaDetailViewComponent – initial state', () => {
  it('starts with null image and empty metadata', () => {
    const { component } = setup();
    expect(component.media()).toBeNull();
    expect(component.metadata()).toEqual([]);
    expect(component.loading()).toBe(false);
    expect(component.editingField()).toBeNull();
  });

  it('has saving signal initialized to false', () => {
    const { component } = setup();
    expect(component.saving()).toBe(false);
  });

  it('has empty project options by default', () => {
    const { component } = setup();
    expect(component.projectOptions()).toEqual([]);
  });
});

describe('MediaDetailViewComponent – computed signals', () => {
  it('displayTitle returns address_label when available', () => {
    const { component } = setup();
    component.media.set(MOCK_MEDIA);
    expect(component.displayTitle()).toBe('Stephansplatz 1, Wien');
  });

  it('displayTitle falls back to filename when no address_label', () => {
    const { component } = setup();
    component.media.set({ ...MOCK_MEDIA, address_label: null });
    expect(component.displayTitle()).toBe('photo.jpg');
  });

  it('displayTitle returns empty string when image is null', () => {
    const { component } = setup();
    expect(component.displayTitle()).toBe('');
  });

  it('isCorrected returns false when coords match EXIF', () => {
    const { component } = setup();
    component.media.set(MOCK_MEDIA);
    expect(component.isCorrected()).toBe(false);
  });

  it('isCorrected returns true when coords differ from EXIF', () => {
    const { component } = setup();
    component.media.set(MOCK_CORRECTED_MEDIA);
    expect(component.isCorrected()).toBe(true);
  });

  it('isCorrected returns false when lat/exif_lat is null', () => {
    const { component } = setup();
    component.media.set({ ...MOCK_MEDIA, latitude: null });
    expect(component.isCorrected()).toBe(false);
  });

  it('captureDate formats captured_at', () => {
    const { component } = setup();
    component.media.set(MOCK_MEDIA);
    const date = component.captureDate();
    expect(date).toBeTruthy();
    expect(date).toContain('2025');
  });

  it('captureDate returns null when image is null', () => {
    const { component } = setup();
    expect(component.captureDate()).toBeNull();
  });

  it('uploadDate formats created_at', () => {
    const { component } = setup();
    component.media.set(MOCK_MEDIA);
    const date = component.uploadDate();
    expect(date).toBeTruthy();
    expect(date).toContain('2025');
  });

  it('projectName returns matching project label', () => {
    const { component } = setup();
    component.media.set(MOCK_MEDIA);
    component.projectOptions.set([
      { id: 'proj-001', label: 'Project Alpha' },
      { id: 'proj-002', label: 'Project Beta' },
    ]);
    expect(component.projectName()).toBe('Project Alpha');
  });

  it('projectName returns empty string when no project assigned', () => {
    const { component } = setup();
    component.media.set({ ...MOCK_MEDIA, project_id: null });
    expect(component.projectName()).toBe('');
  });

  it('projectName returns empty string when project not in options', () => {
    const { component } = setup();
    component.media.set({ ...MOCK_MEDIA, project_id: 'proj-999' });
    component.projectOptions.set([{ id: 'proj-001', label: 'Alpha' }]);
    expect(component.projectName()).toBe('');
  });

  it('projectName prefers explicit primary project label for multi-membership', () => {
    const { component } = setup();
    component.media.set({ ...MOCK_MEDIA });
    component.projectOptions.set([
      { id: 'proj-001', label: 'Project Alpha' },
      { id: 'proj-002', label: 'Project Beta' },
    ]);
    component.selectedProjectIds.set(new Set(['proj-001', 'proj-002']));

    expect(component.projectName()).toBe('Project Beta +1');
  });
});

describe('MediaDetailViewComponent – formatCoord', () => {
  it('formats a number to 6 decimal places', () => {
    expect(formatCoordinate(48.208174)).toBe('48.208174');
  });

  it('returns dash for null', () => {
    const { component } = setup();
    expect(component['formatCoord'](null)).toBe('-');
  });
});

describe('MediaDetailViewComponent – close', () => {
  it('emits closed event', () => {
    const { component } = setup();
    let emitted = false;
    component.closed.subscribe(() => (emitted = true));

    component.close();

    expect(emitted).toBe(true);
  });
});
