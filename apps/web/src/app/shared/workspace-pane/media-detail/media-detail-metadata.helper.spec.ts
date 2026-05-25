import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { MediaDetailMetadataHelper } from './media-detail-metadata.helper';
import type { MediaRecord } from './media-detail-view.types';

const MOCK_MEDIA: MediaRecord = {
  id: 'img-1',
  user_id: 'user-1',
  organization_id: 'org-1',
  project_id: 'proj-1',
  storage_path: null,
  thumbnail_path: null,
  latitude: null,
  longitude: null,
  exif_latitude: null,
  exif_longitude: null,
  captured_at: null,
  has_time: false,
  created_at: '2025-01-01T12:00:00.000Z',
  address_label: null,
  street: null,
  city: null,
  district: null,
  country: null,
  direction: null,
  location_unresolved: false,
};

describe('MediaDetailMetadataHelper', () => {
  it('saves metadata value when validation passes', async () => {
    const metadata = signal([
      { metadataKeyId: 'key-1', key: 'Site', keyType: 'text' as const, value: 'Old' },
    ]);
    const validateMetadataValueForSave = vi.fn(() => ({
      valid: true,
      normalizedValue: 'New',
    }));
    const saveMetadataValueByLookupId = vi.fn(async () => true);

    const helper = new MediaDetailMetadataHelper({
      services: {
        metadata: {
          validateMetadataValueForSave,
          saveMetadataValueByLookupId,
        } as any,
      },
      signals: {
        media: signal<MediaRecord | null>(MOCK_MEDIA),
        mediaId: () => 'img-1',
        metadata,
        saving: signal(false),
      },
    });

    await helper.saveMetadata(
      { metadataKeyId: 'key-1', key: 'Site', keyType: 'text', value: 'Old' },
      'New',
    );

    expect(metadata()[0].value).toBe('New');
    expect(saveMetadataValueByLookupId).toHaveBeenCalledWith('img-1', 'key-1', 'New');
  });

  it('rolls back metadata list when remove fails', async () => {
    const metadata = signal([
      { metadataKeyId: 'key-1', key: 'Site', keyType: 'text' as const, value: 'A' },
    ]);
    const removeMetadataValueByLookupId = vi.fn(async () => false);

    const helper = new MediaDetailMetadataHelper({
      services: {
        metadata: { removeMetadataValueByLookupId } as any,
      },
      signals: {
        media: signal<MediaRecord | null>(MOCK_MEDIA),
        mediaId: () => 'img-1',
        metadata,
        saving: signal(false),
      },
    });

    await helper.removeMetadata({
      metadataKeyId: 'key-1',
      key: 'Site',
      keyType: 'text',
      value: 'A',
    });

    expect(metadata()).toHaveLength(1);
    expect(metadata()[0].value).toBe('A');
  });
});
