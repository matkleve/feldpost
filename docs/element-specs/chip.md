# Chip (Primitive Component)

## What It Is

A compact, inline label element that displays a single piece of information with optional leading icon, trailing action button, or both. Chips are reusable across the app for tags, filters, file types, and status indicators. Supports multiple size and state variants.

## What It Looks Like

Small pill-shaped container (height 1.375rem / 22px) with rounded borders, consistent padding, and Material Icons support. Variations range from icon-only (1.375rem × 1.375rem square) to text-only (flexible width, min 2.5rem) to icon+text combinations. Trailing "X" button is optional; when present, it's slightly darker on hover. All variants use design tokens for colors, spacing, and typography.

Chip visuals follow a **subtle look** by default: tinted background at 10-15% color mix, full-strength text/icon color for contrast, and optional fine border derived from the same base color. This prevents chips from overpowering nearby UI while keeping category distinctions clear.

**Size Strategy**: Small (1.375rem), Medium (1.625rem / 26px), Large (2rem / 32px) chip heights align with button sizing (`--font-size-xs` → `--font-size-sm-soft` → `--font-size-md` respectively).

## Where It Lives

- **Upload Area**: File-type chips (new feature — will replace text-based file list)
- **Filter Panels**: Tag/category filters
- **Status Displays**: Job status chips, phase indicators
- **Settings Sections**: Multi-select option displays
- **Search Results**: Inline category/type labels

Chips are **global shared primitives** — defined in `apps/web/src/app/shared/components/chip/` and imported as needed.

## Actions & Interactions

| Scenario                             | User Action                 | System Response                                                                                                   |
| ------------------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **View chip**                        | Display static chip in page | Render appropriate size/variant; text truncates with ellipsis if >max-width                                       |
| **Hover static chip (no action)**    | Mouse enters chip bounds    | Optional subtle background highlight (semi-transparent primary)                                                   |
| **Focus static chip (keyboard nav)** | Tab to chip or child button | Outline appears; focus ring uses `--color-primary`                                                                |
| **Click dismissible chip X button**  | Click/tap trailing X icon   | Emit `chipDismissed($event)` Output; chip fades out (optional 150ms transition); parent removes from DOM or hides |
| **Hover X button**                   | Mouse enters X region       | X icon opacity increases to full; background slightly darker                                                      |
| **Keyboard: X button**               | Space/Enter on focused X    | Same as click _dismiss_                                                                                           |

## Component Hierarchy

```
chip.component.ts [selector: app-chip]
├── .chip (root container, uses --chip-size to derive dimensions)
├── img.chip__icon—leading (optional <img>, Material Icon <span>, or SVG)
├── span.chip__text (optional, single-line truncated text)
└── button.chip__dismiss (optional, icon-only button)
    └── span.material-icons (aria-hidden)
```

**Template Structure:**

```html
<div [class.chip]="true" [class]="sizeClass() + ' ' + variantClass()">
  @if (icon()) {
  <span class="chip__icon chip__icon--leading material-icons"
    >{{ icon() }}</span
  >
  } @if (text()) {
  <span class="chip__text">{{ text() }}</span>
  } @if (dismissible()) {
  <button
    type="button"
    class="chip__dismiss"
    [attr.aria-label]="dismissAriaLabel()"
    (click)="onDismiss()"
  >
    <span class="material-icons">close</span>
  </button>
  }
</div>
```

## Data Requirements

**Inputs** (via component `@Input()` signals):

- `icon: signal<string | undefined>` — Material Icon name (e.g., `'image'`, `'description'`)
- `text: signal<string | undefined>` — Visible chip label (max 30 chars recommended; longer text truncates)
- `dismissible: signal<boolean>` — Show trailing X button (default: false)
- `size: signal<'sm' | 'md' | 'lg'>` — Chip height (default: 'sm')
- `variant: signal<'default' | 'primary' | 'status-success' | 'status-warning' | 'status-danger' | 'filetype-image' | 'filetype-video' | 'filetype-document' | 'filetype-spreadsheet' | 'filetype-presentation' | 'custom'>` — Color family
- `color: signal<string | undefined>` — Optional CSS color token for custom variants (e.g., `'--color-uploading'`)
- `maxWidth: signal<string>` — Max-width constraint (default: 'auto'; e.g., '8rem' for constrained contexts)

**Outputs**:

- `chipDismissed: EventEmitter<void>` — Fired when X button clicked; parent handles removal

## State

| Signal               | Type                                                                                                                                                                                                                        | Default     | Purpose                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------- |
| `icon`               | `signal<string \| undefined>`                                                                                                                                                                                               | `undefined` | Material Icon name (leading icon)                        |
| `text`               | `signal<string \| undefined>`                                                                                                                                                                                               | `undefined` | Visible text content                                     |
| `dismissible`        | `signal<boolean>`                                                                                                                                                                                                           | `false`     | Show X button                                            |
| `size`               | `signal<'sm' \| 'md' \| 'lg'>`                                                                                                                                                                                              | `'sm'`      | Chip height variant                                      |
| `variant`            | `signal<'default' \| 'primary' \| 'status-success' \| 'status-warning' \| 'status-danger' \| 'filetype-image' \| 'filetype-video' \| 'filetype-document' \| 'filetype-spreadsheet' \| 'filetype-presentation' \| 'custom'>` | `'default'` | Color family                                             |
| `color`              | `signal<string \| undefined>`                                                                                                                                                                                               | `undefined` | Custom CSS token for variant='custom'                    |
| `maxWidth`           | `signal<string>`                                                                                                                                                                                                            | `'auto'`    | Max width constraint                                     |
| `sizeClass()`        | `computed<string>`                                                                                                                                                                                                          | —           | Derives CSS class `chip--sm`, `chip--md`, `chip--lg`     |
| `variantClass()`     | `computed<string>`                                                                                                                                                                                                          | —           | Derives CSS class `chip--primary`, `chip--success`, etc. |
| `dismissAriaLabel()` | `computed<string>`                                                                                                                                                                                                          | —           | Generates "Dismiss [text]" aria-label                    |

## File Map

```
apps/web/src/app/shared/components/chip/
├── chip.component.ts           (59 lines: signals, computed, outputs)
├── chip.component.html         (19 lines: template structure)
├── chip.component.scss         (145 lines: all size/variant styles)
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
    [size]="'sm'"
  ></app-chip>
  }
</div>
```

**Parent Integration Pattern:**

1. Parent maintains array of chip data (icon, text, variant, color)
2. Parent iterates with `@for` to render chip instances
3. Optional: parent listens to `(chipDismissed)` to remove item from array (e.g., for filter chips)

## Sizing & Geometry

### Size Definitions

| Size   | Height          | Icon Size       | Horizontal Padding   | Vertical Padding | Font Size                          | Line Height |
| ------ | --------------- | --------------- | -------------------- | ---------------- | ---------------------------------- | ----------- |
| **sm** | 1.375rem (22px) | 1.125rem (18px) | `--spacing-2` (8px)  | 0.125rem (2px)   | `--font-size-xs` (12px)            | solid       |
| **md** | 1.625rem (26px) | 1.25rem (20px)  | `--spacing-3` (12px) | 0.1875rem (3px)  | `--font-size-sm-soft` (13px)       | solid       |
| **lg** | 2rem (32px)     | 1.5rem (24px)   | `--spacing-3` (12px) | 0.25rem (4px)    | `--font-size-md-compact` (0.85rem) | solid       |

**Gap between icon and text**: `--spacing-1` (4px) for all sizes.

**X button dimensions** (when dismissible):

- Always square; size derived from parent chip size
- Width/Height = chip-height - (2 × vertical-padding) (accounts for internal spacing)
- Icon inside button: 70% of button size (scale effect on hover)

### Examples

**Icon only (sm):**

```
┌─────────┐
│    🖼️    │  1.375rem × 1.375rem
└─────────┘
```

**Icon + Text (md):**

```
┌────────────────────┐
│  📄  filename.pdf  │  1.625rem tall, flexible width
└────────────────────┘
```

**Text only (lg) with dismiss:**

```
┌──────────────────────────┐
│   HEIC Format      ✕     │  2rem tall, dismiss button on right
└──────────────────────────┘
```

## Styling Details

### Default Variant

- **Background**: `color-mix(in srgb, var(--color-border) 48%, transparent)`
- **Text Color**: `var(--color-text-primary)`
- **Border**: `1px solid var(--color-border)`

### Primary Variant

- **Background**: `color-mix(in srgb, var(--color-primary) 18%, var(--color-bg-surface))`
- **Text Color**: `var(--color-primary)`
- **Border**: `1px solid color-mix(in srgb, var(--color-primary) 35%, var(--color-border))`

### Status Variants (reserved for status only)

- **Success**: `--color-success` (status-success)
- **Warning**: `--color-warning` (status-warning)
- **Danger**: `--color-danger` (status-danger)

Use status variants only for real system states (success/warn/error). Do not use them for file categories.

### File-Type Variants (neutral category palette)

- **filetype-image**: `--filetype-image` (blue)
- **filetype-video**: `--filetype-video` (purple)
- **filetype-document**: `--filetype-document` (indigo / blue-grey)
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
- [x] All 4 sizes render at correct heights (1.375rem, 1.625rem, 2rem)
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
- [ ] Unit tests cover: rendering, size variants, color variants, click/keyboard dismiss, maxWidth truncation
- [x] SCSS compiled without errors; no CSS budget exceeded

## Implementation Checklist

- [ ] **Read specification** before coding
- [x] **Create component files** in `apps/web/src/app/shared/components/chip/`
- [x] **Implement signals & computed properties** (size/variant derived classes, aria-label)
- [x] **Write template** following hierarchy exactly
- [x] **Write SCSS** for all size + variant combinations (use tokens throughout)
- [x] **Write unit tests** (integration tests in parent; unit tests for chip in isolation)
- [x] **Build & verify** zero compilation errors
- [ ] **Verify in browser** (all sizes, all variants, hover/focus, dismiss, maxWidth truncation)
- [ ] **Update glossary** (`docs/glossary.md`) with "Chip" entry if new terminology
- [ ] **Document in settings registry** if chip becomes a customizable element
