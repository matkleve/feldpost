# Filter Service

## What It Is

Owns the **active filter rule list** (`FilterRule[]`) for workspace/map filtering. Exposes **`matchesClientSide`** to evaluate a **workspace media** row against rules using **`MetadataService`** for field values. Conjunction semantics across rules are implemented in the shared evaluator.

## What It Looks Like

Filter panel and active filter chips read/write rules through this service. Workspace pipeline applies rules before sort/group stages when integrated with `WorkspaceViewService`.

## Where It Lives

- **Route:** cross-cutting (map + workspace)
- **Runtime module:** `apps/web/src/app/core/filter/`

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | User adds rule | Appends default rule row | `addRule()` |
| 2 | User edits rule | Patches rule by id | `updateRule(id, patch)` |
| 3 | User removes rule | Removes by id | `removeRule(id)` |
| 4 | User clears filters | Empty list | `clearAll()` |
| 5 | Pipeline tests membership | Boolean pass/fail | `matchesClientSide(image, rules)` |

## Component Hierarchy

```text
FilterService
|- filter.types.ts
|- filter.helpers.ts
`- adapters/
filter-rule-evaluator (shared pure evaluator)
MetadataService (field values)
```

## Data

| Source | Layer |
| --- | --- |
| `rules` signal | In-memory rule list |
| Metadata keys/values | Via `MetadataService.getFilterValue` |

## State

| Name | Type | Notes |
| --- | --- | --- |
| rules | `WritableSignal<FilterRule[]>` | Source of truth |
| activeCount | `Computed` | `rules().length` |

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/filter/filter.service.ts` | Facade |
| `docs/specs/service/filter/filter-service.md` | This contract |

## Wiring

### Injected services

- `MetadataService`

## Acceptance Criteria

- [ ] Rule mutations are immutable updates to the signal list.
- [ ] Client-side evaluation delegates value lookup to `MetadataService`.
- [ ] Workspace/filter UI specs link here for rule ownership.
