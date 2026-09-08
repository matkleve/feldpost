# 00 — Progress / handover

**Audit:** Full analysis of the file upload process (specs + code + DB + tests)
**Plan:** [`docs/backlog/prompt-analysis-upload-process.md`](../../backlog/prompt-analysis-upload-process.md) — binding; read it first.
**Branch:** `claude/upload-process-analysis-0mnzwr` (branched from `origin/main` @ `8e4b1e09`)
**Started:** 2026-09-08

> Read this file plus the artifacts already produced. A resuming agent must not re-run Phase 0 or Phase 1.

---

## Phase checklist

| Phase | Artifact | Status |
| --- | --- | --- |
| 0 — Baseline | `00-baseline.md` | ✅ done |
| 1 — Static structure map | `01-structure.md` | ✅ done |
| 2 — Happy-path trace | `02-happy-path.md` | ⏳ next |
| 3 — Branch matrix | `03-branch-matrix.md` | ☐ |
| 4 — State machine audit | `04-state-machine.md` | ☐ |
| 5 — Spec ↔ code drift | `05-spec-drift.md` | ☐ |
| 6 — Duplication / dead code / ownership | `06-health.md` | ☐ |
| 7 — Failure modes | `07-failure-modes.md` | ☐ |
| 8 — Data & security | `08-data-security.md` | ☐ |
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
| 1 | Stale File Map paths in `upload-manager-pipeline.md` | open → Phase 5 |
| 2 | `upload-manager-playbook.md` predates the reorg | open → Phase 5 |
| 3 | Two coexisting location paths (Search Object vs legacy) | open → Phase 3/6 |
| 4 | Two `@deprecated Removed` markers — removal complete? | open → Phase 6 |
| 5 | 20 phases vs 5 proposed — real reachable count | open → Phase 4 |
| 6 | `UPLOAD_DEV_FLAGS.useTrayOrchestrator` implies a second tray path | open → Phase 6 |
| 7 | Mojibake sweep | **confirmed**, scope pending → Phase 6.5 |
| 8 | `media-upload-service/adapters/` empty | **refuted** in Phase 0 |
| 9 | Spec size gate on `upload-manager-pipeline.md` | **confirmed with corrected numbers** (284 vs 180) |

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

## Next step

Phase 2 — line-level happy-path trace of one JPEG with EXIF GPS from `submit()` to a visible `/media` row → `02-happy-path.md`.
