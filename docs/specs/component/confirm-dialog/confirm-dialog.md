# Confirm Dialog

## What It Is

A modal-style confirmation surface with title, body message, and Cancel / Confirm actions. Styling variants include a danger emphasis path for destructive confirmations. Open/close lifecycle is owned by the parent; the component only emits user choices.

## What It Looks Like

Title row, message block, and a footer with secondary (cancel) and primary (confirm) buttons. Danger mode applies destructive button styling to confirm. Layout uses shared UI primitive directives for consistent spacing and button classes.

## Where It Lives

- **Code:** `apps/web/src/app/shared/confirm-dialog/`
- **Consumers:** Account, media actions, and any flow needing a standardized confirm pattern.

## Actions

| #   | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1   | Click Confirm | `confirmed` emits | button click |
| 2   | Click Cancel | `cancelled` emits | button click |
| 3   | Parent hides dialog | Component unmounts | parent state |

## Component Hierarchy

```text
app-confirm-dialog
├── header (title)
├── message body
└── actions (cancel + confirm buttons)
```

## Data

| Input | Type | Purpose |
| ----- | ---- | ------- |
| `title` | `string` | Dialog heading |
| `message` | `string` | Body copy |
| `confirmLabel` | `string` | Confirm button label (default `Delete`) |
| `cancelLabel` | `string` | Cancel label (default `Cancel`) |
| `danger` | `boolean` | When true, confirm uses danger styling |

## Outputs

| Output | Payload | When |
| ------ | ------- | ---- |
| `confirmed` | `void` | User confirms |
| `cancelled` | `void` | User cancels |

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/confirm-dialog/confirm-dialog.component.ts` | API surface |
| `apps/web/src/app/shared/confirm-dialog/confirm-dialog.component.html` | Structure |
| `apps/web/src/app/shared/confirm-dialog/confirm-dialog.component.scss` | Dialog layout tokens |

## Wiring

- Parent controls `*ngIf` / `@if` or overlay host.
- Wire `confirmed` / `cancelled` to close dialog and run async work in parent services.

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ---------------------- | ----------- |
| Dialog panel | host / root dialog container | parent overlay | confirm/cancel buttons | root layout classes | overlay (parent) | buttons receive focus in tab order |
| Danger confirm | confirm button | same | confirm button | danger modifier classes | content | danger styling when `danger=true` |

### Ownership Triad Declaration

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| -------- | -------------- | ----------- | ------------ | ------------- |
| Primary confirm | confirm `button` | `danger` input binding | confirm `button` | ✅ |

## Acceptance Criteria

- [ ] Confirm and cancel never nest interactive elements inside one another.
- [ ] Labels are supplied via inputs; callers provide i18n-ready strings.
- [ ] `danger` input toggles destructive styling without changing layout geometry.
