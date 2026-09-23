---
id: STUDY-030
type: proposal
status: proposed
supersedes: none
corrected-by: none
---

# Selected items — the action surface, and the plan to finish it

Measured 2026-09-23 on `cursor/selection-deselect-quiet-d4cd` at `3a5f7dee`, by reading the grid-shell layout, the workspace pane, and the specs named below. No app was run.

This study does not replace [STUDY-015](./015-shell-grid-layout-change-plan.md) § 14.7. That decision still stands: one selection, and the select surface mirrors the canvas. This file records the next decision about **which controls that surface may have**, and the work still open after it.

## Owner decision

The selected-items surface shows what the canvas already selected. Selecting is not this window's job `[D]`.

Consequences the owner stated in the same conversation `[D]`:

1. The bottom bar (Select all, Select none, Export ZIP, Share link, Copy link) does not belong there.
2. One small quiet **Deselect all** button at the top of the panel does belong there.
3. Nothing else does.

## What the code does now

- `authenticated-app-layout.component.html` still projects a placeholder paragraph into `panelId="download"` `[A]`. The rail option opens that surface. It does not yet show the grid.
- The grid, the toolbar, and the new **Deselect all** button live on the workspace pane media tab (`workspace-toolbar.component.html`, `workspace-pane.component.html`) `[A]`.
- `app-workspace-pane-footer` and `WORKSPACE_EXPORT_ACTION_DEFINITIONS` are deleted `[A]`.
- The thumbnail context menu in `workspace-selected-items-grid.component.ts` still offers Export ZIP, share link, and copy link `[A]`. The owner did not say to remove that menu.

## Specs this decision now owns

Updated in the same change so they stop telling someone to rebuild the bar `[A]`:

| Spec | Current statement |
| --- | --- |
| [workspace-actions-bar.md](../specs/ui/workspace/workspace-actions-bar.md) | Bar is not mounted. Deselect all is the control. |
| [workspace-pane-footer.md](../specs/component/workspace/workspace-pane-footer.md) | Retired. Do not remount. |
| [workspace-pane-footer.destructive-actions.supplement.md](../specs/component/workspace/workspace-pane-footer.destructive-actions.supplement.md) | Parked. Not a selected-items control. |
| [workspace-toolbar.md](../specs/ui/workspace/workspace-toolbar.md) | Ghost `xs` Deselect all, only while `selectedCount > 0`. |
| [selected-items-panel.md](../specs/ui/shell/selected-items-panel.md) | Panel mirrors the canvas. Same button. No footer. |
| [action-context-matrix.md](../specs/system/action-context-matrix.md) | `ws_footer_single` and `ws_footer_multi` are retired columns with no host. |

## Plan

Not permission to build past step 1. Step 1 is the spec and code change already on this branch. Steps 2–4 stay proposed until the owner accepts them.

| Step | Work | Done when |
| --- | --- | --- |
| 1 | Specs match the decision. Footer code is gone. Deselect all is on the toolbar that the pane already shows. | This branch. |
| 2 | Mount the existing selected-items body (toolbar, grid, detail) inside the download panel, and stop using the workspace pane for that job. Contract: [selected-items-panel.md](../specs/ui/shell/selected-items-panel.md). The placeholder paragraph goes away in the same change. | Rail download opens the grid. Deselect all is on that toolbar. No second selection store. |
| 3 | Delete the `ws_footer_*` columns from the action matrix, or leave them as permanently `—`, in one spec edit. Do not invent a new footer to make the old checks true. | Matrix has no host-less "available" footer cell. |
| 4 | Decide the thumbnail context menu. It still exports. That was not part of the footer decision. | Owner says keep or remove. Until then, leave it. |

## What this study could not prove

- Whether Deselect all should also show while media detail is open. The toolbar unmounts in detail mode today `[A]`. No owner sentence covers that `[C]`.
- Whether step 2 should land before or after STUDY-015's flagged shell is the default. The panel spec already says the legacy pane stays while `shellGridLayout` is off `[A]`.

What would settle the open menu question: one owner sentence on the thumbnail context menu, keep or remove.

## Update 2026-09-23 — step 2

The owner said go. Step 2 is in this branch `[A]`.

- `panelId="download"` projects `app-selected-items-panel` (toolbar, grid, detail). The placeholder paragraph is gone `[A]`.
- The surface header keeps the title and the collapse control. There is no second `app-pane-header` `[A]`.
- With `shellGridLayout` on, `MapShellState.setPhotoPanelOpen` opens or closes `download` and leaves `photoPanelOpen` false. The drag divider and `app-workspace-pane` stay unmounted `[A]`.
- Collapse closes the panel only. It does not call `closeWorkspacePane()`, so it does not clear the selection `[A]`.
- The grid still reads `WorkspaceSelectionService`. No second store `[A]`.
- Step 3 (matrix columns) and step 4 (thumbnail context menu) are unchanged. The red-test for a workspace-only selection is still open.
