# Menu panel footer action

## What It Is

Full-width ghost footer add-action row for menu panels.

## What It Looks Like

`hlmMenuItem` row with leading Material icon and muted label text; full panel width.

## Where It Lives

- `apps/web/src/app/shared/menu-panel/menu-panel-footer-action.component.ts`

## Actions

| Trigger | Response |
| --- | --- |
| Click row | `actionRequested` emits |

## Component Hierarchy

```text
app-menu-panel-footer-action
└── button[hlmMenuItem]
```

## Wiring

Composed by `app-standard-dropdown` when `actionLabel` is set.

## Acceptance Criteria

- [x] Icon + label use `option-menu-item__icon` geometry
- [x] Emits `actionRequested` on click
