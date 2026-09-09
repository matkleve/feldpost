# 00 — Progress / handover

**Audit:** Full analysis of the file upload process (specs + code + DB + tests)
**Plan:** [`docs/backlog/prompt-analysis-upload-process.md`](../../backlog/prompt-analysis-upload-process.md) — binding; read it first.
**Branch:** `claude/upload-process-analysis-0mnzwr` (branched from `origin/main` @ `8e4b1e09`)
**Started:** 2026-09-08

> Read this file plus the artifacts already produced. A resuming agent must not re-run Phases 0–7.

---

## Phase checklist

| Phase | Artifact | Status |
| --- | --- | --- |
| 0 — Baseline | `00-baseline.md` | ✅ done |
| 1 — Static structure map | `01-structure.md` | ✅ done |
| 2 — Happy-path trace | `02-happy-path.md` | ✅ done |
| 3 — Branch matrix | `03-branch-matrix.md` | ✅ done |
| 4 — State machine audit | `04-state-machine.md` | ✅ done |
| 5 — Spec ↔ code drift | `05-spec-drift.md` | ✅ done |
| 6 — Duplication / dead code / ownership | `06-health.md` | ✅ done |
| 7 — Failure modes | `07-failure-modes.md` | ✅ done |
| 8 — Data & security | `08-data-security.md` | ⏳ next |
| 9 — Test & spec-quality coverage | `09-coverage.md` | ☐ |
| 10 — Live/manual verification | (folded into `10-findings.md`) | ☐ — **will be abandoned**, see blockers |
| 11 — Synthesis | `10-findings.md`, `11-proposals.md` | ☐ |

Plus, at the very end (the only permitted edits to existing files, plan § 11):
one link line in `docs/audits/README.md`, one bullet in `docs/backlog/README.md`.

---

## Environment blockers (established in Phase 0, do not re-investigate)

1. **Unit suite does not compile** — `npx ng test --watch=false` exits 1 with 101 TypeScript errors across 26 spec files; **zero tests execute**. No audit claim may rest on "tests pass". (`00-baseline.md` § 4)
2. **The plan's test command is wrong for this repo** — `--browsers=ChromeHeadless` is a Karma flag; the repo uses `@angular/build:unit-test` (Vitest). Use `npx ng test --watch=false`. (`00-baseline.md` § 4)
3. **No Supabase CLI, no credentials** (`environment.ts:9` → `anonKey: 'test'`). Phase 8 is SQL-reading only; every runtime DB/RLS claim is `unverified`. (`00-baseline.md` § 9)
4. **Phase 10 cannot run** — no live backend, no display server. It will be recorded as abandoned-with-reason and each finding that would have needed it marked `unverified` with the exact scenario required.
5. `npm run supabase:smoke` is a **static** migration-text check, not a live probe — a green result proves nothing about the hosted schema. (`00-baseline.md` § 5)

## Plan corrections established so far

- Upload spec markdown files: **31 / 3,819 lines**, not the plan's 51 / ≈3,900.
- `upload-manager-pipeline.md` is **284 lines against a 180-line error cap**, not "552 vs 400". The plan's § 6 lead 9 magnitude is wrong; the direction is right.
- Plan § 6 lead 8 (`docs/specs/service/media-upload-service/adapters/` empty) is **refuted** — it holds `upload-project-gps-reference.adapter.md`.
- Plan § 6 lead 7 (mojibake) is **confirmed and wider** — also `core/upload/upload-manager.types.ts:12`.

## Verified-lead tracker (plan § 6)

| # | Lead | Status |
| --- | --- | --- |
| 1 | Stale File Map paths in `upload-manager-pipeline.md` | **confirmed and far larger** — 60 broken paths across 9 files; 17/17 File Map rows in that spec are broken |
| 2 | `upload-manager-playbook.md` predates the reorg | **confirmed** — 11 broken/imaginary paths, "18+ phases" (real: 20), "~600 lines" (real: 19,049), and its central advice contradicts a Hard Blocker. Recommendation: archive |
| 3 | Two coexisting location paths (Search Object vs legacy) | **confirmed — both live** (Phase 6 § 3). Discriminator is `job.groupingKey`; the "legacy" branch is the **default** for a plain photo upload |
| 4 | Two `@deprecated Removed` markers — removal complete? | **behaviourally yes, structurally no** (Phase 6 § 2) — empty stub + dead facade delegation + a test-only helper survive |
| 5 | 20 phases vs 5 proposed — real reachable count | **resolved** in Phase 4 § 2 — **all 20 reachable, none dead**; a collapse is a behaviour change, not a cleanup |
| 6 | `UPLOAD_DEV_FLAGS.useTrayOrchestrator` implies a second tray path | **refuted** in Phase 3 § 8 — `USE_TRAY_ORCHESTRATOR` is a hard `const true`; 13 tray guards are dead |
| 7 | Mojibake sweep | **confirmed, scoped** — 11 upload files, 12 repo-wide, **no UI impact** (only comments + 4 console/test strings) |
| 8 | `media-upload-service/adapters/` empty | **refuted** (Phase 0) but the mirror is **inverted** (Phase 5 § 4.5): 3 shipped adapters with no spec, 1 spec with no code |
| 9 | Spec size gate on `upload-manager-pipeline.md` | **confirmed, corrected** — 284 vs 180, but the **largest offender is `upload-panel.md` at 310**, not the pipeline spec |

---

## Scratchpad (session-scoped, will not survive the container)

`/tmp/claude-0/-home-user-feldpost/46618c86-d69f-59dc-a604-dec63a9c282a/scratchpad/` — raw gate logs from Phase 0. All numbers quoted in the deliverables are reproducible from the commands in `00-baseline.md` § 2 on commit `8e4b1e09`.

## Phase 1 headline results (do not re-derive)

- **One 11-file runtime cycle** (value imports only) spanning facade → manager → pipeline → location → tray adapter, hub `core/upload/location/upload-location-resolution.service.ts`; six siblings break DI with lazy `injector.get`. `01-structure.md` § 3.
- `registerDisambiguationGroup` has **five writer services / eight call sites**. → Phase 4 multi-owner transition, Phase 6 duplication.
- **5 dead files ≈ 500 LOC**: `pipelines/attach/upload-attach-hash.util.ts`, `support/upload-timeout.util.ts`, `upload.helpers.ts`, `upload-panel/upload-panel-dialog-handlers.service.ts` (316 LOC, writes to DB), `upload-resolver-tray/upload-resolver-tray.mock.ts` (109 LOC). Plus 1 test-only file. `01-structure.md` § 5.
  - **Note for Phase 7:** the plan assumes `support/upload-timeout.util.ts` implements live timeout handling. It has no importer.
- **`features/upload/upload-button-zone` does not exist** although `docs/specs/component/upload/upload-button-zone.md` (128 lines) does. → Phase 5 drift row.
- DB access in **17 files across 7 folders** incl. the UI layer (`upload-panel-job-file-actions.service.ts:269`), against a 2-file `adapters/`. Four `*.types.ts` inside one service module where `AGENTS.md` allows one.
- Ownership boundary between `manager/`/`pipelines/`/`support/`/`location/` is **nowhere written down** (answer to plan § 3 Q4).

## Phase 2 headline results (do not re-derive — full evidence in `02-happy-path.md` § 3)

36-step line-level trace of one GPS JPEG. Eleven defects visible from the trace alone:

- **F1** storage object orphaned when the `media_items` insert fails — `core/upload/support/upload-file-persist.util.ts:198-200` (cancel paths clean up, the DB-error path does not).
- **F2** the `beforeunload` warning is an **empty handler** — `core/upload/upload-manager.service.ts:237`; `upload-manager.md:280` carries it as a ticked `[x]` acceptance criterion.
- **F3** the 180 s upload timeout rejects but never aborts the in-flight write → a row can be saved for a job shown as failed (`upload-new-run-upload-phase.util.ts:299-318`).
- **F4** four un-caught fire-and-forget calls on the happy path (reverse geocode, dedup hash, mismatch persist, thumbnail persist).
- **F5** the dedup RPC runs **twice per job** (`upload-new-pre-resolve.util.ts:336` and `:364/:378/:389`).
- **F6** "is this a document?" decided two different ways → same file gets different `issueKind` on two paths.
- **F7** two different types both named `ImageUploadedEvent` (service vs UI) — root cause of Phase-0 test error T8.
- **F8** `media_items.mime_type` (raw) vs storage `contentType` (normalised) derived differently.
- **F9** unsanitised user-controlled extension in the storage path (`upload-file-persist.util.ts:83-84`) — exploitability `unverified`.
- **F10** `statusLabel` hardcoded English in three files; `i18n:guard` cannot see it.
- **F11** `classifyBatch` rejection strands the whole batch at `queued` (`upload-manager-submit.util.ts:65-70`).

Structural: **six files write phases** on one happy path; `missing_data` has two writers with divergent rules.

## Phase 3 headline results (do not re-derive — full matrix in `03-branch-matrix.md`)

51 branch rows across intake / media types / dedup / location routing / conflicts / lifecycle / uploaded lane. New defects beyond Phase 2:

- **Y10** six user actions (retry, cancel, place, assign-project, resolve-conflict, force-duplicate) write `phase:` via `updateJob` instead of `setPhase` → **no `jobPhaseChanged$` event**, and they bypass the terminal guard. `core/upload/manager/upload-manager-actions.util.ts:54,88,119,134,258,288`.
- **Y3** cancel deletes the storage object but **not** the `media_items` row, un-awaited → row with a dangling `storage_path` (mirror of F1). Cancel is also modelled as `phase:'error'`, so the UI offers Retry on a cancelled job.
- **C5** `getIssueKind` falls back to **substring-matching the localized status label** in two languages (`features/upload/upload-phase.helpers.ts:67-75`) to decide lane and row actions.
- **C4** `duplicate_photo` is **never written** yet read in 10 places; `conflict_review` is never stored but is derived. Change-Completeness violation.
- **C3** "requeue at front" is documented in three places but **no reordering exists** — selection is plain array order (`upload-manager-queue.util.ts:14-20`).
- **I5** dropping a *folder* submits nothing — `onDrop` reads only `dataTransfer.files`, never `items`/`webkitGetAsEntry` (0 hits repo-wide).
- **D7** only the first 64 KiB is hashed; `binary_v1` (head+size) is collidable for documents.
- **§ 8** `USE_TRAY_ORCHESTRATOR` is `const true` → `useOrchestrator` is statically true; **13 dead guards** in `upload-resolver-tray.component.ts` + 3 more elsewhere. Lead 6 refuted.
- **§ 7** i18n: `statusLabel` **is** translated by the panel (Phase 2 F10 was overstated and is corrected in place). Real leaks are `job.error` (all producers English), `upload-panel-item.component.ts:176`, `upload-panel-menu-action-router.service.ts:118-123`. `i18n:guard` is blind to service-produced strings.
- Plan error: "video (dedup skipped)" is wrong — code **and** `dedup.md` Tier C both dedup video.

**15 branches remain `unverified`**, each with the exact static check listed in `03-branch-matrix.md` § 9. The densest gap is **L12 Branch C city tray** (858 LOC across two files) — it needs its own pass.

## Phase 4 headline results (do not re-derive — full audit in `04-state-machine.md`)

- **All 20 `UploadPhase` members are reachable. None is dead.** 48 `setPhase` sites + 16 `failJob` sites + 12 direct `phase:` writes.
- **Three write mechanisms, two unguarded**: `setPhase` (event + terminal guard), `failJob` (event, **no** guard), direct `updateJob({phase})` (**no event, no guard**, 9 live transitions).
- **No transition map or guard function exists anywhere** in the subsystem — a direct violation of `.cursor/rules/ui-state-machine.mdc` § Hard rules and root `AGENTS.md` § State-machine invariants, whose own example is "the upload queue".
- **T4 `complete → error` is possible** — `failJob` has no terminal guard, so a late post-save rejection can flip a completed job.
- Multi-owner phases: `queued` 12 writers, `complete` 8, `missing_data` 5, `error` 5. `awaiting_disambiguation` has exactly 1 — the counter-example.
- **S7** `isBusy` (all non-terminal) and `activeCount` (13-member `ACTIVE_PHASES`) disagree in the same service; a tray-paused job is busy-but-not-active.
- Dead union members: `issueKind:'duplicate_photo'`, `UploadTrayStep '2'`. Deferred-by-spec: `UploadDisambiguationKind 'context_distance'`.
- `manager.md:139` types `issueKind` with **4** members (code has 8) and names `duplicate_photo` first — a member with no write site.
- **`duplicateState` does not exist** (0 hits) — plan § 4 Phase 4.4 artefact, refuted.
- Two undocumented FSMs found: `UploadGroupResolutionStatus` (7 members, 17+ writers, no spec) and the tray orchestrator's bundle status.
- Three overlapping "branch" unions for one concept; `UploadTrayStep` declared twice identically.

## Phase 5 headline results (do not re-derive — full tables in `05-spec-drift.md`)

- **60 broken code paths across 9 files**, verified with `existsSync`. `upload-manager-pipeline.md` § File Map: **17 of 17 rows broken**. `upload-manager.md` § File Map: 13 of 15. `upload-panel.feedback-triage.md`: 13 broken paths in 13 lines.
- **C1 (blocker)** `upload-manager.md:277` ticks `- [x] Orphaned storage files are cleaned up when DB insert fails`. Phase 2 F1 proves the opposite. **Falsely ticked AC on a data-loss criterion.**
- **C2 (high)** `upload-manager.md:280` ticks the `beforeunload` warning; the handler is empty.
- **C3 (high)** `upload-manager.md:264` forbids auto-skip; `dedup.md` § Behavior matrix mandates it for same-user and ticks it. **Two normative specs contradict each other**; the code follows `dedup.md`.
- **C4** `upload-manager.md:139` types `issueKind` with 4 members (code: 8) and names `duplicate_photo` first — the one member with no write site.
- `docs/specs/component/upload/upload-button-zone.md` (128 lines) is a **contract for a component that does not exist**, and `upload-manager.md:241` wires an event to it.
- Symmetry: 4 `types.ts` where the rule allows 1; adapters mirror **inverted**; `core/upload-resolver-tray-orchestrator` has **no governance-registry entry**. `core/upload` → `media-upload-service` name mismatch **is** registered, so it is legitimate.
- Deferred: the 12 address-resolution / Search Object specs were **not** checked claim-by-claim (blocked on the same Branch C pass as `03-branch-matrix.md` L12).

## Phase 6 headline results (do not re-derive — full detail in `06-health.md`)

- **Four cancellation routines, only one correct.** Three delete the storage object but keep the `media_items` row, un-awaited. `06-health.md` § 1.1.
- **Cancellation is detected by regex over an English error message** (`upload-cancelled.util.ts:3-5`, 4 call sites). Translating the strings turns every cancel into a hard error. Second instance of presentation-text-as-control-flow after `getIssueKind`.
- **Six auto lane-switches violate a P0 rule** (`upload-panel.feedback-triage.md:48` "never auto-switch lane/tab"). Resolves Phase 3 C7 with a `no`. `06-health.md` § 7.
- `upload-panel-dialog-handlers.service.ts` (316 LOC, dead) is a **method-for-method duplicate** of the live dialog-actions service.
- `support/upload-timeout.util.ts` is an **exact duplicate** of a private copy — and it is the dead one.
- Dead: 5 files ≈ 500 LOC, 7 exports, 2 union members, **13 tray guards**, 7 committed throwaway scripts. The `mockResolverTray` path **ships in the production bundle**.
- 12 deprecation/TODO markers classified; the dedup family is **not** duplicated (plan assumption refuted).
- 38 `console.*` in production paths; `drainQueue` logs 3 lines per drain.
- Also resolved from Phase 3 § 9: **D5** (`reject` dismisses — matches spec), **D6** (apply-to-batch implemented), **D3** (`use_existing` does **not** link project context — the unchecked AC is correctly unchecked).

## Phase 7 headline results (do not re-derive — 30-row matrix in `07-failure-modes.md`)

- **F1.1 (blocker)** DB-insert failure after a successful storage write leaves an **orphaned object**; `upload-manager.md:277` ticks the opposite.
- **F1.5 (high)** the 180 s timeout rejects but never aborts → a storage object **and** a `media_items` row can land for a job shown as failed.
- **F1.2/F1.3/F1.4 (high)** three cancel paths delete the object and keep the row.
- **F1.10 (high)** the attach pipeline detects an RLS-blocked write, logs `✗ WRITE DID NOT PERSIST`, and **completes the job anyway**.
- **F5.4 (high)** object-URL leak **confirmed**: `revokeLocalUrl` exists in two places and is called from nowhere; the cache has no eviction. Resolves Phase 3 Y2.
- **F7.1 (high)** a `classifyBatch` rejection freezes the whole batch at `queued` with no error; `submit()` is never awaited.
- **F2.4** `resolving_address` is a **cosmetic phase** — `enrichWithReverseGeocode` is an empty method; the real work is an un-awaited call elsewhere.
- **9 of 30 failure modes fail completely silently. 0 of 30 have a test.**
- Refuted: the plan's "poisoned dedup index" risk (ordering already prevents it) and its assumption that `support/upload-timeout.util.ts` is live.
- Corrected in place: Phase 2 F4 — `resolveUploadAddress` **is** guarded; the other three fire-and-forget calls are not.

## Next step

Phase 8 — data & security: tables/RPCs/buckets touched, org scoping in SQL, `resolve_media_location` overload, dropped columns, storage-path isolation, client-vs-server validation → `08-data-security.md`.
