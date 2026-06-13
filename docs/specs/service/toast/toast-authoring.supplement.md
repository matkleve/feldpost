# Toast Authoring Guide

Supplement to [`toast-system.md`](toast-system.md).
Covers **when** to show a toast, **what** to write, **how** to wire it, and what to do instead when toast is the wrong choice.

---

## 1. Toast vs. Inline vs. Silent

| Scenario | Right choice | Reason |
| --- | --- | --- |
| System dependency permanently unavailable (geocode down, edge fn boot fail) | **Toast once** (`dedupe: true`) | User needs to know; affects the whole session |
| Background action completed (upload succeeded, media deleted) | **Toast** | User triggered it, may have navigated away |
| User typed and got zero search results | **Inline empty state** | Contextual; toast would be disconnected from the input |
| Internet search unavailable while DB results still show | **Inline note in dropdown** (+ toast once if breaker just opened) | Scoped to the search surface |
| Auth session expired for geocode | **Toast** (`warning`, `dedupe: true`) | Silent cooldown is confusing |
| DB query fails silently (geocoder still works) | **Silent + console.warn** | Per spec `address-resolver.md` §9 |
| Action that can be undone (media delete) | **Toast with `action` (Undo)** | User needs a recovery path |
| Clipboard copy succeeded | **Short success toast** | Confirms invisible action |
| Form validation error | **Inline field error** | Never toast for things the user must fix in-place |
| RLS / auth errors during upload | **Toast** (`error`, structured) | Technical detail hidden behind "Show details" |

**Decision rule:** if the user needs to know but the notification has nowhere to live in the UI → toast. If it can sit next to what caused it → inline.

---

## 2. Structured Copy Template

Always prefer the three-field structured form over a flat `message` string.

```typescript
toastService.show({
  type: 'error',           // 'success' | 'warning' | 'info' | 'error'
  title: 'Upload failed',  // Required. One line. What happened. No punctuation at end.
  body:  'Storage bucket "media" is missing. Create it (or run migrations), then retry.',
                           // Required when title is set. What the user can do.
  detail: rawErrorMessage, // Optional. Raw backend message. Always truncated via truncateToastTechnicalDetail().
  codeRef: { file: 'upload-notification.service.ts', fn: 'handleUploadFailure' },
                           // Optional. Shown as muted debug line. Include for error + warning.
  dedupe: true,            // Required for system-level failures that may fire repeatedly.
});
```

### Title rules

- **Max ~40 characters** — must fit one line at 24rem width
- **Verb phrase or noun phrase:** "Upload failed", "Address copied", "Internet search unavailable"
- **No full stop.** No exclamation marks.
- **No technical terms** in the title. Put them in `detail`.
- **English as fallback** — always `t('key', 'English fallback')` even in components that currently use hardcoded text

### Body rules

- **Max 2 sentences.** What happened (1 sentence) + what to do (1 sentence).
- **User action first** when recovery is possible: "Sign in again, then retry the upload."
- **No raw error codes** in body. Put them in `detail`.
- Permitted to be omitted for simple success/info toasts where title is self-explanatory.

### Detail rules

- **Always use `truncateToastTechnicalDetail(rawError)`** — max 1200 chars, collapses whitespace.
- Only set when `detail !== body` (avoid duplicating the same text).
- Shown behind an expandable "Show details" control — user opts in.

### codeRef rules

- Include for all `error` and `warning` toasts.
- `file`: filename only, no path prefix. `fn`: function or method name.
- Omit for success / info toasts.

---

## 3. Severity Decision Table

| Type | Use when | Default duration | `dedupe` |
| --- | --- | --- | --- |
| `success` | User action completed as expected | 4s | Optional |
| `info` | Neutral system feedback (clipboard copy, nav action) | 4s | Optional |
| `warning` | Degraded state; app still works but something is limited | 8s recommended | **Yes** for system-level |
| `error` | Action failed; user may need to act | 6s | **Yes** for repeated failures |

**System-level failures** (geocode down, auth expired, infra errors) → `warning` or `error` + `dedupe: true` + longer `duration` (8000).

**Action failures** (upload, save, delete) → `error`, no `dedupe` (each failure is distinct).

---

## 4. i18n Requirements

Every user-visible toast string must go through the i18n pipeline. No exceptions.

```typescript
// Correct
title: this.i18n.t('geocoding.toast.unavailable.title', 'Internet address search unavailable'),
body:  this.i18n.t('geocoding.toast.unavailable.body', 'The geocoding service is not reachable. Try again later.'),

// Wrong — hardcoded string
title: 'Adresse kopiert.',   // ← blocked; also in wrong language
```

**Steps when adding a new toast:**

1. Pick a key following the pattern `<domain>.<context>.<level>.<field>`:
   - `geocoding.toast.unavailable.title`
   - `upload.toast.storageMissing.body`
   - `map.toast.addressCopied.message`
2. Add `en` / `de` / `it` columns to `docs/i18n/translation-workbench.csv` with a useful `context` for translators.
3. Run `node scripts/import-i18n-csv-to-sql.mjs` and commit `supabase/seed_i18n.sql`.
4. Use `t(key, 'English fallback')` — the fallback is the canonical source string.

**Technical detail and codeRef are never translated** — they are dev-facing.

---

## 5. `dedupe` and Rate-Limiting Rules

| Rule | Rationale |
| --- | --- |
| Set `dedupe: true` for any toast that can fire on every user keystroke or every polling cycle | Prevents spam (geocode blocked → every search fires) |
| Set `dedupe: true` for system-level outage toasts | One "geocode unavailable" is informative; twenty is noise |
| Do **not** set `dedupe: true` for per-item action errors | Each upload failure is a distinct event the user needs to see |
| Set `duration: 0` only for toasts that require manual action | E.g., undo-delete where timing matters |

---

## 6. Helper Pattern (canonical)

Use a dedicated helper for any domain that generates structured error toasts. Do not inline complex error mapping in components.

**Reference implementation:** `apps/web/src/app/core/upload/support/upload-error-messages.util.ts`

```typescript
// Pattern to follow for new domains
export function buildDomainFailureToast(
  rawError: string | null | undefined,
  codeRef: ToastCodeRef,
): ToastOptions {
  const parts = formatDomainFailureMessage(rawError);  // maps raw → { title, summary, hint, technicalDetail }
  return {
    type: 'error',
    title: parts.title ?? 'Action failed',
    body: parts.hint ? `${parts.summary} ${parts.hint}` : parts.summary,
    detail: parts.technicalDetail,
    codeRef,
  };
}
```

Existing helpers:
- Upload errors: `buildUploadFailureToast()` in `upload-error-messages.util.ts`
- Location update errors: `formatLocationUpdateFailureMessage()` in `media-location-update.helpers.ts`
- Geocode outage: inline in `GeocodingService.notifyGeocodeUnavailableToast()`

---

## 7. Event Inventory

| Event | File | Type | Form | i18n? | Status |
| --- | --- | --- | --- | --- | --- |
| Geocode infra unavailable (503) | `geocoding.service.ts` | `warning` | Structured | ✅ | Shipped |
| Upload pipeline failure | `upload-notification.service.ts` | `error` | Structured + codeRef | ✅ partial | Shipped |
| Location update failure | `media-location-update.helpers.ts` | `error` | Structured + codeRef | ❌ | Shipped |
| Media deleted (undo) | `media-delete-undo.service.ts` | `success` | Structured + action | ✅ partial | Shipped |
| Copy address (map context menu) | `map-shell.component.ts` | `success` | Structured `title` + i18n | ✅ | Shipped |
| Copy GPS (map context menu) | `map-shell.component.ts` | `success` | Structured `title` + i18n | ✅ | Shipped |
| Media marker created | `map-shell.component.ts` | `success` | Structured `title` + i18n | ✅ | Shipped |
| Address not resolvable (copy) | `map-shell.component.ts` | `warning` | Structured `title` + `codeRef` | ✅ | Shipped |
| GPS fix failed | `gps-button.component.ts` | `error` | Structured `title`/`body`/`detail`/`codeRef` | ✅ | Shipped |
| Project create / delete | `projects-page.component.ts` | `success`/`error` | Structured `title` + `codeRef` (errors) | ✅ partial | Shipped |
| Workspace footer export errors | `workspace-pane-footer.component.ts` | `error` | Structured `title`/`detail`/`codeRef` | ✅ partial | Shipped |

---

## 8. Known Copy Debt

**Resolved (2026-06-13):** `map-shell.component.ts` hardcoded German clipboard/marker toasts — migrated to `map.shell.toast.*` keys with structured `title` form.

**Remaining:**

| Location | Issue | Priority |
| --- | --- | --- |
| `account.component.ts` | Uses `tr()` with German source strings + flat `message` | Medium — separate account i18n migration |
| `media-detail-view.component.ts` | ~10 warning toasts with flat `message: result.error` | Medium — needs domain error formatter |
| `workspace-bulk-action.service.ts` | Raw `errorMessage` as flat `message` | Medium |
| `workspace-selected-items-grid.component.ts` | Flat `message` with `t()` — works, prefer `title` | Low |
| Upload panel services | Mix of structured helpers + flat `message` success toasts | Low |

---

## 9. Inline vs. Toast Quick Reference Card

```
User does something → did it work?
  ├─ Yes, visible result in UI   → no toast needed
  ├─ Yes, invisible action       → short success toast (info or success, 4s)
  ├─ Partial / degraded          → inline note near the affected surface
  │                                + warning toast once if session-wide (dedupe)
  └─ Failed
       ├─ User can fix it here   → inline error (form field, dropdown empty state)
       └─ User needs to know     → error toast
            ├─ Has recovery path → structured title + body + optional action
            └─ Technical detail  → structured title + body + detail (expandable)
```
