import { ChipDef } from '../../../shared/quick-info-chips/quick-info-chips.component';
import { ImageRecord, MetadataEntry, SelectOption } from './media-detail-view.types';

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
  if (value == null) return '-';
  return value.toFixed(6);
}

export function resolveDisplayTitle(image: ImageRecord | null, t: DetailTranslateFn): string {
  if (!image) return '';
  return (
    image.address_label ??
    image.storage_path?.split('/').pop() ??
    t('workspace.imageDetail.fallback.file', 'File')
  );
}

export function formatCaptureDate(image: ImageRecord | null, locale: string): string | null {
  if (!image?.captured_at) return null;
  if (image.has_time) {
    return new Date(image.captured_at).toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  return new Date(image.captured_at).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatUploadDate(image: ImageRecord | null, locale: string): string | null {
  if (!image) return null;
  return new Date(image.created_at).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function resolveProjectName(
  options: SelectOption[],
  selectedIds: Set<string>,
  primaryId: string | null,
  fallbackProjectId: string | null,
): string {
  if (selectedIds.size === 0) {
    if (!fallbackProjectId) return '';
    return options.find((option) => option.id === fallbackProjectId)?.label ?? '';
  }

  const selectedLabels = options
    .filter((option) => selectedIds.has(option.id))
    .map((option) => option.label);
  if (selectedLabels.length === 0) return '';

  const primaryLabel =
    primaryId && selectedIds.has(primaryId)
      ? (options.find((option) => option.id === primaryId)?.label ?? selectedLabels[0])
      : selectedLabels[0];

  return selectedLabels.length === 1
    ? primaryLabel
    : `${primaryLabel} +${selectedLabels.length - 1}`;
}

export function filterProjectOptions(options: SelectOption[], search: string): SelectOption[] {
  const term = search.trim().toLowerCase();
  return term ? options.filter((option) => option.label.toLowerCase().includes(term)) : options;
}

export function canCreateProjectOption(
  search: string,
  options: SelectOption[],
  canAssignMultipleProjects: boolean,
  selectedProjectCount: number,
): boolean {
  const term = search.trim();
  if (!term) return false;
  if (!canAssignMultipleProjects && selectedProjectCount > 0) return false;
  return !options.some((option) => option.label.toLowerCase() === term.toLowerCase());
}

export function resolveFullAddress(image: ImageRecord | null): string {
  return image
    ? [image.street, image.city, image.district, image.country].filter(Boolean).join(', ')
    : '';
}

export function buildInfoChips(args: {
  image: ImageRecord | null;
  projectName: string;
  selectedProjectCount: number;
  captureDate: string | null;
  isCorrected: boolean;
  t: DetailTranslateFn;
}): ChipDef[] {
  const { image, projectName, selectedProjectCount, captureDate, isCorrected, t } = args;
  if (!image) return [];

  const hasGps = image.latitude != null;
  return [
    {
      icon: 'folder',
      text: projectName || t('workspace.imageDetail.value.noProject', 'No project'),
      variant: selectedProjectCount > 0 ? ('filled' as const) : ('default' as const),
      title: t('workspace.imageDetail.field.projects', 'Projects'),
    },
    {
      icon: 'schedule',
      text: captureDate ?? t('workspace.imageDetail.value.noDate', 'No date'),
      title: t('workspace.imageDetail.chip.captureDate', 'Capture date'),
    },
    {
      icon: 'my_location',
      text: hasGps
        ? isCorrected
          ? t('workspace.imageDetail.badge.corrected', 'Corrected')
          : t('workspace.imageDetail.value.gps', 'GPS')
        : t('workspace.imageDetail.value.noGps', 'No GPS'),
      variant: hasGps ? ('success' as const) : ('warning' as const),
      title: hasGps
        ? t('workspace.imageDetail.action.copyCoordinates', 'Copy coordinates')
        : t('workspace.imageDetail.value.noGpsData', 'No GPS data'),
    },
  ];
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
