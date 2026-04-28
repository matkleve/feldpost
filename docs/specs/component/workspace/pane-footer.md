# Pane Footer

## What It Is

A two-zone footer row with a flexible spacer between `left` and `right` projected content. Used for secondary actions and status hints at the bottom of panes.

## What It Looks Like

A horizontal strip: optional left slot, expanding spacer, optional right slot. Alignment and spacing follow pane chrome tokens; no cards or elevation inside the component itself.

## Where It Lives

- **Code:** `apps/web/src/app/shared/pane-footer/`
- **Consumers:** Workspace panes needing consistent footer alignment.

## Actions

| #   | User Action | System Response | Notes |
| --- | ----------- | --------------- | ----- |
| 1   | Parent renders slotted nodes | Left/right regions show projected content | Pure projection |
| 2   | Only one slot populated | Spacer still consumes remaining width | Flex behavior |

## Component Hierarchy

```text
app-pane-footer
├── [slot=left]
├── .pane-footer__spacer
└── [slot=right]
```

## Data

| Source | Contract | Operation |
| ------ | -------- | --------- |
| Parent | `ng-content` selectors `slot=left\|right` | Render |

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/pane-footer/pane-footer.component.ts` | Host + inline template |
| `apps/web/src/app/shared/pane-footer/pane-footer.component.scss` | Footer flex + spacer |

## Wiring

- Import `PaneFooterComponent` in pane layouts.
- Interactive elements live in slotted content, not inside structural-only wrappers.

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ---------------------- | ----------- |
| Footer row | `:host` / `.pane-footer` | `:host` | slotted controls | `.pane-footer`, `.pane-footer__spacer` | content (default) | spacer grows; slots stay pinned |

### Ownership Triad Declaration

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| -------- | -------------- | ----------- | ------------ | ------------- |
| Footer layout | `.pane-footer` | N/A | `.pane-footer` | ✅ |

## Acceptance Criteria

- [ ] Left and right slots project correctly with a single flex spacer between them.
- [ ] No programmatic visual state inside this component; no `data-state` required.
- [ ] `ng build` succeeds for consumers.
