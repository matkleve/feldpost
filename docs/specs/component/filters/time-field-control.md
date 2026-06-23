# Time Field Control

## What It Is

Compact **24h time input** with optional portaled scroll-wheel picker. Used beside date fields in `app-calendar-dropdown` split layout (timespace). Parents own wire value (`HH:MM` or `null`).

**Selector:** `app-time-field-control`

## What It Looks Like

Bordered shell matching date control geometry (`2.25rem` height, `--radius-sm`). Centered `HH:MM` text. On focus: body-portaled panel with two side-by-side scroll columns — hours `0–23`, minutes `0–59`. Selected value uses secondary selected ink.

## Where It Lives

| Call site | Parent |
| --- | --- |
| Timespace From/To time | `app-calendar-dropdown` (`layout='split'`, `timeMode≠'dateOnly'`) |

## API

| Input | Type | Default | Effect |
| --- | --- | --- | --- |
| `value` | `string \| null` | `null` | Committed `HH:MM` or empty |
| `ariaLabel` | `string` | `''` | Accessible name |
| `disabled` | `boolean` | `false` | Blocks input + picker |

| Output | Payload |
| --- | --- |
| `valueChange` | `string \| null` — normalized `HH:MM` or `null` when cleared |

## Actions

| # | User action | System response |
| --- | --- | --- |
| 1 | Focus input | Open scroll picker; scroll wheels snap to parsed value |
| 2 | Type in input | Parse via `parseTimeInput`; emit on `input`; sync wheel position |
| 3 | Blur / Enter | Normalize display; close picker |
| 4 | Scroll over hour/minute column | Increment/decrement that half; emit |
| 5 | Click wheel item | Set hour or minute; emit |
| 6 | Escape / outside | Close picker without extra emit |

## Component hierarchy

```
app-time-field-control
├── .time-field__control
│   └── input.time-field__input
└── app-dropdown-shell (`option-menu-surface time-field-panel`) → .time-field__picker (hour wheel | minute wheel)
```

## Visual Behavior Contract

| Behavior | Geometry Owner | Stacking Owner | Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Time shell | `.time-field__control` | `:host` | control | `.time-field__input` | 0 | `2.25rem` height matches `.calendar-dropdown__control` |
| Scroll picker | `app-dropdown-shell` | shell host | wheel columns | `.time-field__picker` | 300 | Body portal |

## File map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/shared/time-field-control/time-field-control.component.ts` | Parse, wheel scroll, emit |
| `apps/web/src/app/shared/time-field-control/time-field-control.component.html` | |
| `apps/web/src/app/shared/time-field-control/time-field-control.component.scss` | |

## Acceptance criteria

- [x] Shell height `2.25rem` — parity with calendar date control
- [x] `parseTimeInput` accepts flexible typing (`9`, `1430`, `14:30`)
- [x] Wheel scroll changes value when hovered column receives wheel events
- [x] Typing updates wheel scroll position to matching hour/minute
- [x] Empty input emits `null`
