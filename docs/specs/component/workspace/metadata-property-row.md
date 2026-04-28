# Metadata Property Row

> **Parent:** [media-detail-inline-editing.md](../../ui/media-detail/media-detail-inline-editing.md), [metadata-service](../../service/metadata/metadata-service.md)

## What It Is

Row UI for a single metadata key/value pair with inline edit and remove actions on custom metadata.

## What It Looks Like

Grid-aligned label and value; rail actions for edit/remove on hover/focus per quiet-actions pattern.

## Where It Lives

- **Code:** `apps/web/src/app/shared/workspace-pane/metadata-property-row.component.ts`
- **Parent:** `MetadataSectionComponent`

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Clicks edit | Focus field / inline edit | Edit |
| 2 | Clicks remove | Removes pair via metadata service | Remove |

## Component Hierarchy

```
MetadataPropertyRow
├── Meta key / value
└── Actions (edit, remove)
```

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Row | `.meta-row` | `.meta-row` | icon buttons | `.meta-row`, `.detail-row-action` | content | actions reveal on hover |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| --- | --- | --- | --- | --- |
| Editing highlight | `.meta-row` | `--editing` class | `.meta-row--editing` | yes |

## Data

Inputs `key`, `value` (aliases `metaKey`, `metaValue`).

## State

Editing vs display; `[attr.data-state]` on host recommended.

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/shared/workspace-pane/metadata-property-row.component.ts` | Component |
| `apps/web/src/app/shared/workspace-pane/metadata-property-row.component.html` | Template |
| `apps/web/src/app/shared/workspace-pane/metadata-property-row.component.scss` | Styles |

## Wiring

- Delegates persistence to `MetadataService` via parent section.

## Acceptance Criteria

- [ ] SCSS follows two-line comment contract on refactors.
- [ ] i18n keys under `workspace.metadata.*`.
