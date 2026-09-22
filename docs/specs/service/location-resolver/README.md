# location-resolver service spec index

Code module: apps/web/src/app/core/location-resolver/
Primary facade: apps/web/src/app/core/location-resolver/location-resolver.service.ts
Types contract: apps/web/src/app/core/location-resolver/location-resolver.types.ts
Helpers: apps/web/src/app/core/location-resolver/location-resolver.helpers.ts
Adapters: apps/web/src/app/core/location-resolver/adapters/

## Child Specs

- [address-resolver.md](address-resolver.md) — DB-first ranking algorithm for map search bar, upload, folder import
- [address-reconciliation.md](address-reconciliation.md) — detail-open prompt, confidence scoring, suppress flag for unverified address fields
- [search-algorithm-addresses-and-places.md](search-algorithm-addresses-and-places.md) — extended algorithm documentation

## Contract Scope

- Owns background and on-demand location resolution attempts.
- Consumes rows from `media_items` that require location completion.
- Uses geocoding via service abstractions and persists normalized location fields.

## Location Status Contract

- Canonical status model: `pending` | `resolved` | `unresolvable` | `partial`.
- Resolver processing eligibility:
  - `pending`: eligible for retry processing.
  - `resolved`: terminal success; resolver must skip.
  - `unresolvable`: terminal failure; resolver must skip unless explicitly reset externally.
  - `partial`: an address was established and no coordinates were — the D-10 area-only result, written by `resolveUploadLocationStatus` for exactly that case. A deliberate outcome, not a failure; the resolver must skip it, and bulk resolution may improve it.
- Deprecated legacy values `gps` | `no_gps` | `unresolved` are transitional read-compatibility only and must not be emitted by new writes. `normalizeLocationStatus` maps them to `resolved`, `pending` and `unresolvable`.

### `location_unresolved` is one derivation of this column (#222)

`MediaRecord.location_unresolved` is a **projection of `location_status`** and nothing else. The single derivation is `isLocationUnresolvedStatus` in `apps/web/src/app/core/location-resolver/location-resolver.helpers.ts`:

| `location_status` | `location_unresolved` | Why |
| --- | --- | --- |
| `resolved`, `gps` | `false` | A place on the map the user can point at. |
| `pending`, `no_gps` | `true` | Nothing established yet. |
| `unresolvable`, `unresolved` | `true` | Terminal **for the resolver**, not for the user: the item still has no location and a human answer is what it is waiting for. |
| `partial` | `true` | See below. |
| unknown / absent | `true` | Fail toward showing the work: an item wrongly offered is visible and correctable, one wrongly hidden is neither. |

**Decision: `partial` counts as unresolved.**

`partial` means an address with no pin — `Archiv/Wien/1010/IMG_0090.jpg` resolves to "Wien 1010" with no street and no coordinates. Three reasons, in order of weight:

1. **The shipped backlog already counts it as work.** `deferred-location.selection.ts` puts `partial` in the `improvable` bucket — *"has a location that could be more precise"* — and that bucket is part of the badge total. A gallery calling the same row *located* would contradict a badge offering work on it.
2. **Bulk eligibility already treats it as work.** `isBulkEligibleStatus` has only ever excluded `resolved` and `gps`. It now delegates to this predicate rather than keeping its own list, so "a run will act on this row" and "this row is unresolved" cannot drift.
3. **It is the answer the detail pane was already giving.** Before #222 the detail pane's flag was overwritten by a coordinate rule in `locationDisplaySnapshotFromRows` (`!legacyMediaHasGps(...)`), which answers `true` for every address-only display link — i.e. for `partial`. Making the status rule say `true` is what lets that coordinate rule be deleted without changing a single observable answer.

**Consequences, which are contracts:**

- `locationDisplaySnapshotFromRows` / `mergeLocationDisplayIntoMediaRecord` MUST NOT derive `location_unresolved`. Whether the display link carries coordinates is `mediaHasZoomableLocation` / `locationPinEligible` — a different question that must not be answered under this name (TRAP-001).
- `mergeMediaLocationPatch` MUST NOT infer it from `latitude`/`longitude`. It applies only what a patch states.
- An optimistic write that asserts the flag ahead of a persisted status MUST take the value from `isLocationUnresolvedStatus(<the status it is persisting>)`, never a literal.
- Count queries filter on `LOCATED_LOCATION_STATUSES`, the same exported set the predicate complements — never a second literal list.

Measured on the project database 2026-09-21: 20 media items — 15 `resolved`, 4 `pending`, 1 `unresolvable`, **zero** `partial`. The decision is therefore unobserved in production today; it is recorded here so the first `partial` row does not have to rediscover it. No surface reads `location_unresolved` to render anything at the time of writing, which is why the disagreement stayed latent (#222 § Why it has not bitten yet).

## RPC Contract Notes

- `get_unresolved_media` contract (name kept for compatibility during rollout):
  - Must return only rows currently equivalent to canonical `pending`.
  - Must not return canonical `resolved` or `unresolvable` rows.
- Background startup resolution may process `pending` rows once per startup pass; no infinite retries.

## Failure Handling Contract

- Reverse/forward geocode miss, empty candidate set, or non-recoverable validation outcome must persist terminal `unresolvable`.
- Recoverable transient faults may keep `pending` for deferred retry.
