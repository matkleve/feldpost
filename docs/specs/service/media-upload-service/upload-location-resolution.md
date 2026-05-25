# Upload location resolution service

> **Parent:** [upload-manager-pipeline.md](./upload-manager-pipeline.md)  
> **UI:** [upload-resolver-tray.md](../../component/upload/upload-resolver-tray.md)

## What it is

`UploadLocationResolutionService` — pre-upload `GeocodingService.search()` disambiguation, grouping (OD-1), and group-level upload gate (OD-3).

## Geocoding contract

- **Multi-hit:** `GeocodingService.search()` only — never `forward()` for disambiguation paths.
- **Locality (OD-5):** Optional `localityHint` from folder path segments only; no unconditional `, Wien, Österreich` append.

## Grouping (OD-1)

`queryKey = normalize(titleAddress) + '|' + folderDisplayPath` where `folderDisplayPath` is the parent path of `relativePath` (no filename).

Same street in different folder trees → separate groups.

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
| `resolveJobTitleAddress` | Search + classify + auto-assign or hold |
| `applyCandidateToGroup` | User pick; closes gate; sets job coords; `phase → queued` |
| `deferGroup` | Close gate; jobs → `missing_data` |
| `isJobBlockedByGate` | Queue drain filter |

## Acceptance criteria

- [ ] Ambiguous multi-hit jobs enter `awaiting_disambiguation` with `addressCandidates`
- [ ] Unambiguous or EXIF-assisted jobs get coords before dedup
- [ ] Non-blocked jobs in other groups continue uploading while one group is held
