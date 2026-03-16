# Role Permissions Matrix

This document is the current source-of-truth draft for role permissions and RLS behavior.

## Current Roles in Database

Defined in schema/seed:

- admin
- clerk
- user
- viewer
- worker

Important:

- `clerk` and `worker` now exist as explicit DB roles.
- Current RLS behavior still treats them like `user` (same effective permissions), which matches the current product request.

## Fit Check: admin, clerk, worker

Current fit status against requested roles:

- admin: fully represented (`admin` role exists).
- clerk: represented (`clerk` role exists).
- worker: represented (`worker` role exists).

Short-term mapping (works today):

- admin -> `admin`
- clerk -> `clerk` (effective permissions currently same as `user`)
- worker -> `worker` (effective permissions currently same as `user`)

This gives clerk and worker the same permissions right now, as requested.
Later, you can split them by introducing dedicated `clerk` and `worker` roles plus explicit RLS checks.

## Effective Security Model (Current)

Authentication:

- Supabase Auth session/JWT is required for protected operations.
- Frontend is untrusted; PostgreSQL RLS and storage policies are the enforcement boundary.

Authorization:

- Org scoping is enforced with `user_org_id()`.
- Elevated checks use `is_admin()`.
- Read-only checks use `is_viewer()`.

## Effective Behavior by Domain

Images:

- Read: all org members.
- Insert: non-viewer org member, `user_id` must match authenticated user.
- Update/Delete: currently org-wide for non-viewers (not owner-only), due to relaxed policy migration.

Image metadata:

- Read: org-scoped through parent image.
- Insert/Update/Delete: non-viewer org members for images in same org.

Metadata keys:

- Read: org members.
- Insert: non-viewer org members.
- Delete: creator or admin.

Projects:

- Read: org members.
- Insert: non-viewer org members.
- Update: currently org-wide for non-viewers (relaxed policy).
- Delete: owner or admin (plus org scope).

Roles/user_roles:

- Read role definitions: authenticated users.
- Read own user_roles: self or admin.
- Assign/revoke roles: admin only.

Storage (`images` bucket):

- Upload: non-viewer, must match org/user path.
- Read: org-scoped.
- Delete: owner or admin.

## Action Matrix (Current Effective)

Legend: ALLOW, DENY, CONDITIONAL

| Action                   | admin | user        | viewer | Notes                              |
| ------------------------ | ----- | ----------- | ------ | ---------------------------------- |
| Read images in own org   | ALLOW | ALLOW       | ALLOW  | org-scoped                         |
| Upload image             | ALLOW | ALLOW       | DENY   | user_id path and row checks        |
| Edit image details       | ALLOW | ALLOW       | DENY   | currently org-wide for non-viewers |
| Delete image             | ALLOW | ALLOW       | DENY   | currently org-wide for non-viewers |
| Edit image metadata      | ALLOW | ALLOW       | DENY   | non-viewer org scope               |
| Create metadata key      | ALLOW | ALLOW       | DENY   | non-viewer org scope               |
| Delete metadata key      | ALLOW | CONDITIONAL | DENY   | creator or admin                   |
| Read projects in own org | ALLOW | ALLOW       | ALLOW  | org-scoped                         |
| Create project           | ALLOW | ALLOW       | DENY   | non-viewer                         |
| Update project           | ALLOW | ALLOW       | DENY   | currently org-wide for non-viewers |
| Delete project           | ALLOW | CONDITIONAL | DENY   | owner or admin                     |
| Assign/revoke roles      | ALLOW | DENY        | DENY   | admin-only policy                  |
| Upload storage object    | ALLOW | ALLOW       | DENY   | path and role checks               |
| Delete storage object    | ALLOW | CONDITIONAL | DENY   | owner or admin                     |

## Action Matrix (Requested Role Names, Current Mapping)

Current effective behavior: clerk and worker both follow non-viewer `user` behavior until dedicated RLS splits are introduced.

| Action                   | admin | clerk       | worker      | Notes                              |
| ------------------------ | ----- | ----------- | ----------- | ---------------------------------- |
| Read images in own org   | ALLOW | ALLOW       | ALLOW       | org-scoped                         |
| Upload image             | ALLOW | ALLOW       | ALLOW       | currently same as user             |
| Edit image details       | ALLOW | ALLOW       | ALLOW       | currently org-wide for non-viewers |
| Delete image             | ALLOW | ALLOW       | ALLOW       | currently org-wide for non-viewers |
| Edit image metadata      | ALLOW | ALLOW       | ALLOW       | non-viewer org scope               |
| Create metadata key      | ALLOW | ALLOW       | ALLOW       | non-viewer org scope               |
| Delete metadata key      | ALLOW | CONDITIONAL | CONDITIONAL | creator or admin                   |
| Read projects in own org | ALLOW | ALLOW       | ALLOW       | org-scoped                         |
| Create project           | ALLOW | ALLOW       | ALLOW       | non-viewer                         |
| Update project           | ALLOW | ALLOW       | ALLOW       | currently org-wide for non-viewers |
| Delete project           | ALLOW | CONDITIONAL | CONDITIONAL | owner or admin                     |
| Assign/revoke roles      | ALLOW | DENY        | DENY        | admin-only policy                  |
| Upload storage object    | ALLOW | ALLOW       | ALLOW       | path and role checks               |
| Delete storage object    | ALLOW | CONDITIONAL | CONDITIONAL | owner or admin                     |

## Production Decision Required

Pick one explicit model for office users (clerk persona):

1. `clerk = viewer` (strict read-only)
2. `clerk = user` (current broad write behavior)
3. Add dedicated `clerk` role and explicit RLS policies per table/action

## Recommended Next Step

If you want least privilege before launch, implement option 3:

- Introduce `clerk` role in roles seed/migration.
- Replace org-wide non-viewer write checks with explicit role-based allow lists.
- Add role-policy tests for every write action.
- Keep frontend role checks as UX only; rely on RLS for enforcement.
