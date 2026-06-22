# Calendar Picker Panel

## What It Is

Popover **content** for [`calendar-dropdown.md`](calendar-dropdown.md): month grid, optional time (single header row or range progressive row), Clear/Done. No trigger, no portal — parent `app-calendar-dropdown` owns anchor and open state.

**Range grid:** [`calendar-picker-panel.range-grid.supplement.md`](calendar-picker-panel.range-grid.supplement.md).

## Where It Lives

Rendered inside `app-calendar-dropdown` via `app-dropdown-shell` portal — never standalone.

## What It Looks Like

`16rem` wide frosted card (`--popover`, `--shadow-lg`, `--radius-md`): split header (date text + optional time), month nav, 7×6 day grid, footer with Clear (when `nullable`) and Done. Disabled days: reduced opacity, `pointer-events: none`. Selected day: secondary ink at rest; hover → primary gold.

## Component hierarchy

```
app-calendar-picker-panel
├── .calendar-picker-panel__header
│   ├── date input
│   └── [optional] time input
├── .calendar-picker-panel__month-nav
├── .calendar-picker-panel__grid (weekday labels + days)
└── .calendar-picker-panel__actions
    ├── clear [nullable]
    └── done
```

## Inputs / outputs

| Input | Type | Notes |
| --- | --- | --- |
| `pickMode` | `'single' \| 'range'` | `'single'` | Enables range day classes + click semantics |
| `anchorTarget` | `'pick' \| 'from' \| 'to'` | `'pick'` | Range only — from parent open FSM |
| `timeMode` | `TimeMode` | from parent |
| `minDate` / `maxDate` | `Date \| null` | disables out-of-range days |
| `disabledDates` | `ReadonlySet<string> \| null` | optional |
| `nullable` | `boolean` | shows Clear |
| `draft` | `CalendarDropdownValue` | single mode two-way |
| `rangeDraft` | `CalendarRangeValue` | range mode two-way |

| Output | Payload |
| --- | --- |
| `draftChange` | updated single draft |
| `rangeDraftChange` | updated range draft |
| `done` | user committed from panel |
| `clear` | user cleared |
| `cancel` | Escape from panel focus trap |

## Actions

| # | User action | System response |
| --- | --- | --- |
| 1 | Click enabled day | Single: set `draft.date`. Range: per `anchorTarget` / two-click FSM (supplement) |
| 2 | Prev/next month | Change view month; selection unchanged |
| 3 | **Today** shortcut | Select today if within bounds |
| 4 | Type date/time in header | Parse locally; invalid blocks Done when required |
| 5 | **Done** / Enter | `done` emit (parent validates + closes) |
| 6 | **Clear** | `clear` emit |
| 7 | **Escape** | `cancel` emit |

## Interaction emphasis

- Canonical: [`state-visuals.md`](../../../design/state-visuals.md) § three-tier budget
- Day cell selected at rest: **secondary** `--interaction-selected-ink`
- Day cell hover / focus: **primary** gold (`emphasis.hover()`)
- Today ring (unselected): `--border` + subtle tint — not primary fill

## CalendarDay interface

`CalendarDay` is defined in `calendar-dropdown.types.ts` and used by the panel grid:

| Field | Type | Notes |
| --- | --- | --- |
| `date` | `string` | ISO `YYYY-MM-DD` |
| `day` | `number` | 1–31 |
| `isCurrentMonth` | `boolean` | |
| `isToday` | `boolean` | |
| `isSelected` | `boolean` | Single mode: selected day. Range: true on start or end |
| `isRangeStart` / `isRangeEnd` / `isInRange` | `boolean` | Range mode only — see range grid supplement |
| `isDisabled` | `boolean` | `true` when `date < minDate \|\| date > maxDate \|\| disabledDates.has(date)` |

Disabled days render with reduced opacity and `pointer-events: none`.

## State

| State | Type | Controls |
| --- | --- | --- |
| `viewYear` / `viewMonth` | `number` | visible grid month |
| `selectedDate` | ISO string | draft date half |
| `timeInput` | string | draft time half |

## File map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/shared/calendar-dropdown/calendar-picker-panel.component.ts` | Grid + nav + validation |
| `apps/web/src/app/shared/calendar-dropdown/calendar-picker-panel.component.html` | |
| `apps/web/src/app/shared/calendar-dropdown/calendar-picker-panel.component.scss` | |

Extracted from legacy `captured-date-editor.component.*` — behavior preserved, selector renamed.

**Migration invariant (normative):** Do **not** port `parseDateInput()` or `formatEU()` from `captured-date-editor` into the new panel — those are hardcoded EU format helpers that bypass locale. Use `parseDateFieldValue` / `formatDateFieldValue` from `date-field.helpers` (via `I18nService`) instead. Remove `parseDateInput` and `formatEU` entirely during cutover.

## Acceptance criteria

- [x] Out-of-range days disabled per `minDate`/`maxDate`
- [x] `requiredTime` blocks Done until valid time
- [x] `dateOnly` hides time input and ignores time on emit
- [x] Selected + hover emphasis match three-tier table above
- [x] Keyboard: Enter → Done, Escape → cancel
