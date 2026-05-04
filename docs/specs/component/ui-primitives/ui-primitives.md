# UI Primitives (shared module)

## What It Is

Shared atoms (buttons, fields, shells, tabs, toggles, badges/`ui-chip`, **`app-chip`**) plus **CardGrid**, **CardVariantSwitch**, **GroupHeader**, **click-outside**, and **parseTimeInput**. One conceptual Button with presets—not parallel button species.

## What It Looks Like

Token-driven chrome from `styles/primitives/*`; composites (`app-card-grid`, etc.) add layout-specific geometry per child specs.

## Where It Lives

- **Code:** `apps/web/src/app/shared/ui-primitives/`
- **Global primitive CSS:** `apps/web/src/styles/primitives/*.scss` via `apps/web/src/styles.scss`
- **Layout chrome:** [Toolbar pane (`app-pane-toolbar`)](../workspace/pane-toolbar.md) lives under `shared/pane-toolbar/`, not the `ui-primitives/` folder.

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Use primitives in templates | Classes/directives apply Feldpost chrome |
| 2 | Import barrel where needed | `UI_PRIMITIVE_DIRECTIVES` or fine-grained symbols |

## Component Hierarchy

```text
ui-primitives module (folder)
├── styling directives (migration target: typed hosts)
├── click-outside + parseTimeInput
├── app-card-grid
├── app-card-variant-switch → app-segmented-switch
└── app-group-header

shared/components/chip (semantic chip — see ui-primitives.chip.md)
```

## Data

### Primitive picker

| Job | Primitive | Spec |
| --- | --------- | ---- |
| Actions | Button | [button](./ui-primitives.button.md) |
| Status pill | Badge | [badges and chips](./ui-primitives.badges-and-chips.md) |
| Filter pill | UI chip | [badges and chips](./ui-primitives.badges-and-chips.md) |
| Rich / dismissible chip | `app-chip` | [Chip entry](./ui-primitives.chip.md) → [chip.md](../filters/chip.md) |
| Panels/items | Container | [container](./ui-primitives.container.md) |
| Grid cards | Card shell | [layout shells](./ui-primitives.layout-shells.md) |
| Metadata rows | Row shell | [layout shells](./ui-primitives.layout-shells.md) |
| Forms | Field controls | [field controls](./ui-primitives.field-controls.md) |
| Workspace tabs | Tab | [tab](./ui-primitives.tab.md) |
| Settings switches | Toggle | [toggle](./ui-primitives.toggle.md) |
| Menu anchor | Dropdown trigger | [dropdown trigger](./ui-primitives.dropdown-trigger.md) |
| Three-slot toolbar row (layout only) | `app-pane-toolbar` | [Toolbar pane](../workspace/pane-toolbar.md) |

### Child specs

| Document | Topic |
| -------- | ----- |
| [ui-primitives.button.md](./ui-primitives.button.md) | Button |
| [ui-primitives.badges-and-chips.md](./ui-primitives.badges-and-chips.md) | Badges + `ui-chip` |
| [ui-primitives.chip.md](./ui-primitives.chip.md) | `app-chip` (semantic) |
| [ui-primitives.layout-shells.md](./ui-primitives.layout-shells.md) | Card + row shell |
| [ui-primitives.container.md](./ui-primitives.container.md) | Container |
| [ui-primitives.field-controls.md](./ui-primitives.field-controls.md) | Fields |
| [ui-primitives.tab.md](./ui-primitives.tab.md) | Tabs |
| [ui-primitives.toggle.md](./ui-primitives.toggle.md) | Toggles |
| [ui-primitives.dropdown-trigger.md](./ui-primitives.dropdown-trigger.md) | Dropdown trigger |
| [ui-primitives.directives-and-utils.md](./ui-primitives.directives-and-utils.md) | Utilities |
| [ui-primitives.card-grid.md](./ui-primitives.card-grid.md) | Card grid |
| [ui-primitives.card-variant-switch.md](./ui-primitives.card-variant-switch.md) | Card variant switch |
| [ui-primitives.group-header.md](./ui-primitives.group-header.md) | Group header |

## Wiring

- Import paths from `shared/ui-primitives` or spread `UI_PRIMITIVE_DIRECTIVES`.
- **Invariant:** `ui-primitives` MUST NOT import `features/*`.

## Acceptance Criteria

- [ ] Every artifact under `ui-primitives/` appears in **Child specs** or the picker.
- [ ] No `features/` imports inside `ui-primitives`.
- [ ] New atoms extend the picker or defer to an existing row.
