# Widget directory

## What It Is

The canvas page the left-rail `+` opens. It lists widgets as rectangles the organization can add.

## What It Looks Like

The page renders inside `app-shell-main-canvas` and adds no second gutter. Each widget is one rectangle. The rectangle shows the widget name, a short explanation, More, and Add. Gap between rectangles is `var(--spacing-3)`. A rectangle the organization does not allow is greyed out. The rectangle is not a button.

## Where It Lives

- **Trigger:** left-rail `+` (`shell.control.more`). It stays inert until this page is implemented.
- **Parent:** `app-shell-main-canvas`. Journey: [widgets-page.md](widgets-page.md).
- **Route:** not assigned.

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Activates More | Canvas shows that widget's explanation page | [widget-explanation.md](widget-explanation.md) |
| 2 | Activates Add on an allowed rectangle | Widget becomes available to the organization | [widget-grants.md](../system/widget-grants.md) |
| 3 | Activates Add on a greyed rectangle | Nothing is installed | organization does not allow it |

## Component Hierarchy

```text
app-shell-main-canvas
└── widget directory
    └── widget rectangle
        ├── name
        ├── short explanation
        ├── More
        └── Add
```

## Data

The directory reads the catalog in [widget-suite.md](widget-suite.md) plus Mitarbeiter and Organisation. It does not name a table. Allowance is [widget-grants.md](../system/widget-grants.md).

## State

| Name | Type | Default | Effect |
| --- | --- | --- | --- |
| `allowed` | per widget | from the organization grant | Greyed when false |

## File Map

| File | Purpose |
| --- | --- |
| `docs/specs/page/widget-directory.md` | This page |

## Wiring

`+` does not navigate in the current shell. No route is added by this spec.

## Acceptance Criteria

- [ ] `+` does not navigate while no directory route exists.
- [ ] A rectangle shows the name, a short explanation, More, and Add.
- [ ] Add on a greyed rectangle installs nothing.
- [ ] No migration is added from this spec alone.

## Visual Behavior Contract

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Rectangle | widget rectangle | widget rectangle | More, Add | rectangle | content `0` | name, short explanation, two controls |
| Greyed | widget rectangle | same | Add does not install | rectangle | content `0` | muted; Add is a no-op |

## Interaction emphasis

- Canonical: docs/design/state-visuals.md § Interaction emphasis
- [ ] More and Add implement the contract when the page is built
