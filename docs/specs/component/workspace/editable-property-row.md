# Editable Property Row

> **Parent:** [media-detail-inline-editing.md](../../ui/media-detail/media-detail-inline-editing.md)

## What It Is

Reusable row for a labeled property with inline edit affordance and optional select mode. The standalone `EditablePropertyRowComponent` was removed (2026-05 workspace-pane restructure); the pattern lives in `MediaDetailInlineSectionComponent` and related media-detail row chrome.

## What It Looks Like

Two-column row: label (muted) and value or control; edit icon appears per hover/focus rules shared with metadata rows.

## Where It Lives

- **Code:** `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-inline-section/media-detail-inline-section.component.ts`
- **Parent:** `MediaDetailViewComponent` and metadata/location sections

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Clicks edit | Enters edit mode for row | `editRequested` |
| 2 | Selects option | Emits value change | select / combobox handlers |

## Component Hierarchy

```
MediaDetailInlineSection
├── Label
└── Value / input / select
```

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Row layout | inline section row / host | `:host` | buttons, inputs | section BEM | content | min-height stable |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| --- | --- | --- | --- | --- |
| Edit mode | row host | edit mode signal | focus ring on input | partial — document in implementation |

## Data

Inputs: label, value, display modes per inline-section contract; see [media-detail-inline-section.md](../../ui/media-detail/media-detail-inline-section.md).

## State

Supports text, date, and select modes; expose unified visual API (`data-state`) when edit vs read diverges.

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-inline-section/media-detail-inline-section.component.ts` | Inline edit section |
| `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-inline-section/media-detail-inline-section.component.html` | Template |
| `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-inline-section/media-detail-inline-section.component.scss` | Styles |

## Wiring

- Consumes i18n for aria labels and placeholders.

## Acceptance Criteria

- [ ] No nested interactive elements (ESLint `feldpost-template/no-nested-interactive`).
- [ ] Copy matches glossary terms for media fields where applicable.
