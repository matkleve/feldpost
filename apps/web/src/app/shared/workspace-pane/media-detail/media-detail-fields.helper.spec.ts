import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { MediaDetailFieldsHelper } from './media-detail-fields.helper';
import type { ImageRecord } from './media-detail-view.types';

const MOCK_IMAGE: ImageRecord = {
  id: 'img-1',
  user_id: 'user-1',
  organization_id: 'org-1',
  project_id: 'proj-1',
  storage_path: 'org-001/user-001/photo.jpg',
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
  const media = signal<ImageRecord | null>({ ...MOCK_IMAGE });
  const editingField = signal<any>(null);
  const saving = signal(false);
  const editDate = signal('');
  const editTime = signal('');
  const updateOr = vi.fn(async () => ({ error: null }));
  const listForMedia = vi.fn(async () => ({
    ok: true as const,
    rows: [
      {
        id: 'loc-1',
        media_item_id: 'img-1',
        organization_id: 'org-1',
        sort_order: 0,
        street: 'Old street',
        city: 'Old city',
        district: 'Old district',
        country: 'Old country',
        address_label: 'Old label',
        latitude: 1,
        longitude: 2,
        house_number: null,
        staircase: null,
        door: null,
        floor: null,
        postcode: null,
        extra_information: null,
        staircase_sort_key: '~~',
        door_sort_key: '~~',
        created_at: '',
        updated_at: '',
      },
    ],
  }));
  const updateLocation = vi.fn(async () => ({ ok: true as const, row: {} }));
  const helper = new MediaDetailFieldsHelper({
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
      mediaLocations: { listForMedia, updateLocation, addLocation: vi.fn() } as any,
      mediaLocationUpdate: { updateFromAddressSuggestion: vi.fn() } as any,
    },
    signals: {
      media,
      editingField,
      saving,
      editDate,
      editTime,
    },
    helpers: {
      t: (_key, fallback) => fallback,
    },
  });

  return { helper, signals: { media, editingField, editDate, editTime }, updateOr };
}

describe('MediaDetailFieldsHelper', () => {
  it('saves location display fields via MediaLocationsService and clears edit mode', async () => {
    const { helper, signals } = createHelper();
    signals.editingField.set('city');

    await helper.saveImageField('city', 'New city');

    expect(signals.media()!.city).toBe('New city');
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
