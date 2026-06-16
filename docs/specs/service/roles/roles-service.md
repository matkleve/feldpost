# Roles service

**Code:** `apps/web/src/app/core/roles/`

## Role

Per-organization hierarchical roles and configurable permissions. Replaces legacy global `roles` table for authorization checks.

## Actions

| # | Method | Data / RPC |
| --- | --- | --- |
| 1 | `loadRoles` | `org_roles` |
| 2 | `loadPermissions` | `org_permissions` |
| 3 | `loadRolePermissionIds` / `updateRolePermissions` | `org_role_permissions` |
| 4 | `createRole` / `updateRole` / `deleteRole` | `org_roles` |
| 5 | `hasPermission` | RPC `has_permission` |
| 6 | `getOwnRoleLevel` | RPC `user_role_level` |
| 7 | `canManageUser` | RPC `can_manage_user` |

## UI

- [organization-page.md](../../page/organization-page.md) — roles section
- [colleagues-page.md](../../page/colleagues-page.md) — member role assign, hierarchy

## Acceptance Criteria

- [x] Custom roles cannot delete system roles (`is_system`).
- [x] Permission catalog is global; assignments are per org role.
- [x] `hasPermission` used for organization page and chat feature gates.
