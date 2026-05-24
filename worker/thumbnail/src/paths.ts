/**
 * Thumbnail object key under the media bucket.
 * @see docs/architecture/media-preview-converter.md#master-raster-storage
 */
export function buildThumbnailStoragePath(storagePath: string, organizationId: string): string {
  const parts = storagePath.split('/').filter(Boolean);
  const fileName = parts[parts.length - 1] ?? 'file';
  const stem = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName;
  const userId = parts.length >= 2 ? parts[1] : 'unknown';
  const org = organizationId.trim() || parts[0] || 'unknown';
  return `${org}/${userId}/${stem}_thumb.webp`;
}
