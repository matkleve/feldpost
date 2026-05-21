import { describeUploadPersistError } from '../upload/upload.service.util';
import { truncateToastTechnicalDetail } from '../toast/toast.helpers';

/** User-facing location update failure with optional remediation hint. */
export interface LocationUpdateFailureMessage {
  /** Short toast headline (one line). */
  title?: string;
  summary: string;
  hint?: string;
  /** Raw backend message for expandable detail. */
  technicalDetail?: string;
}

const LOCATION_HINT_DEFAULT =
  'Retry after refreshing. If using local Supabase, confirm you are signed in and migrations are up to date.';

/**
 * Maps resolve_media_location / geocode failures to actionable copy.
 * @see docs/specs/service/media-location-update/media-location-update-service.md
 */
export function formatLocationUpdateFailureMessage(
  rawError: string | null | undefined,
): LocationUpdateFailureMessage {
  const message = rawError?.trim() ?? '';
  if (!message) {
    return {
      title: 'Location update failed',
      summary: 'The server did not return an error message.',
      hint: LOCATION_HINT_DEFAULT,
    };
  }

  const described = describeUploadPersistError({ message });
  const normalized = message.toLowerCase();

  if (/could not choose the best candidate function/i.test(normalized)) {
    return {
      title: 'Location update failed',
      summary: 'Database has two conflicting resolve_media_location functions.',
      hint: 'Run supabase db reset (or apply migration 20260521180000) locally, then retry.',
      technicalDetail: truncateToastTechnicalDetail(message),
    };
  }

  if (/user profile or organization not found/i.test(normalized)) {
    return {
      title: 'Location update failed',
      summary: 'Your account profile or organization is missing.',
      hint: 'For local dev, run scripts/create-local-dev-user.sql, sign out, and sign in again.',
      technicalDetail: truncateToastTechnicalDetail(message),
    };
  }

  if (/gps assignment is disabled/i.test(normalized)) {
    return {
      title: 'Location update failed',
      summary: 'GPS is locked for this file type.',
      hint: 'Run supabase db reset locally so document GPS migrations are applied, then retry.',
      technicalDetail: truncateToastTechnicalDetail(message),
    };
  }

  if (/no media item matched|not found for your organization/i.test(normalized)) {
    return {
      title: 'Location update failed',
      summary: 'The uploaded file record was not found for your organization.',
      hint: 'Refresh the page and confirm the app uses the same Supabase project you uploaded to.',
      technicalDetail: truncateToastTechnicalDetail(message),
    };
  }

  if (/geocode|edge function|functions\/geocode/i.test(normalized)) {
    return {
      title: 'Location update failed',
      summary: 'Address lookup failed.',
      hint: 'Start local edge functions (supabase functions serve) or set the pin on the map only.',
      technicalDetail: truncateToastTechnicalDetail(message),
    };
  }

  if (described.code === '42501' || /permission denied|row-level security/i.test(normalized)) {
    return {
      title: 'Location update failed',
      summary: 'Database permission denied.',
      hint: 'Sign in again and confirm local vs cloud Supabase in the browser console.',
      technicalDetail: truncateToastTechnicalDetail(message),
    };
  }

  const shortSummary =
    message.length > 120 ? `${message.slice(0, 117)}…` : `Server error: ${message}`;

  if (described.hint) {
    return {
      title: 'Location update failed',
      summary: shortSummary,
      hint: described.hint,
      technicalDetail: truncateToastTechnicalDetail(message),
    };
  }

  return {
    title: 'Location update failed',
    summary: shortSummary,
    hint: LOCATION_HINT_DEFAULT,
    technicalDetail: truncateToastTechnicalDetail(message),
  };
}

/** Single-line toast text from structured location failure (legacy). */
export function locationUpdateFailureMessageToToastText(parts: LocationUpdateFailureMessage): string {
  const headline = parts.title ?? 'Location update failed';
  const body = parts.hint ? `${parts.summary} ${parts.hint}` : parts.summary;
  return `${headline}: ${body}`;
}

/**
 * Normalizes PostgREST / RPC errors from resolve_media_location.
 */
export function describeLocationUpdateRpcError(error: unknown): string {
  const described = describeUploadPersistError(error);
  if (described.message) {
    return described.message;
  }
  return 'Location update failed.';
}

/** When RPC returns false (no row updated). */
export const LOCATION_UPDATE_NOT_FOUND_ERROR =
  'No media item matched your organization. Refresh and try again.';
