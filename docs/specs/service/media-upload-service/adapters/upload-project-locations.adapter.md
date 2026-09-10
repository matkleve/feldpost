# UploadProjectLocationsAdapter

> **Parent:** [upload-address-resolution-pipeline.md](../upload-address-resolution-pipeline.md)
> **Implemented:** `apps/web/src/app/core/upload/adapters/upload-project-locations.adapter.ts`

## Purpose

Load a project's linked locations for Branch B bias-only placement and Step 2 disambiguation
trays. Project location is never an authoritative coordinate source for an upload — only a
bias/centroid hint (`06-health.md` § 2 in the 2026-09-08 upload-process audit records that the
stronger "project location as fallback placement" behaviour was deliberately removed; this
adapter is what remains of the legitimate bias-only use).

## Data source

- RPC `list_project_locations`, called with `p_project_id`.
- Read-only; RLS applies via `SupabaseService.client`.
- Returns `[]` (never throws) on RPC error or a null payload.

## Facade API

| Method | Returns | Notes |
| --- | --- | --- |
| `listProjectLocations(projectId: string)` | `Promise<ProjectLocationRow[]>` | Rows in RPC order; `[]` on error |
| `pickCentroid(rows: readonly ProjectLocationRow[])` | `UploadProjectCentroid \| null` | Sorts by `sortOrder` ascending, returns the first row with finite `latitude`/`longitude` as `{ lat, lng, city, zoom: 14 }` |

```typescript
export interface ProjectLocationRow {
  linkId: string;
  sortOrder: number;
  locationId: string;
  street: string | null;
  houseNumber: string | null;
  postcode: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  addressLabel: string | null;
}
```

## Consumers

| Consumer | When |
| --- | --- |
| `UploadAddressResolutionOrchestrator` (`address-resolution/upload-address-resolution.orchestrator.ts`) | Branch B bias centroid and Step 2 candidate list, when a job's project has linked locations |

## Acceptance criteria

- [x] Read-only — no write RPC or table mutation from this adapter.
- [x] `listProjectLocations` never throws; returns `[]` on RPC error.
- [x] `pickCentroid` never treats a row with a missing or non-finite coordinate as the centroid.
- [x] The returned centroid is bias-only — no caller uses it as an authoritative placement.
