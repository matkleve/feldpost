# Custom Metadata System

> **Parent spec:** [image-detail-view](image-detail-view.md)
> **Use cases:** [image-editing](../use-cases/image-editing.md) (IE-4, IE-5, IE-6)
> **Database:** [database-schema](../database-schema.md) — `metadata_keys`, `image_metadata`

## What It Is

The custom metadata system lets users tag images with arbitrary key/value pairs. Keys are shared across an organization (so all users see the same metadata vocabulary), while values are per-image. Users can add, edit, and remove metadata entries from the Image Detail View. Typing a key name shows autocomplete suggestions from existing org keys (Notion-style).

## What It Looks Like

A section labeled **"Metadata"** (dd-section-label style) inside the Image Detail View, below the Location section. Each metadata entry is a row with the key on the left and editable value on the right, matching dd-item geometry (0.8125rem font, 2rem min-height, warm clay hover). A delete icon appears on hover (right side). Below existing entries, an "Add metadata" button (dd-action-row style) reveals an inline add form with key + value inputs. The key input shows a dropdown of existing org keys filtered by what the user types. The save button uses dd-item styling (neutral icon, not blue).

## Where It Lives

- **Route**: Any route with Image Detail View open
- **Parent**: `ImageDetailViewComponent` in `apps/web/src/app/features/map/workspace-pane/image-detail-view.component.ts`
- **Appears when**: Image detail view is open and image data is loaded

## Actions

| #   | User Action                   | System Response                                                   | Triggers                                  |
| --- | ----------------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| 1   | Click metadata value          | MetadataPropertyRow enters edit mode — value becomes inline input | `editing.set(true)`                       |
| 2   | Press Enter / blur on value   | Commit edit — optimistic update + Supabase upsert                 | `saveMetadata(entry, newValue)`           |
| 3   | Press Escape in value input   | Cancel edit — restore original value, exit edit mode              | `editing.set(false)`                      |
| 4   | Hover metadata row            | Warm clay tint background + delete icon appears on right          | CSS `:hover`                              |
| 5   | Click delete icon             | Optimistic removal from list + Supabase delete                    | `removeMetadata(entry)`                   |
| 6   | Click "Add metadata" button   | Reveal inline add form with key + value inputs                    | `showAddMetadata.set(true)`               |
| 7   | Type in key input             | Filter org metadata keys, show autocomplete dropdown              | `onMetadataKeyInput(query)`               |
| 8   | Click autocomplete suggestion | Fill key input with suggestion, close dropdown, focus value input | Template expression                       |
| 9   | Press Enter in key input      | Move focus to value input                                         | `(keydown.enter)="newValueInput.focus()"` |
| 10  | Press Enter in value input    | Save the new metadata entry                                       | `addMetadata(key, value)`                 |
| 11  | Click save (check) button     | Save the new metadata entry                                       | `addMetadata(key, value)`                 |
| 12  | Press Escape in add form      | Hide add form, clear suggestions                                  | `showAddMetadata.set(false)`              |

## Component Hierarchy

```
MetadataSection ← .detail-section, dd-section-label heading "Metadata"
├── @for MetadataRowWrap ← .detail-metadata-row-wrap, flex row, hover clay tint
│   ├── MetadataPropertyRowComponent ← click-to-edit key/value row
│   │   ├── .prop-key ← key name, 0.8125rem, text-secondary
│   │   └── .prop-value / .prop-input ← value display or inline input
│   └── DeleteButton ← .detail-metadata-delete, absolute right, shown on :hover
│
├── [showAddMetadata] AddMetadataRow ← grid: 1fr 1fr auto
│   ├── KeyInputWrap ← .detail-add-metadata-key-wrap, relative position
│   │   ├── KeyInput ← text input with autocomplete trigger
│   │   └── [metadataKeySuggestions.length > 0] SuggestionsDropdown ← dd-items, absolute, z-dropdown
│   │       └── @for SuggestionButton ← dd-item with label icon + suggestion text
│   ├── ValueInput ← text input, Enter to save
│   └── SaveButton ← dd-item styled check icon button
│
└── [!showAddMetadata] AddMetadataButton ← dd-action-row, "Add metadata"
```

## Data

### Data Flow (Mermaid)

```mermaid
flowchart LR
  UI[UI Component] --> S[Service Layer]
  S --> DB[(Supabase Tables)]
  DB --> S
  S --> UI
```

| Source             | Table / RPC      | Columns / Fields                                  | Operation              |
| ------------------ | ---------------- | ------------------------------------------------- | ---------------------- |
| Metadata entries   | `image_metadata` | `image_id`, `metadata_key_id`, `value_text`       | SELECT, UPSERT, DELETE |
| Metadata key names | `metadata_keys`  | `id`, `key_name`, `organization_id`, `created_by` | SELECT, INSERT         |
| Join for display   | `metadata_keys`  | `key_name` (via foreign key join)                 | SELECT                 |

### Query: Load metadata for an image

```sql
SELECT metadata_key_id, value_text, metadata_keys(key_name)
FROM image_metadata
WHERE image_id = :imageId
```

### Query: Load org metadata keys (for autocomplete)

```sql
SELECT key_name
FROM metadata_keys
WHERE organization_id = :orgId
ORDER BY key_name
```

### Mutation: Upsert metadata value

```sql
INSERT INTO image_metadata (image_id, metadata_key_id, value_text)
VALUES (:imageId, :keyId, :value)
ON CONFLICT (image_id, metadata_key_id)
DO UPDATE SET value_text = EXCLUDED.value_text
```

### Mutation: Find or create metadata key

```sql
-- Step 1: Try to find existing
SELECT id FROM metadata_keys
WHERE key_name = :keyName AND organization_id = :orgId

-- Step 2: If not found, insert
INSERT INTO metadata_keys (key_name, organization_id)
VALUES (:keyName, :orgId)
RETURNING id
```

## State

| Name                     | Type              | Default | Controls                                   |
| ------------------------ | ----------------- | ------- | ------------------------------------------ |
| `metadata`               | `MetadataEntry[]` | `[]`    | List of current image metadata entries     |
| `showAddMetadata`        | `boolean`         | `false` | Visibility of the add-metadata inline form |
| `metadataKeySuggestions` | `string[]`        | `[]`    | Filtered autocomplete suggestions          |
| `allMetadataKeyNames`    | `string[]`        | `[]`    | All org key names (loaded once per image)  |

## Database Schema

### `metadata_keys` table

```
id               uuid PK default gen_random_uuid()
key_name         text NOT NULL
organization_id  uuid NOT NULL FK → organizations(id)
created_by       uuid FK → profiles(id) ON DELETE SET NULL
created_at       timestamptz NOT NULL default now()
UNIQUE (organization_id, key_name)
```

### `image_metadata` table

```
image_id         uuid FK → images(id) ON DELETE CASCADE
metadata_key_id  uuid FK → metadata_keys(id) ON DELETE CASCADE
value_text       text NOT NULL
created_at       timestamptz default now()
PRIMARY KEY (image_id, metadata_key_id)
```

### RLS Policies

- **SELECT**: User can read metadata for images in their organization
- **INSERT**: Non-viewer users can insert metadata for images in their org
- **UPDATE**: Non-viewer users can update metadata for images in their org
- **DELETE**: Non-viewer users can delete metadata for images in their org
- **metadata_keys SELECT**: Users can read keys in their organization
- **metadata_keys INSERT**: Non-viewers can create keys in their org
- **metadata_keys DELETE**: Creator or admin can delete keys in their org

## Interaction Flows

### Add Metadata (with autocomplete)

```
WHEN user clicks "Add metadata":
  showAddMetadata → true
  reveal key + value inputs, focus key input

WHEN user types in key input:
  filter allMetadataKeyNames where key.includes(query)
  exclude keys already assigned to this image
  show max 5 suggestions in dropdown

WHEN user clicks a suggestion:
  fill key input with suggestion text
  close dropdown
  focus value input

WHEN user presses Enter in key input:
  focus value input

WHEN user presses Enter in value input OR clicks save:
  IF key or value is empty → do nothing
  look up metadata_keys for existing key with this name + org
  IF not found → create new metadata_keys row
  upsert image_metadata with (image_id, key_id, value)
  append to metadata signal
  hide add form

WHEN user presses Escape in add form:
  hide add form
  clear suggestions
```

### Edit Metadata Value

```
WHEN user clicks value text in MetadataPropertyRow:
  editing → true, swap to inline input

WHEN user commits (Enter / blur):
  emit valueChanged with new value
  parent calls saveMetadata(entry, newValue)
  optimistic update in metadata signal
  upsert to Supabase

WHEN Supabase returns error:
  roll back to previous value in metadata signal
```

### Remove Metadata

```
WHEN user hovers row → show delete icon
WHEN user clicks delete icon:
  optimistic removal from metadata signal
  delete from image_metadata where image_id + metadata_key_id
  IF error → restore entry
```

## Acceptance Criteria

- [ ] Metadata section shows all key/value pairs for the selected image
- [ ] Click value → inline edit → Enter saves (optimistic update)
- [ ] Escape cancels edit without saving
- [ ] Hover row → warm clay tint + delete icon appears
- [ ] Delete icon removes entry with optimistic update + rollback on error
- [ ] "Add metadata" reveals key + value inputs
- [ ] Typing in key input shows autocomplete from org metadata keys
- [ ] Autocomplete excludes keys already on this image
- [ ] Selecting suggestion fills key and focuses value
- [ ] Enter in key → focus value, Enter in value → save
- [ ] Empty key or value prevents save
- [ ] New key name creates metadata_keys row if not found
- [ ] Save button uses dd-item styling (not blue primary button)
- [ ] Escape in add form hides it
- [ ] RLS prevents viewers from adding/editing/deleting metadata
- [ ] Column names match migration: `key_name`, `metadata_key_id`, `value_text`
