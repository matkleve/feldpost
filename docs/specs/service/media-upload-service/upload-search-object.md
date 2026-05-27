# Upload search object (SO)

> **Parent:** [address-resolution-model.md](./address-resolution-model.md) · [upload-address-resolution-pipeline.md](./upload-address-resolution-pipeline.md)

All **field names are English** (internal model). **Values** use locale-appropriate place names (e.g. `Wien`, `AT`). UI copy is translated separately via i18n.

## Fields

| Field | Type | Notes |
| --- | --- | --- |
| `country` | string \| null | ISO country code (e.g. `AT`) |
| `state` | string \| null | First-level region (e.g. AT federal state) |
| `postcode` | string \| null | Format depends on `country` — not classified without country |
| `city` | string \| null | Municipality / city |
| `street` | string \| null | Street name (joined fragments) |
| `houseNumber` | string \| null | House number |
| `staircase` | string \| null | Staircase / unit (folder token) |
| `project` | string \| null | Project prefix token |
| `sources` | `UploadAddressSourceEntry[]` | Provenance per field write |
| `sourceDeviations` | deviation[] | Folder vs filename conflict log |
| `postcodeCandidates` | string[] | Multiple cities for one postcode |
| `uncertainFields` | string[] | Field names with 0.90–0.97 confidence |
| `groupingKey` | string | Dedup + tray key |
| `relativePath` | string | Immutable job path |
| `fileName` | string | Leaf file name |

## Token classification order

Per path segment, split tokens with `/[\s\-\_\.\,]+/`, then **two passes**:

**Pass 1 — non-numeric tokens (in path order):**

1. Project prefix `^projekt[:\s]/i`  
2. Staircase `^(stiege?\|stg\|top)/i`  
3. **Country** — alias list (`COUNTRY_NAMES`)  
4. State / city — Fuse (**AT gazetteer only when `country === 'AT'`**)  
5. Remaining text → `street` fragments  

**Pass 2 — numeric tokens last** (`^\d+[a-zA-Z]?$`):

1. **Postcode** — only if `country` is set (from pass 1 or an earlier path segment) and token matches that country's pattern  
2. **House number** — if country known: `^\d{1,4}[a-zA-Z]?$`; if country unknown: only `^\d{1,3}[a-zA-Z]?$` (so `1090` is not mistaken for a house number)  

Earlier folder segments run before later ones, so `AT/.../1090` sets `country` before pass 2 on `1090`.

**Out of scope (for now):** inferring postcode from map viewport/radius during upload — see pipeline doc note on spatial disambiguation.

## Country-specific data (not structure)

| Asset | Scope |
| --- | --- |
| `at-bundeslaender.json` | AT states (Fuse when `country === 'AT'`) |
| `at-gemeinden-bev.json` | AT municipalities |
| `at-plz.json` | AT postcode → city (expand step) |

Other countries: path parsing and geocoding use country code; gazetteer Fuse is skipped until data exists.

## Conflict rule

Filename segment overrides folder for the same field; log deviation in `sourceDeviations`.

## Completeness (geocode branches)

`houseNumber` is **never** a gate criterion — it only improves geocode precision when `street` is present.

| Branch | Gate | Geocode | Tray |
| --- | --- | --- | --- |
| **A** | `street` AND (`city` OR `postcode`) | structured-forward | Step 3 if multiple hits |
| **B** | `street`, no locality, project centroid | structured-forward-bias | Step 3 if multiple; 0 hits → Branch C (Step 1A) |
| **C** | `street`, no locality, no centroid | `street` + `country=AT` (Photon first) | **5b** numbered discriminating field; **5c** house; 0 hits → 1A text only |

See [address-resolution-model.md § Branch C](./address-resolution-model.md#branch-c--street-only-countryat).
| **Below street** | admin fields only | none (admin centroid stored) | none |

Legacy helper `isSearchObjectComplete()` remains true only for Branch A.

Implementation: [`upload-search-object.completeness.helpers.ts`](../../../../apps/web/src/app/core/location-path-parser/upload-search-object.completeness.helpers.ts).

## Confidence thresholds

| Score | Action |
| --- | --- |
| ≥ 0.98 | Write field |
| 0.90–0.97 | Write + `uncertainFields` |
| < 0.90 | Omit field |

Fuse: `score = 1 - fuseResult.score` (0 = perfect match).
