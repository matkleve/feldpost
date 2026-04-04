import type { MediaContext, MediaTier } from '../media/media-renderer.types';
import type {
  WorkspaceMediaCustomMetadata,
  WorkspaceMediaFileMetadata,
} from '../workspace-view/workspace-view.types';
import type {
  MediaDeliveryErrorCode,
  MediaDeliveryItemState,
  PhotoLoadState,
  PhotoSize,
} from './media-download.types';

export const PIXELS_PER_REM = 16;

export const CONTEXT_DEFAULT_TIER: Readonly<Record<MediaContext, MediaTier>> = {
  map: 'inline',
  grid: 'small',
  upload: 'small',
  detail: 'mid',
};

export const ALL_MEDIA_TIERS: readonly MediaTier[] = [
  'inline',
  'small',
  'mid',
  'mid2',
  'large',
  'full',
];

export const ZIP_INDEX_PAD_LENGTH = 3;
export const ZIP_TITLE_MAX_LENGTH = 100;
const TEN_MINUTES_IN_SECONDS = 600;
export const SIGNED_URL_TTL_SECONDS = TEN_MINUTES_IN_SECONDS;

const MAX_EXTENSION_FROM_PATH_LENGTH = 12;

const MIME_EXTENSION_FALLBACKS: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-powerpoint': 'ppt',
  'text/plain': 'txt',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

const UUID_FILE_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-zA-Z0-9]+)?$/i;

export function desiredSizeToTier(desiredSize: 'marker' | 'thumb' | 'detail' | 'full'): MediaTier {
  switch (desiredSize) {
    case 'marker':
      return 'inline';
    case 'thumb':
      return 'small';
    case 'detail':
      return 'large';
    case 'full':
    default:
      return 'full';
  }
}

export function tierToPhotoSize(tier: MediaTier): PhotoSize {
  switch (tier) {
    case 'inline':
      return 'marker';
    case 'small':
    case 'mid':
    case 'mid2':
      return 'thumb';
    case 'large':
    case 'full':
    default:
      return 'full';
  }
}

export function readyStateForTier(tier: MediaTier): MediaDeliveryItemState {
  return tier === 'large' || tier === 'full' ? 'ready-high-res' : 'ready-low-res';
}

export function mapLegacyState(state: PhotoLoadState, tier: MediaTier): MediaDeliveryItemState {
  switch (state) {
    case 'loading':
      return 'signing';
    case 'loaded':
      return readyStateForTier(tier);
    case 'error':
      return 'error';
    case 'no-photo':
      return 'no-media';
    case 'idle':
    default:
      return 'idle';
  }
}

export function mapSigningErrorCode(error: unknown): MediaDeliveryErrorCode {
  const text = asErrorText(error);

  if (text.includes('not found') || text.includes('404')) {
    return { code: 'not-found', isRetryable: false };
  }
  if (text.includes('forbidden') || text.includes('403')) {
    return { code: 'forbidden', isRetryable: false };
  }
  if (text.includes('unauthorized') || text.includes('401') || text.includes('auth')) {
    return { code: 'auth', isRetryable: false };
  }
  if (text.includes('timeout')) {
    return { code: 'timeout', isRetryable: true };
  }
  if (text.includes('rate') || text.includes('429')) {
    return { code: 'rate-limited', isRetryable: true };
  }

  return { code: 'sign-failed', isRetryable: true };
}

export function mapFetchErrorCode(error: unknown): MediaDeliveryErrorCode {
  const text = asErrorText(error);

  if (text.includes('timeout')) {
    return { code: 'timeout', isRetryable: true };
  }
  if (text.includes('rate') || text.includes('429')) {
    return { code: 'rate-limited', isRetryable: true };
  }
  if (text.includes('403') || text.includes('forbidden')) {
    return { code: 'forbidden', isRetryable: false };
  }
  if (text.includes('401') || text.includes('auth')) {
    return { code: 'auth', isRetryable: false };
  }
  if (text.includes('404') || text.includes('not found')) {
    return { code: 'not-found', isRetryable: false };
  }

  return { code: 'fetch-failed', isRetryable: true };
}

export function mapExportErrorCode(error: unknown): MediaDeliveryErrorCode {
  const fetchLike = mapFetchErrorCode(error);
  if (fetchLike.code !== 'fetch-failed') {
    return fetchLike;
  }

  const signLike = mapSigningErrorCode(error);
  if (signLike.code !== 'sign-failed') {
    return signLike;
  }

  return { code: 'unknown', isRetryable: true };
}

export function sanitizeExportTitle(value: string): string {
  const trimmed = value.trim() || 'workspace-export';
  return trimmed
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, ZIP_TITLE_MAX_LENGTH);
}

export function getFileExtension(storagePath: string, mimeType: string): string {
  const fromPath = storagePath.split('.').pop()?.toLowerCase();
  if (fromPath && fromPath.length <= MAX_EXTENSION_FROM_PATH_LENGTH) {
    return fromPath;
  }

  return MIME_EXTENSION_FALLBACKS[mimeType] ?? 'jpg';
}

export function readMetadataFilename(
  metadata?: WorkspaceMediaFileMetadata | null,
  legacyMetadata?: WorkspaceMediaCustomMetadata,
): string | null {
  const typed = firstNonEmpty([
    metadata?.originalFilename,
    metadata?.title,
    metadata?.filename,
    metadata?.name,
  ]);
  if (typed) return typed;

  return firstNonEmpty([
    legacyMetadata?.['originalFilename'],
    legacyMetadata?.['title'],
    legacyMetadata?.['filename'],
    legacyMetadata?.['name'],
  ]);
}

export function extractFilenameFromStoragePath(storagePath: string | null): string | null {
  if (!storagePath) return null;

  const pathParts = storagePath.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  if (!lastPart || UUID_FILE_SEGMENT.test(lastPart)) return null;

  const stem = lastPart.split('.')[0]?.trim();
  return stem || null;
}

export function composeStreetWithNumber(
  street: string | null,
  streetNumber: string | null | undefined,
): string | null {
  if (!street && !streetNumber) return null;
  if (!street) return streetNumber ?? null;
  if (!streetNumber) return street;

  const escaped = streetNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`\\b${escaped}\\b`).test(street)) {
    return street;
  }

  return `${street} ${streetNumber}`;
}

function asErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }
  if (typeof error === 'string') {
    return error.toLowerCase();
  }
  return '';
}

function firstNonEmpty(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}
