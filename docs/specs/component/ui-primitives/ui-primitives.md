# UI Primitives (shared module)

## What It Is

The `apps/web/src/app/shared/ui-primitives/` module: **directive-based host classes** for buttons, fields, lists, and layout; **small standalone components** (`CardGrid`, `CardVariantSwitch`, `GroupHeader`); **utilities** (`parseTimeInput`); and **directives** such as click-outside. It is the shared styling and micro-interaction layer consumed by dialogs, account, and workspace surfaces.

## What It Looks Like

Directive hosts apply global `ui-*` / `toolbar-*` classes defined in `styles.scss` and component-local SCSS where noted. `CardGrid` provides responsive CSS grid columns with tokenized gaps. `CardVariantSwitch` wraps `app-segmented-switch` with thumbnail-size icons. `GroupHeader` renders an expandable group row with chevron rotation driven by the `collapsed` input.

## Where It Lives

- **Code:** `apps/web/src/app/shared/ui-primitives/`
- **Specs:** This folder (`docs/specs/component/ui-primitives/`).

## Actions

| #   | User Action | System Response | Surface |
| --- | ----------- | --------------- | ------- |
| 1   | Use `uiButton` + variants on `button` | Host classes apply Feldpost button chrome | directives |
| 2   | Toggle group header | `toggle` output fires; parent flips `collapsed` | `GroupHeader` |
| 3   | Pick card variant | `valueChange` emits `CardVariant` | `CardVariantSwitch` |
| 4   | Compose grid of cards | Grid columns respond to `minColumnWidth` / `gap` | `CardGrid` |

## Component Hierarchy

```text
ui-primitives (module)
├── directives (ui-primitives.directive.ts + click-outside.directive.ts)
├── parseTimeInput (pure function)
├── app-card-grid
├── app-card-variant-switch → app-segmented-switch
└── app-group-header
```

## Data

| Artifact | Contract |
| -------- | -------- |
| `UI_PRIMITIVE_DIRECTIVES` barrel | Standalone directives array for dialog components |
| `parseTimeInput(raw: string): string` | Normalizes flexible 24h input to `HH:MM` or `''` |

## File Map

| File | Purpose |
| ---- | ------- |
| `docs/specs/component/ui-primitives/ui-primitives.md` | Parent index (this file) |
| `apps/web/src/app/shared/ui-primitives/ui-primitives.directive.ts` | Host-class directives |
| `apps/web/src/app/shared/ui-primitives/click-outside.directive.ts` | Click-outside helper |
| `apps/web/src/app/shared/ui-primitives/card-grid.component.*` | Responsive card grid |
| `apps/web/src/app/shared/ui-primitives/card-variant-switch.component.*` | Variant switch |
| `apps/web/src/app/shared/ui-primitives/group-header.component.*` | Group row |
| `apps/web/src/app/shared/ui-primitives/parse-time-input.ts` | Time parse util |

## Wiring

- Feature and shared components import only the symbols they need from `ui-primitives` paths or the `UI_PRIMITIVE_DIRECTIVES` spread.
- **Invariant:** `ui-primitives` MUST NOT import from `features/*`.

## Child Specs

Normative detail lives in child specs (no duplicated matrices):

- [Card grid](ui-primitives.card-grid.md)
- [Card variant switch](ui-primitives.card-variant-switch.md)
- [Group header](ui-primitives.group-header.md)
- [Directives, click-outside, parse-time-input](ui-primitives.directives-and-utils.md)

## Visual Behavior Contract

This parent spec does not duplicate child ownership matrices. **Stacking and hit targets** for each interactive surface are defined in the child specs above. Module-level rule: directive hosts MUST NOT introduce nested interactive elements beyond the HTML element they decorate.

## Acceptance Criteria

- [ ] Every production artifact under `ui-primitives/` has a matching child spec link from this index.
- [ ] No `features/` imports exist inside `ui-primitives` code.
- [ ] Dialog consumers continue to spread `UI_PRIMITIVE_DIRECTIVES` without circular DI.
