# Search tuning — distance radii contract

> **Parent:** [search-tuning-settings.md](../../ui/search-bar/search-tuning-settings.md) (org admin UI)  
> **Upload placement:** [address-resolution-model.md](../media-upload-service/address-resolution-model.md)  
> **Upload constants (meters, app-level):** [upload-location-config.md](../media-upload-service/upload-location-config.md)

## Purpose

Feldpost uses **three different distance concepts**. They must not be conflated in specs, settings copy, or code comments. Two use **meters** in upload-local config; one uses **kilometers in the UI** but **meters in persistence** (`contextDistanceMaxMeters`).

## Canonical comparison

| Concept | Config key | Where set | UI unit | Default | Question it answers |
| --- | --- | --- | --- | --- | --- |
| **Internet / geocode realism cap** | `resolver.contextDistanceMaxMeters` | Org **Search Tuning** (Settings overlay) | **km** slider → stored as **m** | **120 000 m** (120 km) | “Is this **Internet or forward-geocode hit** so far from the **search anchor** that it is unrealistic?” |
| **EXIF fine-tune among geocode hits** | `exifAssistRadiusMeters` | `UploadLocationConfig` (code; not Search Tuning UI today) | **m** | **80 m** | “Among **several geocode candidates**, which one is **close enough to this photo’s EXIF** to auto-pick?” |
| **Text vs EXIF source agreement** | `sourceAgreementRadiusMeters` | `UploadLocationConfig` (code) | **m** | **150 m** | “Do **folder/file geocode coords** and **EXIF metadata** agree, or do we show the **source-conflict** tray?” |

### Search anchor (for `contextDistanceMaxMeters` only)

Priority when measuring distance to a geocoder hit:

1. **This photo’s EXIF GPS** (upload pre-resolve, media-detail search when editing that item).  
2. **Map viewport** center / bounds (search bar).  
3. **Active project** centroid.

**Not** used: distance to other media in the org, other files in the upload batch, or cluster centroids from `get_media_clusters` (those use the same meters value only as **cluster radius km = contextDistanceMaxMeters / 1000**, not per-hit gating against neighbors).

## `contextDistanceMaxMeters` — Internet / geocode realism cap

### Settings overlay

- **Section:** Settings → Search Tuning (org admin, advanced).  
- **Label:** `Max distance for internet results (km)` (`settings.search_tuning.field.context_distance_km`).  
- **Persistence:** `org_search_tuning_profiles.values_json.resolver.contextDistanceMaxMeters` (always **meters**; UI converts km ↔ m).

### When this gate applies

| Surface | Behavior |
| --- | --- |
| **Search bar / location add** | After geocoder fetch, `matchesCountryConstraint` in `search-bar-resolvers.ts` drops hits without country code (and some with anchor rules) when haversine to anchor **>** `contextDistanceMaxMeters`. |
| **Upload forward-geocode (Step 5)** | **Normative:** Before `classifySearchHits`, drop Photon/Nominatim candidates whose coordinates are farther than `contextDistanceMaxMeters` from the **job anchor** (EXIF if present, else project centroid). Hits beyond the cap must not auto-place and must not drive house-number / city trays. |
| **Marking “unrealistic” / far away** | A geocode result that survives scoring but fails this distance check is **ineligible** — same rule as “too far for Internet results” in search. |

### Explicit non-goals

- Does **not** choose between two close geocode candidates (use `exifAssistRadiusMeters`).  
- Does **not** decide folder-name vs GPS conflict (use `sourceAgreementRadiusMeters`).  
- Does **not** compare upload file A to upload file B.

### Implementation status

| Callsite | Status |
| --- | --- |
| `search-bar-resolvers.ts` → `matchesCountryConstraint` | **Implemented** |
| `upload-location-resolution.helpers.ts` → `classifySearchHits` / `runGeocodeForGroup` | **Contract required; wire org tuning + job anchor** (see comment in helpers) |
| `disambiguationKind: context_distance` tray (Prompt B) | **Spec only** — project-area confirm beyond nearest project GPS link |

## `exifAssistRadiusMeters` — EXIF fine-tune (meters)

- **Scope:** Upload pipeline only (`UploadLocationConfig`).  
- **Step:** After geocode returns **multiple** candidates, if EXIF exists, pick the candidate within **≤ `exifAssistRadiusMeters`** of EXIF (`pickExifAssistCandidate` in `classifySearchHits`).  
- **Step 7:** After placement, optional nudge of pin toward EXIF when within the same radius ([address-resolution-model.md](../media-upload-service/address-resolution-model.md) Step 7).  
- **Not** the km slider in Search Tuning.

## `sourceAgreementRadiusMeters` — text vs EXIF (meters)

- **Scope:** Upload only.  
- **When:** `titleAddressCoords` from text geocode **and** `parsedExif.coords` both exist.  
- **≤ radius:** Auto-agree text placement.  
- **> radius:** `disambiguationKind: source` resolver tray.  
- **Not** the Internet-results km cap.

## Code map (do not rename JSON keys)

| Key | Rename? | Notes |
| --- | --- | --- |
| `contextDistanceMaxMeters` | **No** | Org DB JSON; rename would break profiles. UI label already says km. |
| `exifAssistRadiusMeters` | **No** | Clear in upload config. |
| `sourceAgreementRadiusMeters` | **No** | Clear in upload config. |

Deprecated duplicate i18n `settings.search_tuning.field.context_distance_m` — do not use in UI; single control uses `context_distance_km` + meters storage.

## Settings

- **Search Tuning → Max distance for internet results (km):** org-level `contextDistanceMaxMeters`; caps unrealistic Internet and upload geocode distance from anchor.
- **Upload location config (`exifAssistRadiusMeters`, `sourceAgreementRadiusMeters`):** app-level meters; not exposed in Search Tuning overlay today.

## Acceptance criteria

- [ ] Settings help text states km UI vs meters storage and distinguishes EXIF fine-tune (m).  
- [ ] Specs for upload Step 5 reference `contextDistanceMaxMeters`, not `exifAssistRadiusMeters`, for far-hit rejection.  
- [ ] Search bar and upload geocode share the same org merged config for the km cap once upload wiring lands.  
- [ ] No user-facing copy implies the km slider limits “distance to next media in folder.”
