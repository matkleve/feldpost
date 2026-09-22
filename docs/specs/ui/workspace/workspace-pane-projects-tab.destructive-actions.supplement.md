# Workspace Pane — Projects Tab: Destructive Actions

> Parent: [`workspace-pane-projects-tab.md`](./workspace-pane-projects-tab.md)

Contract for the Archive / Restore / Delete row in **State B — Project Detail**
(`.projects-panel-detail__actions`). Delete is the only irreversible action in the panel;
[`docs/CONSTITUTION.md`](../../../CONSTITUTION.md) makes "delete means delete" a
non-negotiable, which is what makes the gate in front of it load-bearing.

## Action Gating

| Action | Rendered when | Confirmation | Service call |
|---|---|---|---|
| Archive | `project.status === 'active'` | none — reversible via Restore | `ProjectsService.archiveProject` |
| Restore | `project.status === 'archived'` | none — reversible via Archive | `ProjectsService.restoreProject` |
| **Delete** | **`project.status === 'archived'` only** | **required** — `app-confirm-dialog` | `ProjectsService.deleteProject` |

**Delete is archived-only because the database says so, not only for symmetry with Archive/Restore.**
Two layers reject a delete of an active project:

- RLS policy `projects: archived delete` (`supabase/migrations/20260317010000_relax_projects_delete_archived_rls.sql`)
  requires `archived_at is not null`.
- `ProjectsService.deleteProject` (`apps/web/src/app/core/projects/projects.service.ts`) adds
  `.not('archived_at', 'is', null)` to the delete.

Rendering Delete for an active project therefore offers an action that cannot succeed: the click
returns `ok === false` and the panel shows nothing — a dead affordance and a silent failure. The
route to deleting an active project is Archive first, then Delete, which matches the projects page
(`app-project-details-panel` renders its delete button under `@if (p.status === 'archived')`).

## Confirmation Contract

- The panel reuses the registered **`app-confirm-dialog`**
  ([`component/confirm-dialog/confirm-dialog.md`](../../component/confirm-dialog/confirm-dialog.md)),
  mounted at template top level behind `@if (pendingDeleteProject())`. No panel-local dialog variant,
  and no `window.confirm` — AGENTS.md § Code Conventions.
- Copy comes from the same helpers the projects page uses
  (`pendingActionTitle` / `pendingActionMessage` / `pendingActionConfirmLabel` in
  `apps/web/src/app/features/projects/logic/projects-formatters.logic.ts`), so the two surfaces
  cannot drift apart. No new i18n keys.

| Slot | Key | EN |
|---|---|---|
| Title | `projects.page.pending.title.deleteArchived` | Delete archived project? |
| Message | `projects.page.pending.message.delete` | "{name}" will be permanently deleted for your organization. |
| Confirm | `projects.page.pending.confirm.delete` | Delete now |
| Cancel | `common.cancel` | Cancel |
| Failure toast | `projects.page.toast.deleteError` | Could not delete archived project. Check permissions or refresh and try again. |

## State

| Name | Type | Default | Controls |
|---|---|---|---|
| `pendingDeleteProjectId` | `string \| null` | `null` | Non-null mounts `app-confirm-dialog`; the delete target |

Transitions:

| From | Event | To | Side effect |
|---|---|---|---|
| `null` | Delete clicked (`requestDeleteProject`) | `<projectId>` | none — **no service call** |
| `<projectId>` | Cancel (`cancelPendingDelete`) | `null` | none |
| `<projectId>` | Confirm (`confirmPendingDelete`) | `null` | `deleteProject`; on success remove from `projects` + `backToList()`, on failure error toast |
| `<projectId>` | Escape | `null` | none — arrives as `cancelled`, same as Cancel |

**Every dismissal arrives as `cancelled`.** `app-confirm-dialog` owns that mapping: it emits
`cancelled` when BrnDialog closes itself on Escape, not only from its Cancel button
([`confirm-dialog.md` § Actions](../../component/confirm-dialog/confirm-dialog.md), issue #254).
The panel therefore needs no Escape handling of its own — clearing the signal in
`cancelPendingDelete()` covers both paths.

**`confirmPendingDelete()` reads and clears `pendingDeleteProjectId` before awaiting**, for two
reasons. The dialog's buttons carry no `brnDialogClose`, so clearing the signal is what dismisses
the dialog at all — leave it set and the modal stays on screen for the length of the request. And
the cleared signal is the re-entry guard: a second confirm click during an in-flight delete returns
early — **one `deleteProject` per confirmation, no `busy` flag needed.**

The panel therefore does not pass `busy`. The projects page does, because it keeps its dialog
mounted across the await to offer a retry when the delete fails.

## Acceptance Criteria

- [x] Delete renders only for an archived project; an active project's detail view offers Archive only.
- [x] Clicking Delete opens `app-confirm-dialog` and does **not** call `ProjectsService.deleteProject`.
- [x] Cancelling the dialog calls nothing and leaves the project in the list.
- [x] Confirming calls `deleteProject(projectId)`, removes the row, and returns the panel to the list.
- [x] Dismissing the dialog with Escape clears the pending delete and leaves Delete usable again
  (via the shared dialog's `cancelled`; covered by `confirm-dialog.component.spec.ts`).
- [x] Double-clicking Confirm calls `deleteProject` exactly once.
- [x] A failed delete shows an error toast instead of failing silently (CONSTITUTION § no silent failure).
- [x] No new i18n keys — the panel reuses the projects page's delete-confirmation keys.

Runnable check: `cd apps/web && npx ng test --watch=false`
(`apps/web/src/app/shared/workspace-pane/projects-panel/workspace-projects-panel.component.spec.ts`).
