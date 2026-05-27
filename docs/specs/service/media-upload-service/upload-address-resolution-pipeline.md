# Upload address resolution pipeline

> **Parent:** [address-resolution-model.md](./address-resolution-model.md) · [upload-manager-pipeline.md](./upload-manager-pipeline.md)  
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

Only **ambiguous** multi-hit geocode (or **source conflict**) creates `UploadDisambiguationGroup` with **all** `jobIds` for that `grouping_key` (merged on repeated `registerDisambiguationGroup`).

| Stage | Owner | Effect |
| --- | --- | --- |
| Batch intake | `UploadAddressResolutionOrchestrator.classifyBatch` | Jobs get `groupingKey`, `titleAddress`, orchestrator cache (`needsGeocode` / `resolved` / `ambiguous` / `partial`) |
| Per job | `runPreUploadLocationResolve` → `applyPreResolveFromOrchestrator` or `resolveJobTitleAddress` | Geocode + `classifySearchHits`; ambiguous → `registerDisambiguationGroup` |
| UI | `app-upload-resolver-tray` | Reads `disambiguationGroups`, `activeGroup`, `UploadManagerService.jobs`; writes via `selectAddressCandidate`, `deferGroup`, `isolateJobFromGroup` |

Tray does **not** call geocoders. Placement trace: `[upload-placement] P1–P6` in `upload-address-resolution.debug.ts` (enable via `feldpost:debug:upload-address`). Detail: [upload-resolver-tray.md](../../component/upload/upload-resolver-tray.md#data-pipeline-read--write).

## Nachbearbeitung

Completeness fail or 0/low-confidence geocode: no tray; job → `missing_data`; after save `media_items.location_status = 'partial'` when text/path exists without coords.

## Debug logging (browser)

Enable before uploading a folder:

```js
localStorage.setItem('feldpost:debug:upload-address', '1')
```

Filter DevTools console by `[upload-address:` — logs Search Object fill, DB RPC, geocode request/response summaries, group status transitions.

Disable: `localStorage.removeItem('feldpost:debug:upload-address')`

**Geocode upstream (Photon vs Nominatim):** chosen in the `geocode` edge function. Local Supabase sets `GEOCODER_FORWARD_URL` in `supabase/config.toml` (self-hosted Photon, not Komoot public cloud). Edge logs `[geocode] action=… upstream=photon|nominatim` and sets response header `X-Feldpost-Geocoder-Upstream` (visible in network tab if your client exposes it).

## Acceptance criteria

- [x] Folder and single-file uploads use the same orchestrator entry (`classifyBatch` on submit)
- [x] One structured geocode per `grouping_key` per batch (`ensureGeocodedGroup` inflight dedupe)
- [x] Tray shows correct file count per group (`jobIds` on group + media chip)
- [x] EXIF and `relative_path` preserved on jobs and DB insert
