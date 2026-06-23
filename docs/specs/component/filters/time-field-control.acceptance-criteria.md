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
- [x] **No visible scrollbars** on wheel columns — values scroll programmatically to selection
- [x] **Given** picker open, **when** user scrolls wheel over left half, **then** hour increments/decrements and emits
- [x] **Given** picker open, **when** user scrolls wheel over right half, **then** minute increments/decrements and emits
- [x] **Given** picker open over map tiles, **when** user clicks a wheel row, **then** value updates and map does not receive the click
- [x] Focus opens picker and snaps wheels to parsed value

## Dismiss

- [x] Escape / outside click closes picker via shell `closeRequested`
- [x] Outside close does not emit extra value beyond last typed/wheel change
