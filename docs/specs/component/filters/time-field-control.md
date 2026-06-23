# Time Field Control

## What It Is

Compact **24h time input** with body-portaled scroll-wheel picker. Used beside date fields in `app-calendar-dropdown` split layout (timespace). Parents own wire value (`HH:MM` or `null`).

**Selector:** `app-time-field-control`

## What It Looks Like

- **Shell:** bordered control matching date field geometry (`2.25rem` height, `--radius-sm`); centered `HH:MM` text
- **Picker panel:** frosted **`option-menu-surface`** on `app-dropdown-shell` (`time-field-panel` modifier) — same elevated chrome as toolbar dropdowns
- **Wheels:** two side-by-side columns (hours `0–23`, minutes `0–59`); **no visible scrollbars**; selected row uses `--interaction-selected-ink`
- **Over map:** when timespace positions the picker over Leaflet tiles, the frosted shell MUST remain opaque and pointer events MUST stay on the picker (wheel scroll + row tap)

Detail: [`time-field-control.acceptance-criteria.md`](time-field-control.acceptance-criteria.md)

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
| 1 | Focus input | Open picker; snap wheels to parsed value |
| 2 | Type in input | Parse via `parseTimeInput`; emit on `input`; sync wheel position |
| 3 | Enter / change on input | Normalize display; close picker |
| 4 | Scroll wheel over picker | Left half → hour ±1; right half → minute ±1; emit; map must not scroll |
| 5 | Pointer down on wheel row | Set hour or minute; emit; stop propagation so map does not steal event |
| 6 | Escape / outside click | Close picker (shell `closeRequested`) |

## Component hierarchy

```text
app-time-field-control
├── .time-field__control
│   └── input.time-field__input
└── app-dropdown-shell (option-menu-surface time-field-panel)
    └── .time-field__picker
        ├── .time-field__wheel (hours)
        └── .time-field__wheel (minutes)
```

## Visual Behavior Contract

| Behavior | Geometry Owner | Stacking Owner | Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Time shell | `.time-field__control` | `:host` | `.time-field__input` | `.time-field__control` | 0 | `2.25rem` matches calendar date control |
| Frosted panel chrome | `app-dropdown-shell` | shell host | shell host | `.option-menu-surface.time-field-panel` | 300 | Frosted bg over map |
| Wheel columns | `.time-field__wheel` | shell | wheel rows | `.time-field__wheel-item` | content | Hidden scrollbars; max-height ~7.5rem |
| Selected row | wheel item | item | item | `.time-field__wheel-item--selected` | states | Secondary selected ink |

## File map

| File | Purpose |
| --- | --- |
| `shared/time-field-control/time-field-control.component.ts` | Parse, wheel scroll, emit, non-passive wheel bind |
| `shared/time-field-control/time-field-control.component.html` | Shell + portaled picker |
| `shared/time-field-control/time-field-control.component.scss` | Control + wheel geometry |
| `shared/dropdown-trigger/shell/dropdown-shell.component.scss` | `:host.time-field-panel` overflow |

## Wiring

- Parent [`calendar-dropdown`](calendar-dropdown.md) embeds `<app-time-field-control>` in split layout; time changes commit immediately when calendar popover is closed
- Picker uses shared [`dropdown-system.md`](dropdown-system.md) shell contract (`option-menu-surface`, body portal, `z-index: 300`)

## Acceptance criteria

- [x] Checklist: [`time-field-control.acceptance-criteria.md`](time-field-control.acceptance-criteria.md)
