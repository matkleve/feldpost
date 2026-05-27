# Upload location resolution service

> **Parent:** [upload-manager-pipeline.md](./upload-manager-pipeline.md)  
> **Pipeline:** [upload-address-resolution-pipeline.md](./upload-address-resolution-pipeline.md)  
> **UI:** [upload-resolver-tray.md](../../component/upload/upload-resolver-tray.md)

## What it is

`UploadLocationResolutionService` — pre-upload resolution, disambiguation groups (OD-1), group-level upload gate (OD-3). Fed by [upload-address-resolution-pipeline](./upload-address-resolution-pipeline.md).

## Geocoding contract

- **Complete SO:** `GeocodingService.searchStructuredForward()` (Photon structured → Nominatim fallback).
- **Legacy fallback:** `GeocodingService.search()` when no SO on job.
- **Locality (OD-5):** Optional `localityHint` from folder path segments only; no unconditional `, Wien, Österreich` append.

## Grouping (OD-1)

`queryKey = grouping_key` from Search Object (`country|state|postcode|city|street|houseNumber` normalized).

`registerDisambiguationGroup` attaches **all** `jobIds` sharing the key when geocode is ambiguous.

## Gate (OD-3)

- `UploadDisambiguationGroup.resolutionGateOpen === true` while `resolutionStatus === 'pending'`.
- `isJobBlocked(job)` is true for `awaiting_disambiguation` or gated group membership.
- No `UploadBatch.resolutionGateOpen`; batch exposes `pendingDisambiguationCount` and `activeDisambiguationGroupId` only.

## Pipeline order (OD-4)

1. Validate / EXIF / title extract  
2. `resolving_location` → search / classify  
3. Dedup  
4. Route / upload  

## Post-upload (OD-7)

MVP excludes tray for uploaded rows. Post-save forward skipped when `coords` or `titleAddressCoords` already set pre-upload.

## API

| Method | Purpose |
| --- | --- |
| `resolveJobTitleAddress` | Legacy free-text geocode + classify + auto-assign or hold |
| `applyPreResolveFromOrchestrator` | SO cache: geocode group, auto-resolve, or register tray |
| `registerDisambiguationGroup(input, options?)` | Upsert tray group; merge `jobIds` by `batchId` + `queryKey`; set jobs `awaiting_disambiguation`. Options: `{ activateTray?: boolean }` — default `true` selects group; **`false`** for Ask-later split (stay on current carousel page) |
| `isolateJobFromGroup(groupId, jobId)` | Remove job from group; register isolated single-job group with `activateTray: false`; preserve carousel page index |
| `applyCandidateToGroup` | User pick; closes gate; sets job coords; `phase → queued` |
| `deferGroup` | Close gate; jobs → `missing_data` |
| `setSelectedGroupId` | Carousel / active group selection |
| `isJobBlockedByGate` | Queue drain filter |

**Signals (tray reads):** `disambiguationGroups`, `selectedGroupId`, `activeGroup`, `pendingGroupCount`.

## Acceptance criteria

- [x] Ambiguous multi-hit jobs enter `awaiting_disambiguation` with `addressCandidates`
- [x] Unambiguous or EXIF-assisted jobs get coords before dedup
- [x] Non-blocked jobs in other groups continue uploading while one group is held
- [x] `isolateJobFromGroup` splits one job without changing the active carousel question index
