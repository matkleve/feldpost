# Calendar Picker Panel — Range Grid Supplement

Parent: [`calendar-picker-panel.md`](calendar-picker-panel.md) · Shell: [`calendar-dropdown.range-mode.supplement.md`](calendar-dropdown.range-mode.supplement.md)

## Grid extensions

When parent passes `pickMode='range'`, the day grid supports **range selection** in addition to single-day selection.

### CalendarDay fields (range)

Extends `CalendarDay` in `calendar-dropdown.types.ts`:

| Field | Type | Notes |
| --- | --- | --- |
| `isRangeStart` | `boolean` | Inclusive start of draft/committed range |
| `isRangeEnd` | `boolean` | Inclusive end |
| `isInRange` | `boolean` | Strictly between start and end (exclusive of endpoints) |
| `isSelected` | `boolean` | `true` when `isRangeStart \|\| isRangeEnd` in range mode; single selected day in single mode |

### Day click handler (range)

| `anchorTarget` | Click enabled day |
| --- | --- |
| `'from'` | Replace **start** only; normalize order if end exists |
| `'to'` | Replace **end** only; normalize order if start exists |

**No `pick` anchor** when parent exposes From/To fields (timespace). Normalize order: if `from > to`, swap date halves.

### Hover preview (range)

| `anchorTarget` | Fixed preview anchor (opposite bound) |
| --- | --- |
| `'from'` | `draft.to` if set |
| `'to'` | `draft.from` if set |

Preview wash only between fixed anchor and hovered date when both exist and differ.

### Interaction emphasis (range)

| Cell state | Tier | Treatment |
| --- | --- | --- |
| Range start / end | **Secondary** | `@include emphasis.selected()` — same as single selected day |
| In-range (between) | **Secondary** (muted) | `@include emphasis.selected(6%)` wash only; text stays foreground |
| Hover on enabled in-range | **Primary** | gold via `emphasis.hover()` |
| Disabled | — | opacity + `pointer-events: none` |

Canonical: [`state-visuals.md`](../../../design/state-visuals.md) § Interaction emphasis.

## Progressive time row

Replaces always-visible header time input in **range + optionalTime** context:

```
app-calendar-picker-panel
├── [single mode header: date + optional time inputs — unchanged]
├── month nav + grid
├── .calendar-picker-panel__add-time [range + optionalTime only]
├── .calendar-picker-panel__time-spinners [expanded only]
│   ├── from HH:MM
│   └── to HH:MM
└── actions (clear, done)
```

**Single mode:** header time row unchanged (`showTime()` from `timeMode`).

**Range mode + `optionalTime`:** header time inputs hidden; spinners live below grid per parent supplement.

## Panel inputs (range)

| Input | Type | Notes |
| --- | --- | --- |
| `pickMode` | `'single' \| 'range'` | from parent `mode` |
| `anchorTarget` | `'from' \| 'to'` | which field opened / re-anchored popover |
| `rangeDraft` | `CalendarRangeValue \| null` | two-way via `rangeDraftChange` |

| Output | Payload |
| --- | --- |
| `rangeDraftChange` | updated range draft |

## Acceptance criteria

- [x] Range mode: in-range days render wash between start and end
- [x] `anchorTarget='from'`: each calendar click replaces start (even when range was empty)
- [x] `anchorTarget='to'`: each calendar click replaces end
- [x] Wrong start: re-open From → second click replaces start, does not set end
- [x] Popover open + other field icon → re-anchor without close
- [ ] `optionalTime` + range: Add time link after start exists; spinners below grid
- [ ] Done disabled until both `from.date` and `to.date` set (unless nullable clear path)
