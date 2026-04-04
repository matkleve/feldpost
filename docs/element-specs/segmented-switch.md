# Segmented Switch

## What It Is

The `app-segmented-switch` is a stylized, accessible single-choice control that behaves like a radio-group. It is used for compact mode/lane/state switching where exactly one option is active.

## What It Looks Like

The control renders as a horizontal segmented track with evenly styled segment buttons. Active segment has emphasized foreground/background contrast; inactive segments keep neutral styling with hover affordance. Icon-only items render as perfect squares, while text and icon-with-text items use standard horizontal padding.

## Where It Lives

- Shared UI component under `apps/web/src/app/shared/`.
- Used by feature UIs that need compact single-select mode switching (for example upload lane/state switches and filter-mode toggles).

## Actions

| #   | User Action                                    | System Response                                                 |
| --- | ---------------------------------------------- | --------------------------------------------------------------- |
| 1   | Clicks a segment                               | Segment becomes active and emits selected value                 |
| 2   | Uses keyboard arrow keys (when focused)        | Focus/selection moves between segments per radio-group behavior |
| 3   | Presses Space/Enter on focused segment         | Activates that segment and emits value                          |
| 4   | Parent updates selected value programmatically | Active segment updates without user click                       |

## Component Hierarchy

```text
SegmentedSwitch
|- SegmentTrack
|  |- SegmentButton (N)
|  |  |- SegmentIcon (optional)
|  |  `- SegmentLabel (optional)
```

## Data

| Source                 | Contract                                               | Operation   |
| ---------------------- | ------------------------------------------------------ | ----------- |
| Parent component input | segment option list (`value`, `label`, `icon`, `type`) | Read/render |
| Parent selected value  | active option key                                      | Read/render |
| Output event           | selected value change                                  | Emit        |

No direct Supabase access is required for this component.

## State

| Name            | Type              | Default                | Controls                   |
| --------------- | ----------------- | ---------------------- | -------------------------- |
| `sizing`        | `'fit' \| 'fill'` | `'fit'`                | Container width behavior   |
| `selectedValue` | `string \| null`  | `null`                 | Active segment             |
| `focusedIndex`  | `number`          | implementation default | Keyboard navigation target |

## File Map

| File                                                                       | Purpose                                          |
| -------------------------------------------------------------------------- | ------------------------------------------------ |
| `docs/element-specs/segmented-switch.md`                                   | Segmented-switch behavior contract               |
| `apps/web/src/app/shared/segmented-switch/segmented-switch.component.ts`   | Inputs/outputs and keyboard interaction logic    |
| `apps/web/src/app/shared/segmented-switch/segmented-switch.component.html` | Segment structure and bindings                   |
| `apps/web/src/app/shared/segmented-switch/segmented-switch.component.scss` | Layout variants (`fit`/`fill`) and visual states |

## Wiring

### Injected Services

None required by default - this is a presentational/interaction primitive.

### Inputs / Outputs

- Inputs: options list, selected value, sizing mode.
- Outputs: value-change event when active segment changes.

### Subscriptions

None required by default.

### Supabase Calls

None.

## Acceptance Criteria

- [ ] Component exposes a single selected-value API (single-choice only).
- [ ] Keyboard interaction is radio-group compliant (arrow keys + Space/Enter).
- [ ] `fit` mode wraps content width; `fill` mode distributes width evenly.
- [ ] `icon-only` segments remain perfect squares.
- [ ] Active/inactive/hover states are visually distinct without geometry shifts.

## Variation Axes

| Axis      | Value            | Behavior                                                                            |
| --------- | ---------------- | ----------------------------------------------------------------------------------- |
| Sizing    | `fit` (default)  | Container wraps contents; natural button width unless icon-only square rule applies |
| Sizing    | `fill`           | Container expands to available width; all segments stretch equally (`flex: 1 1 0`)  |
| Item Type | `text-only`      | Standard text label segment                                                         |
| Item Type | `icon-only`      | Icon-only square segment                                                            |
| Item Type | `icon-with-text` | Icon leading + text label                                                           |

## Pseudo-HTML / Structural Examples

### Sizing: Fit (mixed item types)

```html
<app-segmented-switch sizing="fit">
  <app-segment type="icon-only" icon="upload" />
  <app-segment type="text-only" label="Uploaded" />
  <app-segment type="icon-with-text" icon="warning" label="Issues" />
</app-segmented-switch>
```

### Sizing: Fill (equal stretching)

```html
<app-segmented-switch sizing="fill">
  <app-segment type="text-only" label="Uploading" />
  <app-segment type="text-only" label="Uploaded" />
  <app-segment type="text-only" label="Issues" />
</app-segmented-switch>
```
