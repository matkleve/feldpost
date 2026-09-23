# Shell layout

## What It Is

The open/closed list for the panel column. Ids are `upload`, `download`, `shared-media`, `tips`, and `help`. It does not route the canvas. Undo, activity history, and redo are not panel ids.

**Stack membership (this spec owns it).** `open(id)` never closes another id. Top-stack ids (`upload`, `download`, `shared-media`) and bottom-stack ids (`tips`, `help`) are groups for placement only — [shell-panel-column.md](../../ui/shell/shell-panel-column.md). A group is a list, not one slot. Upload stays open when Download opens, and Tips stays open when Help opens. The rail toggles only the id that was activated.

## What It Looks Like

No UI. The panel column and the right rail read the same signal.

## Where It Lives

- **Code:** `apps/web/src/app/core/shell-layout/`.
- **Consumers:** `app-shell-control-area`, `app-shell-panel-column`, `app-grid-shell`.

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | `open(id)` while closed | Panel becomes open with the next `order` | stack signal |
| 2 | `open(id)` while open | No change | idempotent |
| 3 | `close(id)` while open | Panel leaves the stack | stack signal |
| 4 | `close(id)` while closed | No change | idempotent |
| 5 | `setOpen(id, value)` at the current value | No change | idempotent |
| 6 | `open(id)` while a different id is open | Both stay open. The new id gets the next `order` | no sibling close |

## Component Hierarchy

```text
ShellLayoutService
├── shell-layout.types.ts
└── shell-layout.helpers.ts
```

No adapters. This module does not call Supabase or the router.

## Data

| Source | Contract | Operation |
| --- | --- | --- |
| In-memory signal | `{ id, open, order }[]` | Read and write |

Ids are `upload`, `download`, `shared-media`, `tips`, and `help`. An unknown id is ignored.

## State

| Name | Type | Default | Effect |
| --- | --- | --- | --- |
| `closed` | per id | yes | Panel unmounted |
| `open` | per id | no | Surface mounted |

Both states are reversible. There is no terminal state. Allowed transitions are `closed → open` and `open → closed`. Any other requested transition leaves the current state. `open` and `close` on an id already in that state are no-ops and do not change `order`.

## File Map

| File | Purpose |
| --- | --- |
| `core/shell-layout/shell-layout.service.ts` | Facade |
| `core/shell-layout/shell-layout.service.spec.ts` | Transition tests |
| `core/shell-layout/shell-layout.types.ts` | Panel id and stack row |
| `core/shell-layout/shell-layout.helpers.ts` | Pure transitions |
| `core/shell-layout/README.md` | Module index |

## Wiring

```mermaid
sequenceDiagram
  participant Rail as right rail
  participant S as ShellLayoutService
  participant Col as panel column
  Rail->>S: setOpen(upload, true)
  S-->>Col: open panels in order
```

```mermaid
stateDiagram-v2
  [*] --> closed
  closed --> open: open
  open --> closed: close
  open --> open: open again
  closed --> closed: close again
```

## Acceptance Criteria

- [ ] Upload and Help can be open at the same time.
- [ ] Upload and Download can be open at the same time. Opening one does not close the other.
- [ ] Tips and Help can be open at the same time. Opening one does not close the other.
- [ ] A second `open('upload')` does not change `order`.
- [ ] `close` on a closed id does not throw and does not emit a new list identity change beyond the no-op.
- [ ] The service exposes no canvas route method.
- [ ] An unknown id is ignored.
