import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { MediaDetailMediaEventsHelper } from './media-detail-media-events.helper';
import type { MediaRecord } from './media-detail-view.types';

const MOCK_MEDIA: MediaRecord = {
  id: 'img-1',
  user_id: 'user-1',
  organization_id: 'org-1',
  project_id: 'proj-1',
  storage_path: 'org-001/user-001/old.jpg',
  thumbnail_path: 'org-001/user-001/old-thumb.jpg',
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

describe('MediaDetailMediaEventsHelper', () => {
  it('updates image state and reloads URLs after replace', async () => {
    const media = signal<MediaRecord | null>({ ...MOCK_MEDIA });
    const invalidate = vi.fn();
    const batchSignThumbnails = vi.fn(async () => {});
    const helper = new MediaDetailMediaEventsHelper({
      services: {
        mediaDownloadService: { invalidate } as any,
        workspaceView: {
          rawImages: signal([{ id: 'img-1', storagePath: 'org-001/user-001/old.jpg' }]),
          updateRawImages: (fn: (all: Array<{ id: string; storagePath: string }>) => unknown) => {
            const current = [{ id: 'img-1', storagePath: 'org-001/user-001/old.jpg' }];
            fn(current);
          },
          batchSignThumbnails,
        } as any,
        toastService: { show: vi.fn() } as any,
      },
      signals: {
        media,
        activeJobId: signal('job-1'),
      },
      callbacks: {
        t: (_key, fallback) => fallback,
      },
    });

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    await helper.handleImageReplaced({
      mediaId: 'img-1',
      newStoragePath: 'org-001/user-001/new.jpg',
      localObjectUrl: 'blob:test',
      jobId: 'job-1',
    } as any);

    expect(media()!.storage_path).toBe('org-001/user-001/new.jpg');
    expect(invalidate).toHaveBeenCalledWith('img-1');
    expect(batchSignThumbnails).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:test');
    revokeSpy.mockRestore();
  });
});
