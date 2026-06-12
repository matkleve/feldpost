# Address Field Suggest Service

> **Module:** `apps/web/src/app/core/address-field-suggest/`
> **Parent index:** `docs/specs/service/address-field-suggest/README.md`
> **Related:** [geocoding-service](../geocoding/geocoding-service.md) · [address-resolver](../location-resolver/address-resolver.md) · [address-reconciliation](../location-resolver/address-reconciliation.md)

## What It Is

Headless facade that provides **field-scoped, hierarchically-constrained address suggestions** for individual address fields (country, city, district, street). Each field query is constrained by the already-filled parent fields so results narrow as more context is available.

The service is consumed exclusively by `AddressFieldComboboxComponent` in the media-detail location section. It is designed for reuse by upload panel and other forms.

---

## What It Looks Like

Headless service — no UI. Results surface as suggestion lists rendered by `AddressFieldComboboxComponent`.

## Where It Lives

- **Route:** cross-cutting (provided in root)
- **Code module:** `apps/web/src/app/core/address-field-suggest/`
- **Consumer:** `AddressFieldComboboxComponent` → `MediaDetailLocationSectionComponent`

## Actions

| # | Trigger | System Response | Contract |
| --- | --- | --- | --- |
| 1 | `suggest(field, query, context)` called | Merged org-DB + Nominatim suggestions, DB-first | `Promise<AddressFieldSuggestion[]>` |
| 2 | `filterCountries(query)` called | Synchronous ISO list filter | `CountrySuggestion[]` |
| 3 | Cache hit for (field, query, context) key | Cached results returned without network call | TTL = 2 min |

## Component Hierarchy

```text
AddressFieldSuggestService (facade)
|- address-field-suggest.types.ts
|- address-field-suggest.helpers.ts
|- data/iso-countries.ts
|- adapters/nominatim-field-suggest.adapter.ts
└- adapters/org-address-field-suggest.adapter.ts
```

---

## API Contract

```typescript
@Injectable({ providedIn: 'root' })
export class AddressFieldSuggestService {
  /**
   * Suggest values for a single address field.
   * DB-org results appear first, then geocoder results, deduped by normalized value.
   * Returns [] on empty query or network failure — never throws.
   */
  suggest(
    field: AddressFieldKind,
    query: string,
    context: AddressFieldContext,
  ): Promise<AddressFieldSuggestion[]>;

  /** Synchronous country filter — no network. Returns ISO list filtered by query. */
  filterCountries(query: string): CountrySuggestion[];
}

/** The four hierarchical address components. */
type AddressFieldKind = 'country' | 'city' | 'district' | 'street';

/** Sibling field values and GPS coordinates available at suggestion time. */
interface AddressFieldContext {
  country?: string | null;
  countryCode?: string | null; // derived from ISO pick
  city?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  organizationId?: string | null;
}

interface AddressFieldSuggestion {
  value: string;           // canonical display value to write to DB
  subtitle?: string;       // e.g. city/country for street results
  source: 'org-db' | 'geocoder';
  score: number;           // 0..1, used for dedup/ranking within source tier
  countryCode?: string;    // only populated for country-level results
}

interface CountrySuggestion {
  name: string;            // canonical country name (English)
  code: string;            // ISO 3166-1 alpha-2 lower-case
  localizedName?: string;  // populated from i18n if available
}
```

---

## Per-Field Query Algorithm

### Country

- Source: **static ISO 3166-1 list** — no network call.
- Client-side case-insensitive prefix + substring match on name and ISO code.
- Returns all matches up to 20 entries; instant.
- Country name stored in `media_items.country` is the canonical display form (English).
- ISO alpha-2 code derived in memory and passed as `context.countryCode` to child queries.

### City

- Sources: **org-DB distinct** (`media_items.city`, org-scoped) first; then **Nominatim** (if DB results < 5 or query length ≥ 3).
- Composite free-form query: `"{query}, {context.country}"` (context.country omitted if null).
- Nominatim `countrycodes` parameter: `context.countryCode` if set.
- Post-filter: keep only hits where `address.city || address.town || address.village || address.municipality` matches the typed prefix (case-insensitive).
- DB query: `ilike('city', '*${query}*')` limited to 8 results scoped to `organization_id`.
- Minimum query length before Nominatim call: **2 characters**.
- Debounce: **400ms** (applied in component, not service).

### District

- Sources: org-DB distinct `district` first; then Nominatim.
- Composite query: `"{query}, {context.city}, {context.country}"` (omit null parents).
- Nominatim `countrycodes`: `context.countryCode` if set.
- Post-filter: keep only hits where `address.city_district || address.suburb || address.borough || address.quarter` matches prefix.
- DB query: `ilike('district', '*${query}*')` scoped to org.
- If `context.city` is set in DB query, additionally filter `eq('city', context.city)`.
- Minimum query length before Nominatim: **2 characters**.

### Street

- Sources: org-DB distinct `street` first; then Nominatim.
- Composite query: `"{query}, {context.city}, {context.country}"` (omit null parents; append `, {context.district}` between city and country if set).
- Nominatim `countrycodes`: `context.countryCode` if set.
- Nominatim `viewbox` / `bounded`: set from `context.latitude`/`context.longitude` (±0.1 degree box) if GPS available.
- Post-filter: keep only hits where `address.road` matches prefix.
- DB query: `ilike('street', '*${query}*')` scoped to org; if `context.city` set, additionally `eq('city', context.city)`.
- Minimum query length before Nominatim: **2 characters**.

---

## Quality Gates

All Nominatim results MUST pass the following filters before inclusion:

| Gate | Rule |
| --- | --- |
| Minimum lexical match | `computeTextMatchScore(fieldValue, query) >= 0.25` (reuse from `search-query.ts`) |
| Country constraint | Result `address.country_code` MUST match `context.countryCode` if set |
| Deduplication | Normalized value (`normalize('NFKD').toLower().trim()`) — keep highest-scoring duplicate |
| Max returned | 8 suggestions total (org-DB + geocoder combined, DB tier capped at 5) |

---

## DB-First Ranking

1. Org-DB suggestions MUST appear before geocoder suggestions in the result list.
2. Within each tier, results are sorted descending by `score`.
3. Geocoder results that duplicate an org-DB result (by normalized value) are dropped.

---

## Rate Limit and Caching

- Suggestions share the `GeocodingService` serial queue (one in-flight Nominatim call at a time).
- Field-level in-memory cache: key = `"${field}:${query.toLowerCase()}:${context.countryCode ?? ''}:${context.city?.toLowerCase() ?? ''}"`, TTL = 2 minutes.
- Country filter is synchronous; no cache needed.

---

## Data Model — Verification Metadata

`media_items` gains an optional JSONB column `address_field_meta` (migration required):

```typescript
// Stored in media_items.address_field_meta (JSONB, nullable)
interface AddressFieldMeta {
  street?:   AddressFieldVerification;
  city?:     AddressFieldVerification;
  district?: AddressFieldVerification;
  country?:  AddressFieldVerification;
}

interface AddressFieldVerification {
  source: 'user' | 'geocoder' | 'parser' | 'address-search';
  verified: boolean;
  suppressReconciliationPrompt?: boolean; // user chose "don't ask again"
}
```

Fields saved by selecting a suggestion → `source: 'geocoder', verified: true`.
Fields saved by free-text blur → `source: 'user', verified: false`.
Fields populated by existing address-search bar → `source: 'address-search', verified: true`.
Fields imported from parser → `source: 'parser', verified: false` (eligible for reconciliation).

---

## File Map

| File | Purpose |
| --- | --- |
| `address-field-suggest.service.ts` | Facade (`suggest`, `filterCountries`) |
| `address-field-suggest.types.ts` | `AddressFieldKind`, `AddressFieldContext`, `AddressFieldSuggestion`, `CountrySuggestion`, `AddressFieldMeta`, `AddressFieldVerification` |
| `address-field-suggest.helpers.ts` | Query composition, hit filtering, field-value extraction from geocoder hits, score computation |
| `data/iso-countries.ts` | Static ISO 3166-1 list (name + code); not the parser's 3-country registry |
| `adapters/nominatim-field-suggest.adapter.ts` | Nominatim adapter — see [nominatim-field-suggest.adapter.md](adapters/nominatim-field-suggest.adapter.md) |
| `adapters/org-address-field-suggest.adapter.ts` | Org-DB adapter — see [org-field-suggest.adapter.md](adapters/org-field-suggest.adapter.md) |
| `README.md` | Module index |

---

## Wiring

- **Injected:** `GeocodingService`, `SupabaseService`
- **Consumers:** `AddressFieldComboboxComponent`
- **Forbidden:** Components MUST NOT call `GeocodingService.search()` directly for field suggestions — route through this service.

---

## Acceptance Criteria

- [ ] `filterCountries('')` returns all ISO entries; `filterCountries('aus')` returns Austria and Australia.
- [ ] `suggest('country', ...)` returns synchronously from static data without network.
- [ ] `suggest('city', 'Wien', { countryCode: 'at' })` — org-DB results appear before geocoder; all results are cities not streets.
- [ ] `suggest('street', 'Denisgas', { city: 'Wien', countryCode: 'at' })` — returns only `road`-level results matching prefix.
- [ ] Geocoder results with `address.country_code !== context.countryCode` are excluded when countryCode is set.
- [ ] Cache prevents duplicate Nominatim calls for same (field, query, context) within TTL.
- [ ] Service never throws; all failures return `[]`.
- [ ] `AddressFieldMeta` types are exported from `address-field-suggest.types.ts`.
