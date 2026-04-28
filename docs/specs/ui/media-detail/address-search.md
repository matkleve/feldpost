# Address Search (workspace media detail)

> **Parent:** [media-detail-inline-editing.md](media-detail-inline-editing.md)

## What It Is

Autocomplete address search control embedded in media detail for picking and applying location/address fields (geocoding-backed).

## What It Looks Like

Search icon, text field, clear control, and results list with loading state; compact dropdown styling aligned with `dropdown-system`.

## Where It Lives

- **Code:** `apps/web/src/app/shared/workspace-pane/address-search/`
- **Parent:** `MediaDetailInlineSectionComponent` / `MediaDetailViewComponent` composition

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Types query | Debounced geocode search | Input |
| 2 | Selects result | Applies suggestion to media record | Pick |

## Component Hierarchy

```
AddressSearch
├── Input + clear
└── Results list
```

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Input row | `.address-search` | `:host` | input, buttons | `.address-search__*` | content | results stack below |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| --- | --- | --- | --- | --- |
| Results open | dropdown panel | `hasResults`/open | panel | yes |

## Data

Uses `GeocodingService` / adapters per architecture rules; `currentAddress` input for controlled display.

## State

Idle, loading, results, error — FSM via `[attr.data-state]` recommended.

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/shared/workspace-pane/address-search/address-search.component.ts` | Component |
| `apps/web/src/app/shared/workspace-pane/address-search/address-search.component.html` | Template |
| `apps/web/src/app/shared/workspace-pane/address-search/address-search.component.scss` | Styles |

## Wiring

- Never calls Nominatim directly from template; goes through `GeocodingService`.

## Acceptance Criteria

- [ ] i18n keys `workspace.addressSearch.*`.
- [ ] Loading and empty results are mutually exclusive visual owners.
