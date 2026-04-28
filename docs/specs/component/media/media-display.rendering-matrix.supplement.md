# media display.rendering matrix.supplement

> Parent: [`media-display.md`](./media-display.md)

## State Rendering Matrix

| State                     | Class        | Primary HTML layer(s)                    | Required CSS selector behavior                                                            | Transition entry/exit notes                           |
| ------------------------- | ------------ | ---------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `idle`                    | Main         | neutral idle shell                       | Host keeps constraints and ratio fallback; no content/icon/error/no-media layer active    | Initial state before first valid `mediaId` handoff    |
| `loading-surface-visible` | Main         | `media-display__layer--loading-surface`  | Loading layer opacity `1`, all other visual layers opacity `0`; pulse animation tokenized | Immediate state on handoff, including cache-hit paths |
| `ratio-known-contain`     | Transitional | loading + staged shell                   | Contain-path ratio lock transitions with geometry token; content remains non-final        | Only for contain path; exits to `media-ready`         |
| `media-ready`             | Transitional | `media-display__layer--staged-content`   | Staged layer visible, final content layer still non-final                                 | Transitional bridge before content reveal             |
| `content-fade-in`         | Transitional | staged + `media-display__layer--content` | Content opacity animates in; staged layer remains until transition end                    | Exits to `content-visible` on `transitionend`         |
| `content-visible`         | Main         | `media-display__layer--content`          | Content layer opacity `1`; staged layer `0`                                               | Final visual state                                    |
| `icon-only`               | Main         | `media-display__layer--icon-only`        | Icon-only layer opacity `1`; no image element required                                    | Document-like small-area fallback                     |
| `error`                   | Main         | `media-display__layer--error`            | Error layer opacity `1`; render-only, no action controls in component                     | Service terminal/transient error rendering            |
| `no-media`                | Main         | `media-display__layer--no-media`         | No-media layer opacity `1`, distinct visual from error                                    | Service-reported intentional absence                  |

### HTML/CSS Change Table for Intermediate Transitions

| Transition                                       | HTML/State change                               | CSS change                                                  |
| ------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------- |
| `loading-surface-visible -> ratio-known-contain` | Keep loading visible while ratio lock-in starts | `aspect-ratio` transition with `var(--transition-geometry)` |
| `loading-surface-visible -> media-ready`         | Stage content URL/layer without final reveal    | Staged layer opacity `0 -> 1`                               |
| `media-ready -> content-fade-in`                 | Activate final content layer                    | Content opacity `0 -> 1` with reveal-delay token            |
| `content-fade-in -> content-visible`             | Remove staged emphasis after reveal completes   | Staged layer opacity `1 -> 0`                               |
| `loading-surface-visible -> icon-only`           | Activate icon-only layer without image node     | Icon-only opacity `0 -> 1`                                  |
| `any -> error`                                   | Activate error layer only (render-only)         | Active layer opacity `1 -> 0`, error `0 -> 1`               |

## Visual Behavior Contract

### Ownership Matrix

| Behavior              | Visual Geometry Owner              | Stacking Context Owner   | Interaction Hit-Area Owner | Selector(s)                              | Layer (z-index/token) | Test Oracle                                                    |
| --------------------- | ---------------------------------- | ------------------------ | -------------------------- | ---------------------------------------- | --------------------- | -------------------------------------------------------------- |
| Loading surface       | `.media-display__viewport`         | `app-media-display:host` | none (passive)             | `.media-display__layer--loading-surface` | layer/content (0)     | Loading surface fills viewport with stable ratio               |
| Staged content render | `.media-display__viewport`         | `app-media-display:host` | none (passive)             | `.media-display__layer--staged-content`  | layer/content (1)     | Staged content appears before final content reveal             |
| Final content render  | `.media-display__viewport`         | `app-media-display:host` | none (passive)             | `.media-display__layer--content`         | layer/content (2)     | Final content becomes visible after tokenized fade             |
| Icon-only frame       | `.media-display__layer--icon-only` | `app-media-display:host` | none (passive)             | `.media-display__layer--icon-only`       | layer/content (0)     | Filetype icon fills slot, no image element required            |
| Error frame           | `.media-display__layer--error`     | `app-media-display:host` | none (passive)             | `.media-display__layer--error`           | layer/feedback (3)    | Error frame is visible with no component-owned action controls |
| No-media frame        | `.media-display__layer--no-media`  | `app-media-display:host` | none (passive)             | `.media-display__layer--no-media`        | layer/feedback (3)    | No-media view is distinct from error styling                   |

### Ownership Triad Declaration

| Behavior        | Geometry Owner                           | State Owner                              | Visual Owner                             | Same element? |
| --------------- | ---------------------------------------- | ---------------------------------------- | ---------------------------------------- | ------------- |
| Loading surface | `.media-display__layer--loading-surface` | `.media-display__layer--loading-surface` | `.media-display__layer--loading-surface` | yes           |
| Staged content  | `.media-display__layer--staged-content`  | `.media-display__layer--staged-content`  | `.media-display__layer--staged-content`  | yes           |
| Final content   | `.media-display__layer--content`         | `.media-display__layer--content`         | `.media-display__layer--content`         | yes           |
| Icon-only frame | `.media-display__layer--icon-only`       | `.media-display__layer--icon-only`       | `.media-display__layer--icon-only`       | yes           |
| Error frame     | `.media-display__layer--error`           | `.media-display__layer--error`           | `.media-display__layer--error`           | yes           |
| No-media frame  | `.media-display__layer--no-media`        | `.media-display__layer--no-media`        | `.media-display__layer--no-media`        | yes           |

No triad divergence is required for this component.

## Internal Behavior

- On `mediaId` change: transition to `loading-surface-visible`, then subscribe to `MediaDownloadService.getState(mediaId, slotSizeRem)`.
- On `maxWidth` / `maxHeight` change: set `--media-display-max-width` / `--media-display-max-height` on host.
- On host resize: measure short edge via `ResizeObserver`, convert px to `rem` using computed root font-size, and pass `slotSizeRem` to `MediaDownloadService`.
- On contain-path ratio confirmation: transition to `ratio-known-contain`.
- On staged asset readiness: transition to `media-ready`.
- On reveal start: transition to `content-fade-in`.
- On reveal end: transition to `content-visible`.
- On service `icon-only` signal: transition to `icon-only` and render icon surface without image element.
- On error: transition to `error`.
- On no-media signal: transition to `no-media`.
- Aspect ratio is injected as `--media-aspect-ratio` on host once known (service metadata or `aspectRatio` hint).
- CSS reads ratio via `aspect-ratio: var(--media-aspect-ratio, 1/1)` and resolves within `max-width: var(--media-display-max-width, 100%)` and `max-height: var(--media-display-max-height, 100%)`.
- Transient state exits use `transitionend`, never arbitrary timers.
- `prefers-reduced-motion` is handled globally; no local override logic is required.

## What It Does Not Own

- Selection state
- Upload overlay
- Quiet actions
- Grid slot geometry
- Any boolean `@Input()` representing visual state
- Retry action ownership
- Border styling ownership
- Outline styling ownership
- Border-radius styling ownership
- Any component-local action UI controls
- The decision of whether a filetype is previewable at a given size (owned by `MediaDownloadService`)
- Filetype icon assets (owned by the shared icon system)
- Explicit height assignment on the host (height is derived from width multiplied by aspect ratio)

### Spacing & Framing Ownership

- `MediaDisplayComponent` is a render slot and must not own framing geometry semantics.
- Forbidden ownership in `MediaDisplayComponent`:
  - `border-radius`
  - `padding`, `margin`, `border`
  - `overflow: hidden` for border-radius clipping
- Framing and clipping are container-owned and must be applied by the consuming host (for example media item, map marker, detail view).

