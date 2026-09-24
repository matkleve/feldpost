import { describe, expect, it } from 'vitest';
import { originalPixelSizeFromExif } from './media-item-original-resolution.helpers';

describe('originalPixelSizeFromExif', () => {
  it('reads ExifImageWidth and ExifImageHeight', () => {
    expect(
      originalPixelSizeFromExif({
        ExifImageWidth: 4032,
        ExifImageHeight: 3024,
        Orientation: 'Horizontal (normal)',
      }),
    ).toEqual({ width: 4032, height: 3024 });
  });

  it('swaps axes for 90° orientation so a portrait photo stays portrait', () => {
    expect(
      originalPixelSizeFromExif({
        ExifImageWidth: 4032,
        ExifImageHeight: 3024,
        Orientation: 'Rotate 90 CW',
      }),
    ).toEqual({ width: 3024, height: 4032 });
  });

  it('falls back to ImageWidth and ImageHeight', () => {
    expect(originalPixelSizeFromExif({ ImageWidth: 1920, ImageHeight: 1080 })).toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it('returns null when ingest EXIF has no pixel size', () => {
    expect(originalPixelSizeFromExif({ Make: 'Apple' })).toBeNull();
    expect(originalPixelSizeFromExif(null)).toBeNull();
  });
});
