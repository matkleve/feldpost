# Usage Patterns and Use Cases

Back to master: [master-spec.md](./master-spec.md)

## Purpose

Map Feldpost priority user flows to allowed component families and approved variants.

Rule: use-cases are binding implementation constraints, not optional examples.

## Priority Use Cases

### 1) Projects Page

Allowed components:

- Segmented switch (`size=default`, `density=balanced`)
- Dropdown shell with search/reset
- List row/card primitives
- Toolbar actions with ghost baseline

Not allowed:

- Feature-local segmented styles that alter row geometry
- New local button border systems

### 2) Workspace Pane (Map Right Pane)

Allowed components:

- Workspace pane shell with drag divider
- Group tab bar
- Workspace toolbar dropdown family
- Thumbnail grid/list display primitives

Responsive policy:

- Desktop: resizable pane constrained by shared width scale
- Mobile: sheet behavior, no inline desktop width logic

### 3) Settings Overlay

Allowed components:

- Shared overlay shell
- Section list built on `ui-item`
- Shared segmented switch and toggle rows
- Shared input/select primitives

Not allowed:

- New hardcoded width clamps without design-system registration
- Feature-specific focus ring implementations

### 4) Upload Panel

Allowed components:

- Shared panel shell
- Queue row primitive
- Progress indicator primitive
- Confirm/cancel button family

### 5) Search and Filter Dropdowns

Allowed components:

- Dropdown shell
- Option menu rows (`ui-item` shape)
- Search input + reset icon button

A11y minimum:

- Trigger semantics, `aria-expanded`, keyboard open/close, focus return

### 6) Photo Panel and Image Detail Surface

Allowed components:

- Detail header action primitives
- Metadata key/value rows
- Inline action buttons with shared icon primitive
- Context menus via shared shell

### 7) Toolbar Actions (Map and Workspace)

Allowed components:

- Ghost icon/button primitives
- Thin-border active treatment
- Shared hover/focus tokens

Not allowed:

- Filled controls for non-primary actions
- Accent use as decoration

## Use-Case to Family Mapping

| Use Case         | Required Families                                   | Status Goal |
| ---------------- | --------------------------------------------------- | ----------- |
| Projects         | Inputs/Selection, Data Display, Navigation          | stable      |
| Workspace Pane   | Layout Surfaces, Navigation, Data Display           | stable      |
| Settings Overlay | Overlays/Dialogs, Inputs/Selection, Layout Surfaces | stable      |
| Upload Panel     | Feedback, Inputs, Overlays                          | stable      |
| Search/Filter    | Menus/Overlays, Inputs, A11y contract               | stable      |
| Photo Panel      | Data Display, Actions, Menus                        | stable      |
| Toolbar Actions  | Actions/Input primitives                            | stable      |

## Anti-Patterns

- One-off width clamps per feature
- Local breakpoint values not aligned to design layout rules
- Duplicate menu shell behavior
- Interactive borders on passive containers
- Missing loading/error state definition

## Validation For New Implementations

- The feature references this page and declares its use-case bucket.
- Every selected component is present in component inventory.
- Every selected variant exists in the variants matrix.
- Any exception includes owner, reason, and migration target date.
