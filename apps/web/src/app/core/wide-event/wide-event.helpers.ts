import type { ToastCodeRef } from '../toast/toast.types';
import {
  WIDE_EVENT_MAX_MESSAGE_LENGTH,
  WIDE_EVENT_MAX_STACK_LENGTH,
  WIDE_EVENT_SAMPLE_RATE,
  WIDE_EVENT_SLOW_THRESHOLD_MS,
  type WideEventSampling,
  type WideEventStatus,
} from './wide-event.types';

/** 8-char hex fragment from crypto.randomUUID(). */
export function generateTraceId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  } catch {
    return Math.random().toString(16).slice(2, 10).padEnd(8, '0');
  }
}

export function truncateStack(stack: string | null | undefined, max = WIDE_EVENT_MAX_STACK_LENGTH): string | undefined {
  if (!stack) return undefined;
  return stack.length > max ? stack.slice(0, max) : stack;
}

export function truncateMessage(
  message: string | null | undefined,
  max = WIDE_EVENT_MAX_MESSAGE_LENGTH,
): string | undefined {
  if (message == null) return undefined;
  const text = String(message);
  return text.length > max ? text.slice(0, max) : text;
}

/** Round coordinates to ~100 m precision before storing in event jsonb. */
export function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function formatToastCodeRef(codeRef?: ToastCodeRef): string | undefined {
  if (!codeRef) return undefined;
  return `${codeRef.file} · ${codeRef.fn}`;
}

/** Apply PII rules to accumulated business fields. */
export function sanitizeWideEventFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...fields };

  if (typeof out['latitude'] === 'number') {
    out['latitude'] = roundCoord(out['latitude']);
  }
  if (typeof out['longitude'] === 'number') {
    out['longitude'] = roundCoord(out['longitude']);
  }

  delete out['email'];

  if (typeof out['errorMessage'] === 'string') {
    out['errorMessage'] = truncateMessage(out['errorMessage']);
  }
  if (typeof out['errorStack'] === 'string') {
    out['errorStack'] = truncateStack(out['errorStack']);
  }

  return out;
}

export interface WideEventPersistDecision {
  persist: boolean;
  sampling: WideEventSampling | null;
}

export function decideWideEventPersistence(
  status: WideEventStatus,
  durationMs: number,
  sampleRate = WIDE_EVENT_SAMPLE_RATE,
  slowThresholdMs = WIDE_EVENT_SLOW_THRESHOLD_MS,
  randomValue = Math.random(),
): WideEventPersistDecision {
  if (status === 'error' || status === 'timeout') {
    return { persist: true, sampling: 'always' };
  }

  if (durationMs > slowThresholdMs) {
    return { persist: true, sampling: 'always' };
  }

  if (randomValue < sampleRate) {
    return { persist: true, sampling: 'sampled' };
  }

  return { persist: false, sampling: null };
}
