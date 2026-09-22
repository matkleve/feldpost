# Widget explanation

## What It Is

The canvas page for one widget. It is the longer explanation opened by More on a directory rectangle.

## What It Looks Like

The page renders inside `app-shell-main-canvas`. It shows the same widget name as the directory rectangle, then the longer explanation, then Back. It does not repeat Add. Spacing stays `var(--spacing-3)`.

## Where It Lives

- **Trigger:** More on a [widget directory](widget-directory.md) rectangle.
- **Parent:** `app-shell-main-canvas`. Journey: [widgets-page.md](widgets-page.md).
- **Route:** `/widgets/:widgetId`.

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Activates Back | Canvas shows the directory | [widget-directory.md](widget-directory.md) |

## Component Hierarchy

```text
app-shell-main-canvas
└── widget explanation
    ├── name
    ├── longer explanation
    └── Back
```

## Data

The longer explanation is copy for that widget. Who stores the sentences, a spec or a table, is open in [STUDY-016](../../study/016-widgets-page-flow.md). This page does not choose.

## State

| Name | Type | Default | Effect |
| --- | --- | --- | --- |
| `widget` | one widget id | the More target | Which explanation is shown |

## File Map

| File | Purpose |
| --- | --- |
| `features/widgets/widget-explanation.page.ts` | This page |
| `core/widgets/widgets.service.ts` | Catalog |

## Wiring

Back returns to `/widgets`. More on a rectangle is the navigation onto `/widgets/:widgetId`.

## Acceptance Criteria

- [ ] More on a directory rectangle is the only way onto this page.
- [ ] The page shows the name, the longer explanation, and Back.
- [ ] This page does not install a widget.
