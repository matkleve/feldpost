import { Injectable, inject } from '@angular/core';
import { SupabaseEventWriter } from './adapters/supabase-event-writer';
import {
  decideWideEventPersistence,
  formatToastCodeRef,
  generateTraceId,
  sanitizeWideEventFields,
} from './wide-event.helpers';
import type {
  AppEventPayload,
  WideEventHandle,
  WideEventStatus,
  WideEventToastMeta,
} from './wide-event.types';

@Injectable({ providedIn: 'root' })
export class WideEventService {
  private readonly writer = inject(SupabaseEventWriter);

  start(operation: string, fields?: Record<string, unknown>): WideEventHandle {
    const writer = this.writer;
    const traceId = generateTraceId();
    const startedAt = Date.now();
    const startedAtIso = new Date(startedAt).toISOString();
    let ended = false;
    let toastMeta: WideEventToastMeta = {};
    let accumulated: Record<string, unknown> = fields ? sanitizeWideEventFields(fields) : {};

    const handle: WideEventHandle = {
      traceId,

      set(nextFields: Record<string, unknown>): void {
        accumulated = {
          ...accumulated,
          ...sanitizeWideEventFields(nextFields),
        };
      },

      setToast(toast: WideEventToastMeta): void {
        toastMeta = toast;
      },

      end(status: WideEventStatus, finalFields?: Record<string, unknown>): void {
        if (ended) return;
        ended = true;

        if (finalFields) {
          accumulated = {
            ...accumulated,
            ...sanitizeWideEventFields(finalFields),
          };
        }

        const durationMs = Date.now() - startedAt;
        const { persist, sampling } = decideWideEventPersistence(status, durationMs);
        if (!persist || !sampling) return;

        const payload: AppEventPayload = {
          ...accumulated,
          traceId,
          operation,
          timestamp: startedAtIso,
          durationMs,
          status,
          sampling,
        };

        if (toastMeta.title) payload['toastTitle'] = toastMeta.title;
        if (toastMeta.body) payload['toastBody'] = toastMeta.body;
        const codeRef = formatToastCodeRef(toastMeta.codeRef);
        if (codeRef) payload['toastCodeRef'] = codeRef;

        void writer.write(payload);
      },
    };

    return handle;
  }
}
