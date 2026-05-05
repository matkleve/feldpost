# UI Primitives — Utilities

## What It Is

**Click-outside** directive and **`parseTimeInput`** helper; styling directives remain in `ui-primitives.directive.ts`—see child specs under [ui-primitives.md](./ui-primitives.md).

## What It Looks Like

No shared visual chrome; click-outside is behavioral only.

## Where It Lives

- **Code:** `apps/web/src/app/shared/ui-primitives/click-outside.directive.ts`, `parse-time-input.ts`

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Pointer down outside host | Configured callback |
| 2 | Parse time string | Normalized `HH:MM` or `''` |

## Component Hierarchy

```text
(no visual tree — utilities only)
```

## Visual Behavior Contract

| Behavior | Geometry Owner | Interaction |
| -------- | ---------------- | ----------- |
| Click-outside | overlay host | compares event target to host bounds |

## Data

| Export | Role |
| ------ | ---- |
| `ClickOutsideDirective` | Outside-click wiring |
| `parseTimeInput` | Parser + tests |

## Wiring

Apply click-outside only where the host owns dismiss behavior.

## Acceptance Criteria

- [ ] `parseTimeInput` rejects invalid ranges per unit tests.
- [ ] No nested interactive violations introduced by utility hosts.
