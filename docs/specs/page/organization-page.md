# Organization page

> **Status:** Implementation contract — route `/organization/:section`.

## What It Is

Split-layout organization administration: a left rail lists admin sections (settings-overlay-style navigation); the center hosts the active section. Member chat, suspend/remove, and invites live on **Colleagues** (`/colleagues`) — not here.

## What It Looks Like

Desktop: `app-page-grid` with left rail ~16–22rem. Section rail mirrors [settings overlay](../settings-overlay/settings-overlay.md) interaction emphasis (icon + stacked title/subtitle + chevron, selected ink). Center column shows one section at a time.

## Where It Lives

- **Route:** `/organization/:section` (`profile` | `roles` | `branding` | `billing` | `integrations` | `export` | `audit`)
- **Nav:** Organization icon → `/organization/profile`
- **Parent:** `app-authenticated-app-layout`
- **Services:** [organization-service](../../service/organization/organization-service.md), [roles-service](../../service/roles/roles-service.md)
- **Related:** [colleagues-page.md](./colleagues-page.md) (members, chat, invites)

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Opens `/organization` | Redirects to `/organization/profile` | router |
| 2 | Selects section in rail | Navigates to `/organization/:section` | sidebar `sectionSelected` |
| 3 | Saves profile | `OrganizationService.updateProfile` | profile form |
| 4 | Edits role permissions | `RoleService.updateRolePermissions` | roles section |
| 5 | Saves branding | `OrganizationService.saveBranding` + CSS var apply | branding section |
| 6 | Requests export | Insert job + `process_org_export_job` RPC | export section |
| 7 | Downloads export | Browser blob from `payload` jsonb | export list |

## Component Hierarchy

```text
OrganizationPageComponent
├── OrganizationSidebarComponent (settings-overlay-style rail)
└── @switch(activeSection)
    ├── OrganizationProfileSectionComponent
    ├── OrganizationRolesSectionComponent
    ├── OrganizationBrandingSectionComponent
    ├── OrganizationBillingSectionComponent
    ├── OrganizationIntegrationsSectionComponent
    ├── OrganizationExportSectionComponent
    └── OrganizationAuditSectionComponent
```

## Permission gates

| Section | Visible when | Edit when |
| --- | --- | --- |
| Profile | all org members | `org.settings.edit` |
| Roles | all org members | `org.roles.manage` |
| Branding | all org members | `org.settings.edit` |
| Billing | all org members | invoices: `org.billing.view` |
| API Keys | all org members | `org.api_keys.manage` |
| Export | `org.export` | `org.export` |
| Audit | `org.settings.edit` | read-only |

RLS is authoritative; UI gates are progressive disclosure only.

## Data

| Domain | Tables |
| --- | --- |
| Profile | `organizations` |
| Roles | `org_roles`, `org_permissions`, `org_role_permissions` |
| Branding | `org_branding` |
| Billing | `org_subscriptions`, `org_invoices` |
| API keys | `org_api_keys` |
| Export | `org_export_jobs` (+ `payload` jsonb) |
| Audit | `org_audit_log` |

## File Map

| File | Purpose |
| --- | --- |
| `features/organization/page/organization-page.component.*` | Shell, permission load, routing |
| `features/organization/page/organization-page.config.ts` | Section registry |
| `features/organization/logic/organization-page.helpers.ts` | Section filter by permission |
| `features/organization/sidebar/organization-sidebar.component.*` | Rail nav (settings overlay pattern) |
| `features/organization/sections/*` | Section bodies |
| `core/organization/organization.service.ts` | Org admin facade |

## Acceptance Criteria

- [x] Route `/organization/:section` renders split layout with section rail.
- [x] Rail nav matches settings overlay interaction emphasis (selected ink, chevron rows).
- [x] Sections hidden when user lacks `viewPermissionKey`.
- [x] Write controls disabled/hidden without `editPermissionKey`.
- [x] Export jobs complete via `process_org_export_job` and download from payload.
- [x] Branding colors apply to document CSS variables on load and save.
- [ ] Logo file upload to storage (URL field shipped; upload deferred).
- [ ] API key authentication endpoint (keys stored; validation deferred).

## Settings

- **Branding**: org-level CSS variable overrides (`--primary`, `--accent`, `--background`).
