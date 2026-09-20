# Files Page (folder tree)

**Status:** Element Spec — **not implemented** (contract only)
**Route:** `/files`
**Parent:** Authenticated app layout (split host) — see [workspace-pane § Layout host](../ui/workspace/workspace-pane.md#layout-host-canonical); `FilesComponent` renders inside the layout's `router-outlet` main column.
**Decision:** [STUDY-006 D-04 / Phase 4](../../study/006-upload-pipeline-correction-plan.md) · **Findings:** [F-08](../../study/005-upload-pipeline-trace-findings.md#f-08)
**Detail:** [files-page.bulk-resolution.supplement.md](./files-page.bulk-resolution.supplement.md)

---

## What It Is

A tree of the uploaded media, reconstructed from the folder paths the files arrived with, and the
place where **unresolved items get fixed a folder at a time** instead of one tray question per file.

## Why it exists

The upload pipeline treats a folder path as *evidence for an address* and then organises everything
by address. That is right for a photo of a building, and wrong for an operator who has just imported
an archive and needs to find what did not resolve. At archive scale the per-file tray model does not
survive its own arithmetic — ~45 000 questions for 100 000 files
([F-08](../../study/005-upload-pipeline-trace-findings.md#f-08)) — so D-04 defers those to Issues and
resolves them in bulk afterwards. This page is that "afterwards".

## What It Looks Like

A two-pane route. Left: a virtualised folder tree, each node showing its name, a file count, and an
**unresolved count** badge when non-zero. Right: the contents of the selected folder as a media grid
reusing the existing item grid, with a selection bar. Folders with unresolved items are the only
ones that carry a badge, so the eye lands on work rather than on volume. A folder with **no**
unresolved descendants is still browsable — this is a tree of everything, not a queue.

## Where It Lives

Route `/files`, a new sidebar entry in `nav.component.ts`'s flat `navItems` list. **Icon must not be
`folder`** — the sidebar's *Projects* item already uses it; use `account_tree`. The entry sits after
*Media* and before *Projects*.

## The tree is derived, and it is not a filesystem

`media_items.relative_path` is written once at insert and is **immutable after insert**, enforced by
a trigger (`20260412123000_media_items_raw_columns_immutability.sql`). Two consequences are
normative:

1. **No rename, move, create or delete of folders.** A node is a path prefix of existing rows, not a
   stored entity. The UI MUST NOT offer folder mutation; the trigger would reject it anyway.
2. **Nodes are merged across uploads.** Identical paths from different upload sessions form one
   node. *Accepted risk:* two unrelated imports that both had a `Fotos/` root merge silently. The
   agreed mitigation is to surface each file's upload batch on its row so a merge is visible; see
   Risks.

## Actions & Interactions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Opens `/files` | Root level loads; deeper levels stay unfetched | route activation |
| 2 | Expands a node | That node's children load (one level) | lazy fetch |
| 3 | Selects a folder | Right pane lists the folder's own files; counts include descendants | grid load |
| 4 | Selects "include subfolders" | Right pane lists the whole subtree | grid reload |
| 5 | Selects files, or the folder | Selection bar shows count and eligible bulk actions | selection state |
| 6 | Applies an address to the selection | Bulk resolution runs; see the supplement | writes `locations` |
| 7 | Clicks a file | Opens the existing media detail pane | unchanged behaviour |
| 8 | Clicks an unresolved badge | Filters the right pane to unresolved only | filter state |

## Component Hierarchy

```
FilesComponent (/files)
├── FilesTreePane
│   ├── FolderTreeNode (recursive, virtualised)
│   │   └── [unresolved badge] when unresolvedCount > 0
│   └── [empty state] when the org has no media with a relative_path
└── FilesContentPane
    ├── FilesToolbar (include-subfolders, unresolved-only, selection count)
    ├── ItemGrid (reused, media path)
    └── [BulkResolutionBar] when selection is non-empty
```

## Data

| Source | Field / method | Note |
| --- | --- | --- |
| `media_items` | `relative_path` | **Persisted today, not read today** — see Prerequisite |
| `media_items` | `id`, `location_status`, `captured_at`, `thumbnail_path`, `storage_path` | already selected by the workspace read model |
| `locations` | address fields | written by bulk resolution, not read here |
| RPC | `list_media_folder_children(prefix)` | child segments + file/unresolved counts |
| RPC | `list_media_in_folder(prefix, recursive)` | paginated file rows |

**Prerequisite — done 2026-09-15.** `relative_path` was stored but selected nowhere; it is now read
in the media list and detail queries and carried on `MediaRecord`.

**Aggregation belongs in SQL.** Counting a subtree client-side means fetching every row — at 100 000
items, the cost Phase 3 removed. Both RPCs MUST aggregate server-side and MUST be
`organization_id`-scoped by the same RLS as `media_items`.

**Implementation status, and an unmet verification requirement:**
[files-page.tree-rpcs.supplement.md](./files-page.tree-rpcs.supplement.md).

## State

| State | Type | Default | Effect |
| --- | --- | --- | --- |
| `expandedPaths` | `Set<string>` | `{}` | which nodes are open |
| `selectedPath` | `string \| null` | `null` | drives the right pane |
| `includeSubfolders` | `boolean` | `false` | recursive listing |
| `unresolvedOnly` | `boolean` | `false` | filters the right pane |
| `selection` | `Set<mediaId>` | `{}` | enables the bulk bar |
| `childrenByPath` | `Map<string, Node[]>` | empty | lazily filled; never eagerly walked |

## File Map

| File | Purpose |
| --- | --- |
| `features/files/files.component.ts/html` | route shell, two-pane composition |
| `features/files/files-tree-pane.component.ts` | virtualised tree |
| `features/files/files-content-pane.component.ts` | grid + toolbar |
| `core/media-folders/media-folder-tree.service.ts` | RPC facade, lazy children, counts |
| `features/nav/nav.component.ts` | one `navItems` entry (`account_tree`, `/files`) |
| `supabase/migrations/*_media_folder_listing.sql` | the two RPCs |
| `core/workspace-view/workspace-view.service.ts` | add `relative_path` to the select |

## Wiring

`FilesComponent` is routed in the authenticated layout beside `/media` and reuses `ItemGrid` and the
media detail pane rather than restating them. `MediaFolderTreeService` is the only caller of the new
RPCs. Bulk resolution reuses the existing location-resolution services — it does **not** open trays.

## Acceptance Criteria

- [ ] `/files` renders a tree built from `relative_path`, with no folder-mutation affordance.
- [ ] Expanding a node fetches exactly that node's children; opening the page does not read every row.
- [ ] File and unresolved counts come from a server-side aggregate, verified by query count at 20 000 items.
- [ ] Identical paths from two upload batches appear as one node, and each file row shows its batch.
- [ ] A folder with zero unresolved items shows no badge and is still browsable.
- [ ] Every query is `organization_id`-scoped; a second org's media never appears (RLS test).
- [ ] Bulk resolution meets the criteria in the supplement.

## Interaction emphasis

Actionable controls here are the tree rows, the toolbar toggles and the bulk bar. The bulk bar's
apply action is the page's single high-attention control and takes **brand gold**; tree rows and
toggles are passive context (cool blue) per
[state-visuals § Interaction emphasis](../../design/state-visuals.md).

**Risks:** see [tree RPCs supplement](./files-page.tree-rpcs.supplement.md) § Risks.
