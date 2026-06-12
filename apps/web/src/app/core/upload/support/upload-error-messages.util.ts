import { truncateToastTechnicalDetail } from '../../toast/toast.helpers';
import type { ToastCodeRef, ToastOptions } from '../../toast/toast.types';
import { describeUploadPersistError } from './upload.service.util';

/** User-facing upload failure with optional remediation hint. */
export interface UploadFailureMessage {
  title?: string;
  summary: string;
  hint?: string;
  technicalDetail?: string;
}

const UPLOAD_FAILURE_HINT_DEFAULT =
  'Check your connection, sign in again, and retry. If this persists, open browser devtools Network for the failing request.';

/**
 * Maps raw upload pipeline errors to actionable copy for toasts and panel status.
 * @see docs/specs/service/toast/toast-system.md
 */
export function formatUploadFailureMessage(rawError: string | null | undefined): UploadFailureMessage {
  const message = rawError?.trim() ?? '';
  if (!message) {
    return {
      title: 'Upload failed',
      summary: 'No error details were returned.',
      hint: UPLOAD_FAILURE_HINT_DEFAULT,
    };
  }

  const described = describeUploadPersistError({ message });
  const normalized = message.toLowerCase();

  if (/could not choose the best candidate function/i.test(normalized)) {
    return {
      title: 'Upload failed',
      summary: 'Database function conflict during save.',
      hint: 'Run supabase db reset (or apply latest migrations) locally, then retry.',
      technicalDetail: truncateToastTechnicalDetail(message),
    };
  }

  if (/not authenticated|jwt|session/i.test(normalized)) {
    return {
      title: 'Upload failed',
      summary: 'You are not signed in.',
      hint: 'Sign in again, then retry the upload.',
      technicalDetail: truncateToastTechnicalDetail(message),
    };
  }

  if (/profile not found|organization not found/i.test(normalized)) {
    return {
      title: 'Upload failed',
      summary: 'Your account profile is missing.',
      hint: 'For local dev, run scripts/create-local-dev-user.sql, then sign in again.',
      technicalDetail: truncateToastTechnicalDetail(message),
    };
  }

  if (/bucket\s+not\s+found|storage bucket/i.test(normalized)) {
    return {
      title: 'Upload failed',
      summary: 'Storage bucket "media" is missing.',
      hint: 'Create the bucket (or run migrations), then retry.',
      technicalDetail: truncateToastTechnicalDetail(message),
    };
  }

  if (/storage upload failed|storage error/i.test(normalized)) {
    return {
      title: 'Upload failed',
      summary: 'File could not be stored.',
      hint: 'Confirm local Supabase is running and the "media" bucket exists.',
      technicalDetail: truncateToastTechnicalDetail(message),
    };
  }

  if (/timed out|timeout/i.test(normalized)) {
    return {
      title: 'Upload failed',
      summary: 'The upload timed out.',
      hint: 'Retry with a smaller file or check local Supabase/API availability.',
      technicalDetail: truncateToastTechnicalDetail(message),
    };
  }

  if (/unsupported type|maximum allowed|25\s*mb/i.test(normalized)) {
    return {
      title: 'Upload failed',
      summary: message.length > 120 ? `${message.slice(0, 117)}…` : message,
      technicalDetail: message.length > 120 ? truncateToastTechnicalDetail(message) : undefined,
    };
  }

  if (/gps assignment is disabled/i.test(normalized)) {
    return {
      title: 'Upload failed',
      summary: 'Location cannot be saved for this file type yet.',
      hint: 'Run supabase db reset locally so document GPS migrations are applied, then retry.',
      technicalDetail: truncateToastTechnicalDetail(message),
    };
  }

  if (described.code === '42501' || /permission denied|row-level security/i.test(normalized)) {
    return {
      title: 'Upload failed',
      summary: 'Database permission denied.',
      hint: 'Confirm you are signed into the same Supabase target as the app (local vs cloud).',
      technicalDetail: truncateToastTechnicalDetail(message),
    };
  }

  const shortSummary = message.length > 120 ? `${message.slice(0, 117)}…` : message;

  if (described.hint) {
    return {
      title: 'Upload failed',
      summary: shortSummary,
      hint: described.hint,
      technicalDetail: truncateToastTechnicalDetail(message),
    };
  }

  return {
    title: 'Upload failed',
    summary: shortSummary,
    hint: UPLOAD_FAILURE_HINT_DEFAULT,
    technicalDetail: truncateToastTechnicalDetail(message),
  };
}

/** Structured error toast for upload failures. */
export function buildUploadFailureToast(
  rawError: string | null | undefined,
  codeRef: ToastCodeRef,
): ToastOptions {
  const parts = formatUploadFailureMessage(rawError);
  const title = parts.title ?? 'Upload failed';
  const body = parts.hint ? `${parts.summary} ${parts.hint}` : parts.summary;
  const detail =
    parts.technicalDetail && parts.technicalDetail !== body
      ? parts.technicalDetail
      : undefined;

  return {
    title,
    body,
    detail,
    codeRef,
    type: 'error',
    dedupe: true,
  };
}

/** Single-line toast text from structured upload failure (legacy / panel status). */
export function uploadFailureMessageToToastText(parts: UploadFailureMessage): string {
  const headline = parts.title ?? 'Upload failed';
  const body = parts.hint ? `${parts.summary} ${parts.hint}` : parts.summary;
  return `${headline}: ${body}`;
}
