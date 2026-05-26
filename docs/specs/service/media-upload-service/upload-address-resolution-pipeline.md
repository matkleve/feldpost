# Upload address resolution pipeline

> **Parent:** [upload-manager-pipeline.md](./upload-manager-pipeline.md)  
> **Children:** [upload-search-object.md](./upload-search-object.md), [upload-address-resolution.local-geo.md](./upload-address-resolution.local-geo.md), [upload-address-resolution.phases.md](./upload-address-resolution.phases.md)  
> **Resolution service:** [upload-location-resolution.md](./upload-location-resolution.md)  
> **Tray:** [../../component/upload/upload-resolver-tray.md](../../component/upload/upload-resolver-tray.md)

## What it is

Pre-upload pipeline: folder/filename paths → **Search Object (SO)** → dedup by `grouping_key` → local PLZ → read-only DB lookup → completeness gate → Photon/Nominatim structured geocode → tray or Nachbearbeitung.

## Keys (do not conflate)

| Key | Purpose |
| --- | --- |
| `grouping_key` | Normalized `country\|state\|postcode\|city\|street\|houseNumber` — batch dedup, tray `queryKey`, one geocode call per key |
| `address_dedupe_key` | SHA256 from `compute_location_address_dedupe_key` — `public.locations` uniqueness |

## Tray contract

Only **ambiguous** multi-hit geocode results create `UploadDisambiguationGroup` with **all** `jobIds` for that `grouping_key`. Tray reads `UploadLocationResolutionService` signals only.

## Nachbearbeitung

Completeness fail or 0/low-confidence geocode: no tray; job → `missing_data`; after save `media_items.location_status = 'partial'` when text/path exists without coords.

## Acceptance criteria

- [ ] Folder and single-file uploads use the same orchestrator entry
- [ ] One structured geocode per `grouping_key` per batch
- [ ] Tray shows correct file count per group
- [ ] EXIF and `relative_path` preserved on jobs and DB insert
