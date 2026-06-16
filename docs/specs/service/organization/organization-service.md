# Organization service

**Code:** `apps/web/src/app/core/organization/`

## Role

Facade for organization administration data: profile, branding, billing stub, API keys, exports, audit log.

## Actions

| # | Method | Data |
| --- | --- | --- |
| 1 | `loadProfile` / `updateProfile` | `organizations` |
| 2 | `loadBranding` / `saveBranding` | `org_branding` |
| 3 | `loadSubscription` / `loadInvoices` | `org_subscriptions`, `org_invoices` |
| 4 | `loadApiKeys` / `createApiKey` / `revokeApiKey` | `org_api_keys` |
| 5 | `requestExport` → `processExportJob` | `org_export_jobs`, RPC `process_org_export_job` |
| 6 | `loadAuditLog` | `org_audit_log` |

## Helpers

`organization.helpers.ts`: `applyOrgBrandingToDocument`, `downloadExportPayload`.

## UI

[organization-page.md](../../page/organization-page.md)

## Acceptance Criteria

- [x] All queries org-scoped via RLS (`user_org_id()`).
- [x] Export RPC populates `payload` jsonb for client download.
- [x] Branding apply helper sets/removes root CSS variables.
