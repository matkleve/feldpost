# Image Detail — Inline Editing

> **Parent spec:** [image-detail-view](media-detail-view.md)
> **Editing use cases:** [use-cases/image-editing.md](../../use-cases/image-editing.md)

## What It Is

The inline editing system for image properties in the Image Detail View. Covers the click-to-edit pattern for address label (title), captured date, project memberships, and address components (street, city, district, country). Also includes the address search bar for geocoded address lookup, read-only location evidence breakdown (active coordinates, address-derived coordinates, EXIF coordinates), and parser notes for unresolved address fragments so no location information is lost.

## What It Looks Like

Each property row has a **leading Material icon** (1rem, `--color-text-secondary`), a label (`--text-small`, 13px), and a value (`--text-body`, 15px, `--color-text-primary`). On hover, a warm clay tint background appears (`color-mix(in srgb, var(--color-clay) 8%, transparent)`) and an edit pencil icon fades in on the right (hidden → visible on parent hover, like `dd-drag-handle`). Clicking the value replaces it with an inline input. Row geometry follows `dd-item` pattern: `gap: --spacing-2`, `padding: --spacing-1 --spacing-2`, `--radius-sm`.

Read-only rows (Location, Uploaded, coordinate evidence) display with `--color-text-secondary` value text and no edit icon.

## Where It Lives

- **Parent**: `MediaDetailViewComponent` — DetailsSection and LocationSection
- **Appears when**: Image detail view is open and image data is loaded

## Actions

| #   | User Action                                        | System Response                                                                              | Triggers                         |
| --- | -------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------- |
| 1   | Clicks address label (title)                       | Title becomes an inline text input                                                           | `editingField` → `address_label` |
| 2   | Presses Enter or blurs title input                 | Saves updated address_label to `images` table                                                | Supabase update                  |
| 3   | Clicks captured date value                         | Date becomes a `datetime-local` input                                                        | `editingField` → `captured_at`   |
| 4   | Picks new date/time, blurs                         | Saves updated captured_at to `images` table                                                  | Supabase update                  |
| 5   | Clicks project value                               | Value becomes a multi-select checklist with org projects                                     | `editingField` → `project_ids`   |
| 6   | Checks/unchecks projects                           | Upserts/deletes memberships in `image_projects`                                              | Supabase write batch             |
| 7   | Clicks street/city/district/country value          | Value becomes an inline text input                                                           | `editingField` → field name      |
| 8   | Presses Enter or blurs address input               | Saves updated address component to `images` table                                            | Supabase update                  |
| 9   | Presses Escape during any edit                     | Cancels edit, restores original value, no DB write                                           | `editingField` → null            |
| 10  | Opens location section for mixed-source media      | Sees separate rows for active coordinates, address-derived coordinates, and EXIF coordinates | location evidence model          |
| 11  | EXIF and address-derived coordinates differ (>15m) | Shows mismatch badge with distance and keeps both sources visible                            | reconciliation metadata          |
| 12  | Address parser kept unresolved fragments           | Sees read-only "Address notes" list in location evidence group                               | parser residual notes            |

## Inline Editing Flow

All editable fields follow the same interaction pattern:

1. **ReadOnly** — Field displays current value with dashed underline on hover
2. **Editing** — User clicks → input appears (text / datetime-local / select). Focus auto-set.
3. **Saving** — Enter or blur → optimistic UI update + Supabase write in background
4. **Rollback** — If Supabase update fails, restore previous value
5. **Cancel** — Escape discards changes, no DB write

### Editable Fields Map

| Field         | Input Type       | DB Table         | DB Column                | Validation        |
| ------------- | ---------------- | ---------------- | ------------------------ | ----------------- |
| Address label | `text`           | `images`         | `address_label`          | Max 500 chars     |
| Captured date | `datetime-local` | `images`         | `captured_at`            | Valid ISO date    |
| Projects      | `multi-select`   | `image_projects` | `(image_id, project_id)` | Valid project IDs |
| Street        | `text`           | `images`         | `street`                 | Max 200 chars     |
| City          | `text`           | `images`         | `city`                   | Max 200 chars     |
| District      | `text`           | `images`         | `district`               | Max 200 chars     |
| Country       | `text`           | `images`         | `country`                | Max 200 chars     |

### Property Row Icon Mapping

| Field    | Icon            | Importance | Notes                           |
| -------- | --------------- | ---------- | ------------------------------- |
| Captured | `schedule`      | High       | When the photo was taken        |
| Project  | `folder`        | High       | Organizational grouping         |
| Street   | `signpost`      | Medium     | Part of address group           |
| City     | `location_city` | Medium     | Part of address group           |
| District | `map`           | Low-Medium | Part of address group           |
| Country  | `public`        | Low        | Part of address group           |
| Location | `my_location`   | Medium     | GPS coords, read-only           |
| Uploaded | `cloud_upload`  | Low        | Informational, read-only, muted |

## Address Search

At the top of the Location section sits an **Address Search Bar** — a full-width dd-item styled trigger showing the assembled address or "Search address…" as placeholder.

**Search flow:**

1. Click trigger → input field with search icon (left) and clear button (right)
2. Type → `GeocodingService.forward()` called (debounced 400ms) for Nominatim results
3. Results appear in dropdown using `dd-items` / `dd-item` styling
4. Select result → auto-fills **all** address fields (street, city, district, country, address_label) in one action, with optimistic Supabase update
5. Enter selects first result. Escape cancels.

## Component Hierarchy

```
DetailsSection                         ← dd-section-label "Details"
├── IconPropertyRow "Captured"         ← schedule icon, datetime-local on edit
├── IconPropertyRow "Projects"         ← folder icon, multi-select checklist on edit
└── IconPropertyRow "Uploaded"         ← cloud_upload icon, read-only, muted

LocationSection                        ← dd-section-label "Location"
├── AddressSearchBar                   ← full-width dd-item trigger, search icon
│   └── [search mode] SearchInput + ResultsDropdown (dd-items)
├── IconPropertyRow "Street"           ← signpost icon, text input on edit
├── IconPropertyRow "City"             ← location_city icon, text input on edit
├── IconPropertyRow "District"         ← map icon, text input on edit
├── IconPropertyRow "Country"          ← public icon, text input on edit
├── LocationEvidenceGroup               ← read-only source-separated coordinate rows
│   ├── IconPropertyRow "Coordinates (active)"        ← my_location icon, read-only mono
│   ├── IconPropertyRow "Coordinates (address-derived)" ← location_searching icon, read-only mono
│   ├── IconPropertyRow "Coordinates (EXIF)"          ← photo_camera icon, read-only mono
│   ├── [if notes exist] AddressParsingNotesList         ← sticky_note_2 icon, read-only multiline
│   └── [mismatch >15m] LocationMismatchBadge
└── [corrected] CorrectionHistory      ← original EXIF vs corrected, accent tint
```

## State

| Name               | Type                                                | Default      | Controls                                     |
| ------------------ | --------------------------------------------------- | ------------ | -------------------------------------------- |
| `editingField`     | `string \| null`                                    | `null`       | Which field is currently being edited inline |
| `saving`           | `boolean`                                           | `false`      | Whether a save operation is in progress      |
| `projectOptions`   | `{ id: string, name: string }[]`                    | `[]`         | Available projects for the membership picker |
| `locationEvidence` | `{ active?:string; address?:string; exif?:string }` | empty object | Read-only coordinate evidence rendering      |
| `locationMismatch` | `{ distanceMeters:number } \| null`                 | `null`       | Controls mismatch badge visibility           |
| `addressNotes`     | `string[]`                                          | `[]`         | Read-only unresolved parser fragments        |

## Acceptance Criteria

- [ ] **Address label**: click title → inline text input → save on Enter/blur → updates `images.address_label`
- [ ] **Captured date**: click value → `datetime-local` input → save → updates `images.captured_at`
- [ ] **Projects**: click value → multi-select checklist → save → updates `image_projects` memberships
- [ ] **Street/City/District/Country**: click value → inline text input → save → updates `images.[field]`
- [ ] Escape key cancels any active edit without saving
- [ ] Optimistic updates: UI reflects changes immediately, rolls back on error
- [ ] All editable rows show dashed underline hover affordance
- [ ] All property rows have **leading Material icon** (1rem, `--color-text-secondary`)
- [ ] Row hover uses **warm clay tint** (`color-mix(in srgb, var(--color-clay) 8%, transparent)`)
- [ ] Hover reveals **edit pencil icon** on right (hidden at rest, like dd-drag-handle)
- [ ] Section headings use **dd-section-label** style: `0.6875rem`, uppercase, `600`, `--color-text-disabled`
- [ ] Read-only rows (Location, Uploaded) show muted value text, no edit icon
- [ ] Address search bar triggers geocoding on input (debounced 400ms)
- [ ] Selecting a search result fills all address fields at once
- [ ] Coordinates displayed with correction indicator if corrected
- [ ] Original EXIF coordinates shown when correction exists
- [ ] Location section shows separate read-only rows for active coordinates, address-derived coordinates, and EXIF coordinates when available
- [ ] If address-derived coordinates and EXIF coordinates differ by more than 15m, mismatch badge is shown with distance
- [ ] EXIF coordinates remain visible and never get replaced by address-derived coordinates in detail UI
- [ ] If parser residual fragments exist, location section renders a read-only "Address notes" list so unparsed information remains visible.
- [ ] Projects dropdown loads from `projects` table filtered by `organization_id`
