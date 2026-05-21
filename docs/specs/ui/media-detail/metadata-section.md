# Metadata Section (media detail)

> **Parent:** [media-detail-view.md](media-detail-view.md), [metadata-service](../../service/metadata/metadata-service.md)

## What It Is

Notion-style custom metadata in media detail: org-wide property identity is **type + name** (`metadata_keys`); per image only **value** (`media_metadata.value_text`). Add flow composes type, name, and value without confirmation popups.

## Where It Lives

- **Code:** `apps/web/src/app/shared/workspace-pane/media-detail/metadata-section/`
- **Pickers:** `apps/web/src/app/shared/workspace-pane/media-detail/metadata/`
- **Parent:** `MediaDetailViewComponent`

## Inputs / Outputs

| Input | Type | Notes |
| --- | --- | --- |
| `entries` | `MetadataEntry[]` | Includes `keyType` per row |
| `metadataKeyDefinitions` | `MetadataKeyDefinitionView[]` | Org property catalog |

| Output | Payload |
| --- | --- |
| `valueChanged` | `{ entry, newValue }` |
| `entryRemoved` | `MetadataEntry` |
| `entryAdded` | `{ keyName, keyType, value }` |

## FSM (add row)

| State | Visual | Transitions |
| --- | --- | --- |
| `collapsed` | Full-width “Add metadata” trigger | → `composing` on click |
| `composing` | Type + name + value sub-grid | → `collapsed` on save success, Escape, outside click, R1 close (silent discard) |

Compose draft (`MetadataAddDraft`): `valueType`, `propertyMode` (`new` \| `existing`), `metadataKeyId`, `keyName`, `value` (always string). Validation at **save only** via `validateMetadataValueForSave`. Picking type while `existing` clears lock → `new`. Panel exclusivity: `openPanel: 'type' \| 'property' \| null`.

Duplicate guard: saved rows use `id:${metadataKeyId}`; draft collision uses `def:${valueType}|${normalizedName}`.

## Visual Behavior Contract

### Ownership Triad (add-row sub-grid — canonical)

| Behavior | Geometry owner | State owner | Visual owner | Same element? |
| --- | --- | --- | --- | --- |
| 5-column detail row shell | `.detail-row.add-metadata-row` | `.detail-row--editing` on row | [`_detail-row-slots.scss`](../../../../apps/web/src/app/shared/workspace-pane/media-detail/_detail-row-slots.scss) `.detail-row` grid | yes (row) |
| Center column width / inset | `.detail-row__center.metadata-add-row__center` | — | [`metadata-section.component.scss`](../../../../apps/web/src/app/shared/workspace-pane/media-detail/metadata-section/metadata-section.component.scss) `@layer components` | yes |
| Type + name + value horizontal split | `.metadata-add-row__controls` (new inner wrapper) | — | `metadata-section.component.scss` only — **not** `_detail-row-slots.scss` | yes |
| Type picker width | `app-metadata-type-picker` `:host` | picker internal | picker SCSS | yes |
| Name / value flex | `.metadata-add-row__name`, `.metadata-add-row__value` | — | `metadata-section.component.scss` | yes |

**Rules:**

- [`_detail-row-slots.scss`](../../../../apps/web/src/app/shared/workspace-pane/media-detail/_detail-row-slots.scss): owns **outer** 5-column grid and `.detail-row__center` default 3-column icon/label/value template for **read** rows only — **does not** define metadata add sub-grid columns.
- [`metadata-section.component.scss`](../../../../apps/web/src/app/shared/workspace-pane/media-detail/metadata-section/metadata-section.component.scss): **sole owner** of `.metadata-add-row__center` grid override and `.metadata-add-row__controls` (`grid-template-columns: auto minmax(0,1fr) minmax(0,1fr)` or equivalent).
- Picker components: **no** width on outer detail row; max-width 100% inside name slot only.

## Component Hierarchy

```
MetadataSection
├── MetadataPropertyRow × N
└── Add row (detail-row + pickers + value editor)
    ├── app-metadata-type-picker
    ├── app-metadata-property-picker
    └── app-metadata-value-editor
```

## Acceptance Criteria

- [ ] Property identity: `organization_id` + `key_name` + `key_type` (composite unique).
- [ ] No confirmation popups on compose, type change, or cancel with non-empty draft.
- [ ] Type control: single bordered icon button, no chevron.
- [ ] Name picker: search + rows with type icon + name chip; create row for new names.
- [ ] Existing rows: read-only type + name; edit value only.
- [ ] Collapsed add: entire center cell clickable.
- [ ] i18n keys registered in translation workbench.
