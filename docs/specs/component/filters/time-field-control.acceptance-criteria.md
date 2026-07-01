# Time Field Control — Acceptance Criteria

Parent: [`time-field-control.md`](time-field-control.md)

## Shell & portal

- [x] Input shell height `2.25rem` — parity with `.calendar-dropdown__control`
- [x] Picker opens in body-portaled `app-dropdown-shell` at dropdown plane (`z-index: 300`)
- [x] Shell uses `option-menu-surface time-field-panel` — frosted background visible when panel overlaps map (timespace)
- [x] Shell host `overflow: visible` — wheel columns not clipped by menu CVA

## Typing & value

- [x] `parseTimeInput` accepts flexible typing (`9`, `1430`, `14:30`)
- [x] Typing emits on `input`; Enter / change normalizes and closes picker
- [x] Empty input emits `null`

## Wheel picker

- [x] Two columns: hours `0–23`, minutes `0–59`; selected row uses secondary selected ink
- [x] **No visible scrollbars** on wheel columns — hour and minute columns scroll natively (wheel/trackpad/touch), CSS `scroll-snap` settles on a row
- [x] **Given** picker open, **when** user scrolls/drags the hour column, **then** the row centered under the column midpoint becomes the active hour and emits immediately, continuously as the column moves (no discrete ±1-per-tick lag)
- [x] **Given** picker open, **when** user scrolls/drags the minute column, **then** the row centered under the column midpoint becomes the active minute and emits immediately, continuously as the column moves
- [x] Scroll momentum never chains to the map/page behind the picker (`overscroll-behavior: contain`)
- [x] **Given** picker open over map tiles, **when** user clicks a wheel row, **then** value updates, that row smooth-scrolls to center, and the map does not receive the click
- [x] Focus opens picker and snaps **both** hour and minute wheels to the parsed value (uses the freshly parsed value directly, not a value still round-tripping through the parent binding)
- [x] Typing a full time (e.g. `21:07`) centers both columns on the newly typed hour **and** minute in the same update — the column for the just-changed segment does not lag behind on the previous value

## Dismiss

- [x] Escape / outside click closes picker via shell `closeRequested`
- [x] Outside close does not emit extra value beyond last typed/wheel change

## Remove-time footer action

- [x] Footer button below the wheel columns, full width, `variant="destructive"` — one click, no arm/confirm step
- [x] **Given** picker open with a value set, **when** user clicks the remove-time button, **then** `valueChange` emits `null` and the picker closes immediately
- [x] Button is `disabled` when `value()` is already empty/`null` (nothing to remove)
- [x] Click stops pointer/click propagation so the map does not receive it (same contract as wheel rows)
