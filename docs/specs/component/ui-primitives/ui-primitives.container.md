# UI Primitives — Container and item row

## What It Is

Panel padding/gap (`ui-container` + sizes), list row grid (`ui-item` / media / label / spacer), and section framing (`ui-section-card`). Route-level shells remain in [containers.md](../containers/containers.md).

## What It Looks Like

Containers column-stack with token gaps; items use two-column grid with media + label; section cards add bordered panels.

## Where It Lives

- **Styles:** `apps/web/src/styles/primitives/container.scss`; `ui-section-card` in `patterns/toolbar.scss` / `patterns/form.scss`
- **Integration:** `ui-primitives.directive.ts` (`uiContainer*`, `uiItem*`, `uiSectionCard`, `uiSpacer`)

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Nest content in container | Padding/gap from size vars |
| 2 | Hover/focus item row | Row hover/focus-visible per tokens |

## Component Hierarchy

```text
[uiContainer]
├── [uiSectionCard] (optional)
└── [uiItem] → uiItemMedia, uiItemLabel, uiSpacer
```

Dense card/metadata rows use [layout shells](./ui-primitives.layout-shells.md), not `ui-container` alone.

## Visual Behavior Contract

| Behavior | Geometry Owner | Test Oracle |
| -------- | -------------- | ----------- |
| Panel padding/gap | `ui-container` host | size vars |
| Item grid | `ui-item` host | grid columns |

## Acceptance Criteria

- [ ] Section card class documented until pattern CSS is consolidated.
- [ ] New panels prefer explicit container size (`sm`/`md`/`lg`) where design calls for it.
