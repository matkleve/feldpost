# media-location-update service spec index

Code module: apps/web/src/app/core/media-location-update/
Primary facade: apps/web/src/app/core/media-location-update/media-location-update.service.ts
Types contract: apps/web/src/app/core/media-location-update/media-location-update.types.ts
Helpers: apps/web/src/app/core/media-location-update/media-location-update.helpers.ts
Adapters: apps/web/src/app/core/media-location-update/adapters/

## Contract Scope

- Owns explicit location updates for an existing media row (map placement, address resolution, correction flows).
- Persists coordinates, derived address fields, and status transitions through service abstraction boundaries.

## Location Status Write Contract

- Canonical status model: `pending` | `resolved` | `unresolvable`.
- Write rules:
  - Successful location persist with valid coordinates/address normalization -> `resolved`.
  - Explicit retry request without final resolution -> `pending`.
  - Final non-recoverable resolution outcome -> `unresolvable`.
- New writes must not emit deprecated legacy statuses `gps` | `no_gps` | `unresolved`.

## RPC Alignment

- `resolve_media_location` must align with canonical status semantics and return state compatible with `resolved` or `unresolvable` terminal outcomes.
- Transitional read paths may normalize legacy DB values, but contract output for new writes is canonical only.
