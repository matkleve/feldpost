import { describe, expect, it } from 'vitest';
import { canWarmSkipGridLoadingSurface } from './media-display-warm-revisit.helpers';

describe('canWarmSkipGridLoadingSurface', () => {
  it('returns false for detail context', () => {
    expect(
      canWarmSkipGridLoadingSurface({
        downloadContext: 'detail',
        slotGeometry: 'intrinsic',
        sessionAspectRatio: 1.5,
        cachedPreviewUrl: 'https://example/a.jpg',
      }),
    ).toBe(false);
  });

  it('returns false without session ratio', () => {
    expect(
      canWarmSkipGridLoadingSurface({
        downloadContext: 'grid',
        slotGeometry: 'intrinsic',
        sessionAspectRatio: null,
        cachedPreviewUrl: 'https://example/a.jpg',
      }),
    ).toBe(false);
  });

  it('returns true for grid intrinsic with ratio and cached URL', () => {
    expect(
      canWarmSkipGridLoadingSurface({
        downloadContext: 'grid',
        slotGeometry: 'intrinsic',
        sessionAspectRatio: 1.777,
        cachedPreviewUrl: 'https://example/a.jpg',
      }),
    ).toBe(true);
  });
});
