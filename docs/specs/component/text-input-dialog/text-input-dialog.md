# Text Input Dialog

## What It Is

A modal-style prompt with optional message, text field, and Cancel / Confirm. Confirm emits the trimmed value only when non-empty; Cancel always emits without a value payload.

## What It Looks Like

Title, optional helper message, single-line text control, and action row matching shared UI primitive styling. Empty confirm attempts are ignored at the component boundary.

## Where It Lives

- **Code:** `apps/web/src/app/shared/text-input-dialog/`
- **Consumers:** Flows that need a lightweight prompt (rename, notes) without browser `prompt()`.

## Actions

| #   | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1   | Click Confirm with non-empty trimmed value | `confirmed` emits string | button + `emitConfirmed` |
| 2   | Click Confirm with empty/whitespace | No emit | guard in `emitConfirmed` |
| 3   | Click Cancel | `cancelled` emits | cancel handler |

## Component Hierarchy

```text
app-text-input-dialog
├── title + optional message
├── text input (initialValue)
└── cancel / confirm actions
```

## Data

| Input | Type | Purpose |
| ----- | ---- | ------- |
| `title` | `string` | Heading |
| `message` | `string` | Optional helper |
| `placeholder` | `string` | Input placeholder |
| `confirmLabel` / `cancelLabel` | `string` | Action labels |
| `initialValue` | `string` | Seed value |

## Outputs

| Output | Payload | When |
| ------ | ------- | ---- |
| `confirmed` | `string` | Valid non-empty trimmed submit |
| `cancelled` | `void` | User cancels |

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/text-input-dialog/text-input-dialog.component.ts` | Validation + emits |
| `apps/web/src/app/shared/text-input-dialog/text-input-dialog.component.html` | Template |
| `apps/web/src/app/shared/text-input-dialog/text-input-dialog.component.scss` | Layout |

## Wiring

- Parent opens dialog, listens for `confirmed(value)` or `cancelled()`, then closes host.

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ---------------------- | ----------- |
| Input focus | text field | parent overlay | input + buttons | `input`, `button` | overlay (parent) | keyboard tab order is logical |

### Ownership Triad Declaration

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| -------- | -------------- | ----------- | ------------ | ------------- |
| Text field | input element | native `:focus` | input | ✅ |

## Acceptance Criteria

- [ ] Whitespace-only confirm does not emit `confirmed`.
- [ ] Cancel always closes via parent handling of `cancelled`.
- [ ] No nested buttons; actions are sibling buttons only.
