import {
  formatLocationUpdateFailureMessage,
  type LocationUpdateFailureMessage,
} from './media-location-update.helpers';
import { normalizeToastOptions, truncateToastTechnicalDetail } from '../toast/toast.helpers';
import type { ToastCodeRef, ToastOptions } from '../toast/toast.types';

const DEFAULT_LOCATION_CODE_REF: ToastCodeRef = {
  file: 'media-location-update.service.ts',
  fn: 'resolve_media_location',
};

/**
 * Structured toast for a failed location update.
 */
export function buildLocationUpdateFailureToast(
  error?: string,
  codeRef: ToastCodeRef = DEFAULT_LOCATION_CODE_REF,
): ToastOptions {
  const parts = formatLocationUpdateFailureMessage(error);
  return locationFailurePartsToToast(parts, codeRef);
}

/** @deprecated Use buildLocationUpdateFailureToast — returns flat string for legacy callers. */
export function buildLocationUpdateFailureToastMessage(error?: string): string {
  return normalizeToastOptions(buildLocationUpdateFailureToast(error)).message;
}

function locationFailurePartsToToast(
  parts: LocationUpdateFailureMessage,
  codeRef: ToastCodeRef,
): ToastOptions {
  const title = parts.title ?? 'Location update failed';
  const body = parts.hint ? `${parts.summary} ${parts.hint}` : parts.summary;
  const detail = parts.technicalDetail
    ? truncateToastTechnicalDetail(parts.technicalDetail)
    : undefined;

  return {
    title,
    body,
    detail: detail && detail !== body ? detail : undefined,
    codeRef,
    type: 'error',
    dedupe: true,
  };
}
