# Calendar Dropdown — Acceptance Criteria

Parent: [`calendar-dropdown.md`](calendar-dropdown.md)

## Portal & layout

- [x] Popover is portaled to `document.body` — opening From/To inside timespace toolbar does **not** clip the panel (regression: Val 2026-06-17 screenshot)
- [x] Popover positions below trigger with above-flip when viewport lacks space
- [x] `z-index` uses dropdown plane token (`300`) — same stack as `app-dropdown-shell`

## Locale & typing

- [x] Text input displays using `I18nService.formatDateFieldValue` for active locale
- [x] Typed input parses via `I18nService.parseDateFieldValue` (order matches locale; separator policy per `date-field.helpers`)
- [ ] Changing language in Settings updates placeholder + displayed value without reload

## Variants

- [x] `timeMode='dateOnly'`: no time row; emit date only
- [x] `timeMode='optionalTime'`: time row shown; empty time allowed on Done
- [x] `timeMode='requiredTime'`: Done disabled until valid `HH:MM`

## Constraints

- [x] `minDate` / `maxDate`: days outside range not selectable
- [x] `nullable=true`: Clear emits null and closes
- [x] Timespace: `minDate`/`maxDate` from catalog domain (oldest media → today)

## Commit model

- [x] Done button commits draft → `valueChange`
- [x] Enter in panel commits when valid (same as Done)
- [x] Escape / outside click reverts draft; no `valueChange`

## Migration

- [x] `app-timespace-dropdown` uses **one** `app-calendar-dropdown` with `mode='range'` (replaces twin single instances)
- [x] Media detail captured row uses `app-calendar-dropdown` `mode='single'` (replaces inline `app-captured-date-editor`)
- [x] `app-compact-date-field` and `app-captured-date-editor` removed from production imports after cutover

## Interaction emphasis

- [x] Control shell + icon trigger: gold hover/focus per ink contract
- [x] Panel days: per [`calendar-picker-panel.md`](calendar-picker-panel.md)

## Range mode

- [ ] Timespace: one `app-calendar-dropdown` `mode='range'` with From/To labels — not two separate instances
- [ ] Clicking either From or To field opens the **same** portaled panel
- [ ] Empty range: first day click anchors start; second sets end with in-range highlight; **Done** commits (popover stays open until Done)
- [ ] Existing range: open via From → next click replaces start; open via To → next click replaces end
- [ ] Order normalization: if from > to after pick, draft swaps before display
- [ ] `rangeChange` emits `{ from, to }` with ISO dates; times null unless Add time expanded
- [ ] Histogram selection overlay stays in sync with committed range (drag + calendar paths)

## Progressive time (timespace)

- [ ] Timespace passes `timeMode='optionalTime'`
- [ ] Add time link hidden until start date exists in draft
- [ ] Expanded: From + To HH:MM spinners below grid (not header); empty time allowed on Done
- [ ] Collapsed: emit date-only range on Done
