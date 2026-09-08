# Prompt: full analysis of the file upload process (specs + code + DB + tests)

**Type:** investigation prompt (non-normative). Not an implementation contract — specs under `docs/specs/` stay the source of truth.
**Intended executor:** a coding agent with repo access, run from **repository root**.
**Expected duration:** long. This is a multi-session task; it is designed to be resumable (see [§ 12 Resumability](#12-resumability)).
**Outcome:** an evidence-backed report + prioritized findings that a follow-up agent can turn into concrete fix/refactor PRs. **No production code is changed in this pass.**

---

## 0. Why this exists

The upload flow is the largest and most intricate subsystem in Feldpost:

| Measure | Value (verified 2026-09-08) |
| --- | --- |
| Non-test TS files across `core/upload`, `core/upload-resolver-tray-orchestrator`, `features/upload` | **129 files ≈ 19,000 LOC** |
| Test files in the same scope | 43 files ≈ 7,050 LOC |
| Upload spec files (`docs/specs/**/upload*`) | **51 markdown files ≈ 3,900 lines** |
| `UploadPhase` union members | **20** |
| Pipeline modes | 3 (`new`, `replace`, `attach`) |
| Submission entry points | 3 (`submit`, `submitFolder`, `submitWebkitFolder`) + replace/attach |

Symptoms reported by the product owner: the process is hard to follow, behaves inconsistently in edge cases, and it is unclear which layer owns which decision. `docs/playbooks/upload-manager-playbook.md` already flags "18+ phases with intricate state management" — but that playbook itself references file paths that no longer exist, which is part of the problem.

The goal of this task is **not** to refactor. It is to produce a truthful, complete, referenced map of what the upload process actually does today, where it diverges from its specs, where behavior is duplicated or unreachable, and which defects are real — so that the refactor decision is made on facts rather than on impressions.

---

## 1. Ground rules for the executing agent

1. **Read-only on production code.** Do not modify anything under `apps/web/src/app/**`, `supabase/migrations/**`, or `docs/specs/**` in this pass. Deliverables are new markdown/JSON files under `docs/audits/` (see § 11). If you find a one-line obvious bug, **write it up — do not fix it here**.
2. **Instruction precedence** as defined in root `AGENTS.md` § "Instruction precedence": data/security & `supabase/AGENTS.md` > root `AGENTS.md` > `.cursor/rules/*.mdc` > spec governance > concrete specs > package `AGENTS.md` > tool overlays.
3. **Evidence or nothing.** Every claim carries `path:line` (e.g. `core/upload/upload-manager.service.ts:267`). Paths are repo-relative; `core/…` and `features/…` are shorthand for `apps/web/src/app/…` and MUST be written in full at least once per finding table row.
4. **Mark what you could not verify.** Anything not provable by reading code or running a test is tagged `unverified` plus the exact check needed (a test to write, a manual browser scenario, a DB query). Never present an inference as an observation.
5. **Terminology:** follow `docs/glossary.md` — the domain is **media** (`media_items`), not "photo"/"image", except when quoting MIME types, real identifiers, or DB columns.
6. **No speculative redesign inside the findings.** Fix proposals go in the separate proposals deliverable (§ 11.5), each sized and sequenced.
7. **Language:** deliverables in English (repo convention), regardless of the language of the request.
8. **Commit as you go** on the working branch, one commit per completed phase, so partial work survives.

---

## 2. Territory map (start here — do not re-discover this)

This inventory is verified as of 2026-09-08. **Confirm it still holds** (`find`/`wc -l`) before relying on it; report drift.

### 2.1 Specs

| Area | Path |
| --- | --- |
| Service parent contract | `docs/specs/service/media-upload-service/upload-manager.md` (280 lines) |
| Pipeline child contract | `docs/specs/service/media-upload-service/upload-manager-pipeline.md` (283 lines; lint warns at 552 counted lines — see § 9) |
| Pipeline data matrices | `docs/specs/service/media-upload-service/upload-manager-pipeline.data.md` (290) |
| Location routing FSM | `docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md` (177) |
| Dedup scope | `docs/specs/service/media-upload-service/upload-manager-pipeline.dedup-scope.supplement.md` (80) |
| Address resolution model | `…/address-resolution-model.md` (141), `…/contradiction-resolution-model.md` (192), `…/upload-address-resolution-pipeline.md` (64), `…/upload-address-resolution.phases.md`, `…/upload-address-resolution.branch-c-city-tray.md`, `…/upload-address-resolution.local-geo.md`, `…/upload-address-resolution.audit.md` |
| Location config / resolution | `…/upload-location-config.md` (138), `…/upload-location-resolution.md` (71) |
| Search Object | `…/upload-search-object.md`, `…/upload-search-object.layer-map.md`, `…/…layer-map.examples.md`, `…/…unit-parsing.at.md` |
| Tray orchestrator | `…/upload-resolver-tray-orchestrator.md` (108) |
| UI system | `docs/specs/ui/upload/upload-panel-system.md` (99) |
| Components | `docs/specs/component/upload/` — `upload-panel.md` (309), `.acceptance-criteria.md`, `.lane-and-row-actions.md`, `.layout-and-states.md`, `.feedback-triage.md`, `.dedup-ux.supplement.md`, `upload-resolver-tray.md`, `.question-copy.md`, `.stepper-fsm.supplement.md`, `upload-button-zone.md`, `upload-shell.md` |
| Neighbouring service specs the pipeline depends on | `docs/specs/service/folder-scan/`, `filename-parser/`, `location-path-parser/`, `location-resolver/`, `geocoding/`, `media-preview/`, `metadata/`, `projects/`, `media/`, `wide-event/` |

### 2.2 Code

| Layer | Location | Notes |
| --- | --- | --- |
| Facade | `apps/web/src/app/core/upload/upload-manager.service.ts` (443) | `providedIn: 'root'`; public API: `submit`, `submitFolder`, `submitWebkitFolder`, replace/attach, plus 9 event streams and 7 signals |
| Manager helpers | `core/upload/manager/` (16 files) | `*-submit`, `*-actions`, `*-queue`, `*-drain`, `*-effects`, `*-dedup`, `*-fail`, `*-error`, `*-cancel-active`, `*-lifecycle`, `*-run-route`, `*-facade-deps`, `*-pipeline-host.service`, `*-missing-data.service`, `*-runtime` |
| Pipelines | `core/upload/pipelines/new/` (5 non-test), `…/replace/` (4), `…/attach/` (9) | `new` path is split across `pipeline.service` + `pre-resolve` + `prepare-route` + `run-upload-phase` + `post-save` |
| Support | `core/upload/support/` (24 non-test) | queue, batch, job-state, storage, dedup (check/match/skip/eligibility), content-hash, file-persist, thumbnail-persist, db-postwrite, enrichment, conflict, notification, timeout, cancelled + cancelled-storage-cleanup, error-messages, pre-resolve-wave, file-types |
| Location | `core/upload/location/` (23 non-test) | config, resolution (+helpers), precedence, placement, tray-flow, geocode-group, disambiguation (store/registration), candidate-apply, source-conflict, pre-resolve-orchestrator, admin-level-choice, layer-package-choice, geocode-outcome, inputs |
| Address resolution | `core/upload/address-resolution/` (6 non-test) | orchestrator (620 LOC), resolve util, tray-resolution-gate, debug |
| Tray orchestrator | `core/upload-resolver-tray-orchestrator/` | service (559) + helpers + types + `adapters/upload-location-tray-producer.adapter.ts` (349) |
| Adapters | `core/upload/adapters/` | `upload-location-lookup.adapter.ts`, `upload-project-locations.adapter.ts` |
| UI — panel | `features/upload/upload-panel/` (~30 non-test) | component (384) + 15 sibling services/handlers + `upload-panel-item.component.ts` (520) |
| UI — tray | `features/upload/upload-resolver-tray/` | component (618) + helpers + mock + mock-orchestrator |
| UI — shell / zone | `features/upload/upload-shell/`, `upload-button-zone`, `features/upload/upload-phase.helpers.ts`, `upload-dev-flags.ts` |
| Adjacent | `shared/media-item/media-item-upload*.ts`, `shared/workspace-pane/media-detail/media-detail-upload.helper.ts`, `core/media-page-state/media-page-state-upload-patch.helpers.ts`, `core/location-path-parser/upload-*.ts` (7 files) |

### 2.3 Backend & infrastructure

| Concern | Where |
| --- | --- |
| Dedup index | `supabase/migrations/20260311100001_dedup_hashes.sql`, `…/20260327170500_p2_dedup_share_set_media_item_contract.sql` |
| Location RPCs | `…/20260327223000_p0_all_gps_media_map_and_resolver.sql`, `…/20260328103000_fix_location_status_consistency_rpcs.sql`, `…/20260412113000_location_status_canonical_contract.sql`, `…/20260525210000_drop_resolve_media_location_nine_arg_overload.sql`, `…/20260525130000_drop_media_items_location_columns.sql` |
| Upload security/perf | `…/20260316204500_upload_security_perf_hardening.sql`, `…/20260617140000_upload_metadata_columns.sql` |
| Media type contract | `…/20260327221000_photo_media_type_runtime_contract.sql` |
| Preview generation | `supabase/functions/generate-media-preview/`, `supabase/gotenberg/`, `worker/thumbnail/`, `docker-compose.thumbnail-worker.yml` |
| Geocoding | `supabase/functions/geocode/`, `docker-compose.photon.yml`, `docs/playbooks/remote-photon.md` |
| RLS / security model | `supabase/AGENTS.md`, `docs/security-boundaries.md` |
| Smoke scripts | `npm run supabase:smoke` (`scripts/validate-supabase-rpc-media-type.mjs`, `scripts/validate-supabase-storage-cleanup-api-mode.mjs`) |

### 2.4 Existing non-normative notes (read, then judge — they are known to be stale)

- `docs/playbooks/upload-manager-playbook.md` — improvement plan; its "Files Involved" list points at `core/upload-manager.service.ts` and `core/upload-new-pipeline.service.ts`, which **do not exist** at those paths any more.
- `docs/playbooks/change-classification-upload-example.md`
- `docs/backlog/prompt-audit-specs-vs-code-and-media-terminology.md` — sibling prompt, same evidence discipline; reuse its output format conventions.

---

## 3. Deliverable-driving questions

The report must answer all of these explicitly. If an answer is "cannot determine", say so and name the blocker.

**Architecture**
1. What is the exact end-to-end sequence for a single JPEG with EXIF GPS, from `submit()` to a visible row in `/media`? Which service owns each step, and where is the phase written?
2. Which of the **20** `UploadPhase` values are actually reachable, from which code sites, and which are dead?
3. Where does the state actually live — `UploadJobStateService` signals, batch service, panel-local signals, tray orchestrator, disambiguation store? Which of these hold overlapping copies of the same truth?
4. What is the ownership boundary between `core/upload/manager/*`, `core/upload/pipelines/*`, `core/upload/support/*`, `core/upload/location/*` and the panel's own services? Is it stated anywhere, and does the code follow it?
5. Is there one location-resolution path or two (Search Object path vs the "legacy" fallbacks marked in `upload-new-pre-resolve.util.ts:50`, `upload-location-placement.service.ts:74`, `upload-location-resolution.helpers.ts:63`)? When does each run in production?

**Behaviour & correctness**
6. For every branch in § 4.2, does the implementation match the governing spec clause? Where not: which is wrong, code or spec?
7. What happens on cancel / logout / tab close mid-upload at each phase — are storage objects, DB rows and dedup entries left orphaned?
8. What happens when two batches, or two jobs in one batch, hit the same tray group / same content hash concurrently?
9. Which failures are silent (swallowed catch, unhandled rejection, phase never updated) versus surfaced to the user?
10. Which user-visible strings in the flow are hardcoded rather than i18n-routed (`npm run i18n:guard`)?

**Health**
11. Which upload code is unreachable, duplicated, or only used by tests/mocks (`upload-resolver-tray.mock*.ts`, `UPLOAD_DEV_FLAGS`)?
12. Where is test coverage absent for a branch that the spec calls normative?
13. Which spec statements are unimplementable/untestable as written (ambiguous, contradictory, or self-referential)?

---

## 4. Method

Work the phases **in order**. Each ends with a committed artifact; do not carry findings only in your head.

### Phase 0 — Baseline (do not skip)

```bash
# repository root
npm install
cd apps/web && npm install
```

Record, in `00-baseline.md`, the result and duration of each:

| Command | Purpose |
| --- | --- |
| `cd apps/web && npx ng build` | does the app build today? |
| `cd apps/web && npx ng test --watch=false --browsers=ChromeHeadless` | full unit suite; capture failures verbatim |
| `cd apps/web && npm run lint` | eslint, `--max-warnings 0` |
| `npm run lint:specs` | spec governance lint |
| `npm run design-system:check` | design gates |
| `npm run i18n:check` and `npm run i18n:guard` | translation gates |

If a command cannot run in the environment (no browser, no network, no Supabase), say so explicitly and mark every downstream conclusion that depended on it `unverified`. **A red baseline is a finding, not a blocker** — record it and continue.

Also capture the counts from § 2 fresh, so the report states its own measurement date.

### Phase 1 — Static structure map

1. Build the dependency graph of the upload subsystem: for every non-test file in scope, list its imports within the subsystem and its exported symbols. A short throwaway script (in the scratchpad, not committed to `scripts/`) is fine; `madge`-style output is not required, a JSON edge list is enough.
2. Derive: entry points, leaf utilities, **cycles**, and files imported by nothing but tests.
3. Classify every file into exactly one layer (facade / manager helper / pipeline / support / location / address-resolution / tray / UI / adapter / types) and flag files whose content does not match their folder (e.g. UI concerns inside `core/`, DB writes inside a "helpers" file, business rules inside a component).
4. Produce `01-structure.md` with: the layer table, the cycle list, the orphan list, and a Mermaid diagram of module-level dependencies (collapse per folder — a 129-node graph is unreadable).

### Phase 2 — Happy-path trace

Trace **one** file end to end at line granularity: a JPEG with valid EXIF GPS, submitted via the panel, auto location ON, no duplicate, no conflict.

Deliver a step table in `02-happy-path.md`:

| # | Step | Code site (`path:line`) | Phase set here | State written | Events emitted | Spec clause |
| --- | --- | --- | --- | --- | --- | --- |

Cover at least: intake & validation → `parsedExif` (note: `parsedExif.coords` ≠ `job.coords`, per the location-routing supplement) → title/folder candidate merge → text geocode → source agreement → placement → hashing → dedup check → storage upload → `media_items` insert → post-save enrichment → preview/thumbnail enqueue → panel row transition to the Uploaded lane → map/grid refresh.

For each step also note: is it awaited, can it throw, and what happens to the job if it does.

### Phase 3 — Branch matrix

Repeat the Phase 2 trace, more coarsely (step list, not line-by-line, but still with anchors), for every branch below. Fill one row per branch in `03-branch-matrix.md` with columns `Branch | Trigger | Governing spec clause | Implementation path | Matches spec? | Test coverage | Notes`.

**Intake**
- Multi-file `submit()`; folder via File System Access `submitFolder()`; folder via `submitWebkitFolder()` fallback; drag & drop lanes (`upload-panel.drag-lanes.spec.ts`); replace and attach entry points from media detail.
- Unsupported/oversized file; empty selection; mixed media types in one batch; folder name carrying `Project: [name]`; nested folder address hierarchy (`Wien/Hauptstrasse 5/…`).

**Media types**
- Photo (JPEG/PNG); **HEIC/HEIF conversion** (`convertHeicToJpegUploadFile`, `heic2any`) incl. the normative rule that a failed conversion MUST terminate the job and MUST NOT upload the original blob; video (dedup skipped); each of the 13 document/office types in the canonical catalog (`DOC, DOCX, ODT, ODG, TXT, XLS, XLSX, ODS, CSV, PPT, PPTX, ODP, PDF`) and their preview-generation follow-up.

**Dedup**
- Same-user resume (silent skip) vs colleague duplicate (issue + modal); `use_existing` / `upload_anyway` / `reject`; "apply to all in batch"; hash algorithms `photo_v1` vs `binary_v1`; org scoping (`upload-manager-pipeline.dedup-scope.supplement.md`); a hash row whose storage object no longer exists.

**Location routing** (the densest area — budget accordingly)
- `locationRequirementMode` `required` vs `optional`, incl. the session override map keyed by project filter.
- Phases 0–5 of the pre-upload resolution table in the location-routing supplement.
- Source agreement inside `sourceAgreementRadiusMeters`; `disambiguationKind: 'source'` tray with candidate ids `source-text` / `source-exif` / `source-both` / `source-none`; the idempotency rule (at most one open group per `(batchId, queryKey)`); late-joining jobs and the `held_source_conflict` replay hook; the explicit **forbidden** default-to-text shortcut.
- City ambiguity / Branch C tray; Branch A and Branch B semantics; EXIF-only placement; project location as bias-only (note the two `@deprecated Removed` markers at `upload-location-resolution.service.ts:100` and `upload-location-tray-flow.service.ts:83` — is the removal complete?).
- Geocode far-hit filter against org `contextDistanceMaxMeters`; geocode failure and timeout; `addressNotes[]` retention; low-confidence parse → Issues rather than resolved.
- Tray Continue gate (footer disabled until every job on the active item is `awaiting_disambiguation` and non-HEIC).

**Conflicts & issues**
- Photoless-row conflict → `awaiting_conflict_resolution` (must release the concurrency slot) → `attach_replace` / `attach_keep` / `create_new` → requeue at front.
- Every `issueKind`: `duplicate_photo`, `missing_gps`, `address_ambiguous`, `document_unresolved`, `conflict_review`, `upload_error` — row actions per kind, the "no cross-kind action leakage" rule, and the rule that resolving an item must not auto-switch lanes.
- The rule that changing location on already-persisted media MUST NOT create a new job (Action 8f).

**Lifecycle**
- Retry a failed job (id retained); cancel job; cancel batch; dismiss; dismiss-all-completed; logout mid-flight; `beforeunload`; navigation away and back; queue concurrency limit of 3 and FIFO start order; batch `scanning` → `uploading` → `complete`/`cancelled`.

**Uploaded-lane follow-ups**
- Gating of `Open in /media`, `Prioritize`, `Download`, `Open project` on `mediaId` / `storagePath` / `projectId`; assign-to-project; map-pick and address-finder location changes.

### Phase 4 — State machine audit

1. Extract the actual transition graph from code: every site that sets a phase (grep `setPhase`, `failJob`, `phase:`), with source phase → target phase.
2. Diff it against the spec FSMs (`upload-manager-pipeline.location-routing.supplement.md`, `upload-resolver-tray.stepper-fsm.supplement.md`, `.cursor/rules/ui-state-machine.mdc`).
3. Report in `04-state-machine.md`: reachable set, unreachable phases, transitions in code but not in spec, transitions in spec but not in code, and any phase that can be entered from two owners (a strong duplication smell). Include a Mermaid state diagram of the *actual* graph.
4. Same treatment for `duplicateState`, `batch.status`, `issueKind`, `UploadResolutionStatus`, and the tray stepper.

### Phase 5 — Spec ↔ code drift audit

For every spec file in § 2.1, check claim-by-claim against the code. Known-stale examples to confirm and then look for more of the same kind:

- `upload-manager-pipeline.md` § File Map lists `core/upload/upload-new-pipeline.service.ts` (actual: `core/upload/pipelines/new/upload-new-pipeline.service.ts`), `core/upload/upload-queue.service.ts` (actual: `core/upload/support/upload-queue.service.ts`), `core/upload/folder-scan.service.ts` (actual: `core/folder-scan/folder-scan.service.ts`), and several other `core/upload/*.service.ts` entries that now live in `manager/`, `support/`, or `pipelines/`.
- `docs/playbooks/upload-manager-playbook.md` "Files Involved" — same class of breakage.

Output `05-spec-drift.md` with `Priority | Spec path | Section | Claim | Reality (path:line) | Verdict (spec wrong / code wrong / both) | One-line fix`. Verdict matters: a drift where the **code** is wrong is a bug, a drift where the **spec** is wrong is a doc task. Do not fix either here.

Also check service-module symmetry per root `AGENTS.md`: required files per module (`*.service.ts`, `*.service.spec.ts`, `*.types.ts`, `*.helpers.ts`, `adapters/`, `README.md`), one central `types.ts` per module, no global adapter folder, facade slim. Note `docs/specs/service/media-upload-service/adapters/` currently appears to be an empty directory — confirm and report.

### Phase 6 — Duplication, dead code and ownership

1. Find semantically duplicated logic (not just copy-paste): e.g. dedup decisions across `upload-manager-dedup.util.ts` / `support/upload-dedup-check.util.ts` / `upload-dedup-match.util.ts` / `upload-dedup-skip.util.ts` / `upload-dedup-eligibility.util.ts`; error shaping across `manager/upload-manager-error.util.ts` / `manager/upload-manager-fail.util.ts` / `support/upload-error-messages.util.ts`; cancellation across `upload-manager-cancel-active.util.ts` / `support/upload-cancelled.util.ts` / `support/upload-cancelled-storage-cleanup.util.ts`.
2. List every `@deprecated`, `legacy`, `TODO`, `FIXME` marker in scope and classify: still live / dead / undecided. Known ones: `upload-new-run-upload-phase.util.ts:148`, `upload-new-pre-resolve.util.ts:50`, `upload-location-resolution.service.ts:100`, `upload-location-tray-flow.service.ts:83`, `upload-location-placement.service.ts:74`, `upload-location-resolution.helpers.ts:63`, `upload-panel-lifecycle.service.ts:18,48`, `upload-panel.component.ts:124`.
3. Audit `UPLOAD_DEV_FLAGS` (`features/upload/upload-dev-flags.ts`): what does each flag gate, is the non-default path still maintained, and is `mockResolverTray` / `upload-resolver-tray.mock*.ts` reachable in a production build?
4. Check file hygiene: files over ~400 LOC that mix concerns (`upload-address-resolution.orchestrator.ts` 620, `upload-resolver-tray.component.ts` 618, `upload-location-resolution.helpers.ts` 614, `upload-resolver-tray-orchestrator.service.ts` 559, `upload-panel-item.component.ts` 520, `upload-location-tray-flow.service.ts` 509).
5. Note encoding damage: the header comment block of `core/upload/upload-manager.service.ts` contains mojibake (double-encoded UTF-8 dashes). Sweep the subsystem for the same corruption and list affected files — it is trivially fixable but must be inventoried, not fixed here.

Output `06-health.md`.

### Phase 7 — Failure modes & robustness

Build a failure matrix in `07-failure-modes.md`: `Failure | Where it can occur (path:line) | Current handling | User-visible result | Residue left behind | Severity`.

Cover at minimum:
- Storage upload rejected / network drop mid-upload / timeout (`support/upload-timeout.util.ts`).
- DB insert fails after successful storage write → orphaned object? (check `support/upload-cancelled-storage-cleanup.util.ts`, `support/upload-db-postwrite.util.ts`, and `scripts/validate-supabase-storage-cleanup-api-mode.mjs`).
- Dedup row written but upload later fails → poisoned hash index.
- Geocoder unavailable (Photon/Nominatim down, edge function 5xx), rate limiting, far-hit filter with no anchor.
- Preview/thumbnail worker down → must stay non-blocking per Actions 8a2/8a3.
- Auth token expiry mid-batch; logout cancelling active jobs; RLS denial surfaced as a generic error.
- Concurrency: two jobs finalizing the same tray group; the singleflight claim on `finalizePlacement`; requeue-at-front vs FIFO ordering; the 3-slot limit while jobs sit in paused phases.
- Angular specifics: `effect()` re-entrancy in `manager/upload-manager-effects.util.ts`, signal writes during change detection, subscriptions never torn down, `File`/`Blob`/object-URL retention for large batches (memory), `heic2any` on large HEIC sets.
- Browser support gaps: File System Access unavailable → `isFolderImportSupported` false path; Safari/Firefox webkit fallback.

For each, state whether an automated test exists.

### Phase 8 — Data & security

Read `supabase/AGENTS.md` and `docs/security-boundaries.md` first; the frontend is untrusted.

1. Confirm what the client writes directly vs through RPC; list every table/RPC/bucket the upload path touches, with the migration that defines it.
2. Verify dedup is genuinely org-scoped in SQL and RLS, not only in TS.
3. Verify `resolve_media_location` usage matches the surviving overload after `20260525210000_drop_resolve_media_location_nine_arg_overload.sql`, and that no code still writes the columns dropped in `20260525130000_drop_media_items_location_columns.sql`.
4. Check storage path construction for tenant isolation and for user-controlled path segments (filename injection, traversal, case/unicode collisions).
5. Check that client-side validation (type, size) is mirrored server-side; if not, record it as a finding.
6. Run `npm run supabase:smoke` if the environment allows; otherwise mark `unverified`.

Output `08-data-security.md`. **Report only — no migrations in this pass.** Anything that looks exploitable goes at the top of the executive summary.

### Phase 9 — Test & spec-quality coverage

1. Map the 43 existing spec files to the branch matrix from Phase 3: which branches are covered, at what level (unit / component DOM / integration), and which are covered only by mocks that would not catch a real regression.
2. Identify the highest-value missing tests and write them up as ready-to-implement descriptions (file to create, scenario, assertion) — do not implement them here.
3. Check E2E: `apps/web/e2e/` currently has no upload scenario. State whether one is feasible (auth setup exists at `e2e/auth.setup.ts`) and what it would need.
4. Spec quality: run `npm run lint:specs` and reconcile with `lint-specs-full.txt`; `upload-manager-pipeline.md` warns at 552 lines vs a 400 recommendation. Propose a split that respects the governance rules in `docs/specs/README.md` and the spec-split policy in root `AGENTS.md` — as a proposal, not an edit.

Output `09-coverage.md`.

### Phase 10 — Live/manual verification (best effort)

If the environment allows running the app (`cd apps/web && npm start`, see `docs/playbooks/setup-guide.md` and `docs/playbooks/dev-acceleration.md`; fixtures in `apps/web/public/vienna_sample_photos/`):

1. Execute the scenario list from Phase 3 that cannot be proven statically, recording actual phase sequences (instrument via the existing `core/wide-event` telemetry and `core/upload/address-resolution/upload-address-resolution.debug.ts` rather than adding new logging to production files; a temporary local patch is acceptable **if reverted before the final commit** and disclosed in the report).
2. Note every observed deviation from the traced expectation.

If the app cannot run (no Supabase credentials, no browser), skip and mark the whole phase `unverified`, listing exactly which findings therefore remain theoretical. Do **not** fabricate observed behavior.

### Phase 11 — Synthesis

Produce the final report (§ 11 below) plus a prioritized fix proposal set. Sequence proposals so that each is independently shippable; explicitly call out which ones are prerequisites for a larger refactor (e.g. "collapse the 20 phases" is only safe after the state-machine audit and the missing tests exist).

---

## 5. Severity scale (use consistently)

| Level | Meaning |
| --- | --- |
| `blocker` | Data loss, security/RLS gap, silent corruption, or a flow that cannot complete |
| `high` | User-visible wrong behavior, orphaned storage/DB rows, spec contradiction where code is wrong |
| `medium` | Confusing/duplicated ownership, missing coverage on a normative branch, stale spec |
| `low` | Naming, dead code, cosmetics, encoding damage |

Effort sizing: `S` (< half a day), `M` (1–3 days), `L` (> 3 days or needs a design decision).

---

## 6. Verified leads to check first (not conclusions)

These came from a shallow pass and are **starting points**; confirm or refute each with evidence, and do not let them narrow the search.

1. Spec File Map paths in `upload-manager-pipeline.md` are stale after the `manager/` `support/` `pipelines/` reorganisation (§ 5).
2. `docs/playbooks/upload-manager-playbook.md` describes a "current state" that predates that reorganisation; decide whether it should be archived, and say so in the report (do not move it here).
3. Two coexisting location paths ("Search Object" vs "legacy fallback") — is the legacy path still reachable in production, and under which inputs?
4. Two `@deprecated Removed — project location is bias-only` markers on live methods — is the removal actually complete on both call paths?
5. 20 phases in the union vs 5 proposed in the playbook — establish the *real* reachable count before anyone acts on that proposal.
6. `UPLOAD_DEV_FLAGS.useTrayOrchestrator: true` is documented as "production default", implying a second, non-orchestrator tray path still exists in the tree.
7. Mojibake in `upload-manager.service.ts`'s header comment — sweep for scope.
8. `docs/specs/service/media-upload-service/adapters/` appears empty while root `AGENTS.md` requires an `adapters/` module structure — confirm intent.
9. `upload-manager-pipeline.md` exceeds the spec size gate (552 vs 400) — the contract may be too big to be followed correctly, which is itself a plausible root cause of drift.

---

## 7. Explicitly out of scope

- Any change to production code, specs, or migrations.
- Renaming media/photo/image symbols — that is `docs/backlog/media-photo-symbol-rename-roadmap.md`.
- Redesigning the upload UI, or design-system/token work.
- Opening PRs. Deliverables are documents on the working branch.
- Deleting or moving existing docs (propose in the report instead).

---

## 8. Definition of done

- [ ] All eleven artifacts in § 11 exist, committed on the working branch.
- [ ] Every branch in § 4.2/Phase 3 has a matrix row with a verdict (or an explicit `unverified` + the check needed).
- [ ] Every finding has `path:line` evidence, a severity, and an effort size.
- [ ] The state-machine diff names each of the 20 phases as reachable or dead.
- [ ] The executive summary is ≤ 15 bullets and leads with `blocker`/`high` findings.
- [ ] Proposals are sequenced with prerequisites marked, and none of them was silently implemented.
- [ ] The report states what could not be verified and why.

---

## 9. Gates the executing agent must still run

Even though no production code changes, run and report:

```bash
npm run lint:specs
npm run design-system:check      # only if any docs/design or SCSS file was touched
npm run i18n:check
cd apps/web && npm run lint      # baseline comparison only
```

New markdown under `docs/audits/` is outside the element-spec lint scope (see the exclusion list in `scripts/lint-specs.mjs`), but confirm `lint:specs` output is unchanged from the Phase 0 baseline before finishing.

---

## 10. Working method notes

- Prefer `rg`/`grep` sweeps over reading 129 files linearly, but **read the whole file** for the ten largest ones listed in Phase 6.4 — that is where the complexity actually lives.
- When a trace crosses a boundary you cannot follow statically (dynamic dispatch, deps built in `upload-manager-facade-deps.util.ts`, effects registered in `upload-manager-effects.util.ts`), stop and resolve the indirection explicitly; do not guess the callee.
- Keep raw sweep output (grep dumps, edge lists) in the scratchpad, not in the deliverables. Deliverables carry conclusions plus pointers.
- If the task must be split across agents, hand over via `00-progress.md` (§ 12), never via conversation memory.

---

## 11. Deliverables

All under `docs/audits/upload-process-analysis-<YYYY-MM-DD>/`:

| # | File | Contents |
| --- | --- | --- |
| 0 | `00-progress.md` | Phase checklist, what is done, what is next, known blockers |
| 0b | `00-baseline.md` | Phase 0 command results, measured counts, environment limits |
| 1 | `01-structure.md` | Layer table, dependency graph (Mermaid, folder-level), cycles, orphans |
| 2 | `02-happy-path.md` | Line-level end-to-end trace |
| 3 | `03-branch-matrix.md` | One row per branch from Phase 3 |
| 4 | `04-state-machine.md` | Actual vs specified FSMs, reachability verdicts |
| 5 | `05-spec-drift.md` | Drift table with spec-wrong/code-wrong verdicts |
| 6 | `06-health.md` | Duplication, dead code, deprecated markers, oversized files, encoding damage |
| 7 | `07-failure-modes.md` | Failure matrix incl. residue and coverage |
| 8 | `08-data-security.md` | Tables/RPCs/buckets, RLS and tenant-isolation findings |
| 9 | `09-coverage.md` | Test coverage map, missing-test descriptions, spec-size split proposal |
| 10 | `10-findings.md` | **Main report**: executive summary (≤15 bullets) + full prioritized findings table |
| 11 | `11-proposals.md` | Fix/refactor proposals, each with severity, effort, prerequisites, affected specs, and a suggested PR boundary |

Add one link line to `docs/audits/README.md` and one bullet to `docs/backlog/README.md` pointing at the folder. That is the only edit to existing files this task permits.

**Findings table columns:** `ID | Severity | Effort | Area | Finding (one sentence) | Evidence (path:line) | Spec clause | Suggested action`.

---

## 12. Resumability

Update `00-progress.md` at the end of every phase and commit. A resuming agent must be able to read that file plus the artifacts and continue without re-running Phases 0–1. If a phase is abandoned, record why.

---

_End of prompt._
