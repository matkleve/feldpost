# UploadLocationLookupAdapter

> **Parent:** [upload-address-resolution-pipeline.md](../upload-address-resolution-pipeline.md)
> **Implemented:** `apps/web/src/app/core/upload/adapters/upload-location-lookup.adapter.ts`

## Purpose

Read-only Supabase lookup that resolves a parsed address (Search Object) to an existing
`locations` row via RPC, so the upload pipeline can reuse a canonical location instead of
geocoding text that already has a known match.

## Data source

- RPC `get_location_by_address_components`, called with parameters derived from the
  `UploadSearchObject` by `searchObjectToRpcParams` (`core/upload/location/upload-location-resolution.helpers.ts`).
- Read-only; RLS applies via `SupabaseService.client`.

## Facade API

| Method | Returns | Notes |
| --- | --- | --- |
| `findBySearchObject(so: UploadSearchObject)` | `Promise<UploadLocationRowHit \| null>` | `null` on RPC error, no row, or a row missing finite `latitude`/`longitude` |

```typescript
export interface UploadLocationRowHit {
  id: string;
  latitude: number;
  longitude: number;
  street: string | null;
  house_number: string | null;
  postcode: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  address_label: string | null;
}
```

Every lookup and its outcome (params, hit, RPC error, or "miss") is logged through
`uploadAddressDebug('db-lookup', …)` — see `core/upload/address-resolution/upload-address-resolution.debug.ts`.

## Consumers

| Consumer | When |
| --- | --- |
| `UploadAddressResolutionOrchestrator` (`address-resolution/upload-address-resolution.orchestrator.ts`) | During `classifyBatch`, to check whether a parsed Search Object already matches a known location before falling back to geocoding |

## Acceptance criteria

- [x] Read-only — no write RPC or table mutation from this adapter.
- [x] Returns `null` (never throws) on RPC error, missing row, or non-finite coordinates.
- [x] Every call is observable via `uploadAddressDebug`, gated the same as the rest of `address-resolution/`.
