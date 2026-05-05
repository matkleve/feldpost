# UI Primitives — Layout shells

## What It Is

**Card shell** (grid cards with header/body/actions) and **row shell** (dense metadata/property rows)—two shells with different geometry, not two unrelated systems.

## What It Looks Like

Card shell: bordered panel, hover/focus-within, size variants. Row shell: single horizontal band with leading / label / trailing regions and size variants.

## Where It Lives

- **Styles:** `apps/web/src/styles/primitives/card-shell.scss`, `row-shell.scss`
- **Integration:** `ui-primitives.directive.ts` (`uiCardShell*`, `uiRowShell*`)

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Hover/focus card shell | Border/background transition per tokens |
| 2 | Tab within row shell | Focus-within ring where applicable |

## Component Hierarchy

```text
host (card-shell | row-shell)
├── ui-*__header | __leading (slots)
├── ui-*__body | __label
└── ui-*__actions | __trailing
```

## Visual Behavior Contract

| Shell | Geometry Owner |
| ----- | ---------------- |
| Card shell | host (`min-height`, padding, gap per size) |
| Row shell | host (row height per size) |

## Normative use

- Card shell: project/media **cards**, not arbitrary flex wrappers.
- Row shell: metadata/property **rows**, not `ui-field-row` forms.

## File Map

| File | Purpose |
| ---- | ------- |
| `card-shell.scss` | Card chrome |
| `row-shell.scss` | Row chrome |

## Acceptance Criteria

- [ ] Card shell not used where row shell or container-only layout suffices.
- [ ] Row shell not used for full-width label/control grids (`ui-field-row`).
