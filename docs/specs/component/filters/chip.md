# Chip (Primitive Component)

## What It Is

A compact, inline label element that displays a single piece of information with optional leading **Material icon**, **avatar image**, trailing dismiss control, or combinations. **Figma component set `96:74` (`Chip`) is the source of truth** for default chrome (height, padding, fills, label typescale); `variant` / `color` are Feldpost extensions for file-type and status tinting.

## What It Looks Like

**Pill-shaped** container (`border-radius: full`). **Layouts:** `text-only`, **icon + text** (composed from `icon` + `text` — same shell as Figma spacing), `icon-only`, **`avatar-text`** (`avatarSrc` + `text`). Trailing dismiss is optional. Default label color uses **`var(--foreground)`** (Figma on-surface role).

**Geometry (Figma):** Chip body height **`var(--spacing-4)` (16px)**. Horizontal padding **`8px`** (`var(--spacing-2)`). **Hover** on default: stronger primary tint via **`color-mix`** (see **Styling Details**). There is **no** `size` input — one geometry for `app-chip`.

**Icon + text (product):** Not a separate Figma layout name; use `icon` + `text` with the same 16px row and **`--spacing-1`** gap between glyph and label.

**Related shapes:** Toolbar **filter / grouping / sort / projects** triggers are **not** full pills — they use **control radius** (`--container-radius-control`). **Filter rule** conjunction controls (`Where` / `And` / `Or`) use **smaller radius** (`--radius-sm`). See badges-and-chips doc for the shape table.

## Where It Lives

- **Upload Area**: File-type chips (new feature — will replace text-based file list)
- **Filter Panels**: Tag/category filters
- **Status Displays**: Job status chips, phase indicators
- **Settings Sections**: Multi-select option displays
- **Search Results**: Inline category/type labels

Chips are **global shared primitives** — defined in `apps/web/src/app/shared/components/chip/` and imported as needed. Product-wide **where used / which shape** lives in [badges-and-chips](../ui-primitives/ui-primitives.badges-and-chips.md).

## Actions & Interactions

| Scenario                             | User Action                 | System Response                                                                                                   |
| ------------------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **View chip**                        | Display static chip in page | Render appropriate variant/layout; text truncates with ellipsis if >max-width |
| **Hover static chip (no action)**    | Mouse enters chip bounds    | Optional subtle background highlight (semi-transparent primary)                                                   |
| **Focus static chip (keyboard nav)** | Tab to chip or child button | Outline appears; focus ring uses `--color-primary`                                                                |
| **Click dismissible chip X button**  | Click/tap trailing X icon   | Emit `chipDismissed($event)` Output; chip fades out (optional 150ms transition); parent removes from DOM or hides |
| **Hover X button**                   | Mouse enters X region       | X icon opacity increases to full; background slightly darker                                                      |
| **Keyboard: X button**               | Space/Enter on focused X    | Same as click _dismiss_                                                                                           |

## Component Hierarchy

```
chip.component.ts [selector: app-chip]
├── .chip (root; --chip-height, padding, typescale)
├── img.chip__avatar (optional; Figma avatar-text — circular 16px)
├── span.chip__icon (optional Material leading icon)
├── span.chip__text (optional label)
└── button.chip__dismiss (optional)
    └── span.material-icons (aria-hidden)
```

**Template Structure:**

```html
<div [class]="chipClass()">
  @if (isAvatarText()) {
    <img class="chip__avatar" ... />
  } @else if (icon()) {
  <span class="chip__icon chip__icon--leading material-icons">...</span>
  }
  @if (text()) {
  <span class="chip__text">...</span>
  }
  @if (dismissible()) {
  <button type="button" class="chip__dismiss" ...>...</button>
  }
</div>
```

## Figma Variant Axes

> **Source of truth: Figma component set `96:74` — `Chip`.**

| Figma property | Figma values | Angular mapping |
|----------------|--------------|-----------------|
| **Layout** | `text-only`, `icon-only`, `avatar-text` | **text-only:** `text()` only (no `icon`, no `avatarSrc`). **icon-only:** `icon()` only. **avatar-text:** `avatarSrc()` + `text()` (Material `icon` hidden). **icon + text (product):** `icon()` + `text()` — same metrics as Figma row; not a separate Figma layout name. |
| **State** | `default`, `hover` | CSS only: `:hover`, `:focus-visible`, `:disabled`. Never an Angular `@Input()`. |

Color family (`variant` input) is a **Feldpost extension** beyond Figma's neutral chip — it drives `--chip-color` at runtime and is not a Figma variant axis.

## Data Requirements

**Inputs** (via component `@Input()` signals):

- `icon: signal<string | undefined>` — Material Icon name when **not** using `avatarSrc`
- `text: signal<string | undefined>` — Visible chip label (max 30 chars recommended; longer text truncates)
- `avatarSrc: signal<string | undefined>` — URL for leading circular **avatar** image (Figma `avatar-text`). When set with `text()`, renders `img.chip__avatar` instead of Material `icon`.
- `avatarAlt: signal<string | undefined>` — Optional `alt` for the avatar; when empty, image is **decorative** (`aria-hidden`)
- `dismissible: signal<boolean>` — Show trailing X button (default: false)
- `variant: signal<'default' | 'primary' | ...>` — Color family (Feldpost extension; not a Figma variant axis)
- `color: signal<string | undefined>` — Optional CSS color token for custom variants (e.g., `'--color-uploading'`)
- `maxWidth: signal<string>` — Max-width constraint (default: 'auto'; e.g., '8rem' for constrained contexts)

**Outputs**:

- `chipDismissed: EventEmitter<void>` — Fired when X button clicked; parent handles removal

## State

| Signal               | Type                                                                                                                                                                                                                        | Default     | Purpose                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------- |
| `icon`               | `signal<string \| undefined>`                                                                                                                                                                                               | `undefined` | Material icon when not `avatar-text`                        |
| `text`               | `signal<string \| undefined>`                                                                                                                                                                                               | `undefined` | Visible text content                                     |
| `avatarSrc`          | `signal<string \| undefined>`                                                                                                                                                                                               | `undefined` | Avatar image URL (with `text()` → `chip--avatar-text`)   |
| `avatarAlt`          | `signal<string \| undefined>`                                                                                                                                                                                               | `undefined` | Avatar `alt`; empty = decorative                         |
| `dismissible`        | `signal<boolean>`                                                                                                                                                                                                           | `false`     | Show X button                                            |
| `variant`            | `signal<'default' \| 'primary' \| 'status-success' \| 'status-warning' \| 'status-danger' \| 'filetype-image' \| 'filetype-video' \| 'filetype-document' \| 'filetype-spreadsheet' \| 'filetype-presentation' \| 'custom'>` | `'default'` | Color family                                             |
| `color`              | `signal<string \| undefined>`                                                                                                                                                                                               | `undefined` | Custom CSS token for variant='custom'                    |
| `maxWidth`           | `signal<string>`                                                                                                                                                                                                            | `'auto'`    | Max width constraint                                     |
| `chipClass()`        | `computed<string>`                                                                                                                                                                                                          | —           | Host classes: `chip`, `chip--{variant}`, layout modifiers |
| `isAvatarText()`     | `computed<boolean>`                                                                                                                                                                                                         | —           | True when `avatarSrc` + `text` present                   |
| `isIconOnly()`       | `computed<boolean>`                                                                                                                                                                                                         | —           | True when `icon` only (no text, no avatar)               |
| `dismissAriaLabel()` | `computed<string>`                                                                                                                                                                                                          | —           | Generates "Dismiss [text]" aria-label                    |

## File Map

```
apps/web/src/app/shared/components/chip/
├── chip.component.ts           (59 lines: signals, computed, outputs)
├── chip.component.html         (19 lines: template structure)
├── chip.component.scss         (variant + layout styles)
└── chip.component.spec.ts      (68 lines: unit tests)
```

## Wiring

Parent components use chip as follows:

```typescript
// In parent component (e.g., upload-area.component.ts)
import { ChipComponent } from "@shared/components/chip/chip.component";

export class UploadAreaComponent {
  protected fileTypes = signal<
    Array<{ type: string; icon: string; color: string }>
  >([
    // Populated from upload job file types
  ]);
}
```

```html
<!-- In parent template (e.g., upload-area.component.html) -->
<div class="upload-area__file-type-display">
  @for (ft of fileTypes(); track ft.type) {
  <app-chip
    [icon]="ft.icon"
    [text]="ft.type"
    [variant]="'custom'"
    [color]="ft.color"
  ></app-chip>
  }
</div>
```

**Parent Integration Pattern:**

1. Parent maintains array of chip data (icon, text, variant, color)
2. Parent iterates with `@for` to render chip instances
3. Optional: parent listens to `(chipDismissed)` to remove item from array (e.g., for filter chips)

## Sizing & Geometry

### Figma geometry (single scale)

| Property | Value |
| -------- | ----- |
| **Height** | `var(--spacing-4)` (16px) |
| **Border radius** | `var(--radius-full)` |
| **Horizontal padding** | `var(--spacing-2)` (8px); avatar-text: `padding-inline-end` `var(--spacing-2)` |
| **Gap** | `var(--spacing-1)` (icon/text); avatar-text: `var(--spacing-1)` between avatar and label |
| **Default fills** | Rest: `color-mix(in srgb, var(--primary) 10%, var(--background))`; hover: `color-mix(in srgb, var(--primary) 16%, var(--background))` (Figma ref stops **95 / 90** for warm cream / tint: **`#ffefce`** / **`#ffe08f`** — `docs/design/tokens.md` §3.1a) |
| **Label** | `--fp-sys-typescale-label-small-*`, color `--fp-sys-color-on-surface` |

### Examples

**Icon-only:** outer bounds **16×16**. Inner glyph target **8px** (`var(--spacing-2)`).

**Avatar + text:** **16px** circle `img.chip__avatar` + label, Figma `avatar-text` padding/gap.

## Styling Details

### Default Variant

- **Background (default variant):** `color-mix(in srgb, var(--primary) 10%, var(--background))` (Figma `fp/ref/primary/95` warm cream ≈ **`#ffefce`** — see **`docs/design/tokens.md` §3.1a**; dark: `color-mix` with **`var(--card)`** per `chip.component.scss`)
- **Text / icon label color (default variant):** `var(--foreground)` (tweakcn semantic on-surface ink — [`docs/design/tokens.md`](../../../design/tokens.md); bucket ownership [`docs/design/token-layers.md`](../../../design/token-layers.md))
- **Border**: transparent (no visible border on default chips)
- **Dark mode**: tinted surface via `color-mix(in srgb, var(--primary) 26%, var(--card))` (hover 34%)

### Primary Variant

- **Background**: `color-mix(in srgb, var(--chip-color) 12%, var(--card))` with **`--chip-color: var(--primary)`** on the host (`chip.component.scss` shares the file-type tint recipe)
- **Text Color**: `var(--chip-color)`
- **Border**: `1px solid color-mix(in srgb, var(--chip-color) 28%, var(--border))`

### Status Variants (reserved for status only)

- **Success**: `--color-success` (status-success)
- **Warning**: `--color-warning` (status-warning)
- **Danger**: `--color-danger` (status-danger)

Use status variants only for real system states (success/warn/error). Do not use them for file categories.

### File-Type Variants (neutral category palette)

- **filetype-image**: `--filetype-image` (warm orange)
- **filetype-pdf**: `--filetype-pdf` (red)
- **filetype-video**: `--filetype-video` (purple)
- **filetype-document**: `--filetype-document` (blue, Word-style)
- **filetype-spreadsheet**: `--filetype-spreadsheet` (green)
- **filetype-presentation**: `--filetype-presentation` (amber/orange)

Each filetype variant uses:

- **Background**: `color-mix(in srgb, <token> 12%, var(--color-bg-surface))`
- **Text/Icon**: `<token>`
- **Border**: `1px solid color-mix(in srgb, <token> 28%, var(--color-border))`

### Custom Variant

- **Background**: `color-mix(in srgb, var(color, --color-primary) 18%, var(--color-bg-surface))`
- **Text Color**: `var(color, --color-primary)`
- **Border**: `1px solid color-mix(in srgb, var(color, --color-primary) 35%, var(--color-border))`
- Uses CSS custom property supplied by parent via `[color]="tokenName"`

### Hover & Focus

- **Hover** (no action): background opacity increases to 24%; border color brightens
- **Focus** (keyboard nav): outline 2px solid primary, offset 1px
- **X Button Hover**: X icon opacity 100%, background darkens within button region

### Transitions

- Dismiss fade-out: 150ms ease-out (opacity, optional)
- Hover/focus state changes: 120ms ease-out (background, border)

## Acceptance Criteria

- [x] Component file structure created (`chip.component.{ts,html,scss,spec.ts}`)
- [x] Single Figma height **16px**; no `size` input on `ChipComponent`
- [x] Icon-only variant displays as perfect square; no text shown
- [x] Text-only variant renders without icon; width auto-adjusts
- [x] Icon + Text variant displays both with proper gap (`--spacing-1`)
- [x] Dismissible variant shows X button on right; hidden when `dismissible=false`
- [x] Status variants are used only for status semantics (never for file categories)
- [x] Filetype variants render correctly (image, video, document, spreadsheet, presentation)
- [x] Custom variant accepts CSS token name via `[color]` input
- [x] `maxWidth` input constrains chip width; text truncates with ellipsis
- [x] Hover state applies correct background color increase & border brightening
- [x] Focus state shows 2px outline ring at 1px offset
- [x] X button click emits `chipDismissed` output event
- [x] X button responds to keyboard (Space/Enter) and emits same event
- [x] Chip text respects single-line constraint; newlines are stripped
- [ ] Unit tests cover: rendering, color variants, avatar layout, click/keyboard dismiss, maxWidth truncation
- [x] SCSS compiled without errors; no CSS budget exceeded

## Implementation Checklist

- [ ] **Read specification** before coding
- [x] **Create component files** in `apps/web/src/app/shared/components/chip/`
- [x] **Implement signals & computed properties** (variant/layout derived classes, aria-label)
- [x] **Write template** following hierarchy exactly
- [x] **Write SCSS** for variant + layout combinations (use tokens throughout)
- [x] **Write unit tests** (integration tests in parent; unit tests for chip in isolation)
- [x] **Build & verify** zero compilation errors
- [ ] **Verify in browser** (variants, layouts, hover/focus, dismiss, maxWidth truncation)
- [ ] **Update glossary** (`docs/glossary.md`) with "Chip" entry if new terminology
- [ ] **Document in settings registry** if chip becomes a customizable element
