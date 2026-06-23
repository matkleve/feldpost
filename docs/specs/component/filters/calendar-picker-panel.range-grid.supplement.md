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
| `'pick'` | Two-click range: 1st → start, 2nd → end, 3rd restarts |

Normalize order: if `from > to`, swap date halves.

### Hover preview (range)

| `anchorTarget` | Fixed preview anchor (opposite bound) |
| --- | --- |
| `'from'` | `draft.to` if set |
| `'to'` | `draft.from` if set |
| `'pick'` | First bound when only start set; else none |

Preview wash only between fixed anchor and hovered date when both exist and differ.

### Dual-month view stability

| Rule | Behavior |
| --- | --- |
| `viewAnchorDate` input | Stable ISO date from parent at popover open — not live draft |
| Day click | MUST NOT re-sync visible month when clicked date is in left **or** right grid |
| `prevMonth` / `nextMonth` | User navigation; clears sync lock so browsing is free |

Helper: `isDateVisibleInDualMonthView(iso, viewYear, viewMonth)`.

### Interaction emphasis (range)

| Cell state | Tier | Treatment |
| --- | --- | --- |
| Range start / end | **Secondary** | `@include emphasis.selected()` — same as single selected day |
| In-range (between) | **Secondary** (muted) | `@include emphasis.selected(6%)` wash only; text stays foreground |
| Hover on enabled in-range | **Primary** | gold via `emphasis.hover()` |
| Disabled | — | opacity + `pointer-events: none` |

Canonical: [`state-visuals.md`](../../../design/state-visuals.md) § Interaction emphasis.

## Time in range mode

**Timespace (`layout='split'`):** time inputs live in parent shell via [`time-field-control.md`](time-field-control.md) — **not** in this panel.

**Deferred:** panel-internal Add-time row + spinners below grid (see old progressive-time sketch). Do not implement for timespace unless product reverses shell-time decision.

## Panel inputs (range)

| Input | Type | Notes |
| --- | --- | --- |
| `pickMode` | `'single' \| 'range'` | from parent `mode` |
| `anchorTarget` | `'from' \| 'to' \| 'pick'` | active field / pick FSM |
| `viewAnchorDate` | `string` | ISO date for initial month sync |
| `rangeDraft` | `CalendarRangeValue \| null` | two-way via `rangeDraftChange` |

| Output | Payload |
| --- | --- |
| `rangeDraftChange` | updated range draft |

## Acceptance criteria

- [x] Range mode: in-range days render wash between start and end
- [x] `anchorTarget='from'`: each calendar click replaces start
- [x] `anchorTarget='to'`: each calendar click replaces end
- [x] `anchorTarget='pick'`: two-click range semantics
- [x] Right-grid day click does not jump visible months when date already visible
- [x] Popover open + other field icon → re-anchor without close (toolbar layout)
- [x] Done disabled until both `from.date` and `to.date` set for pick anchor (unless nullable clear)
- [x] Timespace time: shell `app-time-field-control` — panel spinners **not** built
