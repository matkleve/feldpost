import type { PhotoLoadState, PhotoSize } from '../photo-load.model';
import type { MediaContext, MediaTier } from '../media/media-renderer.types';
import type { MediaDeliveryErrorCode, MediaDeliveryItemState } from './media-download.types';

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

function asErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }
  if (typeof error === 'string') {
    return error.toLowerCase();
  }
  return '';
}
