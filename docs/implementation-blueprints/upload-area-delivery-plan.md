# Upload Area Delivery Plan (To Done)

This plan covers end-to-end delivery of the upload area, including file uploads, batch progress board, lane triage, and photo capture support.

## Why This Plan Exists

Use this as a release safety checklist, not process overhead. It keeps specs, security policy, and implementation in sync so upload can ship without permission regressions.

## 0) Target Outcome

Ship an upload area that:

- Opens from the map upload button as compact container
- Accepts image files from picker, drag/drop, folder import
- Supports direct photo capture on mobile and camera-enabled devices
- Shows per-photo state with dot matrix and lane filtering (Uploading, Uploaded, Issues)
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

## 3) Upload UI Completion

### 3.1 Container and Entry

Tasks:

1. Finalize upload button morph and container open/close states.
2. Keep aggregate progress ring visible when panel collapsed.
3. Ensure responsive behavior desktop/mobile.

Done criteria:

- Open/close animation and states match specs.
- Upload can continue when panel closed.

### 3.2 Drop Area and File Intake

Tasks:

1. Drag/drop and file picker multi-select.
2. Folder upload where supported.
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

### 3.4 Progress Board and Lanes

Tasks:

1. Dot matrix color/state mapping.
2. Uploading pulse state.
3. Lane switch and filtered gallery list.
4. Stable ordering of jobs (no visual jumping).

Done criteria:

- Matrix and lanes reflect real-time job state transitions correctly.

### 3.5 Issue Editing

Tasks:

1. Open issue item drawer.
2. Edit address/location metadata.
3. Retry resolution and state transition.

Done criteria:

- Issues can be fixed from panel and transition to uploaded on success.

## 4) Pipeline and Data Integration

Tasks:

1. Ensure all intake modes (picker, drop, folder, capture) use same `UploadManagerService` API.
2. Keep max concurrency and queue behavior consistent.
3. Ensure dedup hash path treats captured photos identically.
4. Ensure image detail and map marker refresh events fire on completion.

Done criteria:

- One canonical job lifecycle regardless of upload source.

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

1. Idle open and last-upload summary.
2. Batch upload matrix progression.
3. Lane switching.
4. Issue correction loop.
5. Collapse while uploads continue.
6. Take photo on mobile/camera-enabled browser and complete upload.

Done criteria:

- All scenarios pass in staging with expected role outcomes.

Current status:

- Build passes.
- Upload-panel and map-shell focused tests pass.
- Pending: add/execute explicit viewer-deny role scenario checks in staging.

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
- [ ] M4: Dot matrix + lane triage complete
- [ ] M5: Issue correction loop complete
- [ ] M6: Full QA + staged rollout complete

Status notes:

- M1: Mostly done, but requires repeatable SQL validation script output attached to release docs.
- M2: Done for current scope (container, intake, progress trigger, tests green).
- M3: In progress (capture-input path complete; stream-preview path optional/pending).
