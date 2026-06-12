# Geocoding Service

## What It Is

Headless facade for **forward**, **reverse**, and **multi-hit search** geocoding. All traffic goes through the Supabase **`geocode`** Edge Function so the browser never calls geocoders directly. The service never throws for normal failures: it returns **`null`** or **`[]`**.

## What It Looks Like

There is no dedicated UI. Consumers see resolved addresses and coordinates in the search bar, upload placement, address resolver flows, and **MediaLocationUpdateService** after map drops. Failures surface as empty results or unchanged fields downstream.

## Where It Lives

- **Route:** cross-cutting
- **Parent:** core service layer
- **Runtime module:** `apps/web/src/app/core/geocoding/`
- **Related:** [address-resolver](../location-resolver/address-resolver.md), [search-bar](../../ui/search-bar/search-bar.md)

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | Consumer requests reverse geocode | Structured address or `null` | `reverse(lat, lng)` |
| 2 | Consumer requests forward geocode | Coordinates + structured fields or `null` | `forward(address)` |
| 3 | Search bar needs ranked list | Zero or more search hits | `search(query, options?)` |
| 4 | Duplicate coordinate query within TTL | Cached result, no network | In-memory reverse/forward cache |
| 5 | Concurrent callers | Serialized queue; one in-flight request | Private `enqueue` |

## Component Hierarchy

```text
GeocodingService (facade)
|- geocoding.types.ts (public DTOs)
|- geocoding.helpers.ts (parse/mapping)
`- adapters/ (reserved)
Supabase Edge Function `geocode` (proxy; Nominatim rate limit on Nominatim paths only)
```

## Data

| Source | Layer | Notes |
| --- | --- | --- |
| Nominatim (via Edge) | External | Reverse and structured-search JSON subsets |
| Photon (via Edge, when `GEOCODER_FORWARD_URL` set) | External | Forward/search + structured-forward; default is shared Hetzner instance |
| UploadLocationConfigService | Config | Cache TTL, search default limit |

## State

| Name | Type | Notes |
| --- | --- | --- |
| reverseCache / forwardCache | `Map` + expiry | TTL from config |
| queue | `Promise` chain | Serializes RPCs |

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/geocoding/geocoding.service.ts` | Facade |
| `apps/web/src/app/core/geocoding/geocoding.types.ts` | Exported result types |
| `apps/web/src/app/core/geocoding/geocoding.helpers.ts` | Parsing helpers |
| `docs/specs/service/geocoding/geocoding-service.md` | This contract |

## Wiring

### Injected services

- `SupabaseService` — invokes Edge Function
- `UploadLocationConfigService` — cache and search limits

### Consumers

- `SearchBarService` / `AddressSearchComponent` — whole-address search
- `LocationResolverService` — GPS ↔ address batch resolution
- `AddressFieldSuggestService` — per-field hierarchical suggestions (see [address-field-suggest](../address-field-suggest/address-field-suggest.md))
- `AddressReconciliationService` — confidence-scored forward geocode for reconciliation prompts (see [address-reconciliation](../location-resolver/address-reconciliation.md))

### Supabase / Edge

- Edge Function: `geocode` with `action`: `reverse` | `forward` (search uses forward-shaped body with limit/viewbox/countrycodes).
- **Upstream routing** (`supabase/functions/geocode/index.ts`):
  - `forward` (and search-shaped forward bodies): **Photon** `/api` when `GEOCODER_FORWARD_URL` is set; otherwise **Nominatim** `/search`.
  - `structured-forward`: **Photon** `/structured` when `GEOCODER_FORWARD_URL` is set; otherwise **Nominatim** `/search` (requires `city`).
  - `reverse`: always **Nominatim** `/reverse`.
  - `structured-search`: always **Nominatim** `/search?street=&city=`.
- **Viewbox:** clients send Nominatim `viewbox=left,top,right,bottom`; the edge adapter converts to Photon `bbox=minLon,minLat,maxLon,maxLat` (`photon-to-nominatim.ts`, unit-tested).
- **Response shape:** Photon GeoJSON is mapped to Nominatim search JSON arrays before returning to Angular (`NominatimSearchResponse` subset).
- **Photon hosting:** Default team dev uses shared remote Austria Photon (Hetzner + sslip.io). See [`docs/playbooks/remote-photon.md`](../../../playbooks/remote-photon.md) and [`supabase/AGENTS.md`](../../../../supabase/AGENTS.md#photon-forwardsearch-via-geocoder_forward_url). Optional laptop fallback: `docker-compose.photon.yml` + `http://host.docker.internal:2322`. Hosted Supabase: set `GEOCODER_FORWARD_URL` via project secrets when cloud should use the same instance.

### Upload disambiguation

- Pre-upload address choice uses **`search()`** (multi-hit) via [`upload-location-resolution.md`](../media-upload-service/upload-location-resolution.md).
- **`forward()`** remains single-best-effort (post-save enrichment fallback only when coords were not resolved pre-upload).

### Forbidden

- Components must not call Nominatim or the Edge Function directly; use `GeocodingService` only.
- Upload disambiguation paths must not use `forward()` for multi-hit classification.

## Acceptance Criteria

- [ ] Reverse/forward/search never throw; failures are `null` or `[]`.
- [ ] Only one geocode RPC in flight at a time (queue contract).
- [ ] Cache TTL driven by upload location config.
- [ ] Structured result types match `geocoding.types.ts` exports.
- [ ] Address resolver and search-bar specs link here for external geocode behavior.
