# location-resolver service spec index

Code module: apps/web/src/app/core/location-resolver/
Primary facade: apps/web/src/app/core/location-resolver/location-resolver.service.ts
Types contract: apps/web/src/app/core/location-resolver/location-resolver.types.ts
Helpers: apps/web/src/app/core/location-resolver/location-resolver.helpers.ts
Adapters: apps/web/src/app/core/location-resolver/adapters/

## Contract Scope

- Owns background and on-demand location resolution attempts.
- Consumes rows from `media_items` that require location completion.
- Uses geocoding via service abstractions and persists normalized location fields.

## Location Status Contract

- Canonical status model: `pending` | `resolved` | `unresolvable`.
- Resolver processing eligibility:
  - `pending`: eligible for retry processing.
  - `resolved`: terminal success; resolver must skip.
  - `unresolvable`: terminal failure; resolver must skip unless explicitly reset externally.
- Deprecated legacy values `gps` | `no_gps` | `unresolved` are transitional read-compatibility only and must not be emitted by new writes.

## RPC Contract Notes

- `get_unresolved_media` contract (name kept for compatibility during rollout):
  - Must return only rows currently equivalent to canonical `pending`.
  - Must not return canonical `resolved` or `unresolvable` rows.
- Background startup resolution may process `pending` rows once per startup pass; no infinite retries.

## Failure Handling Contract

- Reverse/forward geocode miss, empty candidate set, or non-recoverable validation outcome must persist terminal `unresolvable`.
- Recoverable transient faults may keep `pending` for deferred retry.
