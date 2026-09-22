# Widgets catalog

## What It Is

The code catalog of widget ids, placement, and copy keys. It is not a table.

## What It Looks Like

No UI. The overview, the directory, and the explanation page read it.

## Where It Lives

- **Code:** `apps/web/src/app/core/widgets/`.
- **Grants:** [widget-grants.md](../../system/widget-grants.md). This module does not install or authorize.

## Actions

| # | Caller | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | `entries()` | The static list, same array every time | catalog adapter |
| 2 | `find(id)` | The entry, or null | helper |
| 3 | Asks to add before the install table exists | Nothing is stored | `addInstalls` returns false |

## Component Hierarchy

```text
WidgetsService
├── widgets.helpers.ts
└── adapters/widgets-catalog.adapter.ts
```

## Data

Ids: map, projects, media, workers, organisation, vehicles, boats, material, storage-locations, buildings. Map, projects, and media are `fixed` on the top rail. Workers and organisation are `installable` on the bottom rail. The suite is `installable` and `unplaced`.

## State

| Name | Type | Default | Effect |
| --- | --- | --- | --- |
| catalog | readonly array | the ten ids | Reading twice returns the same array |

There is no terminal state.

## File Map

| File | Purpose |
| --- | --- |
| `core/widgets/widgets.service.ts` | Facade |
| `core/widgets/widgets.types.ts` | Entry shape |
| `core/widgets/widgets.helpers.ts` | Lookup and add gate |
| `core/widgets/adapters/widgets-catalog.adapter.ts` | Static list |
| `core/widgets/README.md` | Module index |

## Wiring

The facade does not own the array. The adapter does.

## Acceptance Criteria

- [ ] The ids are the ten names above, in that order.
- [ ] An unknown id is null.
- [ ] `addInstalls` is false before the install table exists.
- [ ] No migration is added from this spec alone.
