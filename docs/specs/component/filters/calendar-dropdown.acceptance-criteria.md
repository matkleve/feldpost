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

- [x] `timeMode='dateOnly'`: no time fields in split layout; emit date only
- [x] `timeMode='optionalTime'`: `app-time-field-control` beside each date in split layout; empty time allowed
- [x] `timeMode='requiredTime'`: Done disabled until valid `HH:MM` (single mode panel)

## Constraints

- [x] `minDate` / `maxDate`: days outside range not selectable
- [x] `nullable=true`: Clear emits null and closes
- [x] Timespace: `minDate`/`maxDate` from catalog domain (oldest media → today)

## Commit model

- [x] Done button commits draft → `valueChange` / `rangeChange` (pick anchor)
- [x] Enter in panel commits when valid (same as Done)
- [x] Escape / outside click reverts draft; no emit
- [x] Split field anchor: single-endpoint day clicks update draft; panel stays open until dismiss (outside / Escape)
- [x] Split field anchor: dismiss commits the active endpoint; pick anchor still uses **Done**

## Migration

- [x] `app-timespace-dropdown` uses **one** `app-calendar-dropdown` with `mode='range'` (replaces twin single instances)
- [x] Media detail captured row uses `app-calendar-dropdown` `mode='single'` (replaces inline `app-captured-date-editor`)
- [x] `app-compact-date-field` and `app-captured-date-editor` removed from production imports after cutover

## Interaction emphasis

- [x] Control shell hover: gold wash + border on `.calendar-dropdown__control`; icon inherits `color` — no second wash on trigger
- [x] Control shell focus: gold border + `--interactive-focus-ring` on `.calendar-dropdown__control:focus-within`; no own ring on trigger or input
- [x] Day cells: rounded square geometry (`--radius-sm`); hover + selected use emphasis mixins (not circles)
- [x] After picking a date, prev/next month navigates freely without snapping back to the selected date's month
- [x] Clicking a day in the **right** dual-month grid does **not** jump months when that date is already visible

## Range mode

- [x] Timespace: one `app-calendar-dropdown` `mode='range'` with From/To labels — not two separate instances
- [x] **Toolbar layout:** calendar icon on From/To opens the same portaled panel
- [x] **Field-anchored:** open via From → each day click replaces start only
- [x] **Field-anchored:** open via To → each day click replaces end only
- [x] Wrong first date: second click via From anchor replaces start — does **not** force end
- [x] Popover open: other field calendar icon re-anchors without closing
- [x] Order normalization: if from > to after edit, draft swaps before display
- [x] **Done** commits when both bounds set (pick anchor); shell typing commits immediately when popover closed
- [x] `rangeChange` emits `{ from, to }` with ISO dates + optional `HH:MM` time
- [x] Histogram selection overlay stays in sync with committed range (drag + calendar paths)

## Split layout (timespace)

- [x] `layout='split'`: From/To date inputs + optional time fields; center calendar button for **range pick only**
- [x] Date input focus **opens** portaled panel with single-endpoint anchor (`from` / `to`)
- [x] Date day click under field anchor auto-commits — **not** two-click range
- [x] Center icon sets `anchorTarget='pick'`; first panel click → from, second → to, third restarts; **Done** required
- [x] Center pick uses `hlmBtn variant="outline" size="icon-sm"` — no custom button geometry in SCSS
- [x] Timespace uses `layout='split'` + `timeMode='optionalTime'`

## Time fields (timespace split)

- [x] Timespace passes `timeMode='optionalTime'`
- [x] From + To `app-time-field-control` in shell row (not panel spinners)
- [x] Time typing uses `parseTimeInput`; wheel picker with hour `0–23` + minute `0–59`
- [x] Empty time → whole UTC day boundary on emit; set time → exact instant
- [x] Filter `matchesTimeRange` uses committed `Date.getTime()` boundaries

## Deferred (not in scope)

- [ ] Panel-internal progressive time row (Add time link below grid) — timespace uses shell [`time-field-control.md`](time-field-control.md) instead
- [ ] Locale switch without reload (UC-11)
