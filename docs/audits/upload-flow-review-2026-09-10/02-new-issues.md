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
