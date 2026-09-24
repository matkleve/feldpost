/**
 * Original pixel size for the detail resolution badge.
 * The preview bitmap is a downscale (thumbnail long edge 128px, or a signed transform).
 * Ingest stores the source dimensions on `exif_raw`.
 * @see docs/specs/ui/media-detail/media-detail-media-viewer.md#what-it-looks-like
 */

export interface OriginalPixelSize {
  width: number;
  height: number;
}

/** exifr `translateValues` strings, plus raw numeric orientation. */
const AXIS_SWAP_ORIENTATIONS = new Set<unknown>([
  5,
  6,
  7,
  8,
  'Mirror horizontal and rotate 270 CW',
  'Rotate 90 CW',
  'Mirror horizontal and rotate 90 CW',
  'Rotate 270 CW',
]);

function positivePixel(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return Math.round(n);
}

function pixelPair(
  exif: Record<string, unknown>,
  widthKey: string,
  heightKey: string,
): OriginalPixelSize | null {
  const width = positivePixel(exif[widthKey]);
  const height = positivePixel(exif[heightKey]);
  if (width == null || height == null) {
    return null;
  }
  return { width, height };
}

/** Source-file pixel size from ingest EXIF, oriented the way the photo is shown. */
export function originalPixelSizeFromExif(
  exif: Record<string, unknown> | null | undefined,
): OriginalPixelSize | null {
  if (!exif) {
    return null;
  }

  const size =
    pixelPair(exif, 'ExifImageWidth', 'ExifImageHeight') ??
    pixelPair(exif, 'ImageWidth', 'ImageHeight');
  if (!size) {
    return null;
  }

  if (AXIS_SWAP_ORIENTATIONS.has(exif['Orientation'])) {
    return { width: size.height, height: size.width };
  }

  return size;
}
