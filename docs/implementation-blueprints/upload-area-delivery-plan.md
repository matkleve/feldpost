# Upload Area Delivery Plan (To Done)

This plan covers end-to-end delivery of the upload area, including file uploads, segmented lane triage, and photo capture support.

## Why This Plan Exists

Use this as a release safety checklist, not process overhead. It keeps specs, security policy, and implementation in sync so upload can ship without permission regressions.

## 0) Target Outcome

Ship an upload area that:

- Opens from the map upload button as compact container
- Accepts image files from picker, drag/drop, folder import
- Supports direct photo capture on mobile and camera-enabled devices
- Shows per-file state via lane filtering (Uploading, Uploaded, Issues)
- Lets users fix issue items (address/location retry path)
- Continues uploads in background after panel close
- Enforces role permissions via RLS (admin, clerk, worker same for now; viewer read-only)

## 1) Scope Lock and Contracts

Source contracts:

- `docs/element-specs/upload-button-zone.md`
- `docs/element-specs/upload-panel.md`
- `docs/element-specs/upload-manager.md`
- `docs/use-cases/upload-panel.md`
- `docs/role-permissions.md`

Done criteria for this phase:

- All upload-area behaviors are represented in specs/use-cases.
- Permission assumptions in specs match `docs/role-permissions.md`.

## 1.1) MCP and Security Guardrails (Mandatory)

1. Any schema, policy, or function change must be delivered as a migration file under `supabase/migrations/`.
2. Do not run DDL through ad-hoc SQL commands in production paths.
3. After each security-relevant migration, run Supabase advisors (`security` and `performance`) and attach findings.
4. Keep the hosted auth leaked-password protection enabled before public launch.
5. Treat frontend permission checks as UX only; RLS is the enforcement boundary.

Done criteria:

- Migration history captures every policy/schema change.
- Advisor results are reviewed and documented after each permission/security change.

## 2) Permission and Security Baseline

Current role baseline:

- Roles: admin, clerk, worker, user, viewer
- Current effective write behavior: clerk and worker same as user

Tasks:

1. Keep viewer blocked from writes in all upload paths.
2. Validate upload and metadata writes under clerk and worker sessions.
3. Add SQL validation script per role for upload, edit, delete, metadata actions.
4. Re-run Supabase advisors after each permission migration.
5. Keep role matrix in `docs/role-permissions.md` updated when policy behavior changes.

Done criteria:

- No upload-path action bypasses RLS.
- Validation script confirms expected allow/deny matrix.

Validation artifact:

- `scripts/validate-upload-role-rls.sql` (transactional, rollback-only role matrix check)

## 3) Upload UI Completion

### 3.1 Container and Entry

Tasks:

1. Finalize upload button morph and container open/close states.
2. Keep aggregate progress ring visible when panel collapsed.
3. Ensure responsive behavior desktop/mobile.
4. While panel is collapsed and uploads are active, show top-right live preview of up to 3 currently uploading items.
5. In collapsed busy state, expand the upload trigger itself horizontally (same height as trigger) and show `Uploading...` plus `current/total` summary.

Done criteria:

- Open/close animation and states match specs.
- Upload can continue when panel closed.
- Collapsed-state busy UX shows both progress ring and 3-item live preview contract.
- Collapsed busy state uses expanded trigger behavior (no separate status-rail surface).

### 3.2 Drop Area and File Intake

Tasks:

1. Drag/drop and file picker multi-select.
2. Keep Folder Upload button visible and clickable; use directory-picker fallback when `showDirectoryPicker` is unavailable.
3. Validation feedback for type/size errors.

Done criteria:

- Intake paths work consistently with unified queue creation.

Current status:

- In progress: drop, picker, and folder intake are wired.
- In progress: map-shell tests are aligned with current upload-button behavior.
- Pending: finalize edge-case messaging for role-deny and unsupported capture flows.

### 3.3 Photo Capture (NEW explicit requirement)

Tasks:

1. Add dedicated capture entry in upload panel:
   - `Take Photo` button in panel header/drop area.
2. Mobile capture path:
   - Use file input with `accept="image/*"` and `capture="environment"` fallback.
3. Camera stream path (optional enhancement):
   - Use `navigator.mediaDevices.getUserMedia` for in-app camera preview and capture.
4. Normalize captured photo into existing upload pipeline:
   - produce `File` object
   - run same validation/EXIF/dedup/address flow
5. Permission and browser handling:
   - permission denied messaging
   - unsupported browser fallback to file picker

Done criteria:

- User can take a photo and it appears in the exact same pipeline/state model as picked files.
- Capture failures are surfaced with actionable message.

Current status:

- In progress: `Take photo` action and capture-file input path are implemented.
- Pending: optional in-app camera stream (`getUserMedia`) decision and implementation.

### 3.4 Segmented Switch and Lanes

Tasks:

1. Lane switch and filtered gallery list.
   - Queue and Uploaded use compact square button treatment.
   - Issues uses stretched icon+text treatment.
   - Segmented switch spans full container width (same horizontal edges as upload area and folder button).
2. Stable ordering of jobs (no visual jumping).
3. Separate issue semantics for duplicate review vs. GPS/manual placement.
   - Duplicate-photo review and GPS/location issues are distinct issue subtypes with distinct action sets.
   - `Upload anyway` is allowed only in duplicate-photo review.
   - `Upload anyway` must never appear for GPS/location issue rows.
4. Ensure uploaded-lane actions are derived from persisted media state and project binding.
5. Render lane rows with a dedicated transparent, padding-free overflow wrapper capped at 5 visible rows with internal scrolling.
6. Enforce strict vertical block stacking with layout gaps between: Upload area -> Folder button -> Segmented switch -> File list.
7. Keep file list entries as full-width stacked items separated by gap spacing (no row-border separators).

Done criteria:

- Lane counts and lane lists are derived from the same semantic bucket mapping.
- GPS issues never expose force-upload actions.
- Duplicate-photo issue rows expose duplicate-resolution actions and may expose `Upload anyway`.
- GPS/location issue rows expose placement/correction actions only; no force-upload affordances.
- Uploaded rows expose follow-up actions only when persisted media data exists.
- Queue/Uploaded/Issues lane list containers share the 5-visible-row + internal-scroll behavior via a transparent overflow wrapper.
- Segmented switch and file list blocks are full width and aligned edge-to-edge with upload area and folder button.
- Segmented switch block does not render an extra card/tile shell; the tab list itself is the only container for switch options.
- Upload panel root section is unstyled (no padding, border, background, shadow); visual surfaces belong to inner blocks only.
- Section separation uses vertical layout gaps between blocks, not decorative separators.
- File item separation uses item gaps, not table-row borders.
- Lane item surfaces have no white tile background.
- Item gaps are visually transparent/see-through.
- Upload panel shell stays mostly transparent so inter-block gaps are visually see-through to the map/background behind.

Current status:

- In progress: lane switch + lane-filtered list implemented in Upload Panel.
- Pending: broader integration pass against real mixed batches and issue-correction flow.
- Pending: lane semantics still need final alignment for duplicate review, GPS issues, and uploaded follow-up actions.

### 3.5 Issue Editing

Tasks:

1. Open issue item drawer.
2. Edit address/location metadata.
3. Retry resolution and state transition.
4. Keep duplicate-hash review separate from GPS/location correction.
5. Support `Upload anyway` only for duplicate-photo review.

Done criteria:

- Issues can be fixed from panel and transition to uploaded on success.
- Duplicate-photo issues support explicit override or use-existing decisions.
- GPS issues support placement/correction flows and do not expose force-upload.

### 3.6 Workspace Upload Tab Multi-Select (NEW)

Tasks:

1. Keep compact map-overlay upload panel menu-first (no checkboxes in compact mode).
2. Enable checkbox reveal on upload rows only when UploadPanel is embedded in Workspace Upload tab.
3. Add selection footer toolbar in embedded mode with `retry`, `download`, `remove`, `clear`.
4. Route bulk remove by job phase: cancel active, dismiss terminal.
5. Keep row/menu geometry aligned with `.ui-item` + dropdown primitives.

Done criteria:

- Multi-select exists only in Workspace Upload tab.
- Compact panel remains unchanged interaction-wise for row selection.
- Bulk actions map to existing upload manager operations without introducing parallel code paths.

## 4) Pipeline and Data Integration

Tasks:

1. Ensure all intake modes (picker, drop, folder, capture) use same `UploadManagerService` API.
2. Keep max concurrency and queue behavior consistent.
3. Ensure dedup hash path treats captured photos identically.
4. Ensure image detail and map marker refresh events fire on completion.
5. Ensure dedup hash path is gated by media category and never blocks document uploads.
6. Emit enough persisted item context for uploaded-lane actions (`imageId`, coords, project binding, download source).

Done criteria:

- One canonical job lifecycle regardless of upload source.
- Duplicate review and GPS correction are represented as separate issue semantics.
- Uploaded follow-up actions can be resolved without re-querying ambiguous lane state.

Current status:

- In progress: folder intake now enters canonical manager pipeline.
- In progress: capture input also enters the same manager submit pipeline.
- Pending: completion-event verification for all capture edge cases.

## 5) Testing and Verification

### Unit/Integration

1. Upload panel component state transitions.
2. Lane filtering and dot mapping logic.
3. Capture-to-file transformation path.
4. Error retry paths.

### Role/RLS Verification

1. admin: upload/edit/delete allowed.
2. clerk: same as worker (currently same as user).
3. worker: same as clerk.
4. viewer: upload/edit/delete denied.

### Manual Scenario Pass

1. Idle open without legacy last-upload summary.
2. Batch upload matrix progression.
3. Lane switching.
4. Issue correction loop.
5. Collapse while uploads continue.
6. Take photo on mobile/camera-enabled browser and complete upload.
7. Duplicate-photo issue enters `Issues` and offers `Upload anyway`.
8. Missing-GPS issue enters `Issues` and offers placement-only actions.
9. Uploaded item exposes `Add to project`, `Prioritize`, `Open in /media`, and `Download`.
10. `Open project` appears only for uploads already bound to a project.

Done criteria:

- All scenarios pass in staging with expected role outcomes.

Current status:

- Build passes.
- Upload-panel and map-shell focused tests pass.
- Pending: execute `scripts/validate-upload-role-rls.sql` in staging SQL Editor and attach output.

## 6) Rollout Plan

1. Deploy DB migrations first.
2. Deploy frontend upload UI + capture feature.
3. Run post-deploy role validation script.
4. Monitor upload failure rates and address-resolution failure rates.

## 7) Open Decisions

1. Should desktop have in-app camera stream or file-input capture only for MVP?
2. Should captured photos default to specific metadata tags (e.g., source=camera)?
3. Should clerk/worker split be introduced immediately after upload launch or deferred?

## 8) Milestone Checklist

- [ ] M1: Permission baseline validated (admin/clerk/worker/viewer)
- [ ] M2: Upload container + intake complete
- [ ] M3: Photo capture support complete
- [ ] M4: Segmented switch + lane triage complete
- [ ] M5: Issue correction loop complete
- [ ] M6: Full QA + staged rollout complete

Status notes:

- M1: Mostly done, but requires repeatable SQL validation script output attached to release docs.
- M2: Done for current scope (container, intake, progress trigger, tests green).
- M3: In progress (capture-input path complete; stream-preview path optional/pending).
- M4: In progress (segmented switch + lane triage implemented; integration verification pending).
