# 06 — Duplication, dead code and ownership (Phase 6)

**Commit:** `8e4b1e09` · **Method:** grep sweeps plus a reference-count pass (throwaway script, scratchpad only) over every `export` in the 129 non-test files, cross-checked against the whole of `apps/web/src/app` including templates. Path shorthand as in earlier phases.

---

## 1. Semantic duplication

### 1.1 Cancellation cleanup — four routines, one of them correct

This is the highest-consequence duplication in the subsystem: **four independent cancellation paths, each leaving different residue.**

| # | Routine | Site | Removes storage object? | Deletes `media_items` row? | Awaited? |
| --- | --- | --- | --- | --- | --- |
| 1 | `handleCancelledResultBeforeFinalize` | `apps/web/src/app/core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:251-276` | **yes** (`:262`) | **yes** (`:264-267`) | yes |
| 2 | `cancelUploadManagerJob` | `apps/web/src/app/core/upload/manager/upload-manager-actions.util.ts:78-96` | yes (`:85`) | **no** | **no** — `apps/web/src/app/core/upload/upload-manager.service.ts:165-167` fires `.remove()` and discards the promise |
| 3 | `cancelAllActiveUploads` (logout) | `apps/web/src/app/core/upload/manager/upload-manager-cancel-active.util.ts:12-21` | yes (`:18`) | **no** | **no** — `apps/web/src/app/core/upload/manager/upload-manager-pipeline-host.service.ts:148-150` |
| 4 | `handleCancelledStorageCleanup` (attach only) | `apps/web/src/app/core/upload/support/upload-cancelled-storage-cleanup.util.ts:13-38`, called from `core/upload/pipelines/attach/upload-attach-pipeline.service.ts:75,205` | yes (`:30`) | **no** | yes |

Only routine 1 leaves no residue. Routines 2–4 delete the bytes and keep the row, producing a `media_items` row whose `storage_path` points at nothing — the mirror image of Phase 2 F1. Severity candidate `high`.

### 1.2 Cancellation *detection* is a regex over an English error message

```ts
// apps/web/src/app/core/upload/support/upload-cancelled.util.ts:3-5
export function isCancelledUploadJob(job: UploadJob | undefined): boolean {
  return job?.phase === 'error' && typeof job.error === 'string' && /cancelled/i.test(job.error);
}
```

Four call sites depend on it: `core/upload/pipelines/new/upload-new-pipeline.service.ts:135`, `core/upload/pipelines/attach/upload-attach-pipeline.service.ts:232`, `core/upload/pipelines/replace/upload-replace-pipeline.service.ts:65`, `core/upload/manager/upload-manager-error.util.ts:27`.

The strings it matches are written at `core/upload/manager/upload-manager-actions.util.ts:92` (`'Upload cancelled by user.'`), `core/upload/manager/upload-manager-pipeline-host.service.ts:155-156` (`'Upload cancelled — user signed out.'`) and `core/upload/support/upload-file-persist.util.ts:64,87,137,208` (`'Upload cancelled by user.'`). **Translating any of them silently turns every cancelled job into a hard error**, because cancellation has no phase of its own (`03-branch-matrix.md` Y3). This is the same anti-pattern as `getIssueKind`'s status-label matching (`03-branch-matrix.md` C5) — presentation text used as control flow, twice, independently. Severity candidate `high`.

### 1.3 `withTimeout` — an exact duplicate, and the shared copy is dead

`apps/web/src/app/core/upload/support/upload-timeout.util.ts:1-20` and the private `withTimeout` at `apps/web/src/app/core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:299-318` are the **same 20 lines**: same `Promise.race`, same `setTimeout`, same `finally { clearTimeout }`. The shared one has **zero importers**; the pipeline uses its private copy.

This also corrects a plan assumption: plan § 4 Phase 7 lists `support/upload-timeout.util.ts` as the place to check timeout handling. It is not executed. The live timeout is the private copy.

### 1.4 The dedup family — five files, no real overlap

Plan § 4 Phase 6.1 flags `upload-manager-dedup.util.ts` / `upload-dedup-check.util.ts` / `upload-dedup-match.util.ts` / `upload-dedup-skip.util.ts` / `upload-dedup-eligibility.util.ts` as duplication candidates. **Refuted.** Read end to end they form a clean chain with no repeated logic:

| File | LOC | Role |
| --- | --- | --- |
| `core/upload/manager/upload-manager-dedup.util.ts` | 25 | the RPC call only (`check_dedup_hashes`) |
| `core/upload/support/upload-dedup-eligibility.util.ts` | 6 | media-type gate |
| `core/upload/support/upload-dedup-check.util.ts` | 64 | orchestrates hash → RPC → match |
| `core/upload/support/upload-dedup-match.util.ts` | 64 | same-user vs colleague routing |
| `core/upload/support/upload-dedup-skip.util.ts` | 29 | the skip write |

Five files for 188 LOC is granular, but each has one reason to change. The real dedup defect is behavioural, not structural: the chain is **invoked twice per job** (`02-happy-path.md` F5).

### 1.5 The error family — three files, one genuine overlap

| File | LOC | Role | Verdict |
| --- | --- | --- | --- |
| `core/upload/manager/upload-manager-fail.util.ts` | 26 | the fail *sequence* (abort → markDone → failJobState → progress → drain) | distinct |
| `core/upload/manager/upload-manager-error.util.ts` | 37 | the catch-all: cancelled? → quiet path, else `failJob` | distinct |
| `core/upload/support/upload-error-messages.util.ts` | 159 | raw error → user copy | distinct |

No duplication between the three. **But** `upload-error-messages.util.ts` overlaps `describeUploadPersistError` in `core/upload/support/upload.service.util.ts:172-203`, which it imports and then re-shapes — two error-description layers over the same input. Minor; severity `low`.

### 1.6 A superseded panel service that was never deleted — 316 LOC

`apps/web/src/app/features/upload/upload-panel/upload-panel-dialog-handlers.service.ts` has **zero importers** anywhere in `apps/web/src` (`01-structure.md` § 5) yet duplicates the live `upload-panel-dialog-actions.service.ts` method-for-method:

| Dead (`upload-panel-dialog-handlers.service.ts`) | Live (`upload-panel-dialog-actions.service.ts`) |
| --- | --- |
| `onLocationAddressDialogQueryInput` `:131` | `onLocationAddressDialogQueryInput` `:114` |
| `updateLocationFromAddressSuggestion` `:150` | `onLocationAddressSuggestionApply` `:201` |
| `openProjectSelectionDialog` `:228` | `openProjectAssignmentForJob` `:354` |
| `onProjectSelectionDialogSelected` `:253` | `onProjectSelectionDialogSelected` `:247` |
| `onProjectSelectionDialogCancelled` `:257` | `onProjectSelectionDialogCancelled` `:305` |
| `onDuplicateResolutionApplyToBatchChange` `:273` | `onDuplicateResolutionApplyToBatchChange` `:310` |
| `openLocationAddressDialog` `:108` / `closeLocationAddressDialog` `:121` | `onLocationAddressDialogClose` `:135` |

It injects `SupabaseService` (`:53`) and issues writes (`:234`). A textbook breach of root `AGENTS.md` § Change-Completeness Rule ("A change is not done until the thing it replaces is gone"). Severity `medium`, effort `S` — deleting it is a pure removal.

### 1.7 Three haversine implementations, one local to upload

`apps/web/src/app/core/upload/pipelines/new/upload-new-post-save.util.ts:308-320` defines a private `haversineMeters`. Independent implementations also live at `apps/web/src/app/core/search/search-bar-helpers.ts:245-252`, `apps/web/src/app/core/search/engine/search-engine.ts:631-638`, and (in km) `apps/web/src/app/core/location-path-parser/disambiguation-algorithms.ts:51`. Same earth radius `6371000`, same formula. Severity `low`.

### 1.8 Three overlapping "branch" unions and one duplicated type

Carried from `04-state-machine.md` § 5.7: `UploadGeocodeBranch` (4 members, `core/upload/address-resolution/upload-address-resolution.types.ts:64`), `GeocodeCompletenessBranch` (5, `apps/web/src/app/core/location-path-parser/upload-search-object.completeness.helpers.ts:8-13`), `LocalResolutionGate` (6, `core/upload/location/upload-location-resolution.helpers.ts:118-124`) — nested supersets of one domain concept under three names. Plus `UploadTrayStep` declared **identically twice** at `core/upload/upload-manager.types.ts:123` and `core/upload/address-resolution/upload-address-resolution.types.ts:66`. Severity `medium`.

---

## 2. Deprecated / legacy / TODO markers — the complete list

Twelve markers in production code. Classification per plan § 4 Phase 6.2:

| # | Marker | Site | Classification |
| --- | --- | --- | --- |
| 1 | `@deprecated Use resolveUploadPhaseInputs from upload-location-inputs.helpers.ts` | `core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:148` | **dead** — `resolveUploadLocationInputs` has exactly one reference, its own `.spec.ts:2,25,31`. A deprecated shim kept alive solely by the test that tests it. |
| 2 | `@deprecated Removed — project location is bias-only (Branch B)` | `core/upload/location/upload-location-resolution.service.ts:100` | **dead delegation** — see below |
| 3 | `@deprecated Removed — project location is bias-only (Branch B)` | `core/upload/location/upload-location-tray-flow.service.ts:83` | **dead stub** — see below |
| 4 | `Legacy free-text search when no grouping key on job` | `core/upload/location/upload-location-placement.service.ts:74` | **live** — see § 3 |
| 5 | `Merge filename/folder title candidates onto the job (legacy fallback)` | `core/upload/pipelines/new/upload-new-pre-resolve.util.ts:50` | **live** — see § 3 |
| 6 | `Phase 3–4 after orchestrator or legacy geocode` | `core/upload/pipelines/new/upload-new-pre-resolve.util.ts:184` | **live** (comment only) |
| 7 | `Stable tray group key. Prefer Search Object groupingKey; legacy fallback uses title + folder` | `core/upload/location/upload-location-resolution.helpers.ts:63` | **live** — see § 3 |
| 8 | `Single-line toast text from structured upload failure (legacy / panel status)` | `core/upload/support/upload-error-messages.util.ts:154` | **live**; the word "legacy" is misleading — `uploadFailureMessageToToastText` is called from `core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:296`. **Undecided → relabel.** |
| 9 | `Delete from primary media_items table by media id or legacy source image id` | `core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:263` | **live** — `source_image_id` is a real column per `docs/glossary.md` § Image / Media Item |
| 10 | `Optional setAutoSwitchCallback (legacy hook; not invoked …)` | `features/upload/upload-panel/upload-panel-lifecycle.service.ts:18` | **dead** — self-documented as never invoked |
| 11 | `Legacy hook: nothing in this service invokes the callback today` | `features/upload/upload-panel/upload-panel-lifecycle.service.ts:48` | **dead** — the second half of #10 |
| 12 | `TODO(brn-sheet): BrnSheet was evaluated for the map floating mode but deferred` | `features/upload/upload-panel/upload-panel.component.ts:124` | **undecided** — a genuine deferred decision, correctly labelled |

### Markers 2 and 3 — plan § 6 lead 4 resolved: the removal is **behaviourally complete, structurally incomplete**

```ts
// apps/web/src/app/core/upload/location/upload-location-tray-flow.service.ts:86-89
async registerBatchProjectTrayIfNeeded(_batchId: string): Promise<void> {
  void _batchId;
  return;
}
```

The implementation is an empty stub, so **no project-location address fallback can run** — the removal succeeded. But three artefacts of the removed feature survive:

1. the stub itself (`upload-location-tray-flow.service.ts:83-90`),
2. the facade delegation to it (`core/upload/location/upload-location-resolution.service.ts:99-105`), which has **no caller other than itself** (`grep -rn registerBatchProjectTrayIfNeeded apps/web/src` returns only the two declarations and the one delegating call),
3. `apps/web/src/app/core/upload/support/upload-batch-project-tray.helpers.ts` (27 LOC, `detectProjectAddressTrayScenario`, `ProjectAddressTrayScenario`) — imported **only** by its own `.spec.ts`.

Root `AGENTS.md` § Change-Completeness Rule names exactly this pattern, citing the same subsystem (`project_address_a`/`project_address_b`, `docs/ai-diary/2026-06-13.md`). **Answer to lead 4: both call paths are dead; the deletion was never finished.** Severity `medium`, effort `S`.

---

## 3. Two location paths, or one? (plan § 6 lead 3 — resolved: **two, both live**)

| Path | Trigger | Site |
| --- | --- | --- |
| **Search Object** | `job.groupingKey` set by `classifyBatch` **and** `highConfidence` title | `core/upload/pipelines/new/upload-new-pre-resolve.util.ts:343-365` → `locationResolution.applyPreResolveFromOrchestrator(jobId)` |
| **Legacy fallback** | anything else — `highConfidence` without a `groupingKey` (`:367-379`), or low confidence (`:381-389`) | both funnel into `completePlacementAfterLocationResolve` (`:187-284`), which forward-geocodes via `resolveJobTitleAddress` (`:243`) |

Three further legacy branches sit under that fallback:

- `core/upload/pipelines/new/upload-new-pre-resolve.util.ts:65-90` — the Search Object intake short-circuit; the `else` branch below it (`:92-147`) is the legacy filename/folder merge.
- `core/upload/location/upload-location-placement.service.ts:74` — "Legacy free-text search when no grouping key on job".
- `core/upload/location/upload-location-resolution.helpers.ts:63` — the group key falls back to `title + folder` when `groupingKey` is absent.

**Both paths are reachable in production**, and the discriminator is `job.groupingKey`, which is `undefined` whenever `classifyBatch` did not produce a Search Object for that file — i.e. for every single-file `submit()` of a photo with no address in its name (the Phase 2 happy path took the legacy route at `:381`). The "legacy" path is therefore **the common case**, not an edge case.

**Which inputs select which is `unverified`:** proving the frequency split needs `classifyBatch`'s classifier read end to end (`core/upload/address-resolution/upload-address-resolution.orchestrator.ts`, 620 LOC) — the same pass deferred as `03-branch-matrix.md` § 9 L12. Severity of the ambiguity itself: `medium`; the naming ("legacy" for the default path) is actively misleading.

---

## 4. Dev flags — plan § 6 lead 6 (resolved in Phase 3, restated with the dead-code consequence)

`USE_TRAY_ORCHESTRATOR` is `export const … = true` (`core/upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.types.ts:10`), so `useOrchestrator` in `features/upload/upload-resolver-tray/upload-resolver-tray.component.ts:96-99` is **statically true**. Consequences:

- **13 unreachable guards** in the tray component at `:109, :113, :118, :127, :144, :151, :216, :241, :278, :391, :422, :429` (and the `:96` computation itself).
- Two more constant-folded guards at `core/upload/location/upload-location-disambiguation-registration.service.ts:124` and `core/upload/support/upload-pre-resolve-wave.service.ts:34,63`.
- `UPLOAD_DEV_FLAGS.useTrayOrchestrator` (`features/upload/upload-dev-flags.ts:11`) has **no effect whatsoever** — flipping it changes nothing.

`mockResolverTray` is a live flag that ships in the production bundle: `upload-resolver-tray.component.ts:342-347` seeds the orchestrator from `upload-resolver-tray.mock-orchestrator.ts` in `ngOnInit`. Answer to plan § 4 Phase 6.3: **yes, the mock path is reachable in a production build** — one constant away.

`upload-resolver-tray.mock.ts` (109 LOC) is a *different* mock with **zero importers**, despite its own header claiming `mockResolverTray` gates it (`:1-3`). Fully dead.

---

## 5. Dead code inventory

### 5.1 Whole files with no importer anywhere in `apps/web/src`

| File | LOC | Note |
| --- | --- | --- |
| `apps/web/src/app/features/upload/upload-panel/upload-panel-dialog-handlers.service.ts` | 316 | superseded duplicate (§ 1.6); injects Supabase and writes |
| `apps/web/src/app/features/upload/upload-resolver-tray/upload-resolver-tray.mock.ts` | 109 | § 4 |
| `apps/web/src/app/core/upload/support/upload-timeout.util.ts` | 20 | exact duplicate of a private copy (§ 1.3) |
| `apps/web/src/app/core/upload/pipelines/attach/upload-attach-hash.util.ts` | — | sole export `computeAttachContentHash` (`:5`) never referenced |
| `apps/web/src/app/core/upload/upload.helpers.ts` | — | required by the module-symmetry rule; satisfies it with zero content in use |

**≈ 500 LOC across 5 files.**

### 5.2 Test-only files

`apps/web/src/app/core/upload/support/upload-batch-project-tray.helpers.ts` (27 LOC) — imported only by its own spec; belongs to the removed project-tray feature (§ 2).

### 5.3 Dead exports inside live files

Verified by counting references across the whole app *and* within the declaring file, so "used privately but over-exported" is excluded:

| Symbol | Site | Note |
| --- | --- | --- |
| `hashAndCheckDedupForNewJob` | `core/upload/pipelines/new/upload-new-prepare-route.util.ts:286` | zero references; superseded by the two `finishPreResolveDedup` calls |
| `computeAttachContentHash` | `core/upload/pipelines/attach/upload-attach-hash.util.ts:5` | zero references (whole file dead) |
| `bindMockOrchestratorDependencies` | `features/upload/upload-resolver-tray/upload-resolver-tray.mock-orchestrator.ts:76` | zero references |
| `optionDisplayLabel` | `features/upload/upload-resolver-tray/upload-resolver-tray.helpers.ts:118` | zero references |
| `DEFAULT_FILE_TYPE_CHIPS` | `features/upload/upload-panel/upload-panel.constants.ts:46` | zero references |
| `resolveUploadLocationInputs` | `core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:149` | referenced only by its own spec (§ 2 marker 1) |
| `detectProjectAddressTrayScenario` | `core/upload/support/upload-batch-project-tray.helpers.ts:11` | referenced only by its own spec |
| `removeGroupMapping` | `core/upload-resolver-tray-orchestrator/adapters/upload-location-tray-producer.adapter.ts:147` | zero references anywhere; found 2026-09-10 while writing the adapter's spec (P5/UP-28) — not in the original 2026-09-08 sweep |

### 5.4 Dead union members

`issueKind: 'duplicate_photo'` (`core/upload/upload-manager.types.ts:105`) — no write site, read in 10 places; `UploadTrayStep '2'` (`:123`) — no write site. Both detailed in `04-state-machine.md` § 4.

### 5.5 Committed throwaway migration scripts

`apps/web/scripts/split-upload-panel.cjs`, `split-upload-panel.js`, `split-upload-panel-phase1.cjs`, `split-upload-panel-phase2.cjs`, `move-upload.cjs`, `move-upload2.cjs`, `extract-upload-phase-helpers.mjs` — one-shot refactor scripts still in the tree; two of them contribute eslint **errors** to the baseline (`00-baseline.md` § 6). Severity `low`.

---

## 6. File hygiene — the ten largest files

Plan § 10 required reading these in full; the "concerns" column reflects that reading.

| LOC | File | Concerns mixed |
| --- | --- | --- |
| 620 | `apps/web/src/app/core/upload/address-resolution/upload-address-resolution.orchestrator.ts` | Search Object classification, group state machine (7 statuses, 17 write sites), geocode dispatch, tray registration triggers |
| 618 | `apps/web/src/app/features/upload/upload-resolver-tray/upload-resolver-tray.component.ts` | presentation, orchestrator adaptation, **13 dead guards** (§ 4), dev-flag branches, mock seeding, carousel state |
| 614 | `apps/web/src/app/core/upload/location/upload-location-resolution.helpers.ts` | group-key derivation, candidate mapping, SO classification, EXIF-authority heuristics, locality hints |
| 559 | `apps/web/src/app/core/upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.service.ts` | bundling window, presentation queue, item dependency chains, backlog |
| 520 | `apps/web/src/app/features/upload/upload-panel/upload-panel-item.component.ts` | row rendering, action-availability computation for 6 issue kinds, menu wiring, overlay state |
| 509 | `apps/web/src/app/core/upload/location/upload-location-tray-flow.service.ts` | four tray kinds (`admin_level_conflict`, `containment_check`, `layer_package`, `house_step`), plus the dead project-tray stub |
| 458 | `apps/web/src/app/features/upload/upload-panel/upload-panel-dialog-actions.service.ts` | address dialog, project dialog, duplicate dialog, **direct Supabase access** (`:64,360`), lane switching (§ 7) |
| 443 | `apps/web/src/app/core/upload/upload-manager.service.ts` | 18 injected services, 3 dep-bundle builders, 7 signals, 11 event subjects, 16 public methods, mojibake header |
| 396 | `apps/web/src/app/core/upload/upload-manager.types.ts` | the module's centre of gravity: fan-in 60 (`01-structure.md` § 4) |
| 390 | `apps/web/src/app/core/upload/pipelines/new/upload-new-pre-resolve.util.ts` | title merge, dedup gating (twice), placement, three routing branches |

Eight of the ten exceed the eslint `max-lines` warning of 200; the subsystem contributes **21 eslint errors and 224 warnings** to the baseline (`00-baseline.md` § 6).

### Lint-rule evasion

`apps/web/src/app/core/upload/pipelines/new/upload-new-pipeline.service.ts:63`:

```ts
private static readonly UPLOAD_PHASE_TIMEOUT_MS = Number('180000');
```

`Number('180000')` is a literal wrapped to defeat the `no-magic-numbers` rule. Severity `low`, but it means the timeout is invisible to a search for the number.

### Console noise in production paths

**38 `console.*` calls** in non-test upload code: 12 `log`, 9 `info`, 8 `error`, 5 `warn`, 4 `debug`. Thirteen are in `core/upload/address-resolution/upload-address-resolution.debug.ts` (intentional, gated). The rest are not gated — `core/upload/manager/upload-manager-drain.util.ts:36,42,50` alone emit **three lines per queue drain**, and a drain fires after every job transition, so a 500-file folder import produces thousands of console lines. `core/upload/pipelines/attach/upload-attach-pipeline.service.ts` has 6, `core/upload/manager/upload-manager-actions.util.ts:191-195,227` logs on every attach. Severity `low`, effort `S`.

---

## 7. Ownership finding: six auto lane-switches against a P0 rule

`docs/specs/component/upload/upload-panel.feedback-triage.md:48` records a **P0** contract:

> "Keep currently selected lane stable after resolution actions; **never auto-switch lane/tab unless user explicitly changes it.**"

Six production call sites do exactly that, each immediately after a resolution action:

| Site | After |
| --- | --- |
| `apps/web/src/app/features/upload/upload-panel/upload-panel-dialog-actions.service.ts:275` | assign-to-project from the project dialog |
| `apps/web/src/app/features/upload/upload-panel/upload-panel-dialog-actions.service.ts:334` | `upload_anyway` in the duplicate dialog |
| `apps/web/src/app/features/upload/upload-panel/upload-panel-bulk-actions.service.ts:70` | bulk retry |
| `apps/web/src/app/features/upload/upload-panel/upload-panel-menu-action-router.service.ts:62` | `upload_anyway` row action |
| `apps/web/src/app/features/upload/upload-panel/upload-panel-menu-action-router.service.ts:69` | `candidate_select` row action |
| `apps/web/src/app/features/upload/upload-panel/upload-panel-menu-action-router.service.ts:82` | `retry` row action |

All six call `setLane('uploading')`. This resolves `03-branch-matrix.md` **C7 with a `no` verdict**: the P0 the triage document was written to fix is violated in six places. Severity candidate `high`, effort `S`.

### Also resolved here (was `03-branch-matrix.md` § 9)

Reading `upload-panel-dialog-actions.service.ts:318-351` settles three deferred rows:

- **D5 `reject`** — falls through to `dismissFile(entry.id)` for every target (`:348-350`). **Matches spec.**
- **D6 "apply to all in batch"** — implemented via `resolveDuplicateResolutionTargets(job, applyToBatch)` (`:325-328`); all three choices honour it. **Matches spec.**
- **D3 `use_existing` links project context** — it does **not**: `:337-343` opens the existing media and then dismisses the jobs, with no project link. `dedup.md`'s unchecked AC ("`use_existing` links project context when batch has project filter") is therefore **correctly unchecked — the behaviour is simply not implemented.** Verdict: spec and code agree that it is missing.

---

## 8. Encoding damage (plan § 6 lead 7 — confirmed, scope measured)

Double-encoded UTF-8 (`ÃƒÂ¢Ã¢â‚¬Â¦` sequences, originally box-drawing and dash characters) in **11 upload-scope files**, plus exactly **one** file outside the subsystem (`apps/web/src/app/core/workspace-view/workspace-view.service.ts`) — 12 repo-wide.

| Occurrences | File |
| --- | --- |
| 14 | `apps/web/src/app/core/upload/upload.service.spec.ts` |
| 12 | `apps/web/src/app/core/upload/upload-manager.service.ts` |
| 9 | `apps/web/src/app/core/upload/support/upload-enrichment.service.ts` |
| 8 | `apps/web/src/app/core/upload/upload-manager.types.ts` |
| 7 | `apps/web/src/app/core/upload/pipelines/new/upload-new-pipeline.service.ts` |
| 6 | `apps/web/src/app/core/upload/pipelines/new/upload-new-prepare-route.util.ts` |
| 5 | `apps/web/src/app/core/upload/pipelines/attach/upload-attach-pipeline.service.ts` |
| 5 | `apps/web/src/app/core/upload/upload-manager.service.spec.ts` |
| 3 | `apps/web/src/app/core/upload/support/upload-conflict.service.ts` |
| 1 | `apps/web/src/app/core/upload/upload.service.ts` |
| 1 | `apps/web/src/app/core/upload/pipelines/new/upload-new-prepare-route.util.spec.ts` |

**It does not reach the UI.** Only four occurrences sit inside string literals, and all four are `console.error` arguments or test titles: `core/upload/pipelines/attach/upload-attach-pipeline.service.ts:139,219`, `core/upload/pipelines/new/upload-new-prepare-route.util.spec.ts:13`, `core/upload/upload.service.spec.ts:333`. Everything else is comment decoration. Severity `low`, effort `S` — but it must be fixed with a re-encode, not a hand edit, and the whole-file rewrite makes it worth doing as its own commit.

---

## 9. Answers this phase settles

| Plan § 3 question | Answer |
| --- | --- |
| **Q5 — one location-resolution path or two?** | **Two, both live** (§ 3). The discriminator is `job.groupingKey`; the branch labelled "legacy" is the default for a plain single-file photo upload. |
| **Q11 — unreachable, duplicated, or test-only code** | 5 dead files ≈ 500 LOC (§ 5.1), 1 test-only file, 7 dead exports, 2 dead union members, 13 dead tray guards, 7 committed throwaway scripts. The `mockResolverTray` path **is** in the production bundle. |
| **Plan § 6 lead 3** | resolved — § 3 |
| **Plan § 6 lead 4** | resolved — behaviourally complete, structurally incomplete (§ 2) |
| **Plan § 6 lead 6** | refuted — no second tray path exists, only its dead shell (§ 4) |
| **Plan § 6 lead 7** | confirmed — 11 files in scope, 12 repo-wide, no UI impact (§ 8) |

## 10. Not verified in this phase

| Claim not made | Check needed |
| --- | --- |
| Which of the two location paths runs more often in practice (§ 3) | Read `core/upload/address-resolution/upload-address-resolution.orchestrator.ts` (620 LOC) end to end, or instrument `classifyBatch` against a real folder — the pass deferred as `03-branch-matrix.md` § 9 L12 |
| That the 13 dead tray guards are dead **after** bundling | The claim is source-level constant folding; confirming that esbuild drops them needs a bundle inspection of `apps/web/dist/web` |
| That no duplication exists between `core/upload/location/*` and `core/upload/address-resolution/*` | Those two folders total 4,960 LOC; only the files named in the plan were compared. A structural clone-detection pass was not run. |
| Dead **private** members inside the ten large files | The reference scan covered `export`ed symbols only |
