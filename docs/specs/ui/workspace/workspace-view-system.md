# Workspace View System — UI overview stub (links only)

## What It Is

A **navigation stub** (non-normative): discovery entry for the workspace feature area. The **canonical** orchestration contract for `WorkspaceViewService`, data flow, and pipeline lives under the service spec—linked below. This file must not duplicate that contract.

## What It Looks Like

Users experience the workspace through `WorkspacePane`, toolbar, and grid surfaces described in sibling UI specs; orchestration behavior is specified in the linked service document.

## Where It Lives

- **This stub:** `docs/specs/ui/workspace/workspace-view-system.md`
- **Canonical contract:** [`docs/specs/service/workspace-view/workspace-view-system.md`](../../service/workspace-view/workspace-view-system.md)
- **Runtime module:** `apps/web/src/app/core/workspace-view/`

## Actions

| # | Trigger | System response | Notes |
| --- | --- | --- | --- |
| 1 | Reader opens this file | Follow link to canonical service spec | Single source of truth |

## Component Hierarchy

See [workspace-pane.md](workspace-pane.md), [workspace-toolbar.md](workspace-toolbar.md), [workspace-actions-bar.md](workspace-actions-bar.md). Service orchestration tree: [workspace-view-system (service)](../../service/workspace-view/workspace-view-system.md).

## Acceptance Criteria

- [ ] This file links to the canonical service spec and does not duplicate its full body.
- [ ] Workspace UI composition specs remain in this folder; service internals stay under `docs/specs/service/workspace-view/`.
