# Metadata Section (media detail)

> **Parent:** [media-detail-view.md](media-detail-view.md), [metadata-service](../../service/metadata/metadata-service.md)

## What It Is

Section listing custom metadata entries with add-row flow: key/value inputs, save, and per-row removal via `MetadataPropertyRowComponent`.

## What It Looks Like

Section label “Metadata”, list of rows, add-metadata control at bottom; follows pane spacing tokens.

## Where It Lives

- **Code:** `apps/web/src/app/shared/workspace-pane/metadata-section/`
- **Parent:** `MediaDetailViewComponent`

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Adds new pair | Validates and saves via `MetadataService` | Save |
| 2 | Removes row | Deletes key/value | Remove |

## Component Hierarchy

```
MetadataSection
├── Section heading
├── MetadataPropertyRow × N
└── Add row controls
```

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Section stack | section root | `:host` | inputs, buttons | `.metadata-section` | content | rows scroll inside pane |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| --- | --- | --- | --- | --- |
| Add row | form row | dirty/saving | buttons | yes |

## Data

Inputs: `entries`, `allKeyNames`; persists through `MetadataService`.

## State

Add flow vs list-only; loading/error for save — single `data-state` on host recommended.

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/shared/workspace-pane/metadata-section/metadata-section.component.ts` | Component |
| `apps/web/src/app/shared/workspace-pane/metadata-section/metadata-section.component.html` | Template |
| `apps/web/src/app/shared/workspace-pane/metadata-section/metadata-section.component.scss` | Styles |

## Wiring

- Uses `MetadataPropertyRowComponent` for each entry.

## Acceptance Criteria

- [ ] Follows metadata service contracts for CRUD.
- [ ] Settings registry / i18n synced when visible copy changes.
