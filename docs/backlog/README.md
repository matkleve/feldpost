# Backlog (deferred work)

Non-authoritative notes and planned refactors that are **not** implementation contracts. Specs live under `docs/specs/`; this folder holds **do-later** engineering tasks, investigations, and cleanup queues.

When picking something up, promote relevant behavior back into the governing spec in `docs/specs/` in the same change set.

## Where open work lives

**GitHub Issues is the task register.** If something needs doing, it is an issue — not a bullet in a markdown file. The documents in this repository each answer a different question, and merging them is how work gets lost:

| Ask | Look in | Why there |
| --- | --- | --- |
| What still needs doing? | **GitHub Issues** | The register. Labelled, assignable, closable. Priority uses the `priority:P0`–`priority:P3` scheme (the bare `P1`/`P2`/`P3` labels are legacy and being retired). |
| Why this and not the alternative? | [`docs/study/`](../study/README.md) | Reasoning, with an evidence grade (`[A]`–`[D]`) on every claim and a status saying whether it still holds. A `[D]` is a decision and is changeable; reading one as an `[A]` is how an old proposal gets built as though it were a contract. |
| What was true on a given date? | [`docs/audits/`](../audits/README.md) | Point-in-time findings. Dated, not normative, and expected to drift. |
| What must the code do? | [`docs/specs/`](../specs/README.md) | The contract. Normative — code follows the spec, not the reverse. |
| What happened? | [`docs/ai-diary/`](../ai-diary/README.md) | Day-by-day narrative: decisions taken, mistakes made, corrections received. |
| What is deferred but planned? | this folder | Multi-step engineering plans too large for one issue. Each should still have an issue pointing at it. |

Bulk-file issues from a JSON batch rather than one `gh issue create` at a time: `node scripts/create-github-issues.mjs path/to/issues.json` (schema in `scripts/create-github-issues.example.json`).

The 2026-09-10 batch (`scripts/issues-2026-09-10-upload-and-cleanup.json`, 53 items) was filed as issues **#136–#188**. **#130–#135 are duplicates of #136–#141** from an interrupted first run and still need closing by hand — the agent token can create issues but not update them.

## Prioritized plans (cross-cutting)

- **[Workspace pane layout + spec priorities](./workspace-pane-layout-and-spec-priorities.md)** — Target: same `WorkspacePane` on any route with layout-level split; P0 implementation hoist + spec updates; media-download / address-resolver follow-ups.
- **[Workspace pane layout — spec implementation plan](./workspace-pane-layout-spec-implementation-plan.md)** — Step-by-step tasks to apply those priorities across `docs/specs/**/*.md` only (phases, per-file tables, `lint-specs` gates).
- **[Media / photo / image symbol renames](./media-photo-symbol-rename-roadmap.md)** — Deferred identifier alignment (TS, CSS, RPC).
- **[Service spec symmetry matrix](./service-spec-symmetry-matrix.md)** — `core/` ↔ `docs/specs/service/` index and plan.
- **[Upload process analysis (prompt)](./prompt-analysis-upload-process.md)** — Executable investigation plan for the file upload subsystem (~19k LOC, 51 specs, 20 phases): structure map, end-to-end + branch traces, FSM audit, spec↔code drift, failure modes, data/security, coverage; read-only pass, outputs to `docs/audits/`.
- **[Upload process analysis — results](../audits/upload-process-analysis-2026-09-08/10-findings.md)** — Output of that plan (2026-09-08): 50 findings (3 blocker, 12 high) with `path:line` evidence, plus sequenced [proposals](../audits/upload-process-analysis-2026-09-08/11-proposals.md). Start at [`00-progress.md`](../audits/upload-process-analysis-2026-09-08/00-progress.md).
- **Historical audits** — [`docs/audits/`](../audits/README.md) (inventories and move passes; not normative).
