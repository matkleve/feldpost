# Upload address resolution — Phase 0 audit (2026-05-26)

> **Implementation plan:** Location Precision & Address Resolution Overhaul (Cursor plan, not edited in-repo).

Normative target architecture is defined in updated child specs under this folder and [`upload-resolver-tray.stepper-fsm.supplement.md`](../../component/upload/upload-resolver-tray.stepper-fsm.supplement.md).

## Contradictions resolved (pre-implementation snapshot)

| Area | Was | Now (spec/code target) |
| --- | --- | --- |
| Completeness gate | `(city OR postcode) AND (street OR houseNumber)` | `street_locality`/`street_project_bias`/`street_only` + `area_only`; `houseNumber` never gates |
| `street_project_bias` tray | (plan draft) direct persist | Bias geocode → Step 3 on multiple hits; 0 hits → `street_only` (Step 1A) |
| `street_only` | single `incomplete_street` | Step 1A (city) → Step 1B (house number) |
| EXIF routing names | Branch A/B = missing_data / EXIF | Renamed `missing_data_route` / `exif_only_route` in location-routing supplement |
| Project address | Aggregated from member media | `project_locations` N:N + minimal picker |
| Zoomable | valid lat/lng + `address_precision` at street/house tier | Legacy code: pin only when `street` present (`locationPinEligible`) — remove in item 15 |

## Affected code (index)

- `upload-search-object.builder.ts` / `upload-search-object.completeness.helpers.ts`
- `upload-address-resolution.orchestrator.ts`, `upload-location-resolution.service.ts`
- `upload-new-pre-resolve.util.ts`, `upload-location-resolution.helpers.ts`
- `geocode` edge function + `GeocodingService`
- `media-locations.helpers.ts`, `projects.service.ts`
- `upload-resolver-tray.component.*`, `project-location-picker.component.*`

## DB delta

- `project_locations` junction + list/link/unlink RPCs (see migration `20260527140000_project_locations.sql`).
