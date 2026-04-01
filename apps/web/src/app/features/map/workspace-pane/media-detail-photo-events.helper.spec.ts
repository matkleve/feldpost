import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { ImageDetailPhotoEventsHelper } from './media-detail-photo-events.helper';
import type { ImageRecord } from './media-detail-view.types';

const MOCK_IMAGE: ImageRecord = {
  id: 'img-1',
  user_id: 'user-1',
  organization_id: 'org-1',
  project_id: 'proj-1',
  storage_path: 'images/old.jpg',
  thumbnail_path: 'images/old-thumb.jpg',
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

describe('ImageDetailPhotoEventsHelper', () => {
  it('updates image state and reloads URLs after replace', async () => {
    const image = signal<ImageRecord | null>({ ...MOCK_IMAGE });
    const reloadSignedUrlsForCurrentMedia = vi.fn(async () => {});
    const invalidate = vi.fn();
    const batchSignThumbnails = vi.fn(async () => {});
    const helper = new ImageDetailPhotoEventsHelper({
      services: {
        photoLoad: { invalidate } as any,
        workspaceView: {
          rawImages: signal([{ id: 'img-1', storagePath: 'images/old.jpg' }]),
          batchSignThumbnails,
        } as any,
        toastService: { show: vi.fn() } as any,
      },
      signals: {
        image,
        fullResPreloaded: signal(true),
        activeJobId: signal('job-1'),
      },
      callbacks: {
        reloadSignedUrlsForCurrentMedia,
        t: (_key, fallback) => fallback,
      },
    });

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    await helper.handleImageReplaced({
      imageId: 'img-1',
      newStoragePath: 'images/new.jpg',
      localObjectUrl: 'blob:test',
      jobId: 'job-1',
    } as any);

    expect(image()!.storage_path).toBe('images/new.jpg');
    expect(invalidate).toHaveBeenCalledWith('img-1');
    expect(reloadSignedUrlsForCurrentMedia).toHaveBeenCalled();
    expect(batchSignThumbnails).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:test');
    revokeSpy.mockRestore();
  });
});
