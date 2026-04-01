# Upload Panel Row Actions - State Matrix Implementation Plan

## Goal

Implement a registry-driven row action system for Upload Panel items where visibility is derived from lane/state first, then row capabilities.

This plan follows the updated `docs/element-specs/upload-panel.md` contract:

- Queue is the user-facing lane label while internal lane id remains `uploading`.
- Row actions are declared in a single registry shape.
- Uploaded rows support project-aware behavior for one or many project bindings.
- Uploaded rows include destructive media deletion in the destructive section.

## Target Shape

```ts
type RowActionRegistryItem = {
  id: UploadItemMenuAction;
  section: "primary" | "edit" | "destructive";
  labelKey: string;
  fallback: string;
  visibleWhen: (job: UploadJob, ctx: RowActionContext) => boolean;
  run: (job: UploadJob, ctx: RowActionContext) => Promise<void> | void;
};

type RowActionContext = {
  lane: UploadLane;
  issueKind: UploadIssueKind;
  hasImageId: boolean;
  hasStoragePath: boolean;
  hasCoords: boolean;
  hasTitleAddress: boolean;
  projectBindingCount: number;
  hasAnyProjectBinding: boolean;
  priorityEnabled: boolean;
};
```

## Phased Plan

### Phase 1 - Normalize labels and lane naming

1. Keep `uploading` as internal lane id.
2. Change only user-facing tab label fallback from `Uploading` to `Queue`.
3. Ensure no action logic depends on label text.
4. Keep `getLaneForJob()` as the source of lane derivation.

Files:

- `apps/web/src/app/features/upload/upload-panel-helpers.ts`
- `apps/web/src/app/features/upload/upload-phase.helpers.ts`

### Phase 2 - Introduce action context and registry

1. Add `RowActionContext` creation utility from `UploadJob` + component inputs.
2. Add action registry array in a dedicated helper file.
3. Replace branch-heavy `availableMenuActions()` with registry filtering and stable ordering by section.
4. Keep menu action ids compatible with existing router handlers where possible.

Files:

- `apps/web/src/app/features/upload/upload-panel-item.component.ts`
- `apps/web/src/app/features/upload/upload-panel-item-helpers.ts`
- `apps/web/src/app/features/upload/upload-panel-row-actions.registry.ts` (new)

### Phase 3 - Project-aware actions (single and multiple bindings)

1. Model `projectBindingCount` in row context.
2. `open_project` behavior:

- exactly one binding: navigate directly.
- more than one binding: open project chooser submenu/dropdown.

3. `add_to_project` always opens shared project-selection primitive from toolbar pattern and supports select/deselect.
4. `remove_from_project` label adapts:

- one binding: `Remove from project`.
- multiple bindings: `Remove from projects`.

Files:

- `apps/web/src/app/features/upload/upload-panel-item-helpers.ts`
- `apps/web/src/app/features/upload/upload-panel-menu-action-router.service.ts`
- `apps/web/src/app/features/upload/upload-panel-dialog-actions.service.ts`
- `apps/web/src/app/features/upload/upload-panel-dialog-handlers.service.ts`
- shared selector integration file(s) used by toolbar pattern

### Phase 4 - Uploaded destructive section and delete media

1. Add explicit `delete_media` action id.
2. Ensure uploaded rows can show both:

- project removal action (if bound)
- media deletion action

3. Keep destructive entries grouped in one final section with divider.
4. Confirm destructive handlers require persisted media identity and show deterministic error toasts on failure.

Files:

- `apps/web/src/app/features/upload/upload-panel-item.component.ts`
- `apps/web/src/app/features/upload/upload-panel-menu-action-router.service.ts`
- `apps/web/src/app/features/upload/upload-panel-job-file-actions.service.ts`
- relevant media deletion service layer in `apps/web/src/app/core/**`

### Phase 5 - Complete issue-lane parity

1. Ensure missing_gps exposes `Add GPS`, `Add/Change address`, `Retry`, `Dismiss`.
2. Ensure document_unresolved exposes `Add GPS`, `Add/Change address`, `Assign project`, `Dismiss`.
3. Keep duplicate/conflict/error actions strictly isolated by `issueKind`.

Files:

- `apps/web/src/app/features/upload/upload-panel-item.component.ts`
- `apps/web/src/app/features/upload/upload-panel-item-helpers.ts`
- `apps/web/src/app/features/upload/upload-panel-menu-action-router.service.ts`

### Phase 6 - Testing and verification

1. Add dedicated tests for action registry visibility by lane/state/capabilities.
2. Add label tests for contextual variants (`Add` vs `Change`, project singular/plural).
3. Add tests for project-open direct vs multi-project chooser behavior.
4. Add tests for destructive section ordering and entries.
5. Re-run upload panel suite and `ng build`.

Likely test files:

- `apps/web/src/app/features/upload/upload-panel.status.spec.ts`
- `apps/web/src/app/features/upload/upload-panel.drag-lanes.spec.ts`
- `apps/web/src/app/features/upload/upload-panel-row-actions.spec.ts` (new)
- `apps/web/src/app/features/upload/upload-phase.helpers.spec.ts`

## Action Inventory for Implementation

| id                      | section     | lane                                  | state/issue gate                           | key capability gates      |
| ----------------------- | ----------- | ------------------------------------- | ------------------------------------------ | ------------------------- |
| view_file_details       | primary     | uploading                             | non-terminal upload phases                 | none                      |
| cancel_upload           | destructive | uploading                             | active/queued                              | none                      |
| change_location_map     | edit        | uploaded                              | persisted                                  | imageId                   |
| change_location_address | edit        | uploaded                              | persisted                                  | imageId                   |
| open_in_media           | primary     | uploaded                              | persisted                                  | imageId                   |
| add_to_project          | primary     | uploaded, issues(document_unresolved) | persisted or unresolved document           | shared selector available |
| open_project            | primary     | uploaded                              | persisted                                  | projectBindingCount > 0   |
| toggle_priority         | primary     | uploaded                              | persisted                                  | priorityEnabled           |
| download                | primary     | uploaded                              | persisted                                  | imageId and storagePath   |
| remove_from_project     | destructive | uploaded                              | persisted                                  | hasAnyProjectBinding      |
| delete_media            | destructive | uploaded                              | persisted                                  | imageId                   |
| open_existing_media     | primary     | issues                                | duplicate_photo                            | existingImageId           |
| upload_anyway           | primary     | issues                                | duplicate_photo                            | none                      |
| add_gps_issue           | edit        | issues                                | missing_gps, document_unresolved           | map-pick capability       |
| change_address_issue    | edit        | issues                                | missing_gps, document_unresolved           | none                      |
| retry                   | primary     | issues                                | missing_gps, conflict_review, upload_error | retryable                 |
| dismiss                 | destructive | issues                                | any issue kind                             | none                      |

## Spec vs Current Code Discrepancy Snapshot (Before Implementation)

1. Uploading lane currently includes `view_progress`; updated spec removes it from required actions.
2. Uploaded lane currently uses either `open_project` or `add_to_project`; updated spec requires both behaviors where applicable.
3. Missing-gps rows currently use `place_on_map` instead of explicit `Add GPS` and `Add/Change address` pair.
4. Uploaded destructive actions currently do not include required `delete_media`.
5. Project-bound destructive behavior is currently singular-only and not explicitly multi-project aware.

## Validation Checklist

- Registry-driven action filtering is the only source of menu visibility.
- No action visibility relies on translated label text.
- Queue tab displays `Queue` while logic still uses `uploading`.
- Shared toolbar project selector is reused for `add_to_project` flow.
- Uploaded rows can show both project removal and delete media in destructive section when applicable.
- Tests cover lane/state/capability matrix and pass.
