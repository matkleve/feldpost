# Workspace Pane retirement (grid shell)

> **Tracks:** [#257](https://github.com/matkleve/feldpost/issues/257), PR [#265](https://github.com/matkleve/feldpost/pull/265)  
> **Do not execute until:** selected items panel + unified selection are green behind `shellGridLayout`.

## What changes

| Artifact | Grid shell interim (`?ff=shellGridLayout`) | After PR 7 (flag default on) |
| --- | --- | --- |
| `app-workspace-pane` | Still mounts beside grid (legacy) | **Deleted** |
| `app-drag-divider` | Still resizes workspace column | **Deleted** |
| Upload tab in workspace | Hidden | **Deleted** |
| Media/Selected tab | Legacy workspace | → [selected-items-panel.md](./selected-items-panel.md) |
| Projects tab in workspace | Still in legacy pane | Canvas `/projects` only |
| `photoPanelOpen` | Opens legacy pane | → `ShellLayoutService.open('download')` |
| `WorkspacePaneObserverAdapter` | Active | Slimmed or replaced by unified selection |

## Build order (next on branch)

```text
1. Specs (this folder) — selected-items-panel, unified-selection  ← you are here
2. UnifiedSelectionService + red tests
3. app-selected-items-panel body wired into download surface
4. Layout: shellGridLayout on → open download instead of workspace pane
5. LIVE CHECK: map select → panel grid mirrors; footer ZIP works
6. Remove parallel workspace mount when flag on
7. PR 7: flag default true; delete legacy path + drag divider
```

## Parallel work (not blocking download panel)

| Issue | Work |
| --- | --- |
| #272 | Dynamic widget list on left rail |
| #273–#275 | Widget records, rail icon optional |
| Settings → canvas | STUDY-015 §15.4 (separate from workspace) |

## Files to delete (PR 7 only)

Grep gate before merge — must be **0** references:

- `app-workspace-pane` in `authenticated-app-layout` when flag removed
- `app-drag-divider` workspace pairing
- `data-workspace-upload-tab` projection
- `workspacePaneWidth` persistence if no other consumer

## LIVE CHECK block (required before PR 7)

1. Map: select 4 items → download panel shows same 4 with footer.
2. `/media`: toggle selection → panel updates without reopening workspace pane.
3. Panel: deselect one → map marker deselects.
4. Detail: open item from panel → detail inline; close returns to grid.
5. Share URL: restores selection into panel.
6. Flag off: legacy workspace unchanged.
