# Upload Flow & Services Audit

**Scope:** Web upload subsystem (`apps/web/src/app/core/upload`, `features/upload`), the
Supabase storage / edge functions, the thumbnail worker, and the DB triggers wiring them
together.
**Type:** Read-only review. No code changed.
**Date:** 2026-06-26

---

## 1. Executive summary

The upload pipeline is functionally rich but structurally over-fragmented and carries a
meaningful amount of dead weight. The biggest themes:

- **Over-modularization** driven by a strict `max-lines` lint cap, producing ~88 source
  files in `core/upload` (46 `*.util.ts`, 25 services, 17 files ≤30 lines). The manager is a
  443-line pure-delegation facade.
- **Dead code / dead cost** shipped to production: an empty helper file, a no-op
  `beforeunload` handler (a documented feature that does nothing), a deprecated edge function
  kept "for reference", deprecated exported wrappers, mock fixtures, and a pile of one-off
  codemod scripts committed under `apps/web/scripts/`.
- **Redundant runtime work**: a `profiles.organization_id` round-trip per uploaded file,
  dual-bucket probing per asset, and duplicated storage-upload logic in two services.
- **Quality smells**: corrupted (mojibake) comment banners across 11 files, a stale doc
  comment that contradicts the code, and a hardcoded worker IP in a DB trigger.

None of these are correctness-critical for the happy path, but together they inflate bundle
size, slow batch uploads, and make the subsystem hard to navigate.

---

## 2. Structural / architectural issues

### 2.1 Over-fragmentation forced by the line-count lint
`apps/web/eslint.config.mjs` enforces:
```
'max-lines': ['warn', { max: 200 }] (and ['error', { max: 300 }] in some scopes)
'max-lines-per-function': ['warn', { max: 60 }]
```
Consequence in `core/upload`:
- 88 non-spec `.ts` files; **46** are `*.util.ts`, **25** are services, **17** are ≤30 lines.
- `upload-manager.service.ts` (443 lines) is almost entirely delegation: every public method
  forwards to a `*-actions.util` / `*-submit.util` function, and state is just re-exported
  from sub-services.

This is mechanical splitting, not domain boundaries. It increases import churn, makes call
chains 3–5 hops deep (`manager → facade-deps → actions.util → pipeline.service → *.util`),
and raises the cognitive cost of any change. **Recommendation:** relax the cap (or scope it
to components only) and re-consolidate cohesive util clusters (e.g. the `manager/*.util.ts`
family, the `pipelines/new/*.util.ts` family) back into their owning service.

### 2.2 Duplicated "upload to storage" implementations
Two independent implementations of the same operation (org lookup → build
`{orgId}/{userId}/{uuid}.{ext}` path → `storage.from('media').upload`):
- `support/upload-file-persist.util.ts` → `uploadFileToStorage()` (used by the `new` path)
- `support/upload-storage.service.ts` → `UploadStorageService.upload()` (used by replace/attach)

They duplicate the profile query, path construction, abort handling, and error mapping.
**Recommendation:** collapse to one storage helper.

### 2.3 Dual-bucket fallback duplicated in 3 places
The `['media', 'images']` sequential-probe pattern is copy-pasted in:
- `core/upload/upload.service.ts` (`getSignedUrl`, `downloadFile`)
- `core/media-download/adapters/edge-export-orchestrator.adapter.ts`
- `core/media-download/adapters/supabase-storage.adapter.ts`

No shared helper. `images` is the legacy bucket; if it is being retired this should be a
single configurable list in one place.

---

## 3. Dead code / dead cost

| # | Item | Location | Notes |
|---|------|----------|-------|
| 3.1 | **Empty helper file** | `core/upload/upload.helpers.ts` | Body is just `export {};`. Zero importers. Delete. |
| 3.2 | **No-op `beforeunload` handler** | `upload-manager.service.ts:237` | `beforeUnloadHandler = (): void => {}`. The class doc (line 18) promises a "beforeunload warning when uploads are in progress" — it is never implemented. A permanent empty window listener is registered for the app lifetime and the `isBusy`/`hasRunning` plumbing around it does nothing useful. Either implement (`event.preventDefault()` when busy) or remove the dead infra. |
| 3.3 | **Deprecated edge function still deployed** | `supabase/functions/generate-media-preview/index.ts` | Header: `@deprecated Superseded by worker/thumbnail … Kept for reference only`. A full edge function (Gotenberg/pdf.js rasterization) sitting unused. Remove as the "separate cleanup task" it references. |
| 3.4 | **Deprecated exported wrapper** | `pipelines/new/upload-new-run-upload-phase.util.ts:148` `resolveUploadLocationInputs` | Only referenced by its own `.spec`. Pure pass-through to `resolveUploadPhaseInputs`. |
| 3.5 | **One-off codemod scripts committed** | `apps/web/scripts/` | `split-upload-panel*.cjs`, `split-upload-panel.js`, `move-upload.cjs`, `move-upload2.cjs`, `fix-split-phase1.cjs`, `update-component-phase{1,2}.cjs`, `split-projects-*.cjs`, `add-progress-binding.cjs`. Throwaway migration tooling — belongs in history, not the tree. |
| 3.6 | **Mock fixtures / dev flags in prod bundle** | `features/upload/upload-resolver-tray/upload-resolver-tray.mock*.ts`, `upload-dev-flags.ts` | `UPLOAD_DEV_FLAGS` (e.g. `dockAlwaysVisible: false`) and the mock orchestrator ship in the build; the always-on branches are dead-but-bundled. Gate behind a build-time flag or move to test files. |

---

## 4. Efficiency / runtime cost

### 4.1 Per-file organization lookup (N queries per batch)
Both `persistUploadFile` (`upload-file-persist.util.ts:67`) and `UploadStorageService.upload`
(`upload-storage.service.ts:48`) run:
```sql
select organization_id from profiles where id = <user>
```
**once per file.** A 200-file folder import issues ~200 identical round-trips before any
bytes move. `organization_id` is stable per session — and the codebase already proves it is
derivable without a query (`organizationIdFromStoragePath` in `upload-db-postwrite.util.ts`).
**Recommendation:** resolve org once (cache on `AuthService` or per batch) and thread it in.

### 4.2 Dual-bucket probing per asset
`getSignedUrl` / `downloadFile` issue up to **2 sequential** storage calls per asset whenever
the first bucket misses. For any asset still in the legacy `images` bucket this doubles
latency on every signed-URL/download. Track the bucket on the row instead of probing.

### 4.3 Possible repeated EXIF parsing
EXIF is parsed in the hashing path and again in `insertUploadMediaRow` when `parsedExif`
isn't passed through (`upload-file-persist.util.ts:160`). The `new` pipeline does thread
`parsedExif`, but the contract is fragile — worth asserting a single parse per file so the
fallback `await deps.parseExif(file)` can't silently double the work.

### 4.4 Synchronous-ish trigger HTTP on every insert
`notify_thumbnail_worker` (migration `20260613132632`) fires
`supabase_functions.http_request(...)` with a 5s timeout **inside the `media_items` AFTER
INSERT** trigger for every eligible row. On bulk inserts this serializes an outbound HTTP
attempt per row on the write path. Consider a queue/batch fan-out instead of per-row HTTP.

---

## 5. Quality / correctness smells

- **5.1 Mojibake comment banners.** 11 files in `core/upload` contain corrupted UTF-8
  (e.g. `upload.service.ts:33`, `upload-manager.service.ts:121/179/235` — the box-drawing
  banners render as `ÃƒÂ¢Ã¢â‚¬Â…`). Cosmetic but pervasive; almost certainly a codemod/encoding
  accident. A single normalize pass would clean it.
- **5.2 Stale doc contradicts code.** `UploadStorageService` header (lines 7–9) documents the
  storage path as `"/images/{date}/{uuid}.{ext}"`, but the code writes
  `` `${profile.organization_id}/${user.id}/${uuid}.${ext}` `` to the `media` bucket
  (`upload-storage.service.ts:67`). Misleading.
- **5.3 Hardcoded worker endpoint in DB.** The trigger posts to a literal
  `https://178-105-242-74.sslip.io/generate` (IP-based sslip.io host) baked into the
  migration. No config indirection — rotating the worker host means a new migration. Move to
  a GUC / Vault setting.

---

## 6. Suggested priority order

1. **Quick wins (low risk, immediate cleanup):** delete `upload.helpers.ts` (3.1), remove the
   deprecated edge function (3.3) and wrapper (3.4), purge `apps/web/scripts/` codemods (3.5),
   normalize mojibake (5.1), fix the stale doc (5.2).
2. **Decide the `beforeunload` feature** (3.2) — implement the warning or delete the plumbing.
3. **Cache org lookup** (4.1) — biggest runtime win for batch uploads.
4. **De-dupe storage upload + bucket-probe helpers** (2.2, 2.3, 4.2).
5. **Revisit the line-count lint** (2.1) and consolidate the util sprawl.
6. **Move the worker URL to config** and reconsider per-row trigger HTTP (4.4, 5.3).

> Note: items 2.1 and the consolidation work are larger refactors; everything in §6.1 is
> safely separable and can land independently.
</content>
</invoke>
