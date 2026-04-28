# Project Select Dialog

## What It Is

A modal-style chooser listing projects as selectable rows with optional pre-selection. User confirms one `selectedId` or cancels. Selection changes emit as the user picks rows so parents can sync external state.

## What It Looks Like

Title, optional message, scrollable option list with radio-like selection affordance, and Cancel / Confirm actions. Confirm stays disabled or no-ops until a selection exists, matching `confirmSelection()` guard in code.

## Where It Lives

- **Code:** `apps/web/src/app/shared/project-select-dialog/`
- **Consumers:** Upload and workspace flows that must bind media to a project.

## Actions

| #   | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1   | Click a project row | `selectedIdChange` emits chosen id | `selectOption` |
| 2   | Click Confirm with selection | `confirmed` emits selected id | `confirmSelection` |
| 3   | Click Cancel | `cancelled` emits | cancel handler |

## Component Hierarchy

```text
app-project-select-dialog
├── header
├── option list (buttons or rows)
└── actions
```

## Data

| Input | Type | Purpose |
| ----- | ---- | ------- |
| `title` | `string` | Heading |
| `message` | `string` | Optional helper |
| `options` | `ProjectSelectOption[]` | `id`, `name` rows |
| `selectedId` | `string \| null` | Current highlight |
| `confirmLabel` / `cancelLabel` | `string` | Actions |

## Outputs

| Output | Payload | When |
| ------ | ------- | ---- |
| `selectedIdChange` | `string` | Row picked |
| `confirmed` | `string` | Confirm with valid `selectedId` |
| `cancelled` | `void` | Cancel |

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/project-select-dialog/project-select-dialog.component.ts` | Selection + confirm guard |
| `apps/web/src/app/shared/project-select-dialog/project-select-dialog.component.html` | Template |
| `apps/web/src/app/shared/project-select-dialog/project-select-dialog.component.scss` | Layout |

## Wiring

- Parent keeps authoritative `selectedId`; may pass `selectedId` back down after `selectedIdChange`.

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ---------------------- | ----------- |
| Option list | scroll container | parent overlay | row buttons | list row selectors | overlay/content | one row active at a time |
| Confirm guard | action row | parent | confirm button | confirm button | content | no `confirmed` without `selectedId` |

### Ownership Triad Declaration

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| -------- | -------------- | ----------- | ------------ | ------------- |
| Selected row | row host | `selectedId` input | active row class | ✅ |

## Acceptance Criteria

- [ ] `confirmed` never fires when `selectedId()` is null/empty.
- [ ] `selectedIdChange` fires on each distinct row activation per implementation.
- [ ] Options list remains scrollable without breaking pointer hit targets.
