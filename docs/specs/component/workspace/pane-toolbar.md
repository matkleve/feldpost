# Pane Toolbar

## What It Is

A three-zone horizontal chrome row (`left`, `center`, `right`) that projects slot content for workspace toolbars. It owns only flex distribution and spacing tokens; it does not interpret domain actions.

## What It Looks Like

A single horizontal bar with optional content in left and right clusters and optional centered content. Vertical alignment is middle; gaps use shared spacing tokens. No elevated surfaces or borders beyond what parent chrome applies.

## Where It Lives

- **Code:** `apps/web/src/app/shared/pane-toolbar/`
- **Consumers:** Workspace panes and map-adjacent shells that need consistent toolbar alignment.

## Actions

| #   | User Action | System Response | Notes |
| --- | ----------- | --------------- | ----- |
| 1   | Parent renders slotted nodes | Slots appear in left/center/right regions | Pure projection |
| 2   | Resize viewport | Flex layout reflows without changing slot API | Responsive by parent width |

## Component Hierarchy

```text
app-pane-toolbar
├── .pane-toolbar__left   [slot=left]
├── .pane-toolbar__center [slot=center]
└── .pane-toolbar__right  [slot=right]
```

## Data

| Source | Contract | Operation |
| ------ | -------- | --------- |
| Parent templates | `ng-content` selectors `slot=left\|center\|right` | Render |

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/pane-toolbar/pane-toolbar.component.ts` | Host + inline template |
| `apps/web/src/app/shared/pane-toolbar/pane-toolbar.component.scss` | Flex geometry for three zones |

## Wiring

- Import `PaneToolbarComponent` where a three-column toolbar row is needed.
- Place interactive controls in the appropriate slot; this component does not wire events.

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ---------------------- | ----------- |
| Three-column bar | `:host` / `.pane-toolbar` | `:host` | slotted children | `.pane-toolbar`, `.pane-toolbar__*` | content (default) | slots align left/center/right without overlap |

### Ownership Triad Declaration

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| -------- | -------------- | ----------- | ------------ | ------------- |
| Toolbar row | `.pane-toolbar` | N/A (no programmatic visual state) | `.pane-toolbar` | ✅ |

### Pseudo-CSS Contract

```css
:host {
  display: block;
}
```

## Acceptance Criteria

- [ ] Three projection slots (`left`, `center`, `right`) render without extra wrapper styling on `ng-content` hosts.
- [ ] Component introduces no domain imports; layout-only.
- [ ] `ng build` succeeds for consumers importing this component.
