# 07 — Failure modes and robustness (Phase 7)

**Commit:** `8e4b1e09` · **Method:** static reading. Nothing below was observed failing — the unit suite does not compile and there is no backend (`00-baseline.md` §§ 4, 9). "Automated test exists?" reports tests **as written**; none can execute today.

Severity uses plan § 5. **Residue** = what is left behind in storage, the database or memory after the failure.

---

## 1. Storage and database

| # | Failure | Where (`path:line`) | Current handling | User-visible result | Residue | Test? | Severity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F1.1 | **`media_items` insert fails after the storage write succeeded** | `apps/web/src/app/core/upload/support/upload-file-persist.util.ts:198-200` | returns `{ error: dbError }`; **no storage removal** on this branch, although `:135-138` and `:202-209` both clean up on cancel | job → `error`, toast from `formatUploadFailureMessage` | **orphaned object in the `media` bucket**, no row references it | none | **blocker** — and `upload-manager.md:277` ticks the opposite as satisfied (`05-spec-drift.md` C1) |
| F1.2 | **Cancel after the row was saved** | `apps/web/src/app/core/upload/manager/upload-manager-actions.util.ts:85` → `apps/web/src/app/core/upload/upload-manager.service.ts:165-167` | `.remove([storagePath])` fired and the promise discarded; **the row is not deleted** | row shows as cancelled in the panel; `/media` may show a broken item | **`media_items` row with a `storage_path` pointing at nothing** | none | **high** |
| F1.3 | **Logout mid-flight** | `apps/web/src/app/core/upload/manager/upload-manager-cancel-active.util.ts:12-21` → `apps/web/src/app/core/upload/manager/upload-manager-pipeline-host.service.ts:148-150` | same shape as F1.2, un-awaited, no row delete | jobs marked `error` / "Cancelled" | same as F1.2, for every in-flight job | none (0 tests mention logout) | **high** |
| F1.4 | **Attach-pipeline cancel** | `apps/web/src/app/core/upload/support/upload-cancelled-storage-cleanup.util.ts:13-38`, called at `core/upload/pipelines/attach/upload-attach-pipeline.service.ts:75,205` | awaits the removal but **never deletes the row** | — | same as F1.2 | none (0 tests mention attach) | high |
| F1.5 | **Upload timeout (180 s) while the request is still in flight** | `apps/web/src/app/core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:299-318`, constant `core/upload/pipelines/new/upload-new-pipeline.service.ts:63` | `Promise.race` rejects; **the underlying `persistUploadFile` is never aborted** — the abort signal is passed to the upload (`upload-file-persist.util.ts:128`) but the timeout path does not trigger it | job → `error` "Upload timed out. Please retry." | the original request can still complete afterwards, writing **both** a storage object and a `media_items` row for a job the user sees as failed | 1 test title mentions timeout, and it is about a confirm-button revert | **high** |
| F1.6 | Storage upload rejected (bucket missing, RLS, quota) | `apps/web/src/app/core/upload/support/upload-file-persist.util.ts:123-133` | mapped through `mapUploadStorageError` (`core/upload/support/upload.service.util.ts:157-170`), which special-cases "bucket not found" | job → `error` with a specific message | none | none | low |
| F1.7 | Network drop mid-upload | same | the storage client rejects; funnels to `handleUploadPipelineError` (`core/upload/manager/upload-manager-error.util.ts:18-37`) → `failJob` | job → `error`, Retry available | a partial multipart object is possible — **`unverified`**, depends on the Supabase storage client | none | medium |
| F1.8 | **Dedup hash insert fails after a successful save** | `apps/web/src/app/core/upload/support/upload-db-postwrite.util.ts:32-38` — the insert ends in a bare `.then()` with **no rejection handler** | nothing; a rejection becomes an unhandled promise rejection | **none** | no `dedup_hashes` row → the next identical upload is not deduped, silently defeating the resume-safety goal of `dedup.md` § Goals #1 | none | medium |
| F1.9 | Dedup row written but the upload later fails ("poisoned index") | ordering at `core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:232-246` | the hash is inserted **after** both cancel checks and only when `mediaId` exists | — | **not reachable on the new path** — plan § 4 Phase 7 assumes this risk; the ordering already prevents it | none | **refuted** |
| F1.10 | RLS denies the `media_items` update in the attach pipeline | `apps/web/src/app/core/upload/support/upload-db-postwrite.util.ts:48-62` (`verifyStoragePathWrite`) | reads the row back and logs `'✗ WRITE DID NOT PERSIST — RLS likely blocked the update'` to the console — **the job is not failed** | job completes; the record is unchanged | a job reported complete whose write never landed | none | **high** |

---

## 2. Geocoding and enrichment

| # | Failure | Where | Current handling | User-visible result | Residue | Test? | Severity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F2.1 | Forward geocode returns no hit | `apps/web/src/app/core/upload/support/upload-enrichment.service.ts:59-62` | `markLocationUnresolvable(mediaId)` → `resolve_media_location(p_location_status:'unresolvable')` | in `required` mode the job goes to `missing_data` (`core/upload/pipelines/new/upload-new-post-save.util.ts:245-266`); otherwise it completes without coords | none | `upload-location-geocode-outcome.util.spec.ts` (6) | low |
| F2.2 | `resolve_media_location` RPC returns an error | `…/upload-enrichment.service.ts:75-79` | marks unresolvable and returns `undefined` — **the RPC error itself is swallowed**, not logged | as F2.1 | none | none | medium |
| F2.3 | Geocoder throws (Photon/Nominatim down, edge function 5xx) | `…/upload-enrichment.service.ts:83-86` (`catch { markLocationUnresolvable }`) and `core/upload/address-resolution/upload-address-resolve.util.ts:45-51` | both guarded; the second also logs | outage is **indistinguishable from "address not found"** | none | none | medium — a fleet-wide geocoder outage silently reclassifies every upload as unresolvable |
| F2.4 | **`resolving_address` does nothing** | `apps/web/src/app/core/upload/support/upload-enrichment.service.ts:43-47` — `enrichWithReverseGeocode` is an empty method (`void mediaId;`) | `core/upload/pipelines/new/upload-new-post-save.util.ts:143-145` sets `setPhase('resolving_address')` and awaits it | the user sees "Resolving address…" for a step that performs no work; the real reverse geocode is the un-awaited call at `core/upload/support/upload-file-persist.util.ts:211-220` | none | none | medium — a **cosmetic phase**, and the spec's post-save enrichment FSM (`routing.md` § Post-save) describes work that happens somewhere else entirely |
| F2.5 | `markLocationUnresolvable` itself fails inside the outer `catch` | `core/upload/address-resolution/upload-address-resolve.util.ts:46` | the call is `await`ed inside a `catch` with no inner guard | none | unhandled rejection from a fire-and-forget call | none | low |
| F2.6 | Auth `401` mid-enrichment | — | `upload-manager.md:274-275` specifies one silent refresh + retry, then a controlled sign-out. **Neither is implemented** in `upload-enrichment.service.ts`; a `401` is caught and treated as "unresolvable" | address silently missing | none | none | medium — both ACs are correctly left **unchecked** in the spec, so this is a known gap, not drift |

---

## 3. Fire-and-forget calls (answers plan § 3 Q9)

| Call | Site | Guarded? | Consequence when it fails |
| --- | --- | --- | --- |
| `resolveUploadAddress(...)` | `apps/web/src/app/core/upload/support/upload-file-persist.util.ts:211-220` | **yes** — full `try/catch` at `core/upload/address-resolution/upload-address-resolve.util.ts:20-51` | address stays unresolved; row marked `unresolvable` |
| `insertDedupHashFireAndForget(...)` | `apps/web/src/app/core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:237-246` | **no** — bare `.then()` at `core/upload/support/upload-db-postwrite.util.ts:38` | F1.8 |
| `void persistMismatch(mediaId, distance)` | `apps/web/src/app/core/upload/pipelines/new/upload-new-post-save.util.ts:240`; body at `core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:124-129` | **no** — a bare `await supabaseClient.from('media_items').update(...)` | `location_mismatch_meters` never persisted; the detail view cannot show the mismatch (`routing.md` § Mismatch audit) |
| `void persistThumbnail(finalJob)` | `apps/web/src/app/core/upload/pipelines/new/upload-new-post-save.util.ts:292`; body at `core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:131-143` | **no** | no persisted thumbnail; grid falls back to the full image |
| `void deps.createDeferredPreviewUrl(job.file).then(...)` | `apps/web/src/app/core/upload/manager/upload-manager-actions.util.ts:237-250` | **no** | PDF preview missing |
| `this.supabase.client.storage.from('media').remove([...])` | `apps/web/src/app/core/upload/upload-manager.service.ts:165-167`; `core/upload/manager/upload-manager-pipeline-host.service.ts:148-150` | **no** | F1.2 / F1.3 — and the caller cannot know the delete failed |

**Answer to Q9:** on the happy path, **five of six** post-save side effects fail silently. None of them surfaces to the user, none is retried, and one (`insertDedupHashFireAndForget`) defeats a stated product goal when it fails.

---

## 4. Concurrency

| # | Failure | Where | Handling | Residue | Test? | Severity |
| --- | --- | --- | --- | --- | --- | --- |
| F4.1 | Two jobs finalize the same tray group | `core/upload/location/upload-location-source-conflict.service.ts:45` (`sourceConflictInflight`) + `:43` (`resolvedSourceChoices`) | a singleflight map keyed by `${batchId}|${queryKey}` — matches `routing.md` Phase 3 "concurrent `finalizePlacement` singleflight shares one reverse-geocode" | none | 21 test titles mention "source" | **satisfied** |
| F4.2 | Five services can open a disambiguation group | 8 call sites (`01-structure.md` § 3.2) | idempotency rests on the store, not on a single writer | a second open group per `(batchId, queryKey)` is prevented only if every caller consults the store first — **`unverified`** | none | medium |
| F4.3 | Requeue-at-front vs FIFO | `core/upload/manager/upload-manager-queue.util.ts:14-20` | plain array order; nothing reorders | a conflict-resolved job waits behind every earlier queued job | `upload-manager-queue.util.spec.ts` (2) | medium — three doc sites claim "front" (`03-branch-matrix.md` C3) |
| F4.4 | 3-slot limit while jobs sit in paused phases | `core/upload/support/upload-queue.service.ts:10` | every pause path calls `queue.markDone` first (`…/upload-new-prepare-route.util.ts:342`, `…/upload-new-pre-resolve.util.ts:207,211,230,249,257`) | slots are released correctly | 1 test title | **satisfied** |
| F4.5 | **`heicConversionByJobId` is module-level mutable state** | `apps/web/src/app/core/upload/pipelines/new/upload-new-prepare-route.util.ts:22` | a module singleton keyed by `jobId`; entries deleted in `finally` (`:56-58`, `:266-271`) | after a **failed** conversion the entry is gone, so `awaitHeicConversionForUpload` (`:67-80`) starts a **second full `heic2any` decode** that is guaranteed to fail again | none | low (waste, not corruption) |
| F4.6 | **`resolvedSourceChoices` is never cleared unless `clearForBatch` is called** | `core/upload/location/upload-location-source-conflict.service.ts:43,52-58` | `clearForBatch(batchId)` exists | a root-singleton `Map<batchId, Map<queryKey,string>>` grows for the session unless every batch is explicitly cleared — **`unverified`**, needs a caller trace of `clearForBatch` | none | low |

---

## 5. Angular-specific

| # | Concern | Where | Finding | Severity |
| --- | --- | --- | --- | --- |
| F5.1 | **`effect()` writing signals** | `apps/web/src/app/core/upload/upload-manager.service.ts:239-256` → `core/upload/manager/upload-manager-effects.util.ts:15-28` | Effect 1 reads `auth.user()` and, when it becomes null, calls `cancelAllActive()` which writes the `_jobs` signal (`core/upload/support/upload-job-state.service.ts:138-140`). Effect 2 reads `isBusy()` — a computed **derived from `_jobs`** — and only calls `window.addEventListener`. So there is no write-inside-read cycle between them, but effect 1 is a signal write inside an effect with no `allowSignalWrites`/untracked marker. Angular 21 permits it; it is a re-entrancy hazard if effect 1 ever grows to read a job signal. | medium (latent) |
| F5.2 | Subscription teardown | `apps/web/src/app/features/upload/upload-panel/upload-panel-lifecycle.service.ts:67-68,81-82` | both use `takeUntilDestroyed(destroyRef)` scoped to the hosting panel; the comment at `:64-65` records the NG0953 incident this fixed | **satisfied** |
| F5.3 | Root-singleton subscription | `apps/web/src/app/core/route-session-cache/route-session-cache.service.ts:40-59` | `takeUntilDestroyed(destroyRef)` on a `providedIn:'root'` service — lives for the app's lifetime, which is intended | satisfied |
| F5.4 | **Object-URL retention** | `apps/web/src/app/core/media-preview/media-preview.service.ts:11` creates `URL.createObjectURL(file)` on the **original File** for every image job | On completion the URL is handed to `MediaDownloadService.setLocalUrl` (`core/upload/pipelines/new/upload-new-post-save.util.ts:287-289`), and both the panel's dismiss paths deliberately skip revoking for `phase === 'complete'` (`core/upload/support/upload-job-state.service.ts:149`, `core/upload/manager/upload-manager-actions.util.ts:68`). The download service's `revokeLocalUrl` exists at `core/media-download/media-download.service.ts:382` and `core/media-download/adapters/signed-url-cache.adapter.ts:171` and is **called from nowhere**; the cache has no size cap or eviction. | **high** — a 500-file folder import pins 500 full-resolution blobs for the tab's lifetime. This resolves `03-branch-matrix.md` Y2 with a confirmed leak. |
| F5.5 | `heic2any` on large HEIC sets | `core/upload/support/upload.service.util.ts:133-155`; scheduled per job at `…/upload-new-prepare-route.util.ts:236-271` | conversion is started for **every** HEIC job at prepare time, in parallel, with no concurrency cap of its own — the 3-slot queue limits how many *pipelines* run, but a job held at a tray keeps its conversion promise alive. Peak memory is `min(3, n)` decoded bitmaps plus every held job's. | medium — **`unverified`**, needs a browser memory profile |
| F5.6 | Signal write during change detection | — | no `setPhase` call was found inside a template expression or a `computed()`; all writes originate in service methods | satisfied |

---

## 6. Browser support

| # | Case | Where | Handling | Severity |
| --- | --- | --- | --- | --- |
| F6.1 | File System Access unavailable | `apps/web/src/app/core/folder-scan/folder-scan.service.ts:97-99` (`isSupported`) → facade `core/upload/upload-manager.service.ts:189` | falls back to `<input webkitdirectory>` and `submitWebkitFolder` | satisfied (path matrix `unverified`, `03-branch-matrix.md` I3) |
| F6.2 | **Folder drag & drop** | `apps/web/src/app/features/upload/upload-panel/upload-panel-input-handlers.ts:50` | reads only `event.dataTransfer.files`; `webkitGetAsEntry` appears **nowhere** in `apps/web/src` | **medium** — dropping a folder silently submits nothing, on every browser |
| F6.3 | HEIC in Safari/Firefox | `core/upload/support/upload.service.util.ts:128-155` | `heic2any` is a dynamic import (`:139`), so the cost is only paid for HEIC files; failure is a terminal error with a user message | satisfied |
| F6.4 | `crypto.subtle` unavailable (insecure context) | `apps/web/src/app/core/upload/support/content-hash.util.ts:84` | **unguarded** — `crypto.subtle.digest` throws on a non-HTTPS origin; the rejection propagates out of `runUploadDedupCheck` into `handleUploadPipelineError` → the job fails with a raw `TypeError` message | low (dev-only in practice) |

---

## 7. Batch-level failures

| # | Failure | Where | Handling | Residue | Severity |
| --- | --- | --- | --- | --- | --- |
| F7.1 | **`classifyBatch` rejects** | `apps/web/src/app/core/upload/manager/upload-manager-submit.util.ts:67-69` (awaited, unguarded) between `addJobs` (`:65`) and `drainQueue` (`:70`) | none — the rejection escapes `submit()`, which is **not awaited** at any of its three call sites (`features/upload/upload-panel/upload-panel-input-handlers.ts:52,62,150`) | **the entire batch is visible in the panel and frozen at `queued`**; no error, no retry affordance | **high** |
| F7.2 | Folder scan rejects | `…/upload-manager-submit.util.ts:100-110` | `try/finally` unsubscribes the progress subscription but does **not** catch — the rejection escapes as in F7.1 | batch stuck at `status:'scanning'` | medium |
| F7.3 | Project auto-create fails | `…/upload-manager-submit.util.ts:238-240` | `catch { return undefined }` | upload proceeds **unassigned**, with no signal that the `Project: X` folder token was ignored | medium |
| F7.4 | Empty folder selection | `…/upload-manager-submit.util.ts:118-123` | batch set to `complete` with `finishedAt`; project auto-create deliberately skipped | none | satisfied |

---

## 8. Failure-handling summary

| Class | Count | Examples |
| --- | --- | --- |
| Fails **loudly** (job → `error`, message shown) | 7 | F1.1, F1.5, F1.6, F1.7, F6.4, and the two HEIC paths |
| Fails **quietly into the Issues lane** | 3 | F2.1, F2.2, F2.3 |
| Fails **completely silently** | **9** | F1.8, F1.10, F2.2 (RPC error), F2.5, F2.6, and all four unguarded fire-and-forget calls of § 3 |
| Leaves **residue** | 5 | F1.1 (storage), F1.2/F1.3/F1.4 (DB rows), F1.5 (both) |
| Covered by an automated test **as written** | **0 of 30** rows in this matrix |

The last row is the finding that governs the rest: **not one failure mode in this matrix has a test**, and even if one existed it could not run today (`00-baseline.md` § 4).

---

## 9. Corrections to earlier phases

- **Phase 2 F4** overstated the risk for one of the four fire-and-forget calls. `resolveUploadAddress` **is** internally guarded (`core/upload/address-resolution/upload-address-resolve.util.ts:20-51`); the other three are not, and the dedup insert's bare `.then()` (`core/upload/support/upload-db-postwrite.util.ts:38`) is the clearest of them. `02-happy-path.md` has been corrected in place.
- **Plan § 4 Phase 7** assumes `core/upload/support/upload-timeout.util.ts` is the live timeout. It has no importer; the live one is a private copy (`06-health.md` § 1.3).
- **Plan § 4 Phase 7** lists "dedup row written but upload later fails → poisoned hash index" as a risk. The ordering at `core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:232-246` already prevents it on the new path (F1.9). **Refuted.**

## 10. Not verified in this phase

| Claim not made | Check needed |
| --- | --- |
| That F1.5's late write actually lands (the timeout leak) | Requires an artificially slow upload against a live backend, or a unit test with a fake timer asserting that `persistUploadFile` still resolves after the race rejects |
| Whether a network drop leaves a partial multipart object (F1.7) | Inspect the installed `@supabase/storage-js` upload implementation, or observe a cancelled request against a live bucket |
| Peak memory for a large HEIC batch (F5.5) | A browser memory profile with 100+ HEIC files — Phase 10, unavailable |
| That `clearForBatch` is called on every batch (F4.6) | `grep -rn clearForBatch apps/web/src` and trace each caller |
| That F4.2's idempotency holds under real concurrency | A test driving two services to register the same `(batchId, queryKey)` simultaneously |
| The replace and attach pipelines' failure paths in the same detail as the new pipeline | Those 13 files / 1,112 LOC have **zero spec files**; this matrix covers only the sites reachable from the new pipeline plus the four attach/replace sites named above |
