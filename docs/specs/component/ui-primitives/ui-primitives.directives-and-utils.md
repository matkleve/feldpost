# UI Primitives — Directives, Click Outside, Parse Time

## What It Is

Host-attribute directives that map Feldpost **global UI classes** onto native elements (`ui-primitives.directive.ts`), a **click-outside** listener directive for closing floating surfaces, and the **`parseTimeInput`** pure function for flexible 24-hour time parsing used by metadata editors.

## What It Looks Like

Buttons gain `ui-button` plus size/variant attribute directives (`uiButtonPrimary`, `uiButtonGhost`, etc.). Containers use `uiContainer`, `uiSectionCard`, list rows use `uiItem*`, badges use `uiStatusPill*`, form rows use `uiFieldRow*`. Click-outside attaches document-level handling to close panels when clicks fall outside the host element.

## Where It Lives

- **Code:** `apps/web/src/app/shared/ui-primitives/ui-primitives.directive.ts`, `click-outside.directive.ts`, `parse-time-input.ts`
- **Parent index:** [ui-primitives.md](./ui-primitives.md)

## Actions

| #   | User Action | System Response |
| --- | ----------- | --------------- |
| 1   | Render decorated button | Host classes from directive metadata apply |
| 2   | Click outside host (click-outside) | Configured callback fires |
| 3   | Call `parseTimeInput` | Returns normalized `HH:MM` or empty string |

## Component Hierarchy

```text
(directives — no template tree; applied on native hosts)
```

## Data

| Export | Role |
| ------ | ---- |
| `UI_PRIMITIVE_DIRECTIVES` | Array spread for standalone `imports` |
| Individual `*Directive` classes | Fine-grained imports |
| `parseTimeInput` | Stateless parser |

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/ui-primitives/ui-primitives.directive.ts` | Host class directives |
| `apps/web/src/app/shared/ui-primitives/click-outside.directive.ts` | Outside click detection |
| `apps/web/src/app/shared/ui-primitives/parse-time-input.ts` | Parser + unit tests |

## Wiring

- Dialog components spread `UI_PRIMITIVE_DIRECTIVES` to avoid enumerating dozens of imports.
- Click-outside: apply only on overlay hosts that own close behavior.

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ----- | ----------- |
| Button chrome | decorated `button` | parent layout | same `button` | `.ui-button*` | content | directives only add classes |
| Click-outside | overlay host | overlay host | document vs host geometry | directive host | overlay | closes only when outside enabled |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same? |
| -------- | -------------- | ----------- | ------------ | ----- |
| Button styling | `button` | native pseudo-states | host classes from directives | ✅ |

## Acceptance Criteria

- [ ] No directive nests a `button` inside another `button`.
- [ ] `parseTimeInput` rejects invalid ranges and returns `''` per implementation tests.
- [ ] `UI_PRIMITIVE_DIRECTIVES` export stays in sync with directive additions (build-time import check).
