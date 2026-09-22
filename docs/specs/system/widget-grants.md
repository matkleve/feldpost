# Widget grants

## What It Is

How an organization allows a widget, and how a role allows a member to use it and its data. Row-level security stays the boundary.

## What It Looks Like

A person who holds `org.roles.manage` edits grants on the organization roles screen, which already lists `org_permissions` and saves `org_role_permissions`. Widget and data grants are not in that catalog yet. The directory rectangle is greyed out when the organization does not allow the widget.

## Where It Lives

- **Roles screen:** `/organization/roles`, [organization-page.md](../page/organization-page.md).
- **Authorization:** [authorization-model.md](authorization-model.md). This file extends that model. It does not replace it.
- **Directory:** [widget-directory.md](../page/widget-directory.md).

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Activates Add on an allowed directory rectangle | The widget becomes available to the organization | install |
| 2 | A role is granted that widget | Members in the role may open it | role grant |
| 3 | A role is not granted that widget | The rail option is absent for those members | role grant |
| 4 | Activates Add on a greyed rectangle | Nothing is installed | organization does not allow it |

Giving `org.roles.manage` to another role is how admin rights move. That key already exists. This spec adds no second admin transfer.

## Component Hierarchy

```text
organization roles section
└── role
    ├── allowed widgets
    └── allowed data for those widgets
```

## Data

Existing tables, read today by `RoleService`: `org_roles`, `org_permissions`, `org_role_permissions`. None of the permission keys name a widget.

This spec names no new table and no new key. Two gates block a migration:

| Id | Gate |
| --- | --- |
| R1 | New keys in `org_permissions`, or a separate grant table |
| R2 | Allowed data is the whole organization, or a narrower set |

Until both are answered, no migration.

## State

| Name | Type | Default | Effect |
| --- | --- | --- | --- |
| `organizationAllows` | per widget | not allowed | Directory rectangle is greyed when false |
| `roleAllows` | per widget, per role | not allowed | Rail option is absent when false |

Install state is `organizationAllows`. It is not a page-local flag.

## File Map

| File | Purpose |
| --- | --- |
| `features/organization/sections/roles/organization-roles-section.component.ts` | Roles screen that will gain the grants |
| `docs/specs/system/widget-grants.md` | This contract |

## Wiring

`has_permission` remains the check. Frontend gates are disclosure only. An uninstalled widget is absent from the rail, not shown disabled.

## Acceptance Criteria

- [ ] No migration is added from this spec alone.
- [ ] Add on a greyed directory rectangle installs nothing.
- [ ] A role without the widget has no rail option for it.
- [ ] `org.roles.manage` stays the grant that edits roles.
