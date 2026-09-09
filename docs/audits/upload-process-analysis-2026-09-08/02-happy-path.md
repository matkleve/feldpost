# 02 — Happy-path trace (Phase 2)

**Commit:** `8e4b1e09` · **Scope of the trace:** one JPEG with valid EXIF GPS, submitted through the upload panel, `locationRequirementMode` **not** `'optional'` (auto location ON), no duplicate hash, no photoless conflict, no address ambiguity, no HEIC conversion.

Method: static reading only. The unit suite does not compile (`00-baseline.md` § 4) and there is no live backend (`00-baseline.md` § 9), so **no step below was observed executing.** Every row is a code-reading claim with a `path:line` anchor; steps whose ordering depends on runtime timing are marked in § 4.

Path shorthand: `core/…` = `apps/web/src/app/core/…`, `features/…` = `apps/web/src/app/features/…`.

---

## 1. Step table

`await?` = is the call awaited by its caller. `throws?` = can this step throw/reject. "On throw" = what happens to the job.

| # | Step | Code site | Phase set here | State written | Events emitted | await? | throws? | On throw | Spec clause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Panel hands the `FileList` to the facade | `apps/web/src/app/features/upload/upload-panel/upload-panel-input-handlers.ts:52` (drop) / `:62`, `:150` (file input) | — | — | — | yes | no | — | `docs/specs/component/upload/upload-panel.md` |
| 2 | Facade delegates; no logic of its own | `apps/web/src/app/core/upload/upload-manager.service.ts:267-269` | — | — | — | yes | no | — | `…/upload-manager.md` § Public API |
| 3 | Batch created, `status: 'uploading'`, `startedAt` | `apps/web/src/app/core/upload/manager/upload-manager-submit.util.ts:35-48` | — | `UploadBatch` in `UploadBatchService` | — | n/a | no | — | `…/upload-manager-pipeline.md` § Batch |
| 4 | Files wrapped as `ScannedFileEntry` with `relativePath = file.name`, `directorySegments: []` | `…/upload-manager-submit.util.ts:50-54` | — | — | — | n/a | no | — | — |
| 5 | One `UploadJob` per file: `id = crypto.randomUUID()`, `phase: 'queued'`, `mode: 'new'`, immediate object-URL preview | `…/upload-manager-submit.util.ts:272-287` | **`queued`** (literal, not via `setPhase`) | jobs array | — | n/a | no | — | `…/upload-manager.md` § Job |
| 5a | Folder hint merge — for a plain `submit()` the segment list is empty, so `titleAddress` stays `undefined` | `…/upload-manager-submit.util.ts:259-270` | — | `titleAddress`, `titleAddressSource` | — | n/a | no | — | `…/upload-manager-pipeline.md` Action 3/4 |
| 6 | Jobs pushed into `UploadJobStateService` | `apps/web/src/app/core/upload/support/upload-job-state.service.ts:130-132` via `…/upload-manager-submit.util.ts:65` | — | `_jobs` signal | — | n/a | no | — | — |
| 7 | Deferred preview URLs hydrated | `…/upload-manager-submit.util.ts:66` → `upload-manager.service.ts:168` | — | `thumbnailUrl` | — | n/a | no | — | — |
| 8 | **`classifyBatch`** — Search Object classification for the whole batch, then layer-package groups, then pre-resolve wave reset | `apps/web/src/app/core/upload/manager/upload-manager-facade-deps.util.ts:110-115`, awaited at `…/upload-manager-submit.util.ts:67-69` | — | `groupingKey` per job, orchestrator group state, wave counter | — | **yes** | yes (unguarded) | rejection propagates out of `submit()`; **jobs are already in the store and `drainQueue()` at step 9 never runs** → the whole batch stalls in `queued` | `…/address-resolution-model.md` |
| 9 | `drainQueue()` | `…/upload-manager-submit.util.ts:70` → `upload-manager-pipeline-host.service.ts:40-57` → `…/upload-manager-drain.util.ts:33-61` | — | — | 3 × `console.log` per drain (`upload-manager-drain.util.ts:36,42,50`) | n/a | no | — | `…/upload-manager-pipeline.md` § Queue Draining |
| 10 | Up to 3 jobs selected (FIFO, skipping blocked/running), abort controller created, marked running | `…/upload-manager-drain.util.ts:57-61`; cap `MAX_CONCURRENT = 3` at `apps/web/src/app/core/upload/support/upload-queue.service.ts:10` | — | `runningIds` set | — | n/a | no | — | `…/upload-manager-pipeline.md` § Queue |
| 11 | `runPipeline` → mode router → `UploadNewPipelineService.run` | `…/upload-manager-pipeline-host.service.ts:63-111`, `…/upload-manager-run-route.util.ts` | — | — | — | yes (`void`-ed at `:53`) | caught at `:87` | `handleUploadPipelineError` → `failJob`, `markDone`, `drainQueue` | `…/upload-manager-pipeline.md` |
| 12 | Resume shortcut — not taken on a first run (`job.coords` undefined, no `conflictResolution`) | `apps/web/src/app/core/upload/pipelines/new/upload-new-prepare-route.util.ts:82-111` | — | — | — | yes | yes — `findJob(jobId)!` at `:93` is a non-null assertion | `TypeError` → caught by step 11 | — |
| 13 | **Validate** file (type + size, client-side) | `…/upload-new-prepare-route.util.ts:120-125` → `apps/web/src/app/core/upload/upload.service.ts:55-57` → `support/upload.service.util.ts` | **`validating`** | — | — | yes | no | invalid → `ctx.failJob(jobId,'validating',…)`, pipeline returns `null` | `…/upload-manager-pipeline.md` Action 1 |
| 14 | **Parse EXIF** (`parsedExif` incl. `coords`, `capturedAt`, `direction`, `exifRaw`) | `…/upload-new-prepare-route.util.ts:232-245` | **`parsing_exif`** | `job.parsedExif`, `job.direction` | `jobPhaseChanged$` | yes | `parseUploadExif` is documented non-throwing (`upload.service.ts:59-62`) | — | `…/upload-manager-pipeline.location-routing.supplement.md` § Phase 0 |
| — | **`parsedExif.coords` ≠ `job.coords`.** `parsedExif.coords` is raw sensor metadata; `job.coords` is the *placement* decision and is still `undefined` here. The DB keeps them in separate columns (step 25). | `…/upload-new-prepare-route.util.ts:245` vs `…/upload-location-precedence.helpers.ts` `buildChosenPlacementPatch` | — | — | — | — | — | — | location-routing supplement |
| 15 | Pre-resolve entered; wave counter decremented in `finally` | `apps/web/src/app/core/upload/pipelines/new/upload-new-pre-resolve.util.ts:289-305` | — | — | — | yes | no (wrapped) | — | location-routing supplement |
| 16 | **Title/folder candidate merge**. With no filename address and no folder hint, returns `{highConfidence:false}` and writes nothing | `…/upload-new-pre-resolve.util.ts:51-148`, entry at `:327-329` | **`extracting_title`** | `titleAddress` / `addressNotes` (not in this trace) | `jobPhaseChanged$` | yes | no | — | `…/upload-manager-pipeline.md` § Filename Address Confidence Contract |
| 17 | **Dedup pass 1** — hash then org lookup | `…/upload-new-pre-resolve.util.ts:336` → `apps/web/src/app/core/upload/support/upload-dedup-check.util.ts:22-64` | **`hashing`** then **`dedup_check`** | `contentHash`, `contentHashAlgo` | 2 × `jobPhaseChanged$` | yes | `checkUploadDedupHash` swallows everything (`…/manager/upload-manager-dedup.util.ts:22-24`) | a failed lookup is indistinguishable from "no duplicate" | `…/upload-manager-pipeline.dedup-scope.supplement.md` |
| 18 | Routing choice. `highConfidence` is false and there is no `groupingKey`, so the third branch is taken | `…/upload-new-pre-resolve.util.ts:381-383` | — | — | — | yes | no | — | location-routing supplement |
| 19 | **Placement**: `current.coords` unset, phase is not `awaiting_disambiguation`, no `titleAddressCoords`, no `titleAddress` → falls through to `resolvePlacementWithoutText(current) === 'exif'` | `…/upload-new-pre-resolve.util.ts:187-284`, decisive test at `:274` | — | — | — | yes | no | — | location-routing supplement § Branch B |
| 20 | **EXIF-only placement applied** — this is where `job.coords` is first written | `…/upload-new-pre-resolve.util.ts:165-181` → `apps/web/src/app/core/upload/location/upload-location-precedence.helpers.ts` `buildChosenPlacementPatch(job,'exif',exifCoords)` | — (no `setPhase`) | `coords`, `locationSourceUsed:'exif'`, resolution fields | — | n/a | no | — | location-routing supplement § EXIF-only placement |
| 21 | **Dedup pass 2** — same function again, hash now cached, but the RPC runs a second time and `dedup_check` is re-entered | `…/upload-new-pre-resolve.util.ts:389` → `upload-dedup-check.util.ts:44-45` | **`dedup_check`** (again) | — | `jobPhaseChanged$` (again) | yes | as step 17 | — | — |
| 22 | Back in the pipeline: `preResolve === 'continue'` → route to upload | `apps/web/src/app/core/upload/pipelines/new/upload-new-pipeline.service.ts:117-131` | — | — | — | yes | no | — | — |
| 23 | **Conflict check** — photoless-row lookup by coords/address; none found in this trace | `…/upload-new-prepare-route.util.ts:326-337` → `apps/web/src/app/core/upload/support/upload-conflict.service.ts` | **`conflict_check`** | `conflictCandidate` (not here) | `jobPhaseChanged$` | yes | yes (DB) | propagates to step 11 | `…/upload-manager-pipeline.md` Action 6 |
| 24 | HEIC gate — no-op for a JPEG | `apps/web/src/app/core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:68-75` | — | — | — | yes | yes | `ctx.failJob(jobId,'converting_format',…)` and return | `…/upload-manager-pipeline.md` § HEIC |
| 25 | **Storage upload** — bytes to the `media` bucket at `{orgId}/{userId}/{uuid}.{ext}`, wrapped in a 180 s `Promise.race` timeout | `…/upload-new-run-upload-phase.util.ts:157-185` (timeout at `:299-318`, constant at `upload-new-pipeline.service.ts:63`) → `apps/web/src/app/core/upload/upload.service.ts:122-136` → `apps/web/src/app/core/upload/support/upload-file-persist.util.ts:90-141` | **`uploading`**, `progress: 0` | — | `jobPhaseChanged$` | yes | yes | rejection → step 11's catch → `failJob` | `…/upload-manager-pipeline.md` Action 7 |
| 25a | Org id resolved first: `profiles.organization_id` for the current user | `…/upload-file-persist.util.ts:67-80` | — | — | — | yes | error returned, not thrown | `{error}` → step 26 | `supabase/AGENTS.md` § Database |
| 25b | Storage path built. **`ext` comes from the filename with no sanitisation** | `…/upload-file-persist.util.ts:82-84` | — | — | — | n/a | no | — | `supabase/AGENTS.md` § Storage (`{org_id}/{user_id}/{uuid}.jpg`) |
| 26 | **`media_items` insert** — `exif_latitude`/`exif_longitude` from *metadata*, placement written separately by the RPC/enrichment path; `location_status` derived; `.select('id').single()` | `…/upload-file-persist.util.ts:173-200` | — | DB row | — | yes | error returned, not thrown | `{error}` → step 27 fails the job. **The storage object written at step 25 is not removed** (§ 3, F1) | `…/upload-manager-pipeline.md` Action 8 |
| 26a | Fire-and-forget reverse-geocode of the placement coords | `…/upload-file-persist.util.ts:211-220` → `core/upload/address-resolution/upload-address-resolve.util.ts` | — | `media_items.address_label` (async) | — | **no** | yes | unhandled rejection (§ 3, F4) | `docs/glossary.md` § Address Label |
| 27 | Result handling. On success: phase `saving_record`, `mediaId`/`storagePath`/`coords`/`direction` written, `progress: 100` | `…/upload-new-run-upload-phase.util.ts:211-231` | **`saving_record`** | `mediaId`, `storagePath`, `coords`, `direction`, `progress` | `jobPhaseChanged$` | n/a | no | — | `…/upload-manager.md` § Job |
| 28 | **Dedup hash registered**, fire-and-forget, `organization_id` parsed back out of the storage path | `…/upload-new-run-upload-phase.util.ts:237-246` → `apps/web/src/app/core/upload/support/upload-db-postwrite.util.ts` | — | `dedup_hashes` row | — | **no** | swallowed inside the util | a lost hash means the next identical upload is not deduped | dedup-scope supplement |
| 29 | **Post-save**. Not `optional`, no `titleAddress`, `coords` present → reverse-geocode enrichment branch | `apps/web/src/app/core/upload/pipelines/new/upload-new-post-save.util.ts:143-145` | **`resolving_address`** | — | `jobPhaseChanged$` | yes | yes | propagates to step 11 → job flipped to `error` **after the row is already saved** | location-routing supplement § Mismatch audit |
| 30 | Phase → complete, slot released | `…/upload-new-post-save.util.ts:168-169` | **`complete`** | — | `jobPhaseChanged$` | n/a | no | — | `…/upload-manager.md` |
| 31 | Local preview URL handed to the download service; thumbnail persisted fire-and-forget | `…/upload-new-post-save.util.ts:287-293` → `apps/web/src/app/core/upload/support/upload-thumbnail-persist.util.ts` | — | `MediaDownloadService` local-url map | — | **no** (`void` at `:292`) | yes | unhandled rejection (§ 3, F4) | Actions 8a2/8a3 |
| 32 | `imageUploaded$` emitted with `{jobId,batchId,mediaId,coords,direction,thumbnailUrl}` | `…/upload-new-post-save.util.ts:295-302` → `apps/web/src/app/core/upload/upload-manager.service.ts:228,193` | — | — | **`imageUploaded$`** | n/a | no | — | `…/upload-manager.md` § Events |
| 33 | Batch progress recomputed; queue drained so the next queued job starts | `…/upload-new-post-save.util.ts:304-305` | — | `UploadBatch` counters | `batchProgress$`, later `batchComplete$` | n/a | no | — | `…/upload-manager-pipeline.md` § Batch |
| 34 | Panel row moves to the **Uploaded** lane — derived, not stored: `getLaneForJob` returns `'uploaded'` as soon as `phase === 'complete'` | `apps/web/src/app/features/upload/upload-phase.helpers.ts:49-55` | — | — | — | n/a | no | — | `docs/specs/ui/upload/upload-panel-system.md` |
| 35 | Panel map-marker callback — **only fires when `event.coords` is set**, and converts to a *different* `ImageUploadedEvent` shape | `apps/web/src/app/features/upload/upload-panel/upload-panel-lifecycle.service.ts:66-79` | — | — | panel `imageUploaded` output | n/a | no | — | `upload-panel-system.md` |
| 36 | `/media` grid patch — independent subscription, `auditTime(300)`, skipped when a project filter is active | `apps/web/src/app/core/route-session-cache/route-session-cache.service.ts:47-59` (`UPLOAD_AUDIT_MS = 300` at `:19`) → `apps/web/src/app/core/media-page-state/media-page-state.service.ts:94-116` → `core/media-page-state/media-page-state-upload-patch.helpers.ts` | — | route session cache for `/media` | — | n/a | no | — | — |

**Phases actually written on this path (9 of 20):** `queued` (literal) → `validating` → `parsing_exif` → `extracting_title` → `hashing` → `dedup_check` → `conflict_check` → `uploading` → `saving_record` → `resolving_address` → `complete`. `converting_format`, `resolving_location`, `awaiting_disambiguation`, `awaiting_conflict_resolution`, `replacing_record`, `resolving_coordinates`, `missing_data`, `skipped`, `error` belong to other branches (Phase 4 settles reachability for all 20).

---

## 2. Ownership per step (answer to plan § 3 Q1)

| Stage | Owner | Where the phase is written |
| --- | --- | --- |
| Intake, batch, job creation | `manager/upload-manager-submit.util.ts` | phase literal in the job object, **not** through `setPhase` — so no `jobPhaseChanged$` fires for `queued` |
| Scheduling / concurrency | `manager/upload-manager-drain.util.ts` + `support/upload-queue.service.ts` | none |
| Pipeline dispatch, error funnel, abort controllers | `manager/upload-manager-pipeline-host.service.ts` | `failJob` only |
| Validate / EXIF / HEIC / conflict / missing-data routing | `pipelines/new/upload-new-prepare-route.util.ts` | `validating`, `parsing_exif`, `converting_format`, `conflict_check`, `awaiting_conflict_resolution`, `missing_data` |
| Title merge, dedup gating, placement decision | `pipelines/new/upload-new-pre-resolve.util.ts` | `extracting_title`; `hashing`/`dedup_check` delegated to `support/upload-dedup-check.util.ts` |
| Placement arithmetic | `location/upload-location-precedence.helpers.ts`, `location/upload-location-resolution.service.ts` | none directly on this path |
| Bytes + row | `support/upload-file-persist.util.ts` (via `upload.service.ts`) | none — it has no access to job state |
| Upload phase framing, timeout, dedup-hash write | `pipelines/new/upload-new-run-upload-phase.util.ts` | `uploading`, `saving_record` |
| Enrichment, completion, events | `pipelines/new/upload-new-post-save.util.ts` | `resolving_address`, `resolving_coordinates`, `missing_data`, `complete` |
| Lane presentation | `features/upload/upload-phase.helpers.ts` | none — derived |

**Six files write phases on one happy path**, and `missing_data` is written by two of them (`upload-new-prepare-route.util.ts:201` and `upload-new-post-save.util.ts:262`) with **different document-classification rules** (§ 3, F6). Carried to Phase 4.

---

## 3. Defects visible from this trace alone

Each is stated as an observation with evidence. Severity/effort are assigned in `10-findings.md`.

**F1 — Storage object orphaned when the `media_items` insert fails.**
`apps/web/src/app/core/upload/support/upload-file-persist.util.ts:198-200` returns `{ error: dbError }` after `uploadFileToStorage` has already written the object at `:90-98`. The cancel paths at `:135-138` and `:202-209` *do* clean up; the DB-error path does not. Result: bytes in the `media` bucket with no row referencing them. `scripts/validate-supabase-storage-cleanup-api-mode.mjs` shows a `cleanup_orphaned_storage_objects` job exists, so the residue is eventually collectable — but the client leaves it. Severity candidate `high`.

**F2 — The `beforeunload` warning does not exist.**
`apps/web/src/app/core/upload/upload-manager.service.ts:237` is `private readonly beforeUnloadHandler = (): void => {};`. It is attached and detached by `core/upload/manager/upload-manager-effects.util.ts:22-28` when `isBusy()` flips. A `beforeunload` listener that calls neither `preventDefault()` nor sets `returnValue` does not raise the browser's leave-site prompt, so **closing the tab mid-upload is silent**. The service's own header claims the opposite (`upload-manager.service.ts:18`), and `docs/specs/service/media-upload-service/upload-manager.md:280` carries it as a **ticked** acceptance criterion: `- [x] \`beforeunload\` warning shown when \`isBusy()\` is true`. Code-wrong drift plus a false-checked AC. Severity candidate `high`.

**F3 — The upload timeout leaks.**
`…/upload-new-run-upload-phase.util.ts:299-318` races the upload against a 180 s timer. On timeout the race rejects, but the underlying `persistUploadFile` promise keeps running: it can still complete the storage write and the `media_items` insert *after* the job has been failed. Nothing cancels it — `ctx.getAbortSignal(jobId)` is passed into the upload but the timeout path never aborts it. Produces a saved row for a job the user sees as failed. Severity candidate `high`. `unverified` on whether the Supabase JS client actually honours the `signal` option passed at `…/upload-file-persist.util.ts:128` — that needs a runtime check.

**F4 — Four fire-and-forget calls with no `catch` on the happy path.**
`…/upload-file-persist.util.ts:211-220` (reverse geocode), `…/upload-new-run-upload-phase.util.ts:237-246` (dedup hash insert — internally guarded), `…/upload-new-post-save.util.ts:240` (`void persistMismatch(...)`), `…/upload-new-post-save.util.ts:292` (`void persistThumbnail(...)`). Each can reject into a global unhandled rejection with no user-visible signal. Answers plan § 3 Q9 for this path: **the failure is silent.**

**F5 — The dedup lookup runs twice per job.**
`…/upload-new-pre-resolve.util.ts:336` and again at `:364` / `:378` / `:389`, both through `runUploadDedupCheck`. The hash is cached after the first pass (`upload-dedup-check.util.ts:34-42`), so the second pass skips hashing but still issues the `check_dedup_hashes` RPC (`:45`) and still calls `setPhase(jobId,'dedup_check')` (`:44`). Consequences: one redundant RPC per file (a 500-file folder import ⇒ 500 extra round-trips) and a duplicate `jobPhaseChanged$` transition `resolving_*`→`dedup_check` that the spec FSM does not contain.

**F6 — "Is this a document?" is decided two different ways.**
`…/upload-new-prepare-route.util.ts:197` uses `deps.uploadService.resolveMediaType(job.file) === 'document'` (MIME with extension fallback, `upload.service.ts:42-48`). `…/upload-new-post-save.util.ts:256-257` uses `mimeType.startsWith('application/') || mimeType.startsWith('text/')` on the raw `file.type`. Both then set the same `issueKind`. For a file whose browser-reported `type` is empty — common for `.odt`/`.odg` on some platforms — the two disagree, so the same file lands in the Issues lane as `document_unresolved` on one path and `missing_gps` on the other.

**F7 — Two different types are both called `ImageUploadedEvent`.**
Service-side: `apps/web/src/app/core/upload/upload-manager.types.ts:219-226` → `{jobId,batchId,mediaId,coords?,direction?,thumbnailUrl?}`. UI-side: `apps/web/src/app/core/workspace-pane/workspace-pane-shell-events.types.ts:7-13` → `{id,lat,lng,direction?,thumbnailUrl?}`, re-exported by `features/upload/upload-panel/upload-panel.types.ts:2`. The bridge is `features/upload/upload-panel/upload-panel-lifecycle.service.ts:66-79`. This collision is the direct cause of Phase 0's test error T8 (`upload-panel.map-pick.spec.ts:42`, `00-baseline.md` § 4).

**F8 — `mime_type` and the storage `contentType` are derived differently.**
`…/upload-file-persist.util.ts:179` writes `mime_type: file.type` (raw browser value, can be `''`), while `:122` uses `deps.resolveMimeType(file)` (normalised, extension fallback) for the storage object. The same file can therefore have an empty `media_items.mime_type` and a correct storage content type.

**F9 — The storage path extension is unsanitised, user-controlled input.**
`…/upload-file-persist.util.ts:83-84`: `const ext = (input.file.name.split('.').pop() ?? 'jpg').toLowerCase();` then `${orgId}/${user.id}/${uuid}.${ext}`. Nothing strips `/`, `..`, whitespace or control characters. In a browser, `File.name` is a basename, so a normal user cannot exercise this — but `supabase/AGENTS.md` states the frontend is untrusted, and a scripted client can send any name. Whether Supabase Storage normalises the key server-side is **`unverified`**; the check needed is a request to the storage API with a crafted key against a live project. Carried to Phase 8.

**F10 — user-visible English leaks through `job.error` and two `statusLabel` render sites (corrected in Phase 3).**
`statusLabel` itself *is* stored in English (`apps/web/src/app/core/upload/support/upload-job-state.service.ts:56-99`; `…/upload-new-prepare-route.util.ts:205`; `core/upload/location/upload-location-disambiguation-registration.service.ts:100`), but the panel's main renderer translates it: `features/upload/upload-panel/upload-panel-item-helpers.ts:72-106` maps **all 20 phases** through `t()` via `STATUS_TEXT_MAP` (`:12-32`) plus explicit branches for `missing_data`/`complete`/`error`/`skipped`, and only falls through to the raw value at `:106` for a phase not in the map — which is currently none. The genuine leaks are:
- `upload-panel-item-helpers.ts:76-78` returns `job.error` verbatim, and every producer of `job.error` is hardcoded English: `core/upload/support/upload.service.util.ts:73,81` (size/type validation), `core/upload/support/upload-error-messages.util.ts:13,22-26,33-60…` (all `title`/`summary`/`hint` strings), `core/upload/manager/upload-manager-actions.util.ts:90-91` (`'Cancelled'`, `'Upload cancelled by user.'`).
- `features/upload/upload-panel/upload-panel-item.component.ts:176` — `label: job.statusLabel` on the upload progress overlay, untranslated.
- `features/upload/upload-panel/upload-panel-menu-action-router.service.ts:118-123` — `toastService.show({ message: job.statusLabel })`, untranslated.

`npm run i18n:guard` cannot see any of these because it only scans templates for literal text nodes (`00-baseline.md` § 2, B7). Partial answer to plan § 3 Q10; the sweep is completed in `03-branch-matrix.md` § 7.

**F11 — `classifyBatch` is an unguarded await between "jobs are visible" and "queue starts".**
`…/upload-manager-submit.util.ts:65-70`: `addJobs` (step 6) happens *before* `await deps.classifyBatch(batchId)` (step 8), and `drainQueue()` (step 9) comes after. If `classifyBatch` rejects, the rejection escapes `submit()` and `drainQueue()` never runs, leaving every job of the batch visible in the panel and frozen at `queued`. `classifyBatch` reaches the network via `addressOrchestrator.classifyBatch` (`upload-manager-facade-deps.util.ts:111`). Carried to Phase 7.

---

## 4. What this trace cannot establish

| Claim | Why not | Check that would settle it |
| --- | --- | --- |
| The actual wall-clock ordering of steps 25/26 against the fire-and-forget calls of F4 | Static reading gives program order, not scheduler order | Run one upload with `core/upload/address-resolution/upload-address-resolution.debug.ts` tracing enabled against a live Supabase project (Phase 10, unavailable) |
| Whether `AbortSignal` reaches the Supabase storage client (F3) | The signal is passed inside a cast object literal (`…/upload-file-persist.util.ts:128`, `... as Record<string, unknown>`), so the type system does not confirm the option exists | Inspect the installed `@supabase/storage-js` version's `upload()` options, or observe a cancelled request in devtools |
| That a failed `classifyBatch` really strands the batch (F11) | The rejection path was read, not run | A unit test stubbing `addressOrchestrator.classifyBatch` to reject and asserting `drainQueue` was not called. **No such test exists, and no test can run today** (`00-baseline.md` § 4) |
| That the browser suppresses the leave-site prompt for an empty handler (F2) | This is a browser-behaviour claim, not a code claim. It follows from the HTML standard's "cancel the event" requirement, but was not observed here | Load the app, start an upload, attempt to close the tab |
| The user-visible result of F1 (orphaned object) | Requires a forced DB-insert failure against a live backend | Revoke insert permission on `media_items` for one session and upload |
