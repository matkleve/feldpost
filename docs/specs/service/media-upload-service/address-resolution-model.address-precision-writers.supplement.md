# Address resolution — precision writers (supplement)

> **Parent:** [address-resolution-model.md](./address-resolution-model.md) § Address precision principle

Normative inventory of every frontend path that creates or updates a `locations` row via Supabase RPC. Migrations `20260910140000_upload_address_precision.sql` and `20260910160000_fix_address_precision_overloads.sql` are **unverified against hosted** in CI (no database in agent environments); `20260910160000` was verified locally by replaying the full migration chain against PostgreSQL 16.

The inventory below covers **all** RPC writers, including the media-detail and junction-link paths that carry no precision producer yet. A writer with no producer is listed explicitly rather than omitted — an unlisted writer reads as "does not write locations", which is what let the `add_media_item_location` gap survive.

## Writer inventory

| Writer | RPC | Precision source | Notes |
| --- | --- | --- | --- |
| New-upload persist (text-first) | `resolve_media_location` | `buildUploadAddressPersistContext` → `deriveAddressPrecisionFromFields` | Skips reverse geocode when text established |
| New-upload persist (coords-only) | `resolve_media_location` | `deriveAddressPrecisionFromReverse` | EXIF/GPS reverse enrichment |
| Post-save forward enrichment | `resolve_media_location` | Input text context (`buildUploadAddressPersistContext`); caps geocode fields | `UploadEnrichmentService.enrichWithForwardGeocode` |
| Issues tray candidate pick | `resolve_media_location` | `deriveAddressPrecisionFromCandidate` on structured candidate fields | Address suggestion — not addressLabel parsing |
| Issues tray pin drop | `resolve_media_location` | `deriveAddressPrecisionFromPinReverse`; max `street` | Coords exact; houseNumber from reverse is not claimed |
| Media detail / map pick (legacy item) | `resolve_media_location` | Suggestion: `deriveAddressPrecisionFromForwardResult`; pin: `deriveAddressPrecisionFromPinReverse` | `MediaLocationUpdateService` |
| Media detail row pick (NN locations) | `update_media_item_location` | Pin: `deriveAddressPrecisionFromPinReverse` | `MediaLocationsService.updateFromCoordinates` |
| Workspace backfill (single) | `resolve_media_location` | Reverse: `deriveAddressPrecisionFromReverse`; forward: `deriveAddressPrecisionFromForwardResult` | `LocationResolverService` |
| Workspace backfill (bulk reverse) | `bulk_update_media_addresses` | `deriveAddressPrecisionFromReverse` | Same-address batch after reverse |
| Unresolvable markers | `resolve_media_location` | `null` (status-only call) | No address fields written |
| Media detail add — free text | `add_media_item_location` | **none** | `MediaLocationsService.addFromFreeText` → `addFromGeocodeSuggestion` on hit, else bare `address_label`. Writes `null`. |
| Media detail add — geocode suggestion | `add_media_item_location` | **none** | `addFromGeocodeSuggestion`; `forwardPatchFromGeocode` does not set `address_precision`. Writes `null`. |
| Media detail add — EXIF coordinates | `add_media_item_location` | **none** | `addFromExifCoordinates`; reverse hit delegates to the suggestion path, miss writes a `lat, lng` label. Writes `null`. |
| Media detail field edit (creates first row) | `add_media_item_location` | **none** | `media-detail-fields.helper.ts` → `addLocation` when no `displayLocationId`; `locationPatchFromField` carries one field only. Writes `null`. |
| Media detail field edit (existing row) | `update_media_item_location` | **none** | Same helper via `updateLocation`. `update_location` COALESCEs, so an existing tier is preserved, not overwritten. |
| Legacy resolve junction link | `find_or_create_location` | Inherited from the `resolve_media_location` payload written immediately before | `MediaLocationUpdateService.ensureLocationLink`; precision rides along in the `address` patch, so this path is correct. |
| Row "change to different address" | `find_or_create_location` | Caller-supplied patch | `MediaLocationsService.replaceMediaItemLocationLink`; no detail caller sets a tier today, so effectively `null`. |
| Project location picker | `find_or_create_location` | **none** | `findOrCreateFromAddressLabel` → `forwardPatchFromGeocode` or bare label. Writes `null`. |
| Attach / replace pipelines | — | — | **Do not** write location rows; only `media_items` metadata. Location via new-upload persist or post-save enrichment. |

## `add_media_item_location` — parameter gap and overload regression

`20260910140000` extended `find_or_create_location`, `update_location`, `update_media_item_location`, `resolve_media_location`, and `bulk_update_media_addresses` with `p_address_precision`, but not `add_media_item_location`. The adapter's `patchToRpcParams()` is shared by `add`, `update`, and `findOrCreate`, so the add path sent a parameter the function did not declare.

Worse, appending a parameter with `CREATE OR REPLACE` **creates a second overload** instead of replacing the function. Replaying the full migration chain against PostgreSQL 16 showed:

- `add_media_item_location` failed regardless of what the client sent, because its internal 13-argument positional call to `find_or_create_location` matched both overloads (`SQLSTATE 42725`).
- `resolve_media_location(p_media_item_id, p_location_status)` — the two-argument "mark unresolvable" call — was ambiguous for the same reason.
- Both worked on the same chain replayed without `20260910140000`, confirming a branch-introduced regression.

**Resolution (`20260910160000_fix_address_precision_overloads.sql`):** drop the five stale pre-precision overloads, extend `add_media_item_location` with `p_address_precision` and forward it to `find_or_create_location`, and return `locations.address_precision` from `list_locations_for_media` and `search_locations`. A guard block fails the migration if any of these functions still has more than one signature.

The parameter was added rather than removed from the adapter because precision is meaningful on this path: a user who types "Wien" into media-detail add-address has produced a `city`-precision location, and recording `null` there is the same fabricated-precision problem this model exists to prevent. **The parameter now exists but has no producer** — every media-detail add still writes `null`. Wiring `deriveAddressPrecisionFromForwardResult` into `forwardPatchFromGeocode` and a text-derived tier into `addFromFreeText` is open work, and it no longer needs a migration.

## Read path

`locations.address_precision` is returned by `list_locations_for_media` and `search_locations` as of `20260910160000`; before that the column was write-only. `MediaItemLocationRow.address_precision` is **optional** because the legacy `media_item_locations` rowtype returned by the `add_media_item_location` / `update_media_item_location` shims has no such column — read the tier from the list cache, never from a mutation result.

## Honest null cases

- Pin drop when reverse geocode fails: coords persisted, `address_precision = null`.
- Candidate pick when structured fields are empty: `address_precision = null` (addressLabel alone is not parsed for tier).
- `markLocationUnresolvable` / status-only RPC: no precision (no location field patch).
- Every media-detail add and the project location picker: `address_precision = null` — no producer wired (see above).

## Helpers (single source)

All tiers flow through `upload-address-precision.helpers.ts` and, for upload jobs, `upload-address-persist-context.helpers.ts`. Call sites MUST NOT invent tier logic inline.
