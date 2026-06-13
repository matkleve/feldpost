# Wide-Event Logging Service

## What It Is

A structured logging service that emits one record per meaningful operation (upload, geocode, location resolve, etc.). Each record is a **wide event** — a single row containing request context, business fields, timing, and (on failure) error + toast details. Replaces scattered `console.*` calls with queryable, RLS-scoped data in a Postgres table.

The design follows the "canonical log line" / wide-event pattern: build up one object as the operation progresses, emit it once at the end.

## Design Decisions

- **Caller-owns model**: the catch block is the single source of truth. It decides what the wide event records and what the toast shows. `ToastService` has no knowledge of wide events. See [toast-authoring.supplement.md §10](../toast/toast-authoring.supplement.md#10-wide-event-integration).
- **Direct PostgREST insert**: events are written to a `app_events` table via `SupabaseService.client.from('app_events').insert()`. No Edge Function intermediary.
- **Sampling decided in `end()`**: all fields accumulate during the operation regardless of whether the event will be persisted. The sampling gate runs only when `end()` is called, so error/slow events are never dropped.

## Storage

Single `app_events` table. Migration name: `YYYYMMDDHHMMSS_create_app_events.sql`.

```sql
CREATE TABLE app_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL    DEFAULT now(),
  org_id     uuid        NOT NULL    REFERENCES organizations(id),
  user_id    uuid        NOT NULL    REFERENCES auth.users(id),
  event      jsonb       NOT NULL
);

CREATE INDEX idx_app_events_event_gin ON app_events USING gin (event);
CREATE INDEX idx_app_events_org_created ON app_events (org_id, created_at DESC);

-- RLS: users see only their org's events
ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org events"
  ON app_events FOR SELECT
  USING (org_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org events"
  ON app_events FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND org_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
```

`org_id` and `user_id` are top-level columns (not inside `event` jsonb) for cheap RLS evaluation and indexing. They are not duplicated inside the jsonb payload.

## Event Shape

The `event` jsonb column contains a common envelope plus operation-specific fields.

### Common envelope (all events)

| Field | Type | Description |
| --- | --- | --- |
| `traceId` | `string` | 8-char hex fragment from `crypto.randomUUID()` — short enough for users to quote in support requests |
| `operation` | `string` | Dot-namespaced operation name: `upload.storage`, `geocoding.forward`, `location.resolve` |
| `timestamp` | `string` | ISO 8601 start time |
| `durationMs` | `number` | Wall-clock ms from `start()` to `end()` |
| `status` | `'ok' \| 'error' \| 'timeout'` | Terminal status |
| `sampling` | `'always' \| 'sampled'` | Why this event was persisted (see §Sampling) |

### Error fields (when `status !== 'ok'`)

| Field | Type | Description |
| --- | --- | --- |
| `errorType` | `string` | Error constructor name or domain code (e.g. `TypeError`, `42501`) |
| `errorMessage` | `string` | Raw error message, truncated to 2000 chars |
| `errorStack` | `string?` | Stack trace, truncated to 1000 chars (see §PII). Angular/zone.js stacks are noisy; 1000 chars is enough for the throw site + 2–3 app frames. |
| `toastTitle` | `string?` | Title shown to the user (set via `setToast()`) |
| `toastBody` | `string?` | Body shown to the user |
| `toastCodeRef` | `string?` | `"file · fn"` format from `ToastCodeRef` |

### Business-specific fields (per operation)

Operations add their own fields via `set()`. Examples for Phase 2 operations:

| Operation | Fields |
| --- | --- |
| `upload.storage` | `fileName`, `fileSize`, `fileType`, `storagePath`, `bytesWritten` |
| `geocoding.forward` | `query`, `resultCount`, `providerStatus` |
| `location.resolve` | `mediaItemId`, `rpcName`, `addressLabel` |

## Service API

Code module: `apps/web/src/app/core/wide-event/`

```typescript
// wide-event.types.ts
export interface WideEventHandle {
  /** Accumulate fields on the in-flight event. */
  set(fields: Record<string, unknown>): void;
  /** Capture toast metadata so the log record includes what the user saw. */
  setToast(toast: { title?: string; body?: string; codeRef?: ToastCodeRef }): void;
  /** Finalize and (if sampled) persist the event. Must be called exactly once. */
  end(status: 'ok' | 'error' | 'timeout', fields?: Record<string, unknown>): void;
  /** The 8-char trace ID for this operation (available immediately after start). */
  readonly traceId: string;
}
```

```typescript
// wide-event.service.ts — facade
@Injectable({ providedIn: 'root' })
export class WideEventService {
  start(operation: string, fields?: Record<string, unknown>): WideEventHandle;
}
```

### Usage pattern

Concrete example rewriting `upload-storage.service.ts` (the densest `console.*` site):

```typescript
async upload(file: File, abortSignal?: AbortSignal): Promise<string | null> {
  const ev = this.wideEvent.start('upload.storage', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  });

  try {
    const user = this.auth.user();
    if (!user) {
      ev.end('error', { errorMessage: 'No authenticated user' });
      return null;
    }

    // ... profile fetch, path construction ...
    ev.set({ storagePath });

    const { error } = await this.supabase.client.storage
      .from('media')
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (error) {
      const toast = buildUploadFailureToast(error.message, codeRef);
      ev.setToast({ title: toast.title, body: toast.body, codeRef: toast.codeRef });
      ev.end('error', { errorMessage: error.message });
      this.toastService.show(toast);
      return null;
    }

    ev.end('ok');
    return storagePath;
  } catch (e) {
    ev.end('error', {
      errorType: e?.constructor?.name,
      errorMessage: e instanceof Error ? e.message : String(e),
      errorStack: e instanceof Error ? e.stack?.slice(0, 1000) : undefined,
    });
    throw e;
  }
}
```

Key properties:
- `try/finally` or `try/catch` guarantees `end()` is called exactly once
- Toast and wide event are populated from the same catch block but can diverge (e.g. toast gets a user-friendly message, event gets the raw stack)
- `traceId` is available immediately after `start()` and can optionally be appended to the toast `detail` field

## Toast Integration

See [toast-authoring.supplement.md §10](../toast/toast-authoring.supplement.md#10-wide-event-integration) for the full contract.

Summary: `ToastService` is never modified. The caller builds `ToastOptions` and calls `handle.setToast()` with the same title/body/codeRef before calling `handle.end()`. The wide-event record includes what the user saw.

### Trace ID in toasts

When showing an error toast for an instrumented operation, callers may append the trace ID to the toast `detail` field:

```typescript
const toast = buildUploadFailureToast(error.message, codeRef);
toast.detail = [toast.detail, `Trace: ${ev.traceId}`].filter(Boolean).join('\n');
ev.setToast({ title: toast.title, body: toast.body, codeRef: toast.codeRef });
ev.end('error', { errorMessage: error.message });
this.toastService.show(toast);
```

This is optional per call site. The trace ID is always in the `app_events` row regardless.

## Sampling

Constants in `wide-event.types.ts`:

```typescript
export const WIDE_EVENT_SAMPLE_RATE = 0.1;   // 10% of successes
export const WIDE_EVENT_SLOW_THRESHOLD_MS = 3000;
```

Decision matrix (evaluated in `end()`):

| Condition | Persisted? | `sampling` field |
| --- | --- | --- |
| `status === 'error'` | Always | `'always'` |
| `status === 'timeout'` | Always | `'always'` |
| `durationMs > SLOW_THRESHOLD_MS` | Always | `'always'` |
| `status === 'ok'` and `Math.random() < SAMPLE_RATE` | Yes | `'sampled'` |
| `status === 'ok'` and not sampled | No | — |

The `sampling` field lets downstream analysis distinguish "this row exists because it was an error" from "this row exists because it was randomly selected," which is necessary for estimating true success-rate denominators from a 10% sample.

## Cross-boundary Tracing (Edge Functions)

The three Phase 2 operations (`upload.storage`, `geocoding.forward`, `location.resolve`) are all client-side PostgREST/Storage calls. No Edge Function hop is involved in these paths.

If a future operation spans client → Edge Function (e.g. geocoding already proxies through `supabase/functions/geocode/`), the `traceId` should be passed as a `x-trace-id` request header so the Edge Function can include it in its own logs. This creates a join key across client and server log rows for the same logical operation. Implementation of header propagation is out of scope for Phase 2.

## PII

| Field | Treatment |
| --- | --- |
| `latitude` / `longitude` | Round to 3 decimal places (~100m precision) before storing in `event` jsonb |
| `email` | Never store in `event` jsonb. User identity is `user_id` column only. |
| `fileName` | Keep as-is. Not PII in a B2B construction context. |
| `errorStack` | Truncate to 1000 chars. Angular/zone.js stacks are noisy; 1000 chars covers the throw site + a few app frames. |
| `errorMessage` | Truncate to 2000 chars. May contain user-facing text but not credentials. |

## File Map (Phase 2)

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/wide-event/wide-event.service.ts` | Facade — `start()` factory |
| `apps/web/src/app/core/wide-event/wide-event.types.ts` | `WideEventHandle`, constants, event shape types |
| `apps/web/src/app/core/wide-event/wide-event.helpers.ts` | `truncateStack()`, `roundCoords()`, sampling logic |
| `apps/web/src/app/core/wide-event/wide-event.service.spec.ts` | Unit tests |
| `apps/web/src/app/core/wide-event/adapters/supabase-event-writer.ts` | PostgREST insert adapter |
| `apps/web/src/app/core/wide-event/README.md` | Module index |
| `supabase/migrations/YYYYMMDDHHMMSS_create_app_events.sql` | Table, indexes, RLS |

## Phase 2 Instrumentation Targets

| Operation | File | Why |
| --- | --- | --- |
| `upload.storage` | `core/upload/support/upload-storage.service.ts` | Densest `console.*` site (7 calls); most debugging-relevant for users |
| `geocoding.forward` | `core/geocoding/geocoding.service.ts` | Circuit breaker + retry = hard to debug without structured logs |
| `location.resolve` | `core/location-resolver/location-resolver.service.ts` | RPC failures are the top support question |

## Example Queries

```sql
-- All errors for an org in the last 24 hours
SELECT created_at, event->>'operation' AS op, event->>'errorMessage' AS err
FROM app_events
WHERE org_id = '<org-id>'
  AND created_at > now() - interval '24 hours'
  AND event->>'status' = 'error'
ORDER BY created_at DESC;

-- Slow geocoding calls (> 3s)
SELECT created_at, (event->>'durationMs')::int AS ms, event->>'query' AS query
FROM app_events
WHERE event->>'operation' = 'geocoding.forward'
  AND (event->>'durationMs')::int > 3000
ORDER BY ms DESC;

-- Correlate a trace ID from a user's toast
SELECT *
FROM app_events
WHERE event->>'traceId' = 'a1b2c3d4';

-- Estimate true success rate for uploads (accounting for 10% sampling)
SELECT
  COUNT(*) FILTER (WHERE event->>'status' = 'error') AS errors,
  COUNT(*) FILTER (WHERE event->>'status' = 'ok') * 10 AS estimated_successes
FROM app_events
WHERE event->>'operation' = 'upload.storage'
  AND created_at > now() - interval '7 days';
```

## Acceptance Criteria

- [ ] Full checklist deferred to Phase 2 implementation
