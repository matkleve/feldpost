# 09 — Test and spec-quality coverage (Phase 9)

**Commit:** `8e4b1e09`

> **Governing constraint.** `npx ng test --watch=false` exits 1 with 101 TypeScript errors across 26 spec files; **zero tests execute** (`00-baseline.md` § 4). Everything below therefore reports coverage **as written**. Not one assertion in this repository is currently known to pass or fail. Six of the eleven upload-scope compile errors are stale-test-after-production-change signatures — the suite is not merely broken, it has drifted away from the code it tests.

---

## 1. The corpus

**43 spec files, 326 `it(` blocks, 7,054 LOC** across the audit scope. Distribution:

| Area | Spec files | `it(` blocks | Non-test LOC covered |
| --- | --- | --- | --- |
| `core/upload` root (`upload.service`, `upload-manager.service`, folder integration) | 3 | **90** | 1,050 |
| `core/upload/location/` | 8 | 60 | 3,853 |
| `core/upload/support/` | 5 | 26 | 2,028 |
| `core/upload/pipelines/new/` | 5 | 19 | 1,576 |
| `core/upload/manager/` | 2 | 8 | 1,401 |
| `core/upload/address-resolution/` | 2 | 12 | 1,107 |
| `core/upload-resolver-tray-orchestrator/` | 2 | 10 | 1,092 |
| `features/upload/upload-panel/` | 13 | 71 | 4,437 |
| `features/upload/upload-resolver-tray/` | 2 | 20 | 948 |
| `features/upload` root | 1 | 7 | 119 |
| **`core/upload/pipelines/replace/`** | **0** | **0** | **351** |
| **`core/upload/pipelines/attach/`** | **0** | **0** | **761** |
| `core/upload/adapters/`, `…/upload-resolver-tray-orchestrator/adapters/`, `features/upload/upload-shell/` | 0 | 0 | 675 |

**Two of the three pipeline modes have no test file at all.** 13 files / 1,112 LOC of `replace` and `attach` — including the only writers of the `replacing_record` phase and three of the four cancellation routines — are untested and, per `05-spec-drift.md`, also unspecced beyond a paragraph in the parent.

Keyword sweep over all 326 test titles: `conflict` 28, `folder` 29, `source` 21, `geocode` 13, `tray` 12, `duplicate` 8, `dedup` 4, `document` 4, `cancel` 3, `webkit` 3, `retry` 2, `heic` 2, `video` 1, `timeout` 1, `concurrency` 1, **`attach` 0, `logout` 0, `beforeunload` 0**.

---

## 2. Branch matrix → test map

Level: **U** unit (pure function), **C** component DOM, **I** integration (multi-service), **M** mock-only (would not catch a real regression), **—** none.

| Branch | Covering spec file(s) | Level | Would it catch a regression? |
| --- | --- | --- | --- |
| I1 multi-file `submit()` | `upload-manager.service.spec.ts`, `upload-panel.intake.spec.ts` | I + C | yes |
| I2 FSA folder | `upload-folder-upload.integration.spec.ts`, `upload-manager-submit.util.spec.ts` | I + U | yes |
| I3 webkit folder | 3 titles in the folder specs | U | partly — the spec's 5-row path matrix is not asserted row by row |
| I4 drag & drop files | `upload-panel.drag-lanes.spec.ts` (12) | C | yes |
| **I5 drag & drop folder** | — | — | **no test, and no implementation** (`03-branch-matrix.md` I5) |
| I6 empty selection | — (behaviour only in `upload-manager-submit.util.spec.ts` indirectly) | — | no |
| I7/I8 type + size validation | `upload.service.spec.ts` (45) | U | yes |
| I10 `Project:` folder token | `upload-manager-submit.util.spec.ts` | U | yes |
| I11 nested hierarchy hints | `upload-folder-upload.integration.spec.ts` | I | yes |
| **I12 replace entry** | — | — | **no** |
| **I13 attach entry** | — | — | **no** |
| M1 photo hashing | `content-hash.util.spec.ts` (14) | U | yes |
| M2 HEIC conversion success | 2 titles, both about the tray gate | U | **no** — conversion itself is untested |
| **M3 HEIC failure must terminate** | — | — | **no** — a normative MUST with no test |
| M4 video dedup | 1 title (MIME catalogue) | U | partly |
| M5 13 document types | `upload.service.spec.ts` | U | yes |
| M6 preview generation follow-up | — | — | no |
| M7 document classification | 4 titles | U | **no** — neither classifier is compared against the other |
| D1/D2 same-user vs colleague | `upload-dedup-match.util.spec.ts` (3) | U | yes |
| D3/D5/D6 duplicate dialog choices | — | — | **no** (behaviour verified by reading in `06-health.md` § 7) |
| D4 `upload_anyway` | — | — | no |
| D7 hash algorithms | `content-hash.util.spec.ts` | U | yes |
| **D10 dedup runs twice** | — | — | **no** — a test asserting a single RPC per job would have caught it |
| L1/L2 location mode | `upload-panel.placement.spec.ts` (12) | C | yes |
| L3 session override map | — | — | **no** |
| L4/L5 Phase 0–1 | `upload-new-prepare-route.util.spec.ts` (6), `upload-new-pre-resolve.util.spec.ts` (6) | U | yes |
| L6 text-before-EXIF | `upload-location-resolution.helpers.spec.ts` (13) | U | yes |
| L7/L8 source agreement + tray | `upload-location-precedence.helpers.spec.ts` (10), 21 "source" titles | U | partly — candidate **ids** are covered, the 4-row placement-effect table is not |
| L9 idempotency | — | — | **no** — the singleflight and the choice store have no concurrency test |
| L10/L11 late-job replay, forbidden shortcut | — | — | **no** — a normative **Forbidden** with no test |
| L12 Branch C city tray | `upload-location-tray-flow.service.spec.ts` (7), `upload-resolver-tray.helpers.spec.ts` (16), `upload-resolver-tray.component.spec.ts` (4) | U + **M** | **partly** — the component spec drives `upload-resolver-tray.mock-orchestrator.ts`, i.e. it exercises the mock, not the producer adapter |
| L13/L14 Branch A / EXIF-only | `upload-location-precedence.helpers.spec.ts` | U | yes |
| L16 far-hit filter | 13 "geocode" titles | U | partly |
| L20 tray Continue gate | `upload-tray-resolution-gate.helpers.spec.ts` (2) | U | yes for the two conditions; **no** for the `answerKind:'text'` exception |
| C1/C2 conflict flow | 28 "conflict" titles, `upload-manager.service.spec.ts` | I | yes |
| **C3 requeue-at-front** | `upload-manager-queue.util.spec.ts` (2) | U | **no** — the tests assert FIFO, which is what the code does; nothing asserts the documented "front" behaviour, so the drift is invisible |
| C4 issueKind inventory | `upload-phase.helpers.spec.ts` (7) | U | partly — `duplicate_photo`'s deadness is not detectable |
| C5 `getIssueKind` label matching | `upload-phase.helpers.spec.ts` | U | **it tests the anti-pattern rather than flagging it** |
| C8 Action 8f | — | — | **no** |
| Y1 retry | 1 title | C | partly |
| Y2 dismiss | 1 title | C | partly — the object-URL leak is not asserted |
| Y3 cancel | 3 titles, incl. "cancels a queued job" | I | **no** for the residue (storage removed, row kept) |
| Y4 cancel batch | — | — | no |
| **Y5 logout** | — | — | **no** (0 titles) |
| **Y6 `beforeunload`** | — | — | **no** — and the AC is ticked (`05-spec-drift.md` C2) |
| Y8 concurrency 3 / FIFO | `upload-manager-queue.util.spec.ts` | U | yes |
| **Y10 six phase writes emit no event** | — | — | **no** |
| U1–U4 uploaded-lane actions | `upload-panel.creation-dom.spec.ts` (17), `upload-panel.status.spec.ts` (7), `upload-panel.map-pick.spec.ts` (5) | C | partly |

### Mock-only coverage (plan § 4 Phase 9.1)

Two spec files assert against fixtures rather than production producers:

- `apps/web/src/app/features/upload/upload-resolver-tray/upload-resolver-tray.component.spec.ts:12` imports `upload-resolver-tray.mock-orchestrator`, so the tray's four tests exercise a hand-written bundle, not `core/upload-resolver-tray-orchestrator/adapters/upload-location-tray-producer.adapter.ts` (349 LOC, **0 tests**).
- `apps/web/src/app/core/upload/support/upload-batch-project-tray.helpers.spec.ts` tests `detectProjectAddressTrayScenario`, a helper belonging to the **removed** project-tray feature (`06-health.md` § 2). It is a test for behaviour that no longer exists.

---

## 3. Coverage of the failure matrix

**0 of the 30 rows in `07-failure-modes.md` has a test.** Not one storage-orphan, timeout, cancellation-residue, RLS-denial or unhandled-rejection path is asserted anywhere.

---

## 4. The highest-value missing tests

Ordered by the severity of the defect each would have caught. Each is a ready-to-implement description, not an implementation (plan § 4 Phase 9.2). All are unit or integration tests runnable under `@angular/build:unit-test` (Vitest) — **none needs a browser or a backend.**

| # | File to create | Scenario | Assertion | Would have caught |
| --- | --- | --- | --- | --- |
| T1 | `apps/web/src/app/core/upload/support/upload-file-persist.util.spec.ts` | stub `supabaseClient` so `storage.upload` resolves and the `media_items` insert returns `{ error }` | `storage.from('media').remove` was called with the same `storagePath` | **F1.1 blocker** — orphaned object, and the falsely ticked AC `upload-manager.md:277` |
| T2 | `apps/web/src/app/core/upload/manager/upload-manager-actions.util.spec.ts` | `cancelUploadManagerJob` on a job that already has `mediaId` **and** `storagePath` | both the storage removal **and** a `media_items` delete are issued | **F1.2/F1.3/F1.4** — row kept after the object is deleted |
| T3 | `apps/web/src/app/core/upload/manager/upload-manager-effects.util.spec.ts` | drive `isBusy() === true`, capture the handler passed to `addBeforeUnloadListener`, invoke it with a fake `BeforeUnloadEvent` | the handler calls `preventDefault()` or sets `returnValue` | **F2** — the empty `beforeunload` handler |
| T4 | `apps/web/src/app/core/upload/pipelines/new/upload-new-run-upload-phase.util.spec.ts` (extend) | fake timers; make `uploadFile` resolve **after** the 180 s race rejects | the abort signal was aborted, or no `media_items` row is created afterwards | **F1.5** — the timeout that never aborts |
| T5 | `apps/web/src/app/core/upload/pipelines/new/upload-new-pre-resolve.util.spec.ts` (extend) | run `runPreUploadLocationResolve` for one job on the EXIF-only path | `ctx.checkDedupHash` is called **exactly once** | **F5/D10** — the double dedup RPC |
| T6 | `apps/web/src/app/core/upload/support/upload-job-state.service.spec.ts` (new) | `failJob` on a job already in `complete` | phase stays `complete`; no `uploadFailed$` emission | **T4 in `04-state-machine.md`** — `complete → error`, and root `AGENTS.md` § State-machine invariants |
| T7 | `apps/web/src/app/core/upload/manager/upload-manager-actions.util.spec.ts` | each of retry / cancel / place / assign / resolve-conflict / force-duplicate | a `jobPhaseChanged$`-equivalent event is emitted for each | **Y10** — six silent transitions |
| T8 | `apps/web/src/app/features/upload/upload-panel/upload-panel-menu-action-router.service.spec.ts` (extend) | `upload_anyway`, `candidate_select`, `retry` while the Issues lane is selected | `setLane` is **not** called | **the P0 lane-switch violation** (`06-health.md` § 7) |
| T9 | `apps/web/src/app/core/upload/pipelines/new/upload-new-prepare-route.util.spec.ts` (extend) | `convertToJpeg` rejects with `HEIC_CONVERSION_FAILED` | job reaches a terminal error phase **and** `uploadService.uploadFile` was never called with the original blob | **M3** — the normative MUST in `routing.md` Phase 0 |
| T10 | `apps/web/src/app/core/upload/support/upload-db-postwrite.util.spec.ts` (new) | `insert` returns a rejected promise | no unhandled rejection escapes | **F1.8** — the bare `.then()` |
| T11 | `apps/web/src/app/core/upload/manager/upload-manager-submit.util.spec.ts` (extend) | `classifyBatch` rejects | `drainQueue` is still called, or the batch is marked failed | **F7.1** — a whole batch frozen at `queued` |
| T12 | `apps/web/src/app/core/upload/location/upload-location-source-conflict.service.spec.ts` (new) | register the same `(batchId, groupingKey)` from two services concurrently | exactly one group is opened; the second observes the stored choice | **L9/F4.2** — the idempotency rule in `routing.md` Phase 3 |
| T13 | same file | a job entering Phase 3 **after** the group resolved, with no `titleAddressCoords` | placement comes from the stored candidate, never from text | **L11** — the explicit **Forbidden** shortcut |
| T14 | `apps/web/src/app/core/upload/pipelines/attach/upload-attach-pipeline.service.spec.ts` (new) | `verifyStoragePathWrite` observes a read-back mismatch | the job fails rather than completing | **F1.10** — RLS-denied write reported as success |
| T15 | `apps/web/src/app/core/upload/pipelines/replace/upload-replace-pipeline.service.spec.ts` (new) | the happy path for `replace` | phases `validating → parsing_exif → uploading → replacing_record → complete` | 351 LOC with **zero** tests |
| T16 | a shared helper spec | `routeJobToMissingData` vs `routeUnresolvedAfterFailedGeocode` given the same `File` with `type: ''` | both produce the same `issueKind` | **F6/M7** — the divergent document classifiers |

**T1–T3 are the ones to write first**: each targets a defect that a *ticked* acceptance criterion currently claims is handled.

**Before any of them can run, the 101 compile errors must be cleared** (`00-baseline.md` § 4). That is a prerequisite for every proposal in `11-proposals.md`, and it is why "fix the suite" is sequenced ahead of the refactor work there.

---

## 5. E2E feasibility (plan § 4 Phase 9.3)

**The plan's premise needs one correction.** `apps/web/e2e/` is not empty of upload coverage: `apps/web/e2e/phase-10-matrix.spec.ts:98-113` opens the panel (`.map-upload-btn` → `app-upload-panel`) and screenshots it per theme. What is missing is an **upload flow** — no file is ever submitted.

### What exists

| Piece | State |
| --- | --- |
| Playwright config | `apps/web/playwright.config.ts` — `testDir: './e2e'`, projects `setup`, `phase-10-chromium`, `phase-10-mobile`, `theme-smoke`, `webServer: npx ng serve --port 4200` |
| Auth setup | `apps/web/e2e/auth.setup.ts` — logs in and saves `e2e/.auth/user.json`; **skips itself** unless `FELDPOST_E2E_EMAIL` and `FELDPOST_E2E_PASSWORD` are set |
| Fixtures | `apps/web/public/vienna_sample_photos/` — **20 JPEGs**, deliberately shaped for this flow: address-bearing names, four intentional city misspellings (`Venna`, `Wiens`, `Wein`, `Viena`), two `DUP_`-prefixed duplicates of existing files, and three bare `photo_00NN.jpg` |
| Browser | Chromium is present in this container at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` |

### What it would need

1. **A test project** in `playwright.config.ts` (`upload-flow`, `dependencies: ['setup']`, `storageState: 'e2e/.auth/user.json'`).
2. **A seeded org and credentials** — the `setup` project skips without them, so CI must provide `FELDPOST_E2E_EMAIL`/`FELDPOST_E2E_PASSWORD` against a disposable organisation.
3. **A cleanup step.** The flow writes real `media_items` rows, storage objects and `dedup_hashes` rows. Without teardown the second run hits the dedup path and asserts something different — the `DUP_` fixtures make that failure mode certain.
4. **File input handling** — `page.setInputFiles()` on the panel's hidden input. Note that `onDrop` (`features/upload/upload-panel/upload-panel-input-handlers.ts:46-57`) cannot be driven this way, so drag-and-drop needs a synthesised `DataTransfer`.

### Highest-value first scenario

Submit `Rennweg 6, 03. Bezirk, Wien_0004.jpg` with auto location ON, then assert: the row reaches the Uploaded lane, a `media_items` row exists with a non-null `storage_path`, and `/media` shows it. Then submit `DUP_Rennweg 6, …_0004.jpg` and assert the same-user auto-skip. That single test would cover the Phase 2 happy path end to end **and** D1, which is currently only unit-tested.

### ⚠ A fixture defect that blocks part of this

Eight fixture filenames are **byte-level mojibake**. `Arsenalstraße` is stored as bytes `41 72 73 65 6e 61 6c 73 74 72 61 E2 94 9C C6 92 65` — U+251C `├` + U+0192 `ƒ` where `ß` (U+00DF) belongs. Affected: `Arsenalstra├ƒe…`, `Ausstellungsstra├ƒe…`, `Mariahilfer Stra├ƒe 100…`, `Maxingstra├ƒe 3…`, `Prinz-Eugen-Stra├ƒe 27…`, `Rotenturmstra├ƒe 8…`, and their kin.

This matters because `docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md` § Webkitdirectory fallback names `Mariahilferstraße 56` and `Fuchsthalergasse 4` as normative cases, and `supabase/AGENTS.md` § Photon uses `Fuchsthalergasse 4` as its curl gate. **The committed fixtures cannot exercise the umlaut path the specs single out** — they would test a string no geocoder can resolve. Severity `medium`, effort `S` (re-encode the filenames). It is a separate instance of the same encoding damage as `06-health.md` § 8.

---

## 6. Spec quality and the split proposal (plan § 4 Phase 9.4)

`npm run lint:specs` on this commit: **183 specs checked, 201 errors, 32 warnings** — unchanged from the Phase 0 baseline (`00-baseline.md` § 7), as plan § 9 requires. There is no `lint-specs-full.txt` in the repository to reconcile against (`find . -name 'lint-specs-full.txt'` → 0 hits); the plan's § 9 reference to it is stale.

### Size-cap failures in upload scope

Cap is **180 lines error / 150 warn** (`docs/specs/README.md` § Spec split and organization), not the 400 the plan assumes.

| Spec | Lines | Over |
| --- | --- | --- |
| `docs/specs/component/upload/upload-panel.md` | 310 | +130 |
| `docs/specs/service/media-upload-service/upload-manager-pipeline.md` | 284 | +104 |
| `docs/specs/service/media-upload-service/upload-manager.md` | 281 | +101 |
| `docs/specs/component/media/media-item-upload-overlay.md` | 254 | +74 |

### Proposed splits

Each respects `docs/specs/README.md` (children are `*.supplement.md` / `*.acceptance-criteria.md` / `parent-name.slice.md`, linked not duplicated) and root `AGENTS.md` § Spec split and organization policy (bloat = long AC / FSM / visual tables → concern slices in the same folder). **Proposals only — nothing is edited.**

**`upload-panel.md` (310 → ~120).** Five Mermaid diagrams occupy lines 100–239, i.e. **45 % of the file**. Extract them:

| New child | Content moved | Lines saved |
| --- | --- | --- |
| `upload-panel.data-flow.supplement.md` | `### Data Flow` (`:100-120`), `### Wiring Flow` (`:269-305`) | ~57 |
| `upload-panel.status-mapping.supplement.md` | `### Status Mapping` (`:185-223`), `### Lane Semantics` (`:224-239`) | ~55 |
| existing `upload-panel.lane-and-row-actions.md` | `### Lane Actions` (`:121-133`), `### Change Location Flow` (`:134-184`) — these belong with the row-action contract already living there | ~64 |

The parent keeps What It Is / Looks Like / Where It Lives / Actions / Component Hierarchy / State / File Map plus links. Note the `## Acceptance Criteria (rollup)` at `:306` already delegates to `upload-panel.acceptance-criteria.md` — the pattern is established, it just was not applied to the diagrams.

**`upload-manager-pipeline.md` (284 → ~140).**

| New child | Content moved | Lines saved |
| --- | --- | --- |
| `upload-manager-pipeline.wiring.supplement.md` | `## Wiring` and its four subsections (`:161-246`) | ~86 |
| fold into existing `upload-manager-pipeline.data.md` | `## Pipeline Service Coverage Addendum (C-01)` (`:151-160`) | ~10 |

**And fix, not move, `## File Map` (`:112-150`)** — all 17 rows are broken (`05-spec-drift.md` § 2.1). Splitting a wrong index just relocates it.

**`upload-manager.md` (281 → ~150).**

| New child | Content moved | Lines saved |
| --- | --- | --- |
| `upload-manager.acceptance-criteria.md` | `## Acceptance Criteria` (`:245-280`) — 36 lines, and the slice type is explicitly sanctioned | ~36 |
| `upload-manager.wiring.supplement.md` | `## Wiring` + `### Wiring Flow` + `### Event Consumers` (`:189-244`) | ~56 |
| fold into `upload-manager-pipeline.data.md` | `## Pipeline Service Coverage Addendum (C-01)` (`:178-188`) | ~11 |

**Sequencing note.** Do the splits **after** the drift fixes of `05-spec-drift.md`, not before. Moving 60 broken paths into new files makes them harder to find and doubles the review surface.

### Structural (non-size) failures in upload scope

Six specs miss required sections and cannot be fixed by splitting — they need content: `upload-resolver-tray.md`, `upload-shell.md`, `upload-address-resolution-pipeline.md`, `upload-location-resolution.md`, `upload-resolver-tray-orchestrator.md` each lack all four of *What It Looks Like / Where It Lives / Actions / Component Hierarchy*; `upload-search-object.md` additionally lacks `## What It Is` (`00-baseline.md` § 7).

### Statements that are unimplementable or untestable as written (plan § 3 Q13)

| Spec | Statement | Why it cannot be implemented or tested as written |
| --- | --- | --- |
| `upload-manager.md:264` vs `dedup.md` § Behavior matrix | "resolved via explicit user decision **rather than auto-skip**" vs "Same user, hash match → **Auto-skip**" | **Directly contradictory.** No implementation can satisfy both; no test can assert both. (`05-spec-drift.md` C3) |
| `upload-manager.md:139` | `issueKind` union of 4, naming `duplicate_photo` first | Names a value the code never produces; a test written against the spec would assert an unreachable state. (`04-state-machine.md` § 4) |
| `routing.md` § Pre-upload resolution | The table is broken in two by prose; rows 5 and 6 render outside it | A reader cannot tell that phases 5–6 belong to the same normative table. (`05-spec-drift.md` C11) |
| `routing.md` § Tray Continue gate | "Exception: `answerKind: 'text'` city step" | The exception has **no owner** — `areAllJobsReadyForTrayResolution` (`core/upload/address-resolution/upload-tray-resolution-gate.helpers.ts:26-38`) does not implement it and the spec does not say who must. Untestable until the boundary is assigned. (`03-branch-matrix.md` L20) |
| `docs/specs/component/upload/upload-button-zone.md` | the whole 128-line contract | Describes a component with no code (`05-spec-drift.md` § 2.4). Every AC in it is unimplementable against the current tree. |
| `upload-manager.md:274-275` | "`401` performs one silent auth refresh and one retry"; "persistent `401` causes controlled sign-out" | Correctly left **unchecked**, but no mechanism exists anywhere to hook a refresh into the enrichment path — it is a design task, not a coding task. (`07-failure-modes.md` F2.6) |

---

## 7. Answers this phase settles

| Plan § 3 question | Answer |
| --- | --- |
| **Q12 — where is coverage absent for a branch the spec calls normative?** | Five normative statements with **zero** tests: HEIC-failure-must-terminate (`routing.md` Phase 0 MUST), the Forbidden default-to-text shortcut (`routing.md` Phase 3), the source-group idempotency rule, the `beforeunload` warning (`upload-manager.md:280`, ticked), orphaned-storage cleanup (`upload-manager.md:277`, ticked). Plus two whole pipeline modes (1,112 LOC). |
| **Q13 — which spec statements are unimplementable/untestable as written?** | Six, listed in § 6 — one of them a direct contradiction between two normative specs. |

## 8. Not verified in this phase

| Claim not made | Check needed |
| --- | --- |
| That any listed test actually passes | The suite does not compile (`00-baseline.md` § 4). Clear the 101 errors and re-run. |
| A line- or branch-coverage percentage | Would need the suite to execute with a coverage reporter |
| That the 43 spec files contain no *further* stale assertions beyond the 11 compile errors | A compile error is only the loudest kind of staleness; assertions that still typecheck but test removed behaviour (like `upload-batch-project-tray.helpers.spec.ts`) are found only by reading each spec against its subject |
| That the proposed splits keep every spec under the cap | The line estimates are arithmetic on current section boundaries; the linter is the arbiter and it cannot be run against files that do not exist yet |
| That an E2E upload run is stable | Needs credentials, a disposable org and a teardown step (§ 5) |
