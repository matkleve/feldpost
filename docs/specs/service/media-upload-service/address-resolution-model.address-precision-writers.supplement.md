# Address resolution — precision writers (supplement)

> **Parent:** [address-resolution-model.md](./address-resolution-model.md) § Address precision principle

Normative inventory of every frontend path that creates or updates a `locations` row via Supabase RPC. Migration `20260910140000_upload_address_precision.sql` is **unverified** in CI (no database in agent environments).

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
| Attach / replace pipelines | — | — | **Do not** write location rows; only `media_items` metadata. Location via new-upload persist or post-save enrichment. |

## Honest null cases

- Pin drop when reverse geocode fails: coords persisted, `address_precision = null`.
- Candidate pick when structured fields are empty: `address_precision = null` (addressLabel alone is not parsed for tier).
- `markLocationUnresolvable` / status-only RPC: no precision (no location field patch).

## Helpers (single source)

All tiers flow through `upload-address-precision.helpers.ts` and, for upload jobs, `upload-address-persist-context.helpers.ts`. Call sites MUST NOT invent tier logic inline.
