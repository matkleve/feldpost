import { ImageRecord, MetadataEntry } from './image-detail-view.types';

export type DetailTranslateFn = (key: string, fallback: string) => string;

interface MetadataKeyRow {
  key_name?: string;
}

interface ImageMetadataRow {
  metadata_key_id: string;
  value_text: string;
  metadata_keys?: MetadataKeyRow | null;
}

export function mapImageMetadataRows(rows: unknown[]): MetadataEntry[] {
  return rows.map((row) => {
    const r = row as ImageMetadataRow;
    return {
      metadataKeyId: r.metadata_key_id,
      key: r.metadata_keys?.key_name ?? 'Unknown',
      value: r.value_text,
    };
  });
}

export function resolvePreviewThumbnailPath(
  thumbnailPath: string | null,
  storagePath: string,
): string | null {
  if (thumbnailPath && isLikelyImagePath(thumbnailPath)) {
    return thumbnailPath;
  }

  if (isLikelyImagePath(storagePath)) {
    return storagePath;
  }

  return null;
}

export function isImageLikeMedia(
  mediaType: string | null,
  mimeType: string | null,
  storagePath: string | null,
): boolean {
  if (mediaType) {
    return mediaType === 'image';
  }

  if (mimeType) {
    return mimeType.startsWith('image/');
  }

  return isLikelyImagePath(storagePath);
}

export function isLikelyImagePath(path: string | null): boolean {
  if (!path) return false;
  return /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|tiff?|webp)$/i.test(path);
}

export function resolveMediaTypeLabel(
  image: ImageRecord | null,
  mediaType: string | null,
  mimeType: string | null,
  t: DetailTranslateFn,
): string {
  const fromMime = resolveLabelFromMime(mimeType, t);
  if (fromMime) return fromMime;

  const fromMediaType = resolveLabelFromMediaType(mediaType, t);
  if (fromMediaType) return fromMediaType;

  const fromPath = resolveLabelFromPath(image?.storage_path ?? null, t);
  if (fromPath) return fromPath;

  return t('workspace.imageDetail.mediaType.media', 'Media');
}

export function formatCoordinate(value: number | null): string {
  if (value == null) return '—';
  return value.toFixed(6);
}

function mapMimeTypeToLabel(mimeType: string, t: DetailTranslateFn): string | null {
  if (mimeType.startsWith('image/')) {
    return t('workspace.imageDetail.mediaType.image', 'Image');
  }

  if (mimeType.startsWith('video/')) {
    return t('workspace.imageDetail.mediaType.video', 'Video');
  }

  switch (mimeType) {
    case 'application/pdf':
      return 'PDF';
    case 'application/msword':
      return 'DOC';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'DOCX';
    case 'application/vnd.ms-excel':
      return 'XLS';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'XLSX';
    case 'application/vnd.ms-powerpoint':
      return 'PPT';
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return 'PPTX';
    default:
      return null;
  }
}

function resolveLabelFromMime(mimeType: string | null, t: DetailTranslateFn): string | null {
  if (!mimeType) return null;
  return mapMimeTypeToLabel(mimeType, t);
}

function resolveLabelFromMediaType(mediaType: string | null, t: DetailTranslateFn): string | null {
  if (mediaType === 'image') return t('workspace.imageDetail.mediaType.image', 'Image');
  if (mediaType === 'video') return t('workspace.imageDetail.mediaType.video', 'Video');
  if (mediaType === 'document') return t('workspace.imageDetail.mediaType.document', 'Document');
  return null;
}

function resolveLabelFromPath(path: string | null, t: DetailTranslateFn): string | null {
  const extension = path?.split('.').pop()?.toUpperCase();
  if (!extension) return null;

  if (extension === 'JPG' || extension === 'JPEG' || extension === 'PNG' || extension === 'WEBP') {
    return t('workspace.imageDetail.mediaType.image', 'Image');
  }

  return extension;
}
