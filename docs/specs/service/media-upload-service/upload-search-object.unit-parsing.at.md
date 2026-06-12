# Upload Search Object — Austria unit parsing (AT)

> **Parent:** [upload-search-object.md](./upload-search-object.md)  
> **Layer packages:** [upload-search-object.layer-map.md](./upload-search-object.layer-map.md)  
> **Code:** `apps/web/src/app/core/location-path-parser/upload-search-object.unit-parsing.at.ts`

## Scope

| Country | Status |
| --- | --- |
| `AT` | **Normative v1** (this file) |
| `DE`, `CH`, others | **Reserved** — do not implement slash/unit rules without a sibling spec |

Runs when `country === 'AT'` (from path context or default upload country). Applied **before** [`tokenizeSegment`](../../../../apps/web/src/app/core/location-path-parser/path-token-classifier.ts) on each path segment.

## Field mapping (SO ↔ database)

| SO field | `public.locations` column | Product meaning (AT) |
| --- | --- | --- |
| `staircase` | `staircase` | Stiege / stairwell identifier |
| `door` | `door` | Top / Tür / unit door (UI label often “Top”) |

Both are nullable. Alphanumeric door values (`7B`, `14-15`, `3+4`) are stored **as parsed** (no reformat).

**Sort order** in DB uses [`build_location_sort_key`](../../../../supabase/migrations/20260522120000_media_item_locations.sql): leading digits zero-padded, then full string — supports `7B`, ranges, and `+` forms.

## Slash chains (AT)

**Folder paths:** `splitPathSegments` splits on `/`, so `AT/Wien/Neustiftgasse 25/14/photo.jpg` becomes `Neustiftgasse 25` + `14` unless [`collapseAtSlashPathSegments`](../../../../apps/web/src/app/core/location-path-parser/upload-search-object.unit-parsing.at.ts) merges a lone numeric segment onto the previous folder part → `Neustiftgasse 25/14`. Used in `buildSearchObjectFromRelativePath` and layer-map folder extraction.

After optional street name, a slash-separated numeric chain attaches to the **house number** on the same segment.

| Pattern | Example input segment | `houseNumber` | `staircase` | `door` |
| --- | --- | --- | --- | --- |
| House / top | `Neustiftgasse 25/14` | `25` | null | `14` |
| House / stair / top | `Kirchengasse 15/4/5` | `15` | `4` | `5` |

**Algorithm (segment-level):**

1. Detect `streetPart + '/' + numericChain` where `numericChain` is one or more `/`-separated parts matching `^\d+[a-zA-Z0-9+\-]*$` (per part).
2. Two parts → `[house, door]`.
3. Three parts → `[house, staircase, door]`.
4. More than three → treat extras as parse noise; log in dev trace only.

## Labeled tokens (same segment)

| Token pattern | SO field | Example |
| --- | --- | --- |
| `^(stiege?\|stg)\b` | `staircase` | `Stiege 3` → `3` |
| `^(tür\|top)\b` | `door` | `Tür 12`, `Top 7` |
| `^top` alone as keyword | `door` | **Not** `staircase` |

Numeric value after label is extracted; label text is not kept in the value unless no digits (then full token).

## Keys (do not put units in geocode grouping by default)

| Key | Includes `staircase` / `door`? |
| --- | --- |
| `grouping_key` | **No** — building-level only (`country` … `houseNumber`). See [upload-search-object.md § Keys](./upload-search-object.md#keys-philosophy). |
| `address_dedupe_key` | **Yes** — full address including units. |

Photon forward geocode uses street + locality; it does **not** accept unit fields. Units persist on SO → RPC (`p_staircase`, `p_door`).

## Worked examples (tests)

| ID | Segment | `houseNumber` | `staircase` | `door` |
| --- | --- | --- | --- | --- |
| AT-U01 | `Neustiftgasse 25/14` | `25` | null | `14` |
| AT-U02 | `Kirchengasse 15/4/5` | `15` | `4` | `5` |
| AT-U03 | `Musterstraße 7 Tür 12` | `7` | null | `12` |
| AT-U04 | `Hauptstraße 3 Stiege 2` | `3` | `2` | null |
| AT-U05 | `Gasse 1 Top 7B` | `1` | null | `7B` |

Vitest: `upload-search-object.unit-parsing.at.spec.ts` — one `it('AT-U0N: …')` per row.

## Acceptance criteria

- [ ] `door` populated on SO when path encodes Top/Tür or slash top segment.
- [ ] `top` keyword never writes `staircase`.
- [ ] Slash `25/14` and `15/4/5` parse per table.
- [ ] `grouping_key` unchanged by unit fields (see parent hub).
