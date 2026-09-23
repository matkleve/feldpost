# Workspace Pane Footer

> **Retired.** Do not remount this bar. The selected-items surface mirrors canvas selection. **Deselect all** lives on [workspace-toolbar.md](../../ui/workspace/workspace-toolbar.md). The feature index is [workspace-actions-bar.md](../../ui/workspace/workspace-actions-bar.md).

## What It Is

A removed bottom action bar. It used to host select all, select none, share, copy, ZIP, and two bulk deletes. The component files and `WORKSPACE_EXPORT_ACTION_DEFINITIONS` are deleted.

## What It Looks Like

Nothing. The selected-items column has no footer slot for export or selection controls.

## Where It Lives

- **Code:** removed from `apps/web/src/app/shared/workspace-pane/footer/workspace-pane-footer/`
- **Parent:** none

## Actions

| # | User action | System response | Notes |
| --- | --- | --- | --- |
| 1 | Expects the old footer | No footer renders | Use **Deselect all** on the toolbar |

## Component Hierarchy

```text
(no app-workspace-pane-footer)
```

## Data

No data. Selection stays on `WorkspaceSelectionService`.

## State

No component state.

## File Map

| File | Purpose |
| --- | --- |
| — | Component removed |

## Wiring

Do not wire `app-workspace-pane-footer` back into `WorkspacePaneComponent` or the download panel.

The parked bulk-delete write-up is [workspace-pane-footer.destructive-actions.supplement.md](./workspace-pane-footer.destructive-actions.supplement.md). It is not a build instruction for this surface.

## Acceptance Criteria

- [x] `app-workspace-pane-footer` is not registered and not imported.
- [x] Selected-items tab has no footer projection.
