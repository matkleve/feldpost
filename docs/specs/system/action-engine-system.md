# Action engine (declarative menus)

## What It Is

`ActionEngineService` resolves declarative `ActionDefinition` lists into ordered, labeled `ResolvedAction` rows for map shell, workspace footer, and media detail menus. It applies visibility/enabled predicates, optional i18n label translation, and stable section ordering (`primary` → `secondary` → `destructive`).

## What It Looks Like

No UI of its own; consumers render icons/labels returned by `resolveActions`. Section order and disabled flags are consistent across surfaces that share the same definitions.

## Where It Lives

- **Code**: `apps/web/src/app/features/action-system/action-engine.service.ts`, `action-types.ts`, `action-context-ids.ts`.
- **Consumers**: `MapShellComponent`, `MediaDetailViewComponent`, `WorkspacePaneFooterComponent` (inject `ActionEngineService`).
- **Cross-surface action semantics**: [action-context-matrix.md](action-context-matrix.md) (which actions exist where); this spec covers only the **resolution engine**, not per-action matrix cells.

## Actions

| #   | User Action (developer)              | System Response                                      | Triggers           |
| --- | ------------------------------------ | ---------------------------------------------------- | ------------------ |
| 1   | Calls `resolveActions(defs, ctx)`   | Filters by `visibleWhen`, maps labels, sorts        | service method     |
| 2   | Passes `translateLabel` in options  | Labels flow through translator callback             | `options`          |
| 3   | Omits `enabledWhen` on a definition | Action is not disabled (enabled)                    | default            |
| 4   | Adds a new consumer component       | Injects service; keeps matrix + context IDs updated | code + specs       |

## Component Hierarchy

```text
ActionEngineService (root-provided)
├── consumed by MapShellComponent
├── consumed by MediaDetailViewComponent
└── consumed by WorkspacePaneFooterComponent
```

Menu shells and hit targets remain owned by each consumer’s component spec.

## Data

| Type / artifact        | Location                         |
| ---------------------- | -------------------------------- |
| `ActionDefinition`     | `action-types.ts`                |
| Context ID constants   | `action-context-ids.ts`         |
| Per-surface definitions | consumer modules (e.g. map-workspace-actions) |

## State

Pure function service; no internal signals. Inputs are definitions + runtime context object.

## File Map

| File                      | Purpose                |
| ------------------------- | ---------------------- |
| `action-engine.service.ts` | Resolution pipeline |
| `action-types.ts`         | Shared typing          |

## Wiring

- `@Injectable({ providedIn: 'root' })` — no feature module.
- Consumers remain in `features/map/**`; moving this service to `core/` requires a separate refactor prompt.

## Acceptance Criteria

- [ ] New menu surfaces that use declarative actions document their context in [action-context-matrix.md](action-context-matrix.md) and inject this engine for resolution.
- [ ] Sorting and section behavior match this spec (section order, then priority, then label).
- [ ] Label keys remain compatible with the project i18n pipeline when `translateLabel` is supplied.
