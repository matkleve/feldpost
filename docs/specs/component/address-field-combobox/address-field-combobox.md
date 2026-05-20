# Address Field Combobox

> **Selector:** `app-address-field-combobox`
> **File:** `apps/web/src/app/shared/workspace-pane/media-detail/address-field-combobox/address-field-combobox.component.ts`
> **Registered:** [`registry.workspace-pane.supplement.md`](../registry.workspace-pane.supplement.md)
> **Parent spec:** [address-field-editing.md](../../ui/media-detail/address-field-editing.md)
> **Service:** [address-field-suggest](../../service/address-field-suggest/address-field-suggest.md)

---

## What It Is

A combobox input that replaces the plain `<input>` in each address field row (street/city/district/country) when editing is active. Provides assistive autocomplete suggestions from the field-suggest service, anchored as a dropdown panel below the editing row. Free-text entry is always allowed.

---

## What It Looks Like

An inline text input styled as `detail-row__field-input` occupies the field slot. When suggestions are available, a floating panel (`app-dropdown-shell`, `positionMode="absolute"`) drops below the editing row showing up to 8 suggestion items. Each item shows the primary value and an optional subtitle (e.g. city, country). DB-org results appear in a labeled section "Your locations" above geocoder results.

---

## Where It Lives

- **Used in:** `MediaDetailLocationSectionComponent` — the `@for (fieldDef of addressFields)` loop, when `editingField() === fieldDef.name`.
- **Appears when:** user clicks a field row's edit trigger.

---

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Input row | `.detail-row__center` | `app-address-field-combobox :host` | `input.address-field-combobox__input` | `.address-field-combobox__input` | content | input visible, row has editing class |
| Suggestion panel | `app-dropdown-shell` | `app-dropdown-shell` (z-300) | `.address-field-combobox__suggestion` buttons | `[data-state="open"]` | dropdown (z-300) | panel positioned below row anchor |
| Loading indicator | inline within panel | — | — | `.address-field-combobox__loading` | content | only when `data-state="loading"` |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| --- | --- | --- | --- | --- |
| Input | `.address-field-combobox__input` | `[data-state]` on `:host` | `.address-field-combobox__input` | ✅ |
| Panel open | `app-dropdown-shell` | `hasResults` derived signal | `app-dropdown-shell` | ✅ |
| Loading | `.address-field-combobox__loading` | `loading` signal | `.address-field-combobox__loading` | ✅ |

---

## FSM

### States

| State | Visual | Conditions |
| --- | --- | --- |
| `idle` | Input, no panel | `editingField !== this.field` (component not rendered) |
| `typing` | Input, no panel or stale panel | value changed, debounce pending |
| `loading` | Input + panel with spinner | network call in-flight |
| `open` | Input + panel with results | suggestions available |
| `empty` | Input + panel with "No results" | query ≥ min chars, no suggestions |
| `closed` | Input only | query < min chars OR country (sync) with 0 matches |

`[attr.data-state]` on `:host` reflects: `typing`, `loading`, `open`, `empty`, `closed`.

### Transition Map

| From | Event | To |
| --- | --- | --- |
| `closed` | input (≥ min chars for non-country) | `typing` |
| `typing` | debounce fires | `loading` |
| `loading` | results arrived | `open` (if results) / `empty` (if 0) |
| `open` | user clears input below min | `closed` |
| `open` | user picks suggestion | emit + parent saves → component destroyed |
| `open` | Escape | `closed` |
| `open` | outside click | `closed` |
| any | Enter | select first suggestion if `open`, else save free text |

---

## Inputs & Outputs

```typescript
// Inputs
readonly field = input.required<AddressFieldKind>();
readonly value = input<string>('');
readonly context = input<AddressFieldContext>({});
readonly verificationState = input<'verified' | 'unverified' | 'unknown'>('unknown');

// Outputs
readonly valueChange = output<string>();         // emitted on blur / Enter for free-text
readonly suggestionSelected = output<AddressFieldSuggestion>(); // emitted when user picks from list
readonly resolveRequested = output<void>();      // emitted when resolve button pressed (forwarded to parent)
```

---

## Keyboard Contract

| Key | Behavior |
| --- | --- |
| `ArrowDown` | Focus first suggestion in panel |
| `ArrowUp` | Focus previous suggestion (wrap to input) |
| `Enter` | If panel open: pick focused / first suggestion. Otherwise: save free text (emit `valueChange`) |
| `Escape` | Close panel; parent cancels edit via existing `editingCancelled` output |
| `Tab` | Close panel; save free text |

---

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Types in input (≥ 2 chars) | Debounced suggestions appear; country is instant | `suggest()` or `filterCountries()` |
| 2 | Presses ArrowDown / ArrowUp | Focus moves through suggestion list | keyboard navigation |
| 3 | Presses Enter (panel open) | First / focused suggestion selected | `suggestionSelected` emitted |
| 4 | Presses Enter (panel closed) | Free text saved | `valueChange` emitted |
| 5 | Clicks suggestion | Suggestion selected, panel closes | `suggestionSelected` emitted |
| 6 | Presses Escape | Panel closes, edit cancelled | `editingCancelled` via parent |
| 7 | Blurs input without picking | Free text saved | `valueChange` emitted |

---

## Component Hierarchy

```
app-address-field-combobox (:host, data-state)
├── input.address-field-combobox__input   (text input, `detail-row__field-input` style class)
└── app-dropdown-shell [positionMode="absolute"] [anchor]="inputRef"
    ├── .address-field-combobox__section-label  (if org-DB results)
    ├── button.address-field-combobox__suggestion ×N  (org-DB tier)
    ├── .address-field-combobox__divider  (if both tiers non-empty)
    ├── .address-field-combobox__section-label  (geocoder results)
    ├── button.address-field-combobox__suggestion ×N  (geocoder tier)
    ├── .address-field-combobox__loading  (spinner row)
    └── .address-field-combobox__empty    (no results message)
```

---

## Wiring

- Calls `AddressFieldSuggestService.suggest(field, query, context)` — debounced 400ms.
- For `country` field: calls `AddressFieldSuggestService.filterCountries(query)` synchronously (no debounce, no spinner).
- Uses `DropdownShellComponent` with `positionMode="absolute"` anchored to the host element.
- Emits `suggestionSelected` with full `AddressFieldSuggestion` so parent can write `source: 'geocoder', verified: true` to `address_field_meta`.
- Emits `valueChange` for free-text so parent writes `source: 'user', verified: false`.

---

## i18n Keys

| Key | Fallback |
| --- | --- |
| `workspace.addressField.suggest.sectionOrgDb` | `Your locations` |
| `workspace.addressField.suggest.sectionGeocoder` | `Suggestions` |
| `workspace.addressField.suggest.loading` | `Searching...` |
| `workspace.addressField.suggest.empty` | `No results` |
| `workspace.addressField.suggest.suggestionAria` | `Select {value}` |

---

## Acceptance Criteria

- [ ] Country field shows full ISO list on empty input; filters synchronously with no network.
- [ ] City/district/street: debounce 400ms before query; spinner shown while loading.
- [ ] Min 2 chars before Nominatim call for city/district/street (country: 0).
- [ ] Org-DB results labeled "Your locations" appear before geocoder results.
- [ ] Keyboard navigation works: Arrow keys move focus, Enter picks, Escape closes.
- [ ] `suggestionSelected` emits with full `AddressFieldSuggestion` object.
- [ ] `valueChange` emits on blur/Enter when no suggestion was picked (free-text).
- [ ] Panel closes on outside click or Escape.
- [ ] Component uses `app-dropdown-shell` — no custom overlay positioning logic.
- [ ] `[attr.data-state]` on `:host` reflects correct FSM state at all times.
