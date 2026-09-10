# 02 — Issues not in the 2026-09-08 audit

**Measured:** 2026-09-10 on branch `cursor/upload-flow-review-3be6` · **Method:** static reading. Nothing here was observed running — there is no live backend in this container. Every row carries a `path:line` anchor so each claim can be checked without re-deriving it.

Findings continue as NF-17 … NF-37 in [`05-address-resolution-and-ui-findings.md`](05-address-resolution-and-ui-findings.md); the status of the previous audit's UP-xx rows is re-measured in [`04-status-of-prior-findings.md`](04-status-of-prior-findings.md).

**Relationship to the previous audit.** [`../upload-process-analysis-2026-09-08/10-findings.md`](../upload-process-analysis-2026-09-08/10-findings.md) holds 50 findings (UP-01 … UP-50), roughly half of which were fixed on 2026-09-09/10. This document does **not** restate those. It covers three things that audit did not:

1. The **attach** and **replace** pipelines, which it explicitly listed as having zero specs and zero tests.
2. The **HEIC** conversion path.
3. Consequences of the 2026-09-09/10 fixes themselves — two of them are inert or incomplete on the paths that need them most.

Path shorthand: `core/…` = `apps/web/src/app/core/…`, `features/…` = `apps/web/src/app/features/…`.

---

## 1. The pattern behind most of this

The **new** pipeline (`submit()` → `UploadNewPipelineService`) is the one that gets attention. It has the upload timeout, the cancel-residue cleanup, the guarded fire-and-forget calls, and the tests. The **attach** and **replace** pipelines share its job model, its phase vocabulary and its lane rendering — but they re-implement its tail, and the 2026-09-09/10 hardening was applied to the new pipeline only.

So the same defect class the previous audit closed twice already survives in two other places, and the two most severe findings below are on the replace path.

---

## 2. Findings

| ID | Sev | Area | Finding | Evidence |
| --- | --- | --- | --- | --- |
| **NF-01** | high | dedup / data loss | **Replace never retires the old content hash**, so re-uploading the original file is later auto-skipped as a duplicate of a row that no longer contains it. | `core/upload/pipelines/replace/upload-replace-pipeline-finish.util.ts:86-93`; no delete exists anywhere (`from('dedup_hashes')` → 3 inserts, 0 deletes); policies `supabase/migrations/20260611120000_dedup_hashes_org_scope.sql:48-59` |
| **NF-02** | high | replace / data corruption | **Cancelling a replace after the row update removes the new object but leaves `storage_path` pointing at it**, leaving a permanently broken media item. | `…/upload-replace-pipeline-finish.util.ts:56-70` |
| **NF-03** | high | cancel residue | **Sign-out cleanup runs after the session is gone**, so the RLS-protected deletes it performs cannot succeed — and both results are discarded, so it fails silently. UP-04's fix is inert on this path. | `core/upload/manager/upload-manager-effects.util.ts:15-20`; `core/upload/manager/upload-manager-pipeline-host.service.ts:141-163`; `core/upload/support/upload-cancel-residue.util.ts:25-33` |
| **NF-04** | medium | dedup | **No in-flight dedup guard**: the hash is registered only after a successful upload, so two identical files inside the same 3-job concurrency window both miss the lookup and both upload. | `core/upload/support/upload-dedup-check.util.ts:44-48`; registration at `core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:272-282`; `MAX_CONCURRENT = 3` at `core/upload/support/upload-queue.service.ts:10` |
| **NF-05** | medium | robustness | **Attach and replace have no upload timeout.** Only the new pipeline races the upload against 180 s, so a hung attach/replace holds a concurrency slot indefinitely. | `core/upload/pipelines/attach/upload-attach-pipeline.service.ts:220`; `…/replace/upload-replace-pipeline-finish.util.ts:35`; cf. the race at `…/new/upload-new-run-upload-phase.util.ts:299-318` |
| **NF-06** | medium | silent failure | **Attach's dedup-hash insert discards its error.** UP-35's fix reached the new and replace pipelines; attach still swallows it. | `core/upload/pipelines/attach/upload-attach-record-update-runner.util.ts:117-119` |
| **NF-07** | low | orphan | Replace's old-object deletion is an **unawaited floating promise with no error handling**, unlike the three awaited removes above it in the same function. | `…/upload-replace-pipeline-finish.util.ts:83` |
| **NF-08** | medium | HEIC | **No size re-validation after HEIC→JPEG conversion.** The original is validated against 25 MiB, then the converted JPEG replaces it; the bucket enforces the same limit exactly, so an oversized conversion is rejected at the storage write after the whole pipeline has run. | validation `core/upload/pipelines/new/upload-new-prepare-route.util.ts:119-124`; swap `:23-38`; limit `core/upload/support/upload-file-types.ts:2` vs `supabase/migrations/20260327121000_storage_media_bucket_init.sql:21` |
| **NF-09** | medium | HEIC | **Double-decode window.** The conversion starts before it is registered in the singleflight map — the gap spans the whole EXIF parse — so a concurrent upload-gate call starts a second full `heic2any` decode and a second file swap that revokes the first's object URL. | started `…/upload-new-prepare-route.util.ts:235-237`, registered `:265-270`; concurrent entry `:66-79` |
| **NF-10** | low | HEIC | Attach **re-implements the conversion inline with no error handling**, so a failed attach conversion surfaces the raw `HEIC_CONVERSION_FAILED` instead of the actionable message the new pipeline produces. | `core/upload/pipelines/attach/upload-attach-pipeline.service.ts:158-172` vs `…/new/upload-new-prepare-route.util.ts:250-263` |
| **NF-11** | medium | tray | **One dead job blocks a whole tray card.** The Continue gate requires *every* job in the item to still be in `awaiting_disambiguation`, and nothing prunes `jobIds` when a job errors, is cancelled or is dismissed. The only exit is Skip, which forfeits the address. | `features/upload/upload-resolver-tray/upload-resolver-tray.component.ts:197-205`; `core/upload/address-resolution/upload-tray-resolution-gate.helpers.ts:16-19,34-37`; Skip is ungated at `…/upload-resolver-tray.component.html:195` |
| **NF-12** | medium | tray | **The text-answer path bypasses that readiness gate entirely**, so a text answer can be confirmed for jobs whose bytes are not ready. Undocumented. Closes the previous audit's unverified item #9. | `…/upload-resolver-tray.component.ts:187-189` |
| **NF-13** | medium | tray | The containment-check tray offers **"Enter a different address", which only defers the group** — no address entry follows; and picking "keep" writes `resolutionStatus: 'failed'`. Both option labels are hardcoded English built in `core/`, where the i18n guard cannot see them. | `core/upload/location/upload-location-geocode-outcome.util.ts:97-109`; `core/upload/location/upload-location-tray-flow.service.ts:141-153` |
| **NF-14** | medium | spec trust | The **open-gap table understates the code**: G2 and G3 ship, with tests, while the spec lists both as unimplemented and leaves their acceptance criteria unchecked. G4 genuinely is not implemented. | fan-out key `core/upload/address-resolution/upload-address-resolution.orchestrator.ts:231-244`; G3 call site `core/upload/location/upload-location-pre-resolve-orchestrator.service.ts:149`, tests `…/upload-location-tray-flow.service.spec.ts:279,326,350`; no `'deferred'` in `core/upload/upload-manager.types.ts:37` |
| **NF-15** | low | dead code | **`context_distance` (contradiction class C5) is a dead union member** — read in one place, never written. Same class as `duplicate_photo`, which was deleted in P4c. | `core/upload/upload-manager.types.ts:115`; sole reader `features/upload/upload-resolver-tray/upload-resolver-tray.helpers.ts:70` |
| **NF-16** | low | change completeness | `project_address_* = Step 2` **still appears in a type comment** — the last surviving reference to the removed project tray, the concept root `AGENTS.md` cites as this repository's canonical Change-Completeness failure. | `core/upload/upload-manager.types.ts:80` (only hit across `apps/web/src` and `docs/specs`) |
| **NF-38** | high | dedup / HEIC | **HEIC dedup fingerprints the converted JPEG, not the source HEIC.** `applyConvertedFileToJob` swaps `job.file` to `heic2any` output before the dedup gate; `computeUploadContentHash` then hashes whatever `job.file` points at. If encoder output varies across runs, the same photo yields a different fingerprint each upload and duplicate detection silently never fires — no error, no UI signal. See § 3 (NF-38). Fix: [`06-improvement-plan.md`](./06-improvement-plan.md) item 1. | swap `core/upload/support/upload-heic-prepare.util.ts:33`; conversion before dedup `…/upload-new-prepare-route.util.ts:185-213` → `…/upload-new-pre-resolve.util.ts:336` → `core/upload/support/upload-dedup-check.util.ts:91` → `core/upload/support/content-hash.util.ts:121-127`; encoder `core/upload/support/upload.service.util.ts:142-143`; same ordering attach `:170-197`, replace `…/upload-replace-pipeline-run.util.ts:103-127` |
| **NF-39** | medium | post-save / address | **Reverse geocode runs unawaited during `saving_record`; `resolving_address` is a false signal; upload reaches `complete` before the street address may exist.** `enrichWithReverseGeocode` is an empty stub (since `f6a3be7b`); the real call is `resolveUploadAddress` in `persistUploadFile`, invoked without `await`. Geocoder failure writes `location_status: 'unresolvable'` with no user-visible error while the job still completes. See § 3 (NF-39). Fix: [`06-improvement-plan.md`](./06-improvement-plan.md) item 13. Supersedes UP-36. | stub `core/upload/support/upload-enrichment.service.ts:43-47`; cosmetic phase `…/upload-new-post-save.util.ts:146-147`; unawaited call `core/upload/support/upload-file-persist.util.ts:232-240`; implementation `core/upload/address-resolution/upload-address-resolve.util.ts:20-51`; Step 4 config with no consumer `core/upload/location/upload-location-config.ts:26-27`, `:71` |

---

## Integration status (branch `cursor/upload-fixes-integration-3be6`, 2026-09-10)

Merged `cursor/upload-pipeline-integrity-3be6`, `cursor/upload-branch-c-resolution-3be6`, and `cursor/upload-panel-tray-ui-3be6` onto `cursor/upload-flow-review-3be6`, then closed cross-boundary items NF-11 (core gate), NF-13 (UI label consumption), and NF-18 (street-centroid core path). Evidence rows above are unchanged; this table records outcome only.

| ID | Status | Notes |
| --- | --- | --- |
| **NF-01** | **fixed** | Migration `20260910120000_retire_dedup_hashes_for_media_item.sql` + replace-pipeline hash retirement. **Migration unverified** — no DB in agent environment. |
| **NF-02** | **fixed** | Replace cancel restores `oldStoragePath` instead of leaving a broken row. |
| **NF-03** | **fixed** | Sign-out guard runs cancel-residue **before** session loss (`upload-sign-out-guard.util.ts`). |
| **NF-04** | **fixed** | In-flight dedup registry blocks duplicate submits within the concurrency window. |
| **NF-05** | **fixed** | Attach/replace upload paths now race storage against 180 s timeout. |
| **NF-06** | **fixed** | Attach dedup-hash insert logs rejection via shared postwrite helper. |
| **NF-07** | **fixed** | Replace old-object removal is awaited with error handling. |
| **NF-08** | **fixed** | HEIC→JPEG re-validated against 25 MiB before swap. |
| **NF-09** | **fixed** | HEIC conversion registered in singleflight map before decode starts. |
| **NF-10** | **fixed** | Attach HEIC path uses shared `upload-heic-prepare.util.ts` with actionable errors. |
| **NF-11** | **fixed** | UI prunes dead jobs in chip list and Continue gate; core `areAllJobsReadyForTrayResolution` now prunes non-`awaiting_disambiguation` jobs (integration reconciliation). |
| **NF-12** | **open (documented)** | Text-answer path still bypasses file-prepare readiness gate by design — documented in `upload-resolver-tray.stepper-fsm.supplement.md` § Tray Continue gate — text answer exception. Not converted to a hard gate. |
| **NF-13** | **fixed** | Containment option `labelKey`/`labelParams` flow through tray producer and resolve via `t()` in the tray component (integration reconciliation). |
| **NF-14** | **fixed** | Branch C spec/open-gap table synced; G2/G3 marked implemented. |
| **NF-15** | **open (annotated)** | `context_distance` union member retained with comment — reserved for unbuilt C5 tray; sole reader in tray helpers unchanged. |
| **NF-16** | **fixed** | Stale `project_address_*` type comment removed. |
| **NF-38** | **fixed** | Source-byte fingerprint + conversion after dedup gate (`2abf22c7`). Encoder determinism experiment (§ 3) found latent risk only — dedup not silently broken for cases tested. |
| **NF-39** | **open** | Reverse geocode unawaited in `saving_record`; `resolving_address` cosmetic; silent `unresolvable` on failure. See § 3 (NF-39). |

---

## 3. The three that matter most

### NF-01 — replace poisons the dedup index against the file it replaced

The chain:

1. Photo A is uploaded. A `dedup_hashes` row records `hash(A) → media_item M`.
2. The user replaces M's file with photo B. `hash(B) → M` is inserted. **`hash(A) → M` is left in place**, and `M.storage_path` now points at B.
3. Someone uploads photo A again. `check_dedup_hashes` matches `hash(A)`; the orphan guard (`m.storage_path IS NOT NULL`, `20260611120000_dedup_hashes_org_scope.sql:79`) still passes because M has B's path. The RPC returns M.
4. If the re-uploader is the original uploader, the behaviour matrix says **auto-skip** — `phase = skipped`, "Already uploaded" (`upload-manager-pipeline.dedup-scope.supplement.md` § Behavior matrix). Photo A is silently not stored, and the item the user is pointed at contains a different photo.

This is the one finding here that cannot be fixed client-side: `dedup_hashes` has **no DELETE policy** (only SELECT and INSERT, `20260611120000_dedup_hashes_org_scope.sql:48-59`), so a migration is required either way. That makes it **Sensitive** class.

Worth noting what is *not* broken, so the fix is not overscoped: the FK is `ON DELETE CASCADE` (`20260327124000_prepare_images_fk_decoupling_phase1.sql:64-67`), so deleting a media row does retire its hashes correctly. Replace is the only operation that changes a row's bytes without deleting the row.

### NF-02 — cancelling a replace can break the media item

`upload-replace-pipeline-finish.util.ts` checks for cancellation three times. The second check (`:61-70`) runs **after** the `media_items` update at `:56-59` has already committed `storage_path` = the new object. The handler then removes the new object and returns — leaving the row pointing at a key that no longer exists, with the old object still in the bucket but no longer referenced.

The correct action on this path is not the one UP-04's `removeUploadCancelResidue` performs (delete the row — the row is pre-existing and must survive) but *restoring* `oldStoragePath`. That is why the shared util was not reusable here, and it is probably why this path was skipped.

### NF-03 — the sign-out cleanup cannot authenticate

`registerUploadManagerEffects` reacts to `getUser()` becoming `null`:

```
if (!user && deps.hasRunning()) { deps.cancelAllActive(); }
```

By the time that effect runs the session is already gone. `cancelAllActive` then calls `removeUploadCancelResidue`, which issues `storage.from('media').remove(...)` and `from('media_items').delete()` — both governed by RLS policies that require `auth.uid()` and `public.user_org_id()`. With no JWT they cannot succeed.

Two things compound it. The util **discards both results** (`upload-cancel-residue.util.ts:25-33`) — Supabase returns `{ error }` rather than throwing — so nothing logs the failure. And `cancelAllActive` is invoked as `void cancelAllActiveUploads(...)` (`upload-manager-pipeline-host.service.ts:142`), so even a rejection would be dropped.

The result is that the one cancellation path where residue is *most* likely — the user closes their session with uploads in flight — is the one that reliably leaves it, silently, while the fix for exactly this class of bug is recorded as landed.

### NF-38 — HEIC dedup fingerprints encoder output, not source bytes

The chain (new pipeline; attach and replace follow the same ordering with conversion before `runUploadDedupCheck`):

1. `prepareExifAndFile` schedules HEIC conversion on the **original** file and **awaits** it before returning (`core/upload/pipelines/new/upload-new-prepare-route.util.ts:185-213`).
2. `ensureHeicConversionScheduled` calls `heic2any` at quality `0.85` (`core/upload/support/upload.service.util.ts:142-143`), then `applyConvertedFileToJob` replaces `job.file` with the JPEG (`core/upload/support/upload-heic-prepare.util.ts:74-79`, swap at `:33`).
3. EXIF for the hash is parsed from the **original** file before conversion (`core/upload/pipelines/new/upload-new-prepare-route.util.ts:179-181`) and passed separately — it is **not** re-read from the JPEG.
4. `finishPreResolveDedup` → `runUploadDedupCheck` passes the **post-swap** `job.file` to `computeUploadContentHash` (`core/upload/pipelines/new/upload-new-pre-resolve.util.ts:161`, `core/upload/support/upload-dedup-check.util.ts:91`).
5. `computeUploadContentHash` reads the first 64 KiB and `file.size` from whatever `File` it receives (`core/upload/support/content-hash.util.ts:121-127`); for `photo_v1` it combines those byte inputs with the separately supplied EXIF metadata (`:128-132`).

**Consequence:** Duplicate detection for HEIC depends on `heic2any` producing **byte-identical** JPEG output for the same source on every run. Construction-site photos overwhelmingly arrive as HEIC. If encoder output varies, the same photo uploaded twice produces two different `contentHash` values — dedup silently never fires. No error, no UI signal, no Issues-lane row.

The EXIF component of `photo_v1` does not rescue this: GPS, `capturedAt`, and `direction` are stable (parsed from the original), but they are **combined** with a potentially changing 64 KiB head and file size from the JPEG. Two uploads of the same HEIC with identical EXIF still diverge when the encoded bytes differ.

**Undermines today's fixes:** Both assume a stable fingerprint.
- **NF-01** (replace hash retirement): `retireStaleDedupHashesFireAndForget` keys off `contentHash` computed at dedup time (`core/upload/support/upload-db-postwrite.util.ts:67-74`; called from `…/upload-replace-pipeline-finish.util.ts:133`). A varying hash leaves orphan rows or fails to retire the right one.
- **NF-04** (in-flight dedup guard): the registry is keyed by `contentHash` (`core/upload/support/upload-inflight-dedup.registry.ts:15-29`; lookup at `upload-dedup-check.util.ts:100-107`). Two concurrent uploads of the same HEIC that encode to different bytes both miss each other.

**Encoder determinism experiment (2026-09-10):** Read-only test via `convertHeicToJpegUploadFile` with production options (`heic2any@0.0.4`, `toType: 'image/jpeg'`, quality `0.85` — matching `core/upload/support/upload.service.util.ts`). Five consecutive conversions in one browser session and two separate Chrome 148 headless processes produced **byte-identical** JPEG output for each input. `photo_v1` fingerprints matched on every run with EXIF held constant.

Two input sizes were tested: a 7,837-byte HEIC converting to 8,326 bytes (below the 64 KiB head window, so head hash equals full hash), and a 62,926-byte HEIC converting to 74,370 bytes (above the window, so the head is a strict subset — both the head hash and the full hash were stable).

**Caveat:** No real device HEIC exists in the repository. Inputs were synthetic HEIC containers generated with `pillow-heif` from an existing JPEG sample — valid HEVC HEIF, not renamed JPEGs, but not iPhone exports either. Live Photo bursts, HDR, depth maps, and iOS version differences were not covered.

**Conclusion:** NF-38 is **latent, not firing**. Duplicate detection for HEIC is not silently broken today for the cases tested. The severity is architectural: the design depended on an encoder determinism property that was never pinned, never tested in CI, and never validated against a real device export, and a `heic2any` or browser upgrade could change it without any signal. The fix that shipped on this branch — hashing source bytes and moving conversion behind the dedup gate (`2abf22c7`) — removes the dependency entirely and was the correct change regardless of the measurement outcome.

### NF-39 — reverse geocode completes after the user is told the upload finished

UP-36 recorded "`enrichWithReverseGeocode` is a no-op — implement or remove the cosmetic phase." That framing is incomplete: the empty method is a symptom; the product defect is **where** reverse geocoding runs, **that it is not awaited**, and **that failure is silent**.

The chain (new pipeline; attach/replace follow the same split between `persistUploadFile` and post-save enrichment):

1. **`enrichWithReverseGeocode` has never contained logic.** Git history shows it was introduced as a stub in `f6a3be7b` (2026-03-11) with the comment that `UploadService.uploadFile` already handles reverse geocoding. At HEAD it is still `void mediaId;` (`core/upload/support/upload-enrichment.service.ts:43-47`).

2. **Reverse geocoding does happen — elsewhere, earlier, without `await`.** During `saving_record`, `persistUploadFile` inserts the `media_items` row, then — if `finalCoords` is set — calls `resolveUploadAddress({ … })` with **no** `await` (`core/upload/support/upload-file-persist.util.ts:232-240`). That function calls `geocoding.reverse(lat, lng)` (Nominatim via the Supabase `/geocode` edge function) and persists through the `resolve_media_location` RPC, which writes the `locations` row and its link (`core/upload/address-resolution/upload-address-resolve.util.ts:20-36`).

3. **Post-save emits a misleading phase.** When the job has GPS coords but no text address, `finalizeNewUploadPhase` sets `resolving_address` and **awaits** the empty stub (`core/upload/pipelines/new/upload-new-post-save.util.ts:145-147`), then immediately sets `complete` (`:170-171`). The user briefly sees "Resolving address…" for work that is not happening there; the real work started one phase earlier under a label that says only "Saving…".

**Three distinct problems:**

| # | Problem | What the user experiences |
| --- | --- | --- |
| 1 | **`resolving_address` is a false signal** | "Resolving address…" appears around an empty method; real reverse geocode already started under `saving_record`. |
| 2 | **`complete` precedes the address** | Upload moves to Uploaded before `geocoding.reverse` finishes — the street line may still be loading, or may never arrive. |
| 3 | **Geocoder failure is silent** | On null result or network error, `resolveUploadAddress` writes `location_status: 'unresolvable'` and returns (`:22-24`, `:45-47`). The job still reaches `complete` with GPS but no human-readable address — no error, no Issues-lane row, no retry prompt. |

**When a photo ends up with GPS but no street address:**

- Reverse geocoder returns null or errors (network, Nominatim rate limit, unmapped location).
- No `job.coords` at upload time, so `resolveUploadAddress` is never called — no EXIF GPS, no usable text address, optional-location mode, or a deferred tray answer that forfeits placement.

**Spec/config drift (same family as C5 and G1):** `address-resolution-model.md` Step 4 ("EXIF reverse, `lang=en`, superset vs Search Object") has a config flag `exifContextCheck` in `upload-location-config.ts:26-27` (default `true` at `:71`) but **zero runtime consumers** in upload code — the only references are the type definition and default object.

**Product principle:** `upload-manager.md` states "Uploading is a background task — don't make me think." A user who cares about the address has no way to know it is missing after a green completion.

**Supersedes UP-36:** Do not treat this as "wire the stub or delete the phase" in isolation. Any fix must address await semantics, phase honesty, and failure visibility together — see [`06-improvement-plan.md`](./06-improvement-plan.md) item 13 (product decision open).

---

## 4. Verified correct — do not re-audit

Three things were checked and are right. Recording them so the next pass does not spend time on them:

| Claim | Evidence |
| --- | --- |
| The legacy `images` bucket's read policy **is** org-scoped — closes the previous audit's unverified item #11 | `supabase/migrations/20260304000001_storage_images.sql:51-58` (`foldername(name)[1] = public.user_org_id()`) |
| Deleting a media row **cannot** leave an orphan dedup hash | `dedup_hashes_media_item_id_fkey … ON DELETE CASCADE`, `supabase/migrations/20260327124000_prepare_images_fk_decoupling_phase1.sql:64-67` |
| `check_dedup_hashes` derives the tenant **server-side** — the opposite of UP-01's defect shape | `supabase/migrations/20260611120000_dedup_hashes_org_scope.sql:77` |

---

## 5. What still needs a runtime

Same limitation as the previous audit. These are the checks that would settle the findings above:

| Finding | Check |
| --- | --- |
| NF-01 | Upload a photo, replace it, re-upload the original; assert it is stored rather than skipped |
| NF-02 | Cancel a replace in the window between the row update and completion; inspect `storage_path` |
| NF-03 | Start an upload, sign out mid-flight, then list the bucket prefix and query the row as an admin |
| NF-04 | Submit a folder containing the same photo twice; count resulting `media_items` rows |
| NF-08 | Convert a ~20 MB HEIC and check whether the JPEG exceeds 25 MiB on a real device |
| NF-09 | Instrument `convertToJpeg` with a call counter and submit a batch of HEICs |
| NF-38 | **Done (2026-09-10):** byte-identical `heic2any` output and stable `photo_v1` hashes for synthetic fixtures — see § 3. Remaining gap: real device-export HEIC fixture ([`06-improvement-plan.md`](./06-improvement-plan.md) item 7). |
| NF-39 | Upload a GPS photo with geocoder stubbed to fail; assert user sees failure or pending state, not silent `complete`. Upload same photo with slow geocoder; assert `complete` does not precede address row. |
