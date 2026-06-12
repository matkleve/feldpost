# Address Search (workspace media detail)

> **Parent:** [media-detail-inline-editing.md](media-detail-inline-editing.md)

## What It Is

Autocomplete address search control embedded in media detail for picking and applying **all** location/address fields at once (geocoding-backed). This is the **whole-address** search — a single query fills street, city, district, country, and coordinates in one action.

**Scope distinction:**
- `app-address-search` (this component): whole-address geocode lookup → fills all fields at once. Triggered via "Address" trigger row or `change_location_address` action.
- `app-address-field-combobox`: per-field hierarchical suggestions when editing individual rows (street/city/district/country). See [address-field-editing.md](address-field-editing.md).

Use `app-address-search` when the user wants to set the full address from scratch. Use `app-address-field-combobox` (automatic, via inline edit) when the user edits a single field.

## What It Looks Like

Search icon, text field, clear control, and results list with loading state; compact dropdown styling aligned with `dropdown-system`.

## Where It Lives

- **Code:** `apps/web/src/app/shared/workspace-pane/media-detail/address-search/`
- **Parent:** `MediaDetailInlineSectionComponent` / `MediaDetailViewComponent` composition

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Types query | Debounced geocode search | Input |
| 2 | Selects result | Applies suggestion to media record | Pick |

## Keyboard navigation (results listbox)

Normative for `app-address-search` while the results panel is open (`showResultsPanel`) and at least one selectable row exists (saved locations, then places — section labels and loading rows are not selectable).

| Key | Focus on input (`focusedIndex === -1`) | Focus in list (`focusedIndex >= 0`) |
| --- | --- | --- |
| **Tab** | Move highlight into the list on the **first** row (`focusedIndex = 0`); default browser tab order is suppressed so focus stays in the control | Move highlight to the **next** row; stops on the last row |
| **Shift+Tab** | No-op (browser default) | Move highlight to the **previous** row; from the first row, return focus to the input (`focusedIndex = -1`) |
| **ArrowDown** | Same as **Tab** (enter list on first row, else next row) | Next row (clamp at last) |
| **ArrowUp** | No-op | Previous row; from the first row, return focus to the input |
| **Enter** | Apply the **first** combined result (saved row 0, else first place) | Apply the **highlighted** row |
| **Escape** | Close search and emit `deactivated` | Same |

**Visual:** Highlighted row uses `.address-search__result-item--focused` (same clay tint as hover). Input exposes `role="combobox"`, `aria-expanded`, `aria-controls`, and `aria-activedescendant` pointing at `address-search-option-{index}`.

**Shared pattern:** Per-field address rows use the same list-highlight model in [address-field-editing.md](address-field-editing.md) (`app-address-field-combobox`). Toolbar / filter menus use [dropdown-system.md](../../component/filters/dropdown-system.md) (different shell; no typeahead list).

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
| `apps/web/src/app/shared/workspace-pane/media-detail/address-search/address-search.component.ts` | Component |
| `apps/web/src/app/shared/workspace-pane/media-detail/address-search/address-search.component.html` | Template |
| `apps/web/src/app/shared/workspace-pane/media-detail/address-search/address-search.component.scss` | Styles |

## Wiring

- Never calls Nominatim directly from template; goes through `GeocodingService`.

## Acceptance Criteria

- [ ] i18n keys `workspace.addressSearch.*`.
- [ ] Loading and empty results are mutually exclusive visual owners.
- [ ] Keyboard navigation matches [Keyboard navigation (results listbox)](#keyboard-navigation-results-listbox): Tab / Shift+Tab / arrows move highlight; Enter applies first result from input or highlighted row from list.
