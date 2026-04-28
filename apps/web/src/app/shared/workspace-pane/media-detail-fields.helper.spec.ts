import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { ImageDetailFieldsHelper } from './media-detail-fields.helper';
import type { ImageRecord } from './media-detail-view.types';

const MOCK_IMAGE: ImageRecord = {
  id: 'img-1',
  user_id: 'user-1',
  organization_id: 'org-1',
  project_id: 'proj-1',
  storage_path: 'images/photo.jpg',
  thumbnail_path: null,
  latitude: 1,
  longitude: 2,
  exif_latitude: 1,
  exif_longitude: 2,
  captured_at: '2025-01-01T10:15:00.000Z',
  has_time: true,
  created_at: '2025-01-01T12:00:00.000Z',
  address_label: 'Old label',
  street: 'Old street',
  city: 'Old city',
  district: 'Old district',
  country: 'Old country',
  direction: null,
  location_unresolved: false,
};

function createHelper() {
  const image = signal<ImageRecord | null>({ ...MOCK_IMAGE });
  const editingField = signal<any>(null);
  const saving = signal(false);
  const editDate = signal('');
  const editTime = signal('');
  const updateOr = vi.fn(async () => ({ error: null }));
  const helper = new ImageDetailFieldsHelper({
    services: {
      supabase: {
        client: {
          from: vi.fn(() => ({
            update: vi.fn(() => ({
              or: updateOr,
            })),
          })),
        },
      } as any,
      toastService: { show: vi.fn() } as any,
    },
    signals: {
      image,
      editingField,
      saving,
      editDate,
      editTime,
    },
    helpers: {
      t: (_key, fallback) => fallback,
    },
  });

  return { helper, signals: { image, editingField, editDate, editTime }, updateOr };
}

describe('ImageDetailFieldsHelper', () => {
  it('saves text fields and clears edit mode', async () => {
    const { helper, signals } = createHelper();
    signals.editingField.set('city');

    await helper.saveImageField('city', 'New city');

    expect(signals.image()!.city).toBe('New city');
    expect(signals.editingField()).toBeNull();
  });

  it('prepares captured-at editor state', () => {
    const { helper, signals } = createHelper();
    const expected = new Date(MOCK_IMAGE.captured_at!);

    helper.openCapturedAtEditor();

    expect(signals.editingField()).toBe('captured_at');
    expect(signals.editDate()).toBe('2025-01-01');
    expect(signals.editTime()).toBe(
      `${String(expected.getHours()).padStart(2, '0')}:${String(expected.getMinutes()).padStart(2, '0')}`,
    );
  });
});
