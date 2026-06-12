# Media Detail — Address Field Editing

> **Parent spec:** [media-detail-inline-editing.md](media-detail-inline-editing.md)
> **Component spec:** [address-field-combobox.md](../../component/address-field-combobox/address-field-combobox.md)
> **Service spec:** [address-field-suggest](../../service/address-field-suggest/address-field-suggest.md)
> **Reconciliation:** [address-reconciliation](../../service/location-resolver/address-reconciliation.md)

---

## What It Is

The hierarchical per-field autocomplete editing system for the four address component rows (street, city, district, country) in the Media Detail location section. Each field shows assistive suggestions constrained by the already-filled sibling fields. Free-text entry is always allowed.

## What It Looks Like (summary)

Same five-slot `detail-row` layout as all other detail rows. See Row Slot Table below.

## Where It Lives

- **Route:** media detail panel (workspace pane)
- **Parent component:** `MediaDetailLocationSectionComponent`
- **Appears when:** user clicks an address field row's edit trigger or when reconciliation is triggered on detail open

---

## What It Looks Like

Each address row (this is the normative detail) (street/city/district/country) has the same five-slot layout as all `detail-row` elements. The behavior of the right-side action slots changes with field state:

### Row Slot Table

| Mode | `--l2` | `--l1` | Center | `--r1` | `--r2` |
| --- | --- | --- | --- | --- | --- |
| **Read — verified** | spacer | edit (pencil) | icon + label + value trigger | spacer | spacer |
| **Read — unverified** | spacer | edit (pencil) | icon + label + value trigger + subtle hint | **resolve** (`travel_explore`) | spacer |
| **Editing — clean** | spacer | spacer | icon + label + `app-address-field-combobox` | **check** (save) | **close** (cancel) |
| **Editing — (dropdown open)** | — | — | input + panel below | check | close |

**Subtle hint for unverified fields:** an inline `(?)` icon or small text badge appended to the value text (not a separate element) with `--muted-foreground` color and `aria-label` "Unverified value".

**Resolve button:** uses `travel_explore` Material icon, same aria pattern as `resolve_location` action. Aria label: `workspace.addressField.action.resolve.aria` → "Resolve address field".

**Resolve button is hidden while `editingField === fieldDef.name`** (check/close take those slots). It returns when the field returns to read mode.

---

## Hierarchy and Cascade Rules

Parent values constrain child query context. The `AddressFieldContext` passed to `AddressFieldComboboxComponent` MUST include sibling values from `image()` signal at the time of edit:

```
context = {
  country: image().country,
  countryCode: deriveCountryCode(image().country),  // from ISO list
  city: image().city,
  district: image().district,
  latitude: image().latitude,
  longitude: image().longitude,
  organizationId: authService.currentOrganizationId(),
}
```

### Cascade on parent save

When a **parent** field is saved with a new value that differs from the current child's context:

| Saved field | Child fields affected | Effect |
| --- | --- | --- |
| `country` | city, district, street | Mark as `unverified` in `address_field_meta` if currently `verified` and country changed |
| `city` | district, street | Mark as `unverified` in `address_field_meta` if currently `verified` and city changed |
| `district` | street | Mark as `unverified` in `address_field_meta` if currently `verified` and district changed |

Cascade does **not** clear field values — the user must explicitly edit or resolve them.

---

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Clicks field value trigger | Row enters edit mode; `app-address-field-combobox` rendered | `editingField → fieldDef.name` |
| 2 | Types in combobox | Debounced suggestions appear (country: instant filter) | `AddressFieldSuggestService.suggest()` |
| 3 | Picks suggestion | Combobox emits `suggestionSelected`; parent saves with `verified: true` | `fieldSaveRequested` + meta write |
| 4 | Blurs / presses Enter without picking | Combobox emits `valueChange`; parent saves with `verified: false` | `fieldSaveRequested` + meta write |
| 5 | Presses Escape | Edit cancelled, original value restored | `editingCancelled.emit()` |
| 6 | Clicks resolve button (unverified row) | Calls `AddressReconciliationService.reconcileField()`; shows offer if confident | Reconciliation flow |
| 7 | Detail view opens | `AddressReconciliationService.reconcileOnDetailOpen()` runs; prompt if confident | Reconciliation flow |
| 8 | Picks "Apply" in reconciliation prompt | Suggested values written to DB with `verified: true` | `applyOffer(…, 'apply')` |
| 9 | Picks "Don't ask again" | `suppressReconciliationPrompt: true` written to meta | `applyOffer(…, 'suppress')` |
| 10 | Picks "Try again" | New resolve cycle with relaxed confidence | `applyOffer(…, 'retry')` |
| 11 | Saves parent field with different country/city | Child fields flagged unverified if they were verified | Cascade rule |

---

## Component Hierarchy (location section scope)

```
MediaDetailLocationSectionComponent
├── app-address-search         ← global full-address bar (unchanged)
└── @for fieldDef of addressFields
    └── .detail-row
        ├── .detail-row-action--l2   spacer
        ├── .detail-row-action--l1   edit button | spacer (editing)
        ├── .detail-row__center
        │   ├── .material-icons      field icon
        │   ├── .detail-row__label   field label
        │   └── [read]  .detail-row__field-trigger (+ unverified badge if applicable)
        │       [edit]  app-address-field-combobox
        ├── .detail-row-action--r1   check (editing) | resolve (unverified, read) | spacer
        └── .detail-row-action--r2   close (editing) | spacer
```

---

## Verification State Derivation

`MediaDetailLocationSectionComponent` derives per-field verification state from `image().address_field_meta`:

```typescript
fieldVerification(field: AddressFieldKind): 'verified' | 'unverified' | 'unknown' {
  const meta = this.image().address_field_meta;
  if (!meta) return 'unknown';  // legacy record — treat as unverified for display
  const f = meta[field];
  if (!f) return 'unknown';
  return f.verified ? 'verified' : 'unverified';
}
```

`'unknown'` is treated as `'unverified'` for the resolve-button visibility rule.

---

## i18n Keys

| Key | Fallback |
| --- | --- |
| `workspace.addressField.unverified.hint` | `Unverified` |
| `workspace.addressField.action.resolve.aria` | `Resolve address field` |
| `workspace.addressField.action.resolve.title` | `Resolve address field` |
| `workspace.reconciliation.prompt.title` | `Address suggestion found` |
| `workspace.reconciliation.prompt.body` | `We found: {candidateLabel}. Apply to this item?` |
| `workspace.reconciliation.action.apply` | `Apply` |
| `workspace.reconciliation.action.dontAskAgain` | `Don't ask again` |
| `workspace.reconciliation.action.retry` | `Try again` |
| `workspace.reconciliation.toast.notFound` | `No suggestion found` |

---

## DB Migration

A new JSONB column `address_field_meta` must be added to `media_items` (nullable, no default). RLS is unchanged (same org row ownership). Migration file naming: `YYYYMMDDHHMMSS_add_address_field_meta.sql`.

---

## Acceptance Criteria

- [ ] Each address row shows resolve button (`travel_explore`) when `verificationState` is `unverified` or `unknown` and field has a non-null value.
- [ ] Resolve button is hidden while field is in edit mode (check/close take `--r1`/`--r2`).
- [ ] Picking a suggestion saves with `source: 'geocoder', verified: true` in `address_field_meta`.
- [ ] Free-text blur/Enter saves with `source: 'user', verified: false` in `address_field_meta`.
- [ ] Unverified field shows subtle hint text next to value in read mode.
- [ ] Cascade: saving country with new value flags city/district/street as unverified (if they were verified).
- [ ] Detail open triggers `reconcileOnDetailOpen` once per session per item.
- [ ] Reconciliation prompt shows apply / don't-ask-again / try-again.
- [ ] Applying reconciliation writes `verified: true` to all offered fields.
- [ ] Suppressing reconciliation prevents future prompts for those fields.
- [ ] Country suggestions are instant (no spinner, no network).
- [ ] City/district/street suggestions debounced 400ms; spinner shown while loading.
