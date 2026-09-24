# Workspace Pane retirement (grid shell)

> **Tracks:** [#257](https://github.com/matkleve/feldpost/issues/257), PR [#265](https://github.com/matkleve/feldpost/pull/265)  
> **Do not execute until:** selected items panel + unified selection are green behind `shellGridLayout`.

## What changes

| Artifact | Grid shell interim (`?ff=shellGridLayout`) | After PR 7 (flag default on) |
| --- | --- | --- |
| `app-workspace-pane` | Still mounts beside grid (legacy) | **Deleted** |
| `app-drag-divider` | Still resizes workspace column | → `app-shell-column-divider` (grid); legacy deleted in PR 9 |
| Upload tab in workspace | Hidden | **Deleted** |
| Media/Selected tab | Legacy workspace | → [selected-items-panel.md](./selected-items-panel.md) |
| Projects tab in workspace | Still in legacy pane | Canvas `/projects` only |
| `photoPanelOpen` | Opens legacy pane | → `ShellLayoutService.open('share')` |
| `WorkspacePaneObserverAdapter` | Active | Slimmed or replaced by unified selection |

## Build order (next on branch)

```text
1. Specs (this folder) — selected-items-panel, unified-selection  ← done
2. UnifiedSelectionService + red tests                            ← done
3. app-selected-items-panel body wired into share surface         ← done
4. Layout: shellGridLayout on → open share instead of workspace   ← done
5. LIVE CHECK: map select → share panel grid mirrors; no footer   ← owner 2026-09-23
6. Remove parallel workspace mount when flag on                   ← done
7. Shell panel resize — spec: shell-panel-resize.md                 ← done
   7a. Column divider: canvas ↔ panel column (reuse drag-divider UX) ← done
   7b. Stack divider: top-aligned vs bottom-aligned panel stacks in column ← done (corrected 2026-09-23)
   7c. Detail mode fix: panel-embedded detail (no narrow fixed overlay); hide shell title in detail ← done
   7d. Shell surface elevation — desk ladder in light/sandstone ([shell-surface-elevation.md](./shell-surface-elevation.md)) ← done
8. LIVE CHECK (resize): column + stack divider drag, persistence, map reflow
   Upload + Help with room → no stack divider (owner 2026-09-23). Divider only on overflow.
8b. Canvas and panel column share one bottom edge — [grid-shell.md](./grid-shell.md), [shell-panel-column.md](./shell-panel-column.md)
8c. Canvas page content left-aligned — [shell-main-canvas.md](./shell-main-canvas.md), [STUDY-015 §16](../../../study/015-shell-grid-layout-change-plan.md) ← done. `/media` later fills the canvas width; `/projects` keeps its list.
9. PR 7: flag default true; legacy layout path unmounted (workspace pane + drag divider no longer mount) ← owner 2026-09-23
```

## Parallel work (not blocking download panel)

| Issue | Work |
| --- | --- |
| #272 | Dynamic widget list on left rail |
| #273–#275 | Widget records, rail icon optional |
| Settings → canvas | Done 2026-09-23. Renderer fills `app-shell-main-canvas`. URL sync stays on `AppComponent`. |

## Files to delete (PR 7 only)

Grep gate before merge — must be **0** references:

- `app-workspace-pane` in `authenticated-app-layout` when flag removed
- `app-drag-divider` workspace pairing
- `data-workspace-upload-tab` projection
- `workspacePaneWidth` persistence if no other consumer

## LIVE CHECK block (required before step 9 / flag default)

1. Map: select 4 items → download panel shows same 4 with footer.
2. `/media`: toggle selection → panel updates without reopening workspace pane.
3. Panel: deselect one → map marker deselects.
4. Detail: open item from panel → detail inline; close returns to grid.
5. Share URL: restores selection into panel.
6. Flag off: legacy workspace unchanged.
7. Resize: column divider + stack divider — see [shell-panel-resize.md](./shell-panel-resize.md) § LIVE CHECK.
