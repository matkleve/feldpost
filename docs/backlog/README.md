# Backlog (deferred work)

Non-authoritative notes and planned refactors that are **not** implementation contracts. Specs live under `docs/specs/`; this folder holds **do-later** engineering tasks, investigations, and cleanup queues.

When picking something up, promote relevant behavior back into the governing spec in `docs/specs/` in the same change set.

## Prioritized plans (cross-cutting)

- **[Workspace pane layout + spec priorities](./workspace-pane-layout-and-spec-priorities.md)** — Target: same `WorkspacePane` on any route with layout-level split; P0 implementation hoist + spec updates; media-download / address-resolver follow-ups.
- **[Workspace pane layout — spec implementation plan](./workspace-pane-layout-spec-implementation-plan.md)** — Step-by-step tasks to apply those priorities across `docs/specs/**/*.md` only (phases, per-file tables, `lint-specs` gates).
- **[Media / photo / image symbol renames](./media-photo-symbol-rename-roadmap.md)** — Deferred identifier alignment (TS, CSS, RPC).
- **[Service spec symmetry matrix](./service-spec-symmetry-matrix.md)** — `core/` ↔ `docs/specs/service/` index and plan.
- **Historical audits** — [`docs/audits/`](../audits/README.md) (inventories and move passes; not normative).
