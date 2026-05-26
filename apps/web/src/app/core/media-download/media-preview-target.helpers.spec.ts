import { describe, expect, it } from 'vitest';
import { isImageLikeStoragePath, resolvePreviewTarget } from './media-preview-target.helpers';
import type { MediaPreviewRequest } from './media-download.types';

const baseRequest = (overrides: Partial<MediaPreviewRequest>): MediaPreviewRequest => ({
  mediaId: 'm1',
  storagePath: 'org/u/file.bin',
  context: 'grid',
  ...overrides,
});

describe('resolvePreviewTarget', () => {
  it('prefers thumbnail_path for low tiers', () => {
    const target = resolvePreviewTarget(
      baseRequest({
        storagePath: 'org/u/photo.jpg',
        thumbnailPath: 'org/u/photo_thumb.jpg',
      }),
      'small',
    );

    expect(target).toBe('org/u/photo_thumb.jpg');
  });

  it('uses storage_path for full tier even when thumbnail_path exists', () => {
    const target = resolvePreviewTarget(
      baseRequest({
        storagePath: 'org/u/photo.jpg',
        thumbnailPath: 'org/u/photo_thumb.jpg',
      }),
      'full',
    );

    expect(target).toBe('org/u/photo.jpg');
  });

  it('uses storage_path for large tier (detail signing size)', () => {
    const target = resolvePreviewTarget(
      baseRequest({
        storagePath: 'org/u/photo.jpg',
        thumbnailPath: 'org/u/photo_thumb.jpg',
      }),
      'large',
    );

    expect(target).toBe('org/u/photo.jpg');
  });

  it('uses storage_path for JPEG when no thumbnail', () => {
    const target = resolvePreviewTarget(
      baseRequest({ storagePath: 'org/u/photo.jpg', thumbnailPath: null }),
      'small',
    );

    expect(target).toBe('org/u/photo.jpg');
  });

  it('returns null for office storage without thumbnail', () => {
    const target = resolvePreviewTarget(
      baseRequest({ storagePath: 'org/u/deck.pptx', thumbnailPath: null }),
      'small',
    );

    expect(target).toBeNull();
  });
});

describe('isImageLikeStoragePath', () => {
  it('accepts common photo extensions', () => {
    expect(isImageLikeStoragePath('a/b/c.jpeg')).toBe(true);
  });

  it('rejects pptx', () => {
    expect(isImageLikeStoragePath('a/b/c.pptx')).toBe(false);
  });
});
