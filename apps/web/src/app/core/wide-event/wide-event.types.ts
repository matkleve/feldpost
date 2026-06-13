import type { ToastCodeRef } from '../toast/toast.types';

/** Terminal status for a wide event. */
export type WideEventStatus = 'ok' | 'error' | 'timeout';

/** Why a success event was persisted. */
export type WideEventSampling = 'always' | 'sampled';

export const WIDE_EVENT_SAMPLE_RATE = 0.1;
export const WIDE_EVENT_SLOW_THRESHOLD_MS = 3000;
export const WIDE_EVENT_MAX_STACK_LENGTH = 1000;
export const WIDE_EVENT_MAX_MESSAGE_LENGTH = 2000;

export interface WideEventToastMeta {
  title?: string;
  body?: string;
  codeRef?: ToastCodeRef;
}

export interface WideEventHandle {
  /** Accumulate fields on the in-flight event. */
  set(fields: Record<string, unknown>): void;
  /** Capture toast metadata so the log record includes what the user saw. */
  setToast(toast: WideEventToastMeta): void;
  /** Finalize and (if sampled) persist the event. Must be called exactly once. */
  end(status: WideEventStatus, fields?: Record<string, unknown>): void;
  /** The 8-char trace ID for this operation (available immediately after start). */
  readonly traceId: string;
}

/** Jsonb payload written to app_events.event (excludes org_id/user_id columns). */
export interface AppEventPayload extends Record<string, unknown> {
  traceId: string;
  operation: string;
  timestamp: string;
  durationMs: number;
  status: WideEventStatus;
  sampling: WideEventSampling;
}
