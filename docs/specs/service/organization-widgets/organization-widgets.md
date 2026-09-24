# Organization widget install

## What It Is

The write path for a widget the organization has added. The catalog stays in code. This module stores one row per organization and widget.

## What It Looks Like

No UI. The directory calls `install`. A second call for the same widget does not add a second row.

## Where It Lives

- **Code:** `apps/web/src/app/core/organization-widgets/`.
- **Table:** `supabase/migrations/20260922120000_organization_widgets.sql`.
- **Catalog:** [widgets.md](../widgets/widgets.md). This module does not own the list.
- **Grants:** [widget-grants.md](../../system/widget-grants.md). Role keys are a separate module.

## Actions

| # | Caller | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | `install` on an allowed installable id | One row for the member's organization | adapter upsert |
| 2 | `install` again for the same pair | No second row | primary key, `ignoreDuplicates` |
| 3 | `install` on a fixed, unknown, or disallowed id | Nothing is stored | `installRow` returns null |

## Component Hierarchy

```text
OrganizationWidgetsService
├── organization-widgets.helpers.ts
└── adapters/organization-widgets.adapter.ts
```

## Data

Columns are `organization_id` and `widget_id`. There is no user column. Installable ids: workers, organisation, vehicles, boats, material, storage-locations, buildings. RLS is `organization_id = user_org_id()` on select, insert, and delete.

## State

| Name | Type | Default | Effect |
| --- | --- | --- | --- |
| install row | present or absent | absent | Present means the organization has added the widget |

There is no terminal state. Installing an id that is already present is a no-op.

## File Map

| File | Purpose |
| --- | --- |
| `core/organization-widgets/organization-widgets.service.ts` | Facade |
| `core/organization-widgets/organization-widgets.types.ts` | Row shape |
| `core/organization-widgets/organization-widgets.helpers.ts` | Install gate |
| `core/organization-widgets/adapters/organization-widgets.adapter.ts` | Table write |
| `supabase/migrations/20260922120000_organization_widgets.sql` | Table and policies |
| `scripts/validate-organization-widgets-rls.sql` | Cross-org check on a live database |

## Wiring

The facade reads the catalog and the member's organization, then the adapter upserts. The directory is the caller. Frontend checks are disclosure. RLS is the boundary.

## Acceptance Criteria

- [ ] The table has `organization_id` and `widget_id` only.
- [ ] A member of another organization cannot read the row.
- [ ] `install('map')` stores nothing.
- [ ] A second `install` of the same widget does not add a row.
