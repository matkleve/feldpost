# Workspace Export Bar — Implementation Blueprint

> **Spec**: [element-specs/workspace-export-bar.md](../element-specs/workspace-export-bar.md)
> **Use cases**: [use-cases/workspace-export.md](../use-cases/workspace-export.md)
> **Status**: Planned (not implemented)

## Existing Infrastructure

| File                                                                      | What it provides                                      |
| ------------------------------------------------------------------------- | ----------------------------------------------------- |
| `apps/web/src/app/core/workspace-view.service.ts`                         | Scoped image dataset for active selection workflows   |
| `apps/web/src/app/features/map/workspace-pane/thumbnail-grid.component.*` | Grid rendering where selection affordance is attached |
| `apps/web/src/app/core/supabase.service.ts`                               | Supabase client abstraction                           |
| `supabase/migrations/20260303000005_rls.sql`                              | Existing RLS pattern style and helper function usage  |

## Deliverables

1. Multi-select interaction in workspace media cards.
2. Bottom export bar with selection actions.
3. Share-set persistence (`share_sets`, `share_set_items`) with RLS + RPC.
4. Download ZIP flow with naming defaults.
5. Clipboard + native-share integration with fallback UX.

## Migration Plan

### Migration A: Share Set Schema + RLS + RPC

Create `supabase/migrations/20260318090000_share_sets.sql` with:

1. Tables
   - `share_sets`
   - `share_set_items`
2. Indexes
   - `idx_share_sets_org_fingerprint_active`
   - `idx_share_sets_lookup_active`
   - `idx_share_set_items_share_order`
3. RLS policies for both tables (org-scoped read, owner/admin write)
4. RPCs
   - `create_or_reuse_share_set(p_image_ids uuid[], p_expires_at timestamptz)`
   - `resolve_share_set(p_token text)`
5. Grants to `authenticated`

Validation:

- `npx supabase db push`
- RLS access checks with users from same org and foreign org
- expired + revoked token behavior tests

## Frontend Service Plan

### 1) Workspace Selection Service

Create `apps/web/src/app/core/workspace-selection.service.ts`:

- `selectedMediaIds: WritableSignal<Set<string>>`
- `selectedCount: Signal<number>`
- `toggle(id, options)` with modifier-aware semantics
- `selectAllInScope(scopeIds: string[])`
- `clearSelection()`
- optional `setAnchor(id)` for future Shift-range select

### 2) Share Set Service

Create `apps/web/src/app/core/share-set.service.ts`:

- `createOrReuseShareSet(imageIds: string[], expiresAt?: string)`
- `resolveShareSet(token: string)`
- map RPC responses into UI-ready DTOs
- never expose raw token hash handling to components

### 3) ZIP Export Service

Create `apps/web/src/app/core/zip-export.service.ts`:

- `buildDefaultTitle(context): string`
- `exportSelectionAsZip(imageIds: string[], title: string)`
- fetch signed URLs via `SupabaseService`
- package files using `jszip`
- emit progress updates for dialog/bar

## Component Plan

### 1) Workspace Export Bar Component

Create:

- `apps/web/src/app/features/map/workspace-pane/workspace-export-bar.component.ts`
- `apps/web/src/app/features/map/workspace-pane/workspace-export-bar.component.html`
- `apps/web/src/app/features/map/workspace-pane/workspace-export-bar.component.scss`

Responsibilities:

- render selected count
- actions: select all, select none, share link, copy link, download ZIP
- open/close share/download dialogs
- keyboard shortcuts (`Ctrl/Cmd + A`, `Escape`) while workspace focused

### 2) Share Dialog Component

Create:

- `share-selection-dialog.component.ts/html/scss`

Responsibilities:

- generate/reuse share token
- display URL
- copy-to-clipboard with toast feedback
- optional native share button if `navigator.share` available

### 3) Download Dialog Component

Create:

- `download-selection-dialog.component.ts/html/scss`

Responsibilities:

- prefill title (project name or heuristic + date)
- validate filename
- trigger ZIP export
- show progress and error states

### 4) Thumbnail Grid Integration

Update `thumbnail-grid.component.*`:

- add top-left selection checkbox affordance
- handle checkbox click and modifier-click
- ensure detail-open click and selection click are disambiguated

### 5) Workspace Pane Integration

Update `workspace-pane.component.*` (or host map-shell layout where pane content is currently composed):

- mount `WorkspaceExportBarComponent` at bottom when selected count > 0
- pass current scope IDs for deterministic `Select all`

## Dependency Additions

`apps/web/package.json`:

- `jszip` for ZIP assembly

No direct component-level Supabase calls; use services only.

## Test Plan

Create tests:

1. `workspace-selection.service.spec.ts`
   - toggle behavior
   - select all/none behavior
   - persistence across sort/filter scope changes
2. `share-set.service.spec.ts`
   - create/reuse mapping
   - resolve valid/expired/revoked cases
3. `zip-export.service.spec.ts`
   - title defaults
   - filename sanitization
   - partial fetch failure handling
4. component specs for export bar/dialog interactions

Manual verification:

- desktop: hover checkbox + Ctrl/Cmd-click
- mobile: native share availability fallback
- cross-org token access denied

## Rollout Sequence

1. Ship migration and RPCs.
2. Implement `WorkspaceSelectionService` and integrate card selection.
3. Add export bar shell (`Select all`, `Select none`) first.
4. Add share-link flow.
5. Add ZIP download flow.
6. Add keyboard shortcuts and UX polish.
7. Final accessibility + regression pass in workspace view flows.
