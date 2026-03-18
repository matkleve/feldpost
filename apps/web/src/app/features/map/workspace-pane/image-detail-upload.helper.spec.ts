import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { ImageDetailUploadHelper } from './image-detail-upload.helper';
import type { ImageRecord } from './image-detail-view.types';

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

function createHelper() {
  const image = signal<ImageRecord | null>({ ...MOCK_IMAGE });
  const replaceError = signal<string | null>(null);
  const activeJobId = signal<string | null>(null);
  const uploadService = {
    validateFile: vi.fn(() => ({ valid: true })),
  } as any;
  const uploadManager = {
    replaceFile: vi.fn(() => 'replace-job'),
    attachFile: vi.fn(() => 'attach-job'),
  } as any;

  const helper = new ImageDetailUploadHelper({
    services: { uploadService, uploadManager },
    signals: { image, replaceError, activeJobId },
    callbacks: {
      findJobForFailure: vi.fn(() => true),
    },
  });

  return { helper, signals: { image, replaceError, activeJobId }, deps: { uploadService, uploadManager } };
}

describe('ImageDetailUploadHelper', () => {
  it('starts a replace job for images with an existing storage path', () => {
    const { helper, signals, deps } = createHelper();
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });

    helper.onFileSelected(file);

    expect(deps.uploadManager.replaceFile).toHaveBeenCalledWith('img-1', file);
    expect(signals.activeJobId()).toBe('replace-job');
  });

  it('stores validation errors without creating a job', () => {
    const { helper, signals, deps } = createHelper();
    deps.uploadService.validateFile.mockReturnValue({ valid: false, error: 'bad file' });
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });

    helper.onFileSelected(file);

    expect(signals.replaceError()).toBe('bad file');
    expect(deps.uploadManager.replaceFile).not.toHaveBeenCalled();
    expect(deps.uploadManager.attachFile).not.toHaveBeenCalled();
  });
});
