# RoleService

Per-organization hierarchical roles and configurable permissions.

Mirrors `docs/specs/service/roles/roles-service.md`.

## Responsibilities

- Load org roles and permission catalog
- CRUD custom roles (non-system)
- Update role-permission assignments
- Hierarchy checks via Postgres RPCs (`user_role_level`, `can_manage_user`)
