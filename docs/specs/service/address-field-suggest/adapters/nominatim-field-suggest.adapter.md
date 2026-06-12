# Nominatim Field Suggest Adapter

> **Parent:** [address-field-suggest.md](../address-field-suggest.md)
> **Code:** `apps/web/src/app/core/address-field-suggest/adapters/nominatim-field-suggest.adapter.ts`

## What It Is

Thin adapter that translates an `AddressFieldKind` + query + context into a `GeocodingService.search()` call and maps the raw `GeocoderSearchResult[]` response back to `AddressFieldSuggestion[]` for the matching field.

## What It Looks Like

Headless adapter — no UI. Used internally by `AddressFieldSuggestService`.

## Where It Lives

- **Code:** `apps/web/src/app/core/address-field-suggest/adapters/nominatim-field-suggest.adapter.ts`
- **Consumer:** `AddressFieldSuggestService`

## Actions

| # | Trigger | System Response |
| --- | --- | --- |
| 1 | `fetchNominatimFieldSuggestions(field, query, context, geocodingService)` called | Nominatim results filtered to target address component |

## Component Hierarchy

Internal function — no class hierarchy.

## Responsibilities

- Compose the composite free-form `q` string and `GeocoderSearchOptions` per field.
- Post-filter results to only those hits where the relevant address component matches.
- Map hits to `AddressFieldSuggestion` with normalized `value` and `score`.
- Return `[]` on any failure — never throws.

## Query Composition Table

| Field | `q` value | `countrycodes` | `viewbox` / `bounded` |
| --- | --- | --- | --- |
| `city` | `"{query}, {ctx.country}"` (country omitted if null) | `ctx.countryCode` if set | — |
| `district` | `"{query}, {ctx.city}, {ctx.country}"` (omit null segments) | `ctx.countryCode` if set | — |
| `street` | `"{query}, {ctx.city}, {ctx.country}"` (district inserted before country if set) | `ctx.countryCode` if set | `±0.1° box` from GPS if available |

- `country` field: MUST NOT call this adapter — handled by static ISO list in service.
- Null context fields are omitted from the composite string (no trailing commas).

## Result Field Extraction

| `AddressFieldKind` | Accepted Nominatim address fields |
| --- | --- |
| `city` | `address.city \|\| address.town \|\| address.village \|\| address.municipality` |
| `district` | `address.city_district \|\| address.suburb \|\| address.borough \|\| address.quarter` |
| `street` | `address.road` |

- Results where the expected field is absent or empty are DROPPED.
- `value` is set to the extracted field value (not `displayName`).
- `subtitle` is set to `"{city}, {country}"` for city-level+ context and `"{city}"` for street/district when city is available.

## Score Computation

```typescript
score = computeTextMatchScore(extractedValue, query) * (result.importance ?? 0.5)
```

Reuses `computeTextMatchScore` from `apps/web/src/app/core/search/search-query.ts`.

## Acceptance Criteria

- [ ] `q` string never contains trailing commas or double-spaces.
- [ ] City suggestions include only city/town/village/municipality-bearing results.
- [ ] Street suggestions include only `road`-bearing results.
- [ ] `countrycodes` is passed only when `context.countryCode` is non-null.
- [ ] `viewbox` + `bounded` are passed for street queries only when GPS coordinates available.
- [ ] Adapter returns `[]` when `GeocodingService.search` throws or returns empty.
