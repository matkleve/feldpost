# Media Item Quiet Actions

## What It Is

Media Item Quiet Actions is the corner-action presenter for media item selection and map-jump affordances. It is an overlay-layer control surface that reveals via parent hover/focus logic.

## What It Looks Like

The component exposes two compact icon-only buttons: select (top-left) and map (top-right). The select control can show active selected styling and check icon. The map control uses the same small action style and supports disabled state when no location is available. Buttons support keyboard focus-visible outlines and are rendered within the media-frame action layer. Visual values use token-based spacing and colors.

## Where It Lives

- Component root: `apps/web/src/app/features/media/media-item-quiet-actions.component.ts`
- Used by: `MediaItemComponent`
- Trigger: always rendered as action layer; visibility controlled by parent state selectors

## Actions

| #   | User Action / System Trigger  | System Response                                         | Trigger             |
| --- | ----------------------------- | ------------------------------------------------------- | ------------------- |
| 1   | User clicks select action     | Emits `selectRequested` if not disabled                 | select button click |
| 2   | User clicks map action        | Emits `mapRequested` if not disabled and map is enabled | map button click    |
| 3   | Item is selected              | Select button receives active selected style            | `selected=true`     |
| 4   | Map action disabled           | Map button is disabled and non-interactive              | `mapDisabled=true`  |
| 5   | Keyboard focus enters actions | Focus-visible ring appears on focused button            | keyboard navigation |

## Component Hierarchy

```text
MediaItemQuietActionsComponent
└── div.media-item-quiet-actions
    ├── button.media-item-quiet-actions__button--select
    │   └── span.material-icons (optional check)
    └── button.media-item-quiet-actions__button--map
        └── span.material-icons (map)
```

## Data

The component consumes parent-provided booleans and labels, and emits action outputs.

| Field         | Source              | Type      | Purpose                                |
| ------------- | ------------------- | --------- | -------------------------------------- |
| `selected`    | parent media item   | `boolean` | selected visual state on select button |
| `disabled`    | parent media item   | `boolean` | disables all actions                   |
| `mapDisabled` | parent media item   | `boolean` | disables map action                    |
| `selectLabel` | i18n parent binding | `string`  | aria-label for select action           |
| `mapLabel`    | i18n parent binding | `string`  | aria-label for map action              |

```mermaid
flowchart TD
  A[Parent media item state] --> B[Quiet Actions Component]
  B --> C[Select button state]
  B --> D[Map button state]
  C --> E[selectRequested output]
  D --> F[mapRequested output]
```

## State

| Name          | TypeScript Type | Default | What it controls           |
| ------------- | --------------- | ------- | -------------------------- |
| `selected`    | `boolean`       | `false` | select button active style |
| `disabled`    | `boolean`       | `false` | global action lock         |
| `mapDisabled` | `boolean`       | `false` | map action availability    |

## State Machine

FSM scope rule:

- Required because this component has programmatic reveal/selection/disabled state.
- CSS pseudo-classes alone cannot represent action enablement and selected-state transitions.

### State Enum

```ts
export type MediaItemQuietActionsState =
  | "hidden"
  | "revealing"
  | "visible-unselected"
  | "visible-selected"
  | "visible-disabled"
  | "leaving";
```

### Transition Map

```ts
export const MEDIA_ITEM_QUIET_ACTIONS_TRANSITIONS: Record<
  MediaItemQuietActionsState,
  MediaItemQuietActionsState[]
> = {
  hidden: ["revealing"],
  revealing: [
    "visible-unselected",
    "visible-selected",
    "visible-disabled",
    "leaving",
  ],
  "visible-unselected": ["visible-selected", "visible-disabled", "leaving"],
  "visible-selected": ["visible-unselected", "visible-disabled", "leaving"],
  "visible-disabled": ["visible-unselected", "visible-selected", "leaving"],
  leaving: ["hidden"],
};
```

### Transition Guard Contract

- Quiet actions transition through a guarded transition map.
- Unlisted transitions are rejected.
- Root visual driver is `[attr.data-state]`.
- Template and SCSS must not use boolean visual-state flags as primary visual driver.
- Parent/child coordination required: parent media item controls reveal gates and must synchronize quiet-actions state transitions.

### Transition Choreography Table (Required Before CSS)

| from -> to                        | step | element       | property                | timing token                 | delay |
| --------------------------------- | ---- | ------------- | ----------------------- | ---------------------------- | ----- |
| `hidden -> revealing`             | 1    | actions host  | opacity                 | `var(--transition-fade-in)`  | `0ms` |
| `hidden -> revealing`             | 2    | actions host  | transform               | `var(--transition-emphasis)` | `0ms` |
| `revealing -> visible-unselected` | 1    | actions host  | opacity                 | `var(--transition-fade-in)`  | `0ms` |
| `revealing -> visible-selected`   | 1    | select button | border-color/background | `var(--transition-emphasis)` | `0ms` |
| `visible-* -> leaving`            | 1    | actions host  | opacity                 | `var(--transition-fade-out)` | `0ms` |

## Boolean Input Migration Required

- Migration required: yes.
- Current public visual-state inputs are boolean (`selected`, `disabled`, `mapDisabled`).
- Target contract is one enum state input (`state: MediaItemQuietActionsState`) plus non-visual labels and action outputs.
- Parent bindings must migrate in the same pass; boolean visual-state inputs must be removed after cutover.
- Parent call-site migration required: yes (`MediaItemComponent` template bindings to `app-media-item-quiet-actions`).

## File Map

| File                                                                      | Purpose                                    |
| ------------------------------------------------------------------------- | ------------------------------------------ |
| `apps/web/src/app/features/media/media-item-quiet-actions.component.ts`   | action input/output handling               |
| `apps/web/src/app/features/media/media-item-quiet-actions.component.html` | two-button quiet-action markup             |
| `apps/web/src/app/features/media/media-item-quiet-actions.component.scss` | corner button positioning and state styles |

## Wiring

### Injected Services

None.

### Inputs / Outputs

- Inputs: `selected`, `disabled`, `mapDisabled`, `selectLabel`, `mapLabel`
- Outputs: `selectRequested`, `mapRequested`

### Subscriptions

None.

### Supabase Calls

None — delegated to parent/domain services.

```mermaid
sequenceDiagram
  participant M as MediaItemComponent
  participant Q as QuietActions

  M->>Q: bind selected/disabled/mapDisabled + labels
  Q-->>M: render select/map controls
  M->>Q: user click select
  alt disabled
    Q-->>M: no emit
  else enabled
    Q-->>M: selectRequested()
  end
  M->>Q: user click map
  alt disabled or mapDisabled
    Q-->>M: no emit
  else enabled
    Q-->>M: mapRequested()
  end
```

## Acceptance Criteria

- [ ] Quiet actions render select and map controls with proper aria labels.
- [ ] Select action emits only when component is enabled.
- [ ] Map action emits only when component and map action are enabled.
- [ ] Focus-visible ring is present for keyboard navigation.
- [ ] Select active style is applied when `selected=true`.
- [ ] Exactly two geometry owners exist in each render path (outer layout owner and innermost content owner).
- [ ] Visual output is driven by one enum state input with `[attr.data-state]`; boolean visual-state inputs are removed.
- [ ] Transition choreography uses tokenized timings (`var(--transition-*)`) and no magic numbers.
- [ ] `npm run lint` and `ng build` are clean for the migration scope.

## Visual Behavior Contract

### Ownership Matrix

| Behavior                   | Visual Geometry Owner                     | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s)                                                         | Layer (z-index/token) | Test Oracle                                          |
| -------------------------- | ----------------------------------------- | ---------------------- | -------------------------- | ------------------------------------------------------------------- | --------------------- | ---------------------------------------------------- |
| Action control positioning | `app-media-item:host` action layer bounds | `app-media-item:host`  | action buttons             | `.media-item__quiet-actions` + `.media-item-quiet-actions__button*` | overlay/actions (3)   | buttons stay in top-left and top-right frame corners |
| Select active style        | select button                             | same as above          | select button              | `.media-item-quiet-actions__button--select-active`                  | actions/select-active | selected state shows highlighted select control      |
| Focus ring                 | focused button                            | same as above          | focused button             | `.media-item-quiet-actions__button:focus-visible`                   | actions/focus         | focus ring appears only on keyboard focus            |

### Ownership Triad Declaration

| Behavior            | Geometry Owner                              | State Owner                                                              | Visual Owner                                       | Same element?                                                   |
| ------------------- | ------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------- | --------------------------------------------------------------- |
| Select active style | `.media-item-quiet-actions__button--select` | `.media-item-quiet-actions__button--select-active`                       | `.media-item-quiet-actions__button--select-active` | ✅                                                              |
| Focus ring          | `.media-item-quiet-actions__button`         | `.media-item-quiet-actions__button:focus-visible`                        | `.media-item-quiet-actions__button:focus-visible`  | ✅                                                              |
| Action reveal       | `.media-item__quiet-actions`                | `.media-item--selected` / `:hover` / `:focus-within` (parent state gate) | `.media-item__quiet-actions`                       | ⚠️ exception — reveal is controlled by parent interaction state |

### Stacking Context

- Parent media item host provides stacking and absolute overlay placement.
- Quiet-actions component provides internal button layout only.

### Layer Order (z-index)

- Quiet-actions host layer uses parent-assigned action layer z-order (`3`).
- Internal buttons do not create competing global layers.

### State Ownership

- hover/focus reveal: Parent media item selector rules
- select active visual: quiet-actions component select button
- map disabled visual: quiet-actions component map button

### Pseudo-CSS Contract

```css
:host {
  display: block;
}

.media-item-quiet-actions__button {
  position: absolute;
  inset-block-start: var(--spacing-2);
}

.media-item-quiet-actions__button--select {
  inset-inline-start: var(--spacing-2);
}

.media-item-quiet-actions__button--map {
  inset-inline-end: var(--spacing-2);
}
```
