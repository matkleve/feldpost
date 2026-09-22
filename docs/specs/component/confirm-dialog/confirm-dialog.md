# Confirm Dialog

## What It Is

A modal-style confirmation surface with title, body message, and Cancel / Confirm actions. Styling variants include a danger emphasis path for destructive confirmations. Open/close lifecycle is owned by the parent; the component only emits user choices — and it emits one for **every** dismissal, including the Escape key, so the parent's open-state can never outlive the overlay.

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
| 3   | Press Escape | `cancelled` emits | `BrnDialog` self-close |
| 4   | Parent hides dialog | Component unmounts | parent state |
| 5   | Any action while `busy` | ignored — buttons disabled, Escape disarmed | `busy` input |

**The parent owns dismissal; the dialog only reports.** The buttons carry no `brnDialogClose`, so
a press never closes the dialog — unmounting it is the parent's job, which is why an async confirm
cannot race the overlay tearing itself down. `BrnDialog` still closes itself on Escape
(`disableClose` is `false` unless `busy`), and that close is reported as `cancelled`: a dismissal
the parent never hears about would strand its `@if` signal, leaving a truthy signal with no overlay
and a trigger that can never reopen (issue #254).

**Every press reports, for as long as the dialog is mounted.** There is deliberately no
"one outcome per mounting" latch. A parent may hold the dialog open after a failed confirm to offer
a retry — the projects page does exactly this — and a latch would leave the user facing a live modal
whose buttons silently do nothing.

While `busy` is true, `disableClose` is bound true: the parent owns an in-flight action and the
dialog must not vanish under it.

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
| `busy` | `boolean` | Parent action in flight: both buttons disabled, Escape disarmed |
| `size` | `ConfirmDialogSize` | Panel width — `sm` (default, `max-w-[20rem]`) or `md` (`max-w-[26rem]`) for a sentence of body copy |

## Outputs

| Output | Payload | When |
| ------ | ------- | ---- |
| `confirmed` | `void` | User confirms |
| `cancelled` | `void` | User cancels **or dismisses by any other means** (Escape) |

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/confirm-dialog/confirm-dialog.component.ts` | API surface |
| `apps/web/src/app/shared/confirm-dialog/confirm-dialog.component.html` | Structure |
| `apps/web/src/app/shared/confirm-dialog/confirm-dialog.component.scss` | Dialog layout tokens |
| `apps/web/src/app/shared/confirm-dialog/confirm-dialog.component.spec.ts` | Dismissal + busy contract |

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
- [x] Every dismissal reaches the parent: a self-close (Escape) emits `cancelled`.
- [x] A parent that holds the dialog open after a failed confirm can still retry or cancel.
- [x] `busy` disables both buttons and prevents the dialog closing itself.
- [x] `size` changes panel width only; it is the sole width knob (no per-caller Tailwind override).

Runnable check: `cd apps/web && npx ng test --watch=false`
(`apps/web/src/app/shared/confirm-dialog/confirm-dialog.component.spec.ts`).
