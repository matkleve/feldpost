import type { ChipDef } from '../../../shared/quick-info-chips/quick-info-chips.component';
import type { MediaLocationAddressPatch } from '../../../core/media-location-update/media-location-update.types';
import type { ForwardGeocodeResult } from '../../../core/geocoding/geocoding.service';
import type { ImageRecord, MetadataEntry, SelectOption } from './media-detail-view.types';

export type DetailTranslateFn = (key: string, fallback: string) => string;

interface MetadataKeyRow {
  key_name?: string;
  key_type?: string | null;
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
      keyType: (r.metadata_keys?.key_type ?? 'text') as MetadataEntry['keyType'],
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
  // Prefer bytes/path over media_type — rows can be mis-tagged as `document`.
  if (mimeType?.startsWith('image/')) {
    return true;
  }
  if (isLikelyImagePath(storagePath)) {
    return true;
  }
  if (mediaType) {
    // Canonical DB value is `photo`; legacy rows and RPCs may still use `image`.
    return mediaType === 'photo' || mediaType === 'image';
  }
  return false;
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

/** Plain-language type for quick-info chips (Image, PDF, Document — not JPG/DOCX). */
export function resolveMediaTypeChipLabel(
  image: ImageRecord | null,
  mediaType: string | null,
  mimeType: string | null,
  t: DetailTranslateFn,
): string {
  if (mimeType?.startsWith('image/')) {
    return t('workspace.imageDetail.mediaType.image', 'Image');
  }

  if (mimeType?.startsWith('video/')) {
    return t('workspace.imageDetail.mediaType.video', 'Video');
  }

  if (mimeType === 'application/pdf') {
    return 'PDF';
  }

  if (mimeType && isOfficeMimeType(mimeType)) {
    return t('workspace.imageDetail.mediaType.document', 'Document');
  }

  const fromMediaType = resolveLabelFromMediaType(mediaType, t);
  if (fromMediaType) return fromMediaType;

  const extension = image?.storage_path?.split('.').pop()?.toUpperCase();
  if (extension && isImageExtension(extension)) {
    return t('workspace.imageDetail.mediaType.image', 'Image');
  }

  if (extension === 'PDF') {
    return 'PDF';
  }

  return t('workspace.imageDetail.mediaType.media', 'Media');
}

/** Technical file format for the details row (JPG, PNG, PDF, DOCX, …). */
export function resolveFileFormatLabel(
  storagePath: string | null,
  mimeType: string | null,
  t: DetailTranslateFn,
): string {
  const fromPath = resolveFormatFromPath(storagePath);
  if (fromPath) return fromPath;

  const fromMime = resolveFormatFromMime(mimeType);
  if (fromMime) return fromMime;

  return t('workspace.imageDetail.value.empty', '—');
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

  const primaryLabel = selectedLabels[0];

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
  if (!image) {
    return '';
  }

  const parts = [image.street, image.city, image.district, image.country].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(', ');
  }

  return image.address_label?.trim() ?? '';
}

export function hasResolvableCoordinates(image: ImageRecord | null): boolean {
  return image?.latitude != null && image?.longitude != null;
}

export function locationPatchFromForwardGeocode(
  suggestion: ForwardGeocodeResult,
): MediaLocationAddressPatch & { latitude: number; longitude: number } {
  return {
    latitude: suggestion.lat,
    longitude: suggestion.lng,
    address_label: suggestion.addressLabel,
    street: suggestion.street,
    city: suggestion.city,
    district: suggestion.district,
    country: suggestion.country,
  };
}

export function mergeImageLocationPatch(
  image: ImageRecord,
  patch: MediaLocationAddressPatch & {
    latitude?: number | null;
    longitude?: number | null;
    location_unresolved?: boolean;
    gps_assignment_allowed?: boolean;
  },
): ImageRecord {
  const next: ImageRecord = {
    ...image,
    ...(patch.latitude !== undefined ? { latitude: patch.latitude } : {}),
    ...(patch.longitude !== undefined ? { longitude: patch.longitude } : {}),
    ...(patch.address_label !== undefined ? { address_label: patch.address_label } : {}),
    ...(patch.street !== undefined ? { street: patch.street } : {}),
    ...(patch.city !== undefined ? { city: patch.city } : {}),
    ...(patch.district !== undefined ? { district: patch.district } : {}),
    ...(patch.country !== undefined ? { country: patch.country } : {}),
    ...(patch.gps_assignment_allowed !== undefined
      ? { gps_assignment_allowed: patch.gps_assignment_allowed }
      : {}),
  };

  if (patch.location_unresolved !== undefined) {
    next.location_unresolved = patch.location_unresolved;
  } else if (next.latitude != null && next.longitude != null) {
    next.location_unresolved = false;
  }

  return next;
}

/** True when GPS exists but structured address lines are still empty (reverse geocode in flight). */
export function needsAddressResolutionAfterGps(image: ImageRecord | null): boolean {
  if (!hasResolvableCoordinates(image)) {
    return false;
  }
  const hasStructured =
    !!(image?.street?.trim() || image?.city?.trim() || image?.district?.trim() || image?.country?.trim());
  const hasLabel = !!(image?.address_label?.trim());
  return !hasStructured && !hasLabel;
}

export function buildInfoChips(args: {
  image: ImageRecord | null;
  mediaTypeChipLabel: string;
  projectName: string;
  selectedProjectCount: number;
  captureDate: string | null;
  isCorrected: boolean;
  t: DetailTranslateFn;
}): ChipDef[] {
  const {
    image,
    mediaTypeChipLabel,
    projectName,
    selectedProjectCount,
    captureDate,
    isCorrected,
    t,
  } = args;
  if (!image) return [];

  const hasGps = image.latitude != null;
  return [
    {
      icon: 'description',
      text: mediaTypeChipLabel,
      variant: 'filled',
      title: t('workspace.imageDetail.field.type', 'Type'),
    },
    {
      icon: 'folder',
      text: projectName || t('workspace.imageDetail.value.noProject', 'No project'),
      variant: selectedProjectCount > 0 ? ('filled' as const) : ('default' as const),
      title: t('workspace.imageDetail.field.projects', 'Projects'),
      action: 'project',
    },
    {
      icon: 'schedule',
      text: captureDate ?? t('workspace.imageDetail.value.noDate', 'No date'),
      title: t('workspace.imageDetail.chip.captureDate', 'Capture date'),
      action: 'captured_at',
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
      action: 'coordinates',
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
  if (mediaType === 'image' || mediaType === 'photo') {
    return t('workspace.imageDetail.mediaType.image', 'Image');
  }
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

function resolveFormatFromPath(path: string | null): string | null {
  const extension = path?.split('.').pop()?.toUpperCase();
  if (!extension || extension.length > 12 || extension.includes('/')) {
    return null;
  }

  return extension;
}

function resolveFormatFromMime(mimeType: string | null): string | null {
  if (!mimeType) return null;

  const exact = MIME_FORMAT_LABELS[mimeType];
  if (exact) return exact;

  if (
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/')
  ) {
    const subtype = mimeType.slice(mimeType.indexOf('/') + 1);
    if (subtype && /^[a-z0-9.-]+$/i.test(subtype) && !subtype.startsWith('vnd')) {
      return subtype.toUpperCase();
    }
  }

  return null;
}

function isOfficeMimeType(mimeType: string): boolean {
  return (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  );
}

function isImageExtension(extension: string): boolean {
  return /^(AVIF|BMP|GIF|HEIC|HEIF|JPE?G|PNG|SVG|TIF{1,2}|WEBP)$/i.test(extension);
}

const MIME_FORMAT_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'image/gif': 'GIF',
  'image/heic': 'HEIC',
  'image/heif': 'HEIF',
  'image/tiff': 'TIFF',
  'image/avif': 'AVIF',
  'image/bmp': 'BMP',
  'image/svg+xml': 'SVG',
  'video/mp4': 'MP4',
  'video/quicktime': 'MOV',
  'video/webm': 'WEBM',
};
