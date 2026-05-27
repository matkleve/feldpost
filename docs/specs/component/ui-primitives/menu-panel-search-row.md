# Menu panel search row

## What It Is

Search field row for menu panels (clear + optional projected actions).

## What It Looks Like

Border-bottom row; grid with fluid input and fixed `2.5rem` icon slots; matches `standard-dropdown__search` geometry.

## Where It Lives

- `apps/web/src/app/shared/menu-panel/menu-panel-search-row.component.ts`

## Actions

| Trigger | Response |
| --- | --- |
| Type in field | `searchTermChange` emits |
| Click clear | `clearRequested` emits |

## Component Hierarchy

```text
app-menu-panel-search-row
├── input.standard-dropdown__search-field
└── .standard-dropdown__search-trailing (clear + projected actions)
```

## Wiring

Composed by `app-standard-dropdown` when `showSearch` is true. Uses `.standard-dropdown__search*` class names for shared clear-button rules on the parent host.

## Acceptance Criteria

- [x] Grid layout: fluid field + trailing icon slots (`2.5rem`)
- [x] Clear button uses `data-fp-dropdown-search-clear` hooks
- [x] `reserveProjectedSearchActionSlot` preserves width when action absent
