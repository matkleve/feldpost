import { describe, expect, it } from 'vitest';
import { MediaAspectRatioCacheService } from './media-aspect-ratio-cache.service';

describe('MediaAspectRatioCacheService', () => {
  it('stores and returns intrinsic ratio', () => {
    const cache = new MediaAspectRatioCacheService();
    cache.set('media-1', 1.5);
    expect(cache.get('media-1')).toBe(1.5);
  });

  it('does not let registry hint overwrite intrinsic ratio', () => {
    const cache = new MediaAspectRatioCacheService();
    cache.set('media-1', 1.77, 'intrinsic');
    cache.set('media-1', 1.33, 'registry');
    expect(cache.get('media-1')).toBe(1.77);
  });

  it('invalidates per media id', () => {
    const cache = new MediaAspectRatioCacheService();
    cache.set('media-1', 2);
    cache.invalidate('media-1');
    expect(cache.get('media-1')).toBeNull();
  });
});
