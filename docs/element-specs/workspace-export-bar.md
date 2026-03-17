# Workspace Export Bar

> **Blueprint:** [implementation-blueprints/workspace-export-bar.md](../implementation-blueprints/workspace-export-bar.md)
> **Use cases:** [use-cases/workspace-export.md](../use-cases/workspace-export.md)

## What It Is

The Workspace Export Bar is a bottom action surface in the Workspace Pane that appears when at least one media item is selected. It enables batch actions for the current selection across three areas: selection controls (select all/none), curation actions (add to project, change address, delete), and export actions (share as stable link, copy link, download as ZIP).

## What It Looks Like

The bar is anchored to the bottom edge of the Workspace Pane content area and spans full pane width. Height is 3.5rem (56px) minimum touch target, with horizontal padding 0.75rem (12px) and control gap 0.5rem. Background uses `--color-bg-elevated`, top border `1px` in `--color-border-subtle`, and a soft shadow token used by elevated overlays. It enters with a vertical translate and opacity transition from `docs/design/motion.md` timing tokens. Primary actions are left-to-right: selection controls, count summary, curation actions, then export actions.

Each media card in the thumbnail grid shows a quiet checkbox affordance at top-left on hover/focus, and always-visible when selected. On desktop, multi-select follows common patterns: checkbox click, Ctrl-click on Windows/Linux, Cmd-click on macOS; Shift-range selection is optional but reserved in state model.

## Where It Lives

- **Route**: `/`
- **Parent**: `WorkspacePaneComponent` content stack in `features/map/workspace-pane/workspace-pane.component.ts`
- **Appears when**: `selectedMediaIds.size > 0` in workspace selection scope

## Actions & Interactions

| #   | User Action                                           | System Response                                                                   | Triggers                            |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | Hovers media tile                                     | Reveals top-left checkbox affordance                                              | Pointer hover/focus                 |
| 2   | Clicks checkbox                                       | Toggles selection state for media ID                                              | `selectedMediaIds` update           |
| 3   | Ctrl/Cmd + clicks media tile                          | Toggles selection without entering detail view                                    | Modifier + click handler            |
| 4   | Selects first item                                    | Export bar animates in from bottom                                                | `selectedMediaIds.size` from 0 to 1 |
| 5   | Clicks `Select all`                                   | Selects all currently scoped items (filtered/grouped result set, not whole DB)    | `selectAllInScope()`                |
| 6   | Clicks `Select none`                                  | Clears selection, bar animates out                                                | `clearSelection()`                  |
| 7   | Clicks `Add to project`                               | Opens project picker dialog scoped to current organization                        | `addToProjectDialogOpen = true`     |
| 8   | Confirms add to existing project                      | Upserts project memberships for all selected media IDs                            | `bulkAddToProject(ids, projectId)`  |
| 9   | Clicks `Change address`                               | Opens bulk address editor with preview count                                      | `changeAddressDialogOpen = true`    |
| 10  | Confirms address change                               | Updates selected media rows with normalized address value                         | `bulkChangeAddress(ids, address)`   |
| 11  | Clicks `Delete`                                       | Opens destructive confirmation with selected count                                | `deleteDialogOpen = true`           |
| 12  | Confirms deletion                                     | Deletes selected media rows and related storage references, then clears selection | `bulkDeleteMedia(ids)`              |
| 13  | Clicks `Share link`                                   | Opens Share Dialog with count and visibility summary                              | `shareDialogOpen = true`            |
| 14  | Confirms link generation                              | Creates or fetches stable share-set token mapped to normalized selected IDs       | `createShareSetToken(ids)`          |
| 15  | Clicks `Copy link`                                    | Writes resolved URL to clipboard and shows toast                                  | `navigator.clipboard.writeText`     |
| 16  | Clicks `Share` on supported device                    | Invokes native share sheet with URL/title/text                                    | `navigator.share`                   |
| 17  | Clicks `Download ZIP`                                 | Opens Download Dialog with prefilled filename/title                               | `downloadDialogOpen = true`         |
| 18  | Confirms ZIP download                                 | Fetches binaries, packages ZIP, starts browser download                           | `startZipExport()`                  |
| 19  | Edits filename/title                                  | Validates and normalizes safe filename                                            | `exportTitle` validation            |
| 20  | Presses `Ctrl/Cmd + A` while workspace has focus      | Selects all items in current scope                                                | keyboard selection shortcut         |
| 21  | Presses `Escape` while export bar is active           | Clears selection and closes bar                                                   | keyboard cancel shortcut            |
| 22  | Changes sorting/filtering/grouping while items chosen | Keeps selected IDs by identity; selected count includes hidden-but-selected IDs   | resilient selection state           |
| 23  | Opens shared link URL                                 | Resolves token to exact media ID set and renders same set in workspace context    | token resolve flow                  |
| 24  | Opens shared link from unauthorized org               | Shows access denied state; no media payload returned                              | RLS + org checks                    |
| 25  | Opens expired shared link                             | Shows expired-link state with retry/request guidance                              | token TTL validation                |
| 26  | Export encounters partial fetch failures              | Shows recoverable error with retry and "download available only" fallback         | ZIP error path                      |

## Component Hierarchy

```
WorkspacePane
├── ActiveSelectionView
│   └── ThumbnailGrid
│       └── MediaCard × N
│           └── SelectionCheckbox [top-left, quiet on hover]
├── [selectedMediaIds.size > 0] WorkspaceExportBar ← `.ui-container` bottom action surface
│   ├── SelectionActions
│   │   ├── Button: Select none
│   │   └── Button: Select all
│   ├── SelectionSummary
│   │   └── Label: "X selected"
│   ├── CurationActions
│   │   ├── Button: Add to project
│   │   ├── Button: Change address
│   │   └── Button: Delete (danger)
│   ├── ExportActions
│   │   ├── Button: Share link
│   │   ├── Button: Copy link
│   │   └── Button: Download ZIP
│   └── [mobile+supported] Button: Native Share
├── [addToProjectDialogOpen] AddToProjectDialog
│   ├── ProjectSearch
│   ├── ProjectList
│   └── Confirm/CancelButtons
├── [changeAddressDialogOpen] ChangeAddressDialog
│   ├── AddressInput
│   ├── SelectionScopeSummary
│   └── Confirm/CancelButtons
├── [deleteDialogOpen] DeleteSelectionDialog
│   ├── WarningCopy
│   ├── SelectionScopeSummary
│   └── Confirm/CancelButtons
├── [shareDialogOpen] ShareSelectionDialog
│   ├── ScopeSummary
│   ├── LinkField
│   ├── CopyButton
│   └── Generate/RegenerateButton
└── [downloadDialogOpen] DownloadSelectionDialog
    ├── TitleInput
    ├── DefaultNameHint
    ├── ProgressRow [during zip generation]
    └── Confirm/CancelButtons
```

## Data Requirements

### Data Flow (Mermaid)

```mermaid
flowchart LR
  UI[WorkspaceExportBar UI] --> WS[WorkspaceSelectionService]
  UI --> MB[MediaBulkActionsService]
  MB --> DBI[(images, image_projects)]
  WS --> SS[ShareSetService]
  SS --> DB[(share_sets, share_set_items)]
  WS --> ZE[ZipExportService]
  ZE --> ST[(Supabase Storage)]
  MB --> ST
  SS --> UI
  MB --> UI
  ZE --> UI
```

### Schema / Query Notes

| Field / Artifact      | Source                                      | Type            | Notes                                                      |
| --------------------- | ------------------------------------------- | --------------- | ---------------------------------------------------------- |
| Selected IDs          | `WorkspaceSelectionService`                 | `Set<string>`   | Canonical identity source for export actions               |
| Selection scope IDs   | `WorkspaceViewService.groupedSections()`    | `string[]`      | Used by `Select all` for current filtered/grouped scope    |
| Project membership    | `MediaBulkActionsService.bulkAddToProject`  | mutation result | Upserts selected IDs into `image_projects` for a project   |
| Address field update  | `MediaBulkActionsService.bulkChangeAddress` | mutation result | Updates selected images address fields in one batch        |
| Bulk delete mutation  | `MediaBulkActionsService.bulkDeleteMedia`   | mutation result | Deletes selected media records with storage cleanup        |
| Share token           | `ShareSetService`                           | `string`        | URL-safe token, high entropy, deterministic mapping policy |
| Share-set fingerprint | Backend function                            | `string`        | Hash of sorted media IDs + org context for dedup/lookup    |
| Share-set rows        | `share_sets`, `share_set_items`             | relational rows | New schema to persist stable shared groups                 |
| Export title default  | `ProjectService` + media metadata           | `string`        | Project name or heuristic `bestLabel + yyyy-mm-dd`         |
| ZIP blob              | `ZipExportService`                          | `Blob`          | Mixed media archive download                               |

### SQL Contract (Share Sets)

```sql
-- share_sets: one logical shared selection
CREATE TABLE public.share_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  fingerprint text NOT NULL,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_share_sets_org_fingerprint_active
  ON public.share_sets (organization_id, fingerprint)
  WHERE revoked_at IS NULL;

CREATE INDEX idx_share_sets_lookup_active
  ON public.share_sets (organization_id, token_hash)
  WHERE revoked_at IS NULL;

-- share_set_items: explicit ordered membership for deterministic rendering
CREATE TABLE public.share_set_items (
  share_set_id uuid NOT NULL REFERENCES public.share_sets(id) ON DELETE CASCADE,
  image_id uuid NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  item_order int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (share_set_id, image_id)
);

CREATE INDEX idx_share_set_items_share_order
  ON public.share_set_items (share_set_id, item_order);
```

### RLS Contract (Share Sets)

```sql
ALTER TABLE public.share_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_set_items ENABLE ROW LEVEL SECURITY;

-- Org-scoped read for authenticated members.
CREATE POLICY share_sets_select_org
  ON public.share_sets
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.user_org_id()
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Create only within own org, creator tied to auth.uid().
CREATE POLICY share_sets_insert_own_org
  ON public.share_sets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.user_org_id()
    AND created_by = auth.uid()
    AND NOT public.is_viewer()
  );

-- Revoke/delete only by creator or admin inside org.
CREATE POLICY share_sets_update_owner_or_admin
  ON public.share_sets
  FOR UPDATE
  TO authenticated
  USING (organization_id = public.user_org_id() AND (created_by = auth.uid() OR public.is_admin()))
  WITH CHECK (organization_id = public.user_org_id());

CREATE POLICY share_sets_delete_owner_or_admin
  ON public.share_sets
  FOR DELETE
  TO authenticated
  USING (organization_id = public.user_org_id() AND (created_by = auth.uid() OR public.is_admin()));

-- Item table inherits access from parent share_set.
CREATE POLICY share_set_items_select_via_parent
  ON public.share_set_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.share_sets s
      WHERE s.id = share_set_id
        AND s.organization_id = public.user_org_id()
        AND s.revoked_at IS NULL
        AND (s.expires_at IS NULL OR s.expires_at > now())
    )
  );

CREATE POLICY share_set_items_write_owner_or_admin
  ON public.share_set_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.share_sets s
      WHERE s.id = share_set_id
        AND s.organization_id = public.user_org_id()
        AND (s.created_by = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.share_sets s
      WHERE s.id = share_set_id
        AND s.organization_id = public.user_org_id()
        AND (s.created_by = auth.uid() OR public.is_admin())
    )
  );
```

### RPC Contract

```sql
-- create_or_reuse_share_set(p_image_ids uuid[], p_expires_at timestamptz)
-- returns: token, share_set_id, expires_at
-- behavior:
-- 1) sort ids, derive fingerprint
-- 2) reuse active set for same org+fingerprint or create new row
-- 3) upsert ordered members in share_set_items

-- resolve_share_set(p_token text)
-- returns: share_set_id, image_id, item_order
-- behavior:
-- 1) hash incoming token and look up token_hash
-- 2) enforce org, revoked_at, expires_at checks
-- 3) return ordered ids for deterministic UI rendering
```

### Data Model (Mermaid)

```mermaid
erDiagram
  share_sets ||--o{ share_set_items : contains
  images ||--o{ share_set_items : referenced

  share_sets {
    uuid id PK
    uuid organization_id
    uuid created_by
    text token UK
    text fingerprint
    timestamptz expires_at
    timestamptz created_at
  }

  share_set_items {
    uuid share_set_id FK
    uuid image_id FK
    int item_order
    timestamptz created_at
  }
```

## State

| Name                      | Type                                                                    | Default              | Controls                                         |
| ------------------------- | ----------------------------------------------------------------------- | -------------------- | ------------------------------------------------ |
| `selectedMediaIds`        | `WritableSignal<Set<string>>`                                           | empty set            | Current selection identity set                   |
| `lastAnchorId`            | `WritableSignal<string \| null>`                                        | `null`               | Optional anchor for future Shift-range selection |
| `exportBarVisible`        | `Signal<boolean>`                                                       | `false`              | Derived from `selectedMediaIds.size > 0`         |
| `addToProjectDialogOpen`  | `WritableSignal<boolean>`                                               | `false`              | Add-to-project dialog visibility                 |
| `changeAddressDialogOpen` | `WritableSignal<boolean>`                                               | `false`              | Change-address dialog visibility                 |
| `deleteDialogOpen`        | `WritableSignal<boolean>`                                               | `false`              | Delete confirmation dialog visibility            |
| `bulkActionStatus`        | `WritableSignal<'idle' \| 'running' \| 'error'>`                        | `'idle'`             | Batch curation action lifecycle state            |
| `busyBulkAction`          | `WritableSignal<'add-project' \| 'change-address' \| 'delete' \| null>` | `null`               | Prevents duplicate destructive/slow actions      |
| `shareDialogOpen`         | `WritableSignal<boolean>`                                               | `false`              | Share dialog visibility                          |
| `downloadDialogOpen`      | `WritableSignal<boolean>`                                               | `false`              | Download dialog visibility                       |
| `shareUrl`                | `WritableSignal<string \| null>`                                        | `null`               | Generated/loaded share URL                       |
| `isGeneratingShareLink`   | `WritableSignal<boolean>`                                               | `false`              | Share link generation in progress                |
| `exportTitle`             | `WritableSignal<string>`                                                | `''`                 | User-editable ZIP title                          |
| `zipProgress`             | `WritableSignal<number>`                                                | `0`                  | ZIP generation progress percent                  |
| `zipStatus`               | `WritableSignal<'idle' \| 'running' \| 'done' \| 'error'>`              | `'idle'`             | ZIP export lifecycle state                       |
| `selectionSourceScope`    | `WritableSignal<'active-selection' \| 'saved-group'>`                   | `'active-selection'` | Which workspace context defines `Select all`     |

## Settings

- **Export & Sharing**: default share-link expiration, allow token reuse vs forced regeneration, and whether native-share action is enabled on supported devices.
- **Selection Bulk Actions**: default delete confirmation behavior, whether address-change requires non-empty validation, and which project targets are shown first (recent vs alphabetical).

## File Map

| File                                                                   | Purpose                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| `features/map/workspace-pane/workspace-export-bar.component.ts`        | Bottom action bar component                                  |
| `features/map/workspace-pane/workspace-export-bar.component.html`      | Template for selection and export actions                    |
| `features/map/workspace-pane/workspace-export-bar.component.scss`      | Bar layout, transitions, responsive behavior                 |
| `features/map/workspace-pane/add-to-project-dialog.component.ts`       | Batch add-to-project dialog behavior                         |
| `features/map/workspace-pane/add-to-project-dialog.component.html`     | Project picker for selected media                            |
| `features/map/workspace-pane/add-to-project-dialog.component.scss`     | Add-to-project dialog styles                                 |
| `features/map/workspace-pane/change-address-dialog.component.ts`       | Batch change-address dialog behavior                         |
| `features/map/workspace-pane/change-address-dialog.component.html`     | Address editor for selected media                            |
| `features/map/workspace-pane/change-address-dialog.component.scss`     | Change-address dialog styles                                 |
| `features/map/workspace-pane/delete-selection-dialog.component.ts`     | Batch delete confirmation dialog behavior                    |
| `features/map/workspace-pane/delete-selection-dialog.component.html`   | Destructive confirmation content                             |
| `features/map/workspace-pane/delete-selection-dialog.component.scss`   | Delete dialog styles                                         |
| `features/map/workspace-pane/share-selection-dialog.component.ts`      | Share-link dialog component                                  |
| `features/map/workspace-pane/share-selection-dialog.component.html`    | Share dialog template                                        |
| `features/map/workspace-pane/share-selection-dialog.component.scss`    | Share dialog styles                                          |
| `features/map/workspace-pane/download-selection-dialog.component.ts`   | ZIP download dialog component                                |
| `features/map/workspace-pane/download-selection-dialog.component.html` | Download dialog template                                     |
| `features/map/workspace-pane/download-selection-dialog.component.scss` | Download dialog styles                                       |
| `core/workspace-selection.service.ts`                                  | Selection state, toggles, select all/none, keyboard handling |
| `core/media-bulk-actions.service.ts`                                   | Batch add-to-project, change-address, and delete operations  |
| `core/share-set.service.ts`                                            | Create/resolve share-set tokens via Supabase                 |
| `core/zip-export.service.ts`                                           | Fetch signed URLs/files, build ZIP blob, trigger download    |
| `supabase/migrations/20260318090000_share_sets.sql`                    | `share_sets` + `share_set_items` tables, indexes, RLS, RPC   |
| `docs/use-cases/workspace-export.md`                                   | Behavioral scenarios and validation checklist                |
| `docs/implementation-blueprints/workspace-export-bar.md`               | Delivery plan with file-level implementation tasks           |

## Wiring

### Wiring Flow (Mermaid)

```mermaid
sequenceDiagram
  participant User
  participant Grid as ThumbnailGrid
  participant Sel as WorkspaceSelectionService
  participant Bar as WorkspaceExportBar
  participant Share as ShareSetService
  participant Zip as ZipExportService

  User->>Grid: Ctrl/Cmd-click item
  Grid->>Sel: toggleSelection(id)
  Sel-->>Bar: selectedCount > 0
  Bar-->>User: show bottom export bar
  User->>Bar: Share link
  Bar->>Share: createOrFetchShareSet(selectedIds)
  Share-->>Bar: shareUrl
  User->>Bar: Download ZIP
  Bar->>Zip: export(selectedIds, title)
  Zip-->>User: browser download
```

- `WorkspaceExportBarComponent` is rendered inside `WorkspacePaneComponent` below workspace content, using a sticky-bottom container.
- `WorkspaceSelectionService` is the single source of truth for selected IDs and shortcut handling.
- `WorkspaceViewService` provides current scope IDs for deterministic `Select all` behavior.
- `ShareSetService` uses Supabase APIs through service abstraction; components never call Supabase directly.
- `ZipExportService` resolves signed file URLs and assembles ZIP in browser before download trigger.

## Acceptance Criteria

- [x] Hovering a media card reveals a top-left selection checkbox without shifting layout.
- [x] Checkbox click toggles selection state and never opens detail view.
- [x] Ctrl-click (Windows/Linux) and Cmd-click (macOS) toggle selection on media cards.
- [ ] First selection opens export bar with transition; zero selection closes it.
- [x] Export bar always includes `Select none` and `Select all` actions.
- [ ] Export bar includes `Add to project`, `Change address`, and `Delete` actions for selected media.
- [ ] `Add to project` applies to every currently selected ID and reports per-item failures non-destructively.
- [ ] `Change address` updates every selected media row and refreshes both grid labels and marker tooltip/address surfaces.
- [ ] `Delete` requires explicit confirmation and removes all selected media while clearing stale selection IDs.
- [ ] `Select all` targets current workspace scope (active filters/grouping/tab), not entire dataset.
- [ ] Selection survives sort, filter, grouping, and fullscreen transitions.
- [x] Share link creation returns a stable tokenized URL for the selected set.
- [ ] Opening a valid share URL reproduces the same media set ordering and membership.
- [x] Share URL access is denied outside organization boundaries via RLS/policy checks.
- [ ] Download dialog pre-fills title with project name when single-project scope is detected.
- [ ] Download dialog pre-fills `bestLabel + date` for ad-hoc or mixed-project selections.
- [x] ZIP export includes mixed media (images, PDFs, supported files) and starts a browser download.
- [x] Copy link uses Clipboard API in secure contexts and shows success/error feedback.
- [x] Native share action uses Web Share API only when feature support and activation constraints are met.
