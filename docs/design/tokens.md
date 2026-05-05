# Feldpost – Design Tokens

Load this file for any task involving visual styling, sizing, or color.

Layer ownership and alias architecture are defined in `docs/design/token-layers.md`.
Use this file for concrete values; use `token-layers.md` for layering and override rules.

## 3.1 Color Tokens

Design tokens are CSS custom properties. All components use tokens — never raw hex or Tailwind arbitrary values in design-sensitive contexts.

### §3.1a — Feldpost v2 `--fp-*` Color System

The v2 color system follows the Material Design 3 tonal architecture with the Feldpost `--fp-` prefix. It sits **above** the legacy `--color-*` tokens in `tokens.scss` and will replace them incrementally.

#### Two-layer structure

| Layer | Prefix | Purpose | Use in components? |
|-------|--------|---------|-------------------|
| Reference palette | `--fp-ref-primary-*` | Raw tonal stops (0→100). Primitives only. | No — Figma alias resolution only |
| System roles | `--fp-sys-color-*` | Semantic role per surface/role pair. | Yes — this is the component API |

#### Reference palette — primary tonal scale (seed `#CC7A4A`)

| Stop | Hex | Note |
|------|-----|------|
| 0 | `#000000` | |
| 10 | `#331200` | |
| 20 | `#542200` | |
| 30 | `#773300` | |
| 40 | `#974811` | |
| 50 | `#b66029` | |
| 60 | `#d67840` | |
| 70 | `#f69257` | |
| 80 | `#ffb68e` | |
| 87 | `#cc7a4a` | **seed** |
| 90 | `#ffdbca` | |
| 95 | `#ffede5` | |
| 99 | `#fffbff` | |
| 100 | `#ffffff` | |

#### System color roles

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `--fp-sys-color-primary` | `#974811` | `#ffb68e` | Primary action fill |
| `--fp-sys-color-on-primary` | `#ffffff` | `#542200` | Text/icon on primary |
| `--fp-sys-color-primary-container` | `#ffdbca` | `#773300` | Tinted surface (chips, selected) |
| `--fp-sys-color-on-primary-container` | `#331200` | `#ffdbca` | Text on primary container |
| `--fp-sys-color-secondary` | `#765848` | `#e6beab` | Secondary action fill |
| `--fp-sys-color-on-secondary` | `#ffffff` | `#432b1d` | Text/icon on secondary |
| `--fp-sys-color-secondary-container` | `#ffdbca` | `#5c4132` | Tinted surface (secondary) |
| `--fp-sys-color-on-secondary-container` | `#2b160a` | `#ffdbca` | Text on secondary container |
| `--fp-sys-color-tertiary` | `#636032` | `#cec991` | Tertiary / accent fill |
| `--fp-sys-color-on-tertiary` | `#ffffff` | `#343208` | Text/icon on tertiary |
| `--fp-sys-color-tertiary-container` | `#eae5ab` | `#4b481d` | Tinted surface (tertiary) |
| `--fp-sys-color-on-tertiary-container` | `#1e1c00` | `#eae5ab` | Text on tertiary container |
| `--fp-sys-color-error` | `#ba1a1a` | `#ffb4ab` | Error / destructive fill |
| `--fp-sys-color-on-error` | `#ffffff` | `#690005` | Text/icon on error |
| `--fp-sys-color-error-container` | `#ffdad6` | `#93000a` | Tinted surface (error) |
| `--fp-sys-color-on-error-container` | `#410002` | `#ffb4ab` | Text on error container |
| `--fp-sys-color-background` | `#fffbff` | `#201a17` | App / page background |
| `--fp-sys-color-on-background` | `#201a17` | `#ece0db` | Text on background |
| `--fp-sys-color-surface` | `#fffbff` | `#201a17` | Panel / card surface |
| `--fp-sys-color-on-surface` | `#201a17` | `#ece0db` | Text on surface |
| `--fp-sys-color-surface-variant` | `#f4ded4` | `#52443c` | Lower-contrast tinted surface |
| `--fp-sys-color-on-surface-variant` | `#52443c` | `#d7c2b9` | Text on surface-variant |
| `--fp-sys-color-outline` | `#85746b` | `#9f8d84` | Low-emphasis strokes, dividers |
| `--fp-sys-color-outline-variant` | `#d7c2b9` | `#52443c` | Hairline dividers |
| `--fp-sys-color-shadow` | `#000000` | `#000000` | Drop-shadow tint |
| `--fp-sys-color-scrim` | `#000000` | `#000000` | Sheet / modal scrim |
| `--fp-sys-color-inverse-surface` | `#362f2c` | `#ece0db` | Snackbar / toast surface |
| `--fp-sys-color-inverse-on-surface` | `#fbeee9` | `#362f2c` | Text on inverse surface |
| `--fp-sys-color-inverse-primary` | `#ffb68e` | `#974811` | CTA on inverse surface |

#### Migration rule

New components: use `--fp-sys-color-*` directly.
Existing components: continue using `--color-*` until the migration sprint. Do not mix both in the same component.

---

### Semantic token hierarchy (v1 — LEGACY)

| Token                        | Light value | Dark value | Usage                                                         |
| ---------------------------- | ----------- | ---------- | ------------------------------------------------------------- |
| `--color-bg-base`            | `#F9F7F4`   | `#0F0E0C`  | Page/app background — warm off-white / warm near-black        |
| `--color-bg-surface`         | `#FFFFFF`   | `#1A1917`  | Panels, sidebar, workspace pane                               |
| `--color-bg-elevated`        | `#FFFFFF`   | `#252320`  | Dropdowns, tooltips, modal overlays                           |
| `--color-bg-map`             | — (tile)    | — (tile)   | Map canvas; tile URL swaps on dark mode                       |
| `--color-border`             | `#E8E4DE`   | `#2E2B27`  | Panel borders, dividers — warm-tinted                         |
| `--color-border-strong`      | `#C8C1B8`   | `#3D3830`  | Inputs, focused borders                                       |
| `--color-text-primary`       | `#1A1714`   | `#EDEBE7`  | Headlines, body, labels — warm near-black / warm near-white   |
| `--color-text-secondary`     | `#6B6259`   | `#908880`  | Subtext, timestamps, metadata labels                          |
| `--color-text-disabled`      | `#A89E95`   | `#4A4540`  | Disabled states                                               |
| `--color-primary`            | `#CC7A4A`   | `#D9895A`  | Primary actions, active markers, focus rings                  |
| `--color-primary-hover`      | `#B8663A`   | `#E89A6E`  | Hover state for primary                                       |
| `--color-accent-brand`       | `#CC7A4A`   | `#D9895A`  | Canonical warm brand accent for CTA/selection intent          |
| `--color-accent-brand-hover` | `#B8663A`   | `#E89A6E`  | Hover variant of brand accent                                 |
| `--color-success`            | `#16A34A`   | `#22C55E`  | Upload success, confirmed correction                          |
| `--color-warning`            | `#C2610A`   | `#F59E0B`  | Missing GPS, low-confidence EXIF                              |
| `--color-danger`             | `#DC2626`   | `#EF4444`  | Upload error, deletion confirmation                           |
| `--color-accent`             | `#7C3AED`   | `#A78BFA`  | Named group tabs, badge accents                               |
| `--color-clay`               | alias       | alias      | Deprecated compatibility alias -> `var(--color-accent-brand)` |

**Map marker colors (semantic):**

| State          | Color token                                             | Meaning                            |
| -------------- | ------------------------------------------------------- | ---------------------------------- |
| Default        | `--color-primary`                                       | Normal EXIF-placed image           |
| Corrected      | `--color-accent`                                        | Marker has been manually corrected |
| Selected       | `#FFFFFF` with primary ring                             | Currently active/selected marker   |
| Pending upload | `--color-accent-brand`                                  | In upload queue, not yet saved     |
| Error          | `--color-danger`                                        | Upload failed                      |
| Cluster        | `--color-bg-elevated` with `--color-text-primary` badge | Aggregated cluster                 |

All markers use a **2px solid white outline** (`stroke: #FFFFFF; stroke-width: 2`) and a `drop-shadow(0 1px 3px rgba(0,0,0,0.45))`. This ensures legibility on any tile background — street tiles, dark matter tiles, and satellite imagery alike (Eleken principle: always test markers against the darkest and brightest backgrounds you will encounter).

#### Tile styling

The default OSM tile is never shipped unstyled. Strip the following from the base tile configuration:

- Restaurant, cafe, hotel, and retail POI icons
- Tourist attraction markers
- Parking and transit symbols (unless in a zone with heavy construction logistics)
- Decorative park and landuse labels

Keep:

- Road network (all levels, muted stroke)
- Building footprints (muted warm fill)
- Water bodies, green areas (muted, desaturated)
- Address labels at zoom ≥ 15
- Motorway and primary road labels at all zoom levels

For MVP: use CartoDB Light (Positron) in light mode — already significantly cleaner than stock OSM. Apply full custom brand tile style post-MVP (see `docs/design/README.md`, Design Debt item 3).

#### Dark mode tile layers

- **Light mode:** CartoDB Positron (clean, minimal, light) — `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`
- **Dark mode:** CartoDB Dark Matter — `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- **Dark mode alternative:** Stadia Alidade Smooth Dark — `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png`

The tile URL is set by `MapAdapter.setTileStyle('light' | 'dark')` and changes when `ThemeService` emits a theme change event.

---

### §3.1b — Shape (`--fp-sys-shape-*`)

Border-radius scale. Use `var(--fp-sys-shape-*)` in components — never raw `px` or `rem` radius values.

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `--fp-sys-shape-none` | `0` | 0 | Sharp corners (inputs that hug content) |
| `--fp-sys-shape-extra-small` | `0.25rem` | 4px | Chips, badges, small tags |
| `--fp-sys-shape-small` | `0.5rem` | 8px | Buttons, inputs, dropdowns |
| `--fp-sys-shape-medium` | `0.75rem` | 12px | Cards, thumbnails |
| `--fp-sys-shape-large` | `1rem` | 16px | Panels, sidebar, workspace pane |
| `--fp-sys-shape-extra-large` | `1.75rem` | 28px | Modals, dialogs, bottom sheets |
| `--fp-sys-shape-full` | `9999px` | — | Pills, avatar circles, FAB |

---

### §3.1c — Spacing (`--fp-sys-spacing-*`)

4px base grid. All values are in `rem` (1rem = 16px). Use these instead of arbitrary `rem`/`px` spacing in new components.

| Token | Value | Pixels |
|-------|-------|--------|
| `--fp-sys-spacing-0` | `0` | 0 |
| `--fp-sys-spacing-1` | `0.25rem` | 4px |
| `--fp-sys-spacing-2` | `0.5rem` | 8px |
| `--fp-sys-spacing-3` | `0.75rem` | 12px |
| `--fp-sys-spacing-4` | `1rem` | 16px |
| `--fp-sys-spacing-5` | `1.25rem` | 20px |
| `--fp-sys-spacing-6` | `1.5rem` | 24px |
| `--fp-sys-spacing-8` | `2rem` | 32px |
| `--fp-sys-spacing-10` | `2.5rem` | 40px |
| `--fp-sys-spacing-12` | `3rem` | 48px |
| `--fp-sys-spacing-16` | `4rem` | 64px |

---

### §3.1d — Elevation (`--fp-sys-elevation-*`)

MD3 box-shadow elevation levels 0–5. Shadow offsets and blur use `px` (project convention: `px` only for sub-pixel and shadow geometry values).

| Token | Level | Usage |
|-------|-------|-------|
| `--fp-sys-elevation-0` | `none` | Flush surfaces, page background |
| `--fp-sys-elevation-1` | `0px 1px 2px … 0px 1px 3px 1px …` | Raised card resting state |
| `--fp-sys-elevation-2` | `0px 1px 2px … 0px 2px 6px 2px …` | Navigation rail, FAB resting |
| `--fp-sys-elevation-3` | `0px 1px 3px … 0px 4px 8px 3px …` | FAB hovered, navigation drawer |
| `--fp-sys-elevation-4` | `0px 2px 3px … 0px 6px 10px 4px …` | Navigation bar, bottom sheet |
| `--fp-sys-elevation-5` | `0px 4px 4px … 0px 8px 12px 6px …` | Modal dialog, full-screen overlay |

Note: elevation tokens are skipped by `sync-tokens.mjs` (complex multi-value shorthand). Set Figma elevation effects manually.

---

### §3.1e — Typeface & Typescale (`--fp-ref-typeface-*`, `--fp-sys-typescale-*`)

#### Typefaces

Google Fonts are imported globally in `tokens.scss`. Both families are bundled via `@import url(...)` at the top of the file.

| Token | Value | Role |
|-------|-------|------|
| `--fp-ref-typeface-brand` | `'Cormorant Garamond'` | Display, headlines, editorial emphasis |
| `--fp-ref-typeface-plain` | `'DM Sans'` | Body, labels, UI copy |
| `--fp-ref-typeface-weight-regular` | `400` | |
| `--fp-ref-typeface-weight-medium` | `500` | |
| `--fp-ref-typeface-weight-bold` | `700` | |

#### Type scale

Token name format: `--fp-sys-typescale-{role}-{size|line-height|weight|tracking}`

| Role | Size | Line-height | Weight | Tracking |
|------|------|-------------|--------|---------|
| `display-large` | `3.5625rem` | `4rem` | `400` | `-0.015625rem` |
| `display-medium` | `2.8125rem` | `3.25rem` | `400` | `0rem` |
| `display-small` | `2.25rem` | `2.75rem` | `400` | `0rem` |
| `headline-large` | `2rem` | `2.5rem` | `400` | `0rem` |
| `headline-medium` | `1.75rem` | `2.25rem` | `400` | `0rem` |
| `headline-small` | `1.5rem` | `2rem` | `400` | `0rem` |
| `title-large` | `1.375rem` | `1.75rem` | `400` | `0rem` |
| `title-medium` | `1rem` | `1.5rem` | `500` | `0.009375rem` |
| `title-small` | `0.875rem` | `1.25rem` | `500` | `0.00625rem` |
| `body-large` | `1rem` | `1.5rem` | `400` | `0.03125rem` |
| `body-medium` | `0.875rem` | `1.25rem` | `400` | `0.015625rem` |
| `body-small` | `0.75rem` | `1rem` | `400` | `0.025rem` |
| `label-large` | `0.875rem` | `1.25rem` | `500` | `0.00625rem` |
| `label-medium` | `0.75rem` | `1rem` | `500` | `0.03125rem` |
| `label-small` | `0.6875rem` | `0.75rem` | `500` | `0.03125rem` |

---

### §3.1f — State Layers (`--fp-sys-state-*`)

Opacity multipliers for interactive state surfaces. Apply as the `opacity` of a filled overlay on the component's surface color.

| Token | Value | State |
|-------|-------|-------|
| `--fp-sys-state-hover` | `0.08` | Pointer enters |
| `--fp-sys-state-focus` | `0.12` | Keyboard focus |
| `--fp-sys-state-pressed` | `0.12` | Active / pressed |
| `--fp-sys-state-dragged` | `0.16` | Drag in progress |
| `--fp-sys-state-disabled` | `0.38` | Disabled content opacity |

---

### §3.1g — Motion (`--fp-sys-motion-*`)

#### Durations

| Token | Value |
|-------|-------|
| `--fp-sys-motion-duration-short1` | `50ms` |
| `--fp-sys-motion-duration-short2` | `100ms` |
| `--fp-sys-motion-duration-short3` | `150ms` |
| `--fp-sys-motion-duration-short4` | `200ms` |
| `--fp-sys-motion-duration-medium1` | `250ms` |
| `--fp-sys-motion-duration-medium2` | `300ms` |
| `--fp-sys-motion-duration-medium3` | `350ms` |
| `--fp-sys-motion-duration-medium4` | `400ms` |
| `--fp-sys-motion-duration-long1` | `450ms` |
| `--fp-sys-motion-duration-long2` | `500ms` |

#### Easings

| Token | Curve | Use |
|-------|-------|-----|
| `--fp-sys-motion-easing-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default UI transitions |
| `--fp-sys-motion-easing-standard-decelerate` | `cubic-bezier(0, 0, 0, 1)` | Elements entering the screen |
| `--fp-sys-motion-easing-standard-accelerate` | `cubic-bezier(0.3, 0, 1, 1)` | Elements leaving the screen |
| `--fp-sys-motion-easing-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | High-attention transitions |
| `--fp-sys-motion-easing-emphasized-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | Emphasized elements entering |
| `--fp-sys-motion-easing-emphasized-accelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | Emphasized elements leaving |

---

## 3.2 Typography

All text is set in the system sans-serif stack unless the brand acquires a custom typeface. The stack prioritizes native fonts for performance on field devices:

```
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

**Type scale (rem, base 16px, ratio 1.13):**

| Step | Token             | Approx size      | Usage guideline               |
| ---- | ----------------- | ---------------- | ----------------------------- |
| 2xs  | `--font-size-2xs` | 0.75rem (12px)   | Caption / dense meta text     |
| xs   | `--font-size-xs`  | 0.85rem (13.6px) | Secondary labels              |
| sm   | `--font-size-sm`  | 0.96rem (15.3px) | Compact body text             |
| md   | `--font-size-md`  | 1.08rem (17.3px) | Default reading/body emphasis |
| lg   | `--font-size-lg`  | 1.22rem (19.6px) | Section headings              |
| xl   | `--font-size-xl`  | 1.38rem (22.1px) | Panel headings                |
| 2xl  | `--font-size-2xl` | 1.56rem (25.0px) | Major titles                  |
| 3xl  | `--font-size-3xl` | 1.76rem (28.2px) | Hero/state titles             |
| 4xl  | `--font-size-4xl` | 1.99rem (31.9px) | Display-level emphasis        |

Minimum rendered text size: **12px / 0.75rem** (caption only). Body text is never below 15px.

## 3.3 Spacing and Grid

Feldpost uses a **0.25rem (4px) base unit** with a DRY modular scale driven by `--spacing-unit` and token multipliers.

| Token         | Value                            |
| ------------- | -------------------------------- |
| `--spacing-1` | `calc(var(--spacing-unit) * 1)`  |
| `--spacing-2` | `calc(var(--spacing-unit) * 2)`  |
| `--spacing-3` | `calc(var(--spacing-unit) * 3)`  |
| `--spacing-4` | `calc(var(--spacing-unit) * 4)`  |
| `--spacing-5` | `calc(var(--spacing-unit) * 6)`  |
| `--spacing-6` | `calc(var(--spacing-unit) * 8)`  |
| `--spacing-7` | `calc(var(--spacing-unit) * 12)` |
| `--spacing-8` | `calc(var(--spacing-unit) * 16)` |

Key layout dimensions:

| Element                          | Value                                                                      |
| -------------------------------- | -------------------------------------------------------------------------- |
| Sidebar width (collapsed)        | 48px (3rem)                                                                |
| Sidebar width (expanded)         | 240px (15rem)                                                              |
| Workspace pane width (default)   | 360px (22.5rem)                                                            |
| Workspace pane width (min)       | 280px (17.5rem)                                                            |
| Workspace pane width (max)       | 640px (40rem)                                                              |
| Top toolbar height               | 56px (3.5rem)                                                              |
| Bottom sheet (min / half / full) | 64px (4rem) / 50vh / 100vh                                                 |
| Map padding (viewport pre-fetch) | 10% on each edge                                                           |
| Filter panel width (desktop)     | 280px (17.5rem)                                                            |
| Narrow content rail width        | 400px (25rem)                                                              |
| Thumbnail size (grid)            | 128×128px (px intentional — image display size should not scale with font) |
| Thumbnail size (list)            | 64×64px (px intentional — image display size should not scale with font)   |
| Tap target minimum (mobile)      | 3rem × 3rem (48×48px)                                                      |
| Tap target minimum (desktop)     | 2.75rem × 2.75rem (44×44px)                                                |

**Interactive element heights (Notion-inspired compact density):**

Pointer targets always meet the 2.75rem × 3rem (44×48px) minimum via CSS `padding` — the _visual_ height of the element may be smaller. This lets the interface carry more information per row without sacrificing accessibility.

| Size      | Visual height  | Token class    | Usage                                                                      |
| --------- | -------------- | -------------- | -------------------------------------------------------------------------- |
| `compact` | 1.75rem (28px) | `.btn-compact` | Workspace pane inline micro-actions, command palette results, tab chips    |
| `default` | 2rem (32px)    | `.btn-default` | Filter panel controls, panel buttons, dropdown items                       |
| `large`   | 2.5rem (40px)  | `.btn-large`   | Primary CTAs ("Confirm upload", "Save correction"), toolbar action buttons |
| FAB       | 3.5rem (56px)  | `.btn-fab`     | Mobile upload trigger (fixed, bottom-right)                                |

Ghost buttons (the default for secondary/tertiary actions) have no background or border at rest. A `--color-bg-elevated` fill at 35–45% opacity appears on hover over 80ms. Filled buttons (primary CTAs only) use `--color-primary` fill and `--color-text-on-primary` label.

### Shared layout primitives

Use the shared primitives in `apps/web/src/styles.scss` before inventing custom panel or row shells.

| Primitive                | Role                                                                                | Default geometry                                                                            | Rules                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `.ui-container`          | Shared panel shell for sidebar, search surfaces, upload panel, and similar overlays | Panel radius `--container-radius-panel`, panel padding tokens, panel gap token              | Defines the outer geometry boundary. Sidebar, Search Bar, Upload Panel, Filter Panel, and future panels should all start from this same shell. |
| `.ui-container--compact` | Compact container variant                                                           | Uses compact inline/block padding tokens                                                    | Use when the surface needs denser internal spacing without changing outer corners.                                                             |
| `.ui-item`               | Shared row/item shell for nav rows, dropdown items, search results, and menu rows   | Fixed leading media column, flexible label column, control radius, token-driven padding/gap | Row geometry is stable across states. Do not animate padding, row height, icon column width, or gap.                                           |
| `.ui-item-media`         | Fixed leading media column                                                          | `2rem` (32px) square by default                                                             | Width stays fixed while labels, subtitles, or meta text change.                                                                                |
| `.ui-item-label`         | Flexible label/meta column                                                          | Stacks primary text and optional secondary text                                             | Use clipping/ellipsis for overflow rather than changing the row shell.                                                                         |
| `.ui-spacer`             | Flex spacer in vertical layouts                                                     | `flex: 1 1 auto`                                                                            | Use to push footer/account/actions to the end of a vertical container instead of hard-coded margins.                                           |

Primitive invariants:

- Sidebar is the reference implementation for `.ui-container`, `.ui-item`, and `.ui-spacer`.
- Search Bar uses `.ui-container` with the same panel corners as the sidebar, not a rounded-pill radius change between idle/open states.
- Sidebar, Search Bar, Upload Panel, and similar panel surfaces should share the same panel padding and gap tokens so alignment starts from a common boundary.
- Panel shells use explicit padding tokens (`--container-padding-inline-panel`, `--container-padding-block-panel`) and a dedicated panel gap token (`--container-gap-panel`).
- If a pill treatment causes transition instability, keep the standard panel radius in all states.
- Visual state changes may affect color, opacity, clipping, and outer container width or height. They must not change row geometry.

## 3.4 Border Radius

The UI uses a consistent "friendly but professional" radius system:

| Element                       | Radius                   |
| ----------------------------- | ------------------------ |
| Cards, panels, workspace pane | `rounded-xl` (12px)      |
| Buttons, inputs, dropdowns    | `rounded-lg` (8px)       |
| Chips, badges, tags           | `rounded-full`           |
| Thumbnails in grid            | `rounded-md` (6px)       |
| Map overlays / floating cards | `rounded-xl` with shadow |
| Modals                        | `rounded-2xl` (16px)     |

## 3.5 Shadows and Elevation

### Physical shadow scale

Four physical shadows define elevation only. Components should consume semantic aliases (state shadows and elevation layers) instead of hardcoding physical levels directly.

| Token                 | Light mode value                                                      | Purpose                              |
| --------------------- | --------------------------------------------------------------------- | ------------------------------------ |
| `--shadow-sm`         | `0 1px 3px rgba(15,14,12,.12), 0 1px 2px rgba(15,14,12,.08)`          | Lightest lift                        |
| `--shadow-md`         | `0 4px 12px rgba(15,14,12,.15), 0 2px 4px rgba(15,14,12,.10)`         | Standard overlay                     |
| `--shadow-lg`         | `0 8px 24px rgba(15,14,12,.18), 0 4px 8px rgba(15,14,12,.12)`         | Dropdown/popover                     |
| `--shadow-xl`         | `0 16px 48px rgba(15,14,12,.22), 0 6px 16px rgba(15,14,12,.14)`       | Modal-level                          |
| `--shadow-focus-ring` | `0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)` | Ring primitive for focus composition |

In dark mode, `sm` through `xl` are overridden with `rgba(0,0,0,...)` at higher opacity so shadows remain visible against dark surfaces. `--shadow-focus-ring` adapts automatically via `--color-primary`.

### State shadow aliases (semantic interaction)

State shadows compose from physical elevation plus optional semantic rings.

| Token               | Composition                                             | Purpose                              |
| ------------------- | ------------------------------------------------------- | ------------------------------------ |
| `--shadow-hover`    | `var(--shadow-sm)`                                      | Hover lift without changing geometry |
| `--shadow-focus`    | `var(--shadow-sm), var(--shadow-focus-ring)`            | Keyboard/mouse focus treatment       |
| `--shadow-selected` | `var(--shadow-sm), 0 0 0 2px var(--color-accent-brand)` | Selected-state emphasis              |
| `--shadow-error`    | `var(--shadow-sm), 0 0 0 2px var(--color-danger)`       | Error-state emphasis                 |

Rule: interactive components should prefer semantic state shadows (`--shadow-hover`, `--shadow-focus`, `--shadow-selected`, `--shadow-error`) over raw physical tokens when rendering state changes.

### Default border token

Use `--border-default` as the baseline neutral border (`1px` equivalent) for low-emphasis outlines and resting control borders. State borders (`--border-focus`, `--border-hover`, `--border-selected`, `--border-error`) stay available when a real border is required instead of a state shadow.

Current emphasis ordering: `--border-focus` > `--border-hover` > `--border-selected`.

Border scale tokens are available for consistent sizing semantics:

| Token         | Meaning                                      |
| ------------- | -------------------------------------------- |
| `--border-sm` | thin neutral border (`1px` equivalent)       |
| `--border-md` | medium neutral border (`1.5px` equivalent)   |
| `--border-lg` | emphasized neutral border (`2px` equivalent) |
| `--border-xl` | strong neutral border (`3px` equivalent)     |

`--border-default` maps to `--border-sm`.

### Z-index ladder

Use semantic z-index tokens only:

| Token               | Value | Layer intent                   |
| ------------------- | ----- | ------------------------------ |
| `--z-map`           | `0`   | Base map plane                 |
| `--z-panel`         | `100` | Panel/rail surfaces            |
| `--z-upload-button` | `200` | High-priority map CTA controls |
| `--z-dropdown`      | `300` | Context/dropdown overlays      |
| `--z-toast`         | `400` | Notifications above dropdowns  |
| `--z-modal`         | `500` | Modal/dialog top layer         |

### Elevation layers (semantic)

Every component's `box-shadow` references a semantic `--elevation-*` token. Elements at the **same visual plane share the same layer** — this ensures the sidebar, search bar, upload FAB, GPS button, and map markers all look like they float at the same height.

| Layer                  | Maps to       | Elements                                                                                                                                    |
| ---------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `--elevation-base`     | `none`        | Page background, flush surfaces                                                                                                             |
| `--elevation-subtle`   | `--shadow-sm` | Mobile bottom bar, drag divider (rest), location marker rings                                                                               |
| `--elevation-overlay`  | `--shadow-md` | **All map-level overlays**: sidebar, search bar, upload FAB, GPS button, placement banner, toast, upload panel, workspace pane, photo panel |
| `--elevation-dropdown` | `--shadow-lg` | Context menus, popovers, toolbar dropdowns (sort/group/filter), auth card                                                                   |
| `--elevation-modal`    | `--shadow-xl` | Delete confirmation dialog, image detail overlay, drag preview                                                                              |

**Rule**: if two elements visually sit at the same plane, they must use the same `--elevation-*` layer. To change the shadow for an entire visual plane, update the alias in `:root` — every element on that plane updates together.

**Photo marker drop shadow** (`--photo-marker-drop-shadow`) is a separate token: it uses `filter: drop-shadow(...)` so it traces the SVG/image shape rather than the bounding box. Light: `rgba(15,14,12,0.45)`. Dark: `rgba(0,0,0,0.65)`.

## 3.6 Motion and Micro-Interactions

Motion tokens are the source of truth for interaction timing and easing.

| Group          | Token                      | Value                                                     |
| -------------- | -------------------------- | --------------------------------------------------------- |
| Duration       | `--motion-duration-fast`   | `100ms`                                                   |
| Duration       | `--motion-duration-base`   | `200ms`                                                   |
| Duration       | `--motion-duration-slow`   | `300ms`                                                   |
| Easing         | `--motion-ease-standard`   | `cubic-bezier(0.4, 0, 0.2, 1)`                            |
| Easing         | `--motion-ease-in`         | `cubic-bezier(0.4, 0, 1, 1)`                              |
| Easing         | `--motion-ease-out`        | `cubic-bezier(0, 0, 0.2, 1)`                              |
| Semantic alias | `--transition-interactive` | `var(--motion-duration-fast) var(--motion-ease-out)`      |
| Semantic alias | `--transition-panel`       | `var(--motion-duration-base) var(--motion-ease-standard)` |

Compatibility aliases for existing component code:

- `--transition-fade-in: var(--transition-interactive)`
- `--transition-fade-out: var(--motion-duration-fast) var(--motion-ease-in)`
- `--transition-reveal-delay: 60ms`

## 3.7 Iconography

Use a single coherent icon set throughout. Standard for this project: **Material Icons / Material Symbols only**. Do not mix icon libraries.

Icon sizing conventions:

- Toolbar / navigation: 1.25rem (20px)
- Inline with text: 1rem (16px)
- Large actions (FAB, empty states): 2rem–2.5rem (32–40px)
- Map markers: custom SVG (not icon font)

All interactive icons must have a visible label or a `title` / `aria-label` attribute for accessibility.

---

## 3.8 Figma Bridge

### Source of truth

**Code is the source of truth. The direction is one-way:**

```
apps/web/src/styles/tokens.scss  →  docs/design/figma-tokens.json  →  Figma Variables
```

Figma represents code values; it does not define them. Token changes always flow through a code PR first, then a re-export. Figma changes do not flow back to code without a PR that updates `tokens.scss`.

### Generating the export

```bash
npm run sync-tokens
```

This runs `scripts/sync-tokens.mjs`, which parses `tokens.scss` and overwrites `docs/design/figma-tokens.json` with a W3C Design Token Community Group (DTCG) format file containing `light` and `dark` token sets.

Re-run whenever `tokens.scss` changes. Commit `figma-tokens.json` together with the SCSS change.

### Human import step (the agent stops here)

The agent's responsibility ends at `docs/design/figma-tokens.json`. Importing into Figma is a **manual step** performed by the designer:

1. Open the Figma project.
2. Use **Tokens Studio** plugin → sync from the JSON file, or
3. Use the **Variables Import** plugin → import the JSON file directly.

The agent must **never** attempt to automate the Figma-side import. If no enterprise Figma API access is available, the above manual route is the only supported path.

### Naming convention

CSS kebab-case → Figma Variable path: each hyphen-separated segment is capitalised and `/`-separated.

| CSS custom property | Figma Variable path | DTCG `$type` | Exported? |
|---|---|---|---|
| `--color-bg-base` | `Color/Bg/Base` | `color` | ✓ primitive |
| `--color-accent-brand` | `Color/Accent/Brand` | `color` | ✓ primitive |
| `--color-primary` | `Color/Primary` | — | ✗ alias (`var()`) |
| `--radius-md` | `Radius/Md` | `dimension` | ✓ primitive |
| `--spacing-unit` | `Spacing/Unit` | `dimension` | ✓ primitive |
| `--spacing-1` | `Spacing/1` | — | ✗ `calc()` |
| `--font-size-2xs` | `Font/Size/2xs` | `dimension` | ✓ primitive |
| `--font-size-md` | `Font/Size/Md` | — | ✗ `calc()` |
| `--font-weight-regular` | `Font/Weight/Regular` | `number` | ✓ primitive |
| `--motion-duration-fast` | `Motion/Duration/Fast` | `duration` | ✓ primitive |
| `--motion-ease-standard` | `Motion/Ease/Standard` | `cubicBezier` | ✓ array `[P1x,P1y,P2x,P2y]` |
| `--z-modal` | `Z/Modal` | `number` | ✓ primitive |

### What is skipped and why

| Reason | Examples | Action in Figma |
|---|---|---|
| `alias` — resolves to another token via `var()` | `--color-primary`, `--elevation-overlay` | Set manually as a Variable alias after primitives are imported |
| `calc` — computed from another token | `--spacing-1`, `--font-size-md` | Set manually or derive from the base token |
| `color-mix` — computed at render time | `--interactive-border-muted`, `--state-success-bg` | Approximate with a manual opacity or solid value |
| `complex` — multi-value shorthand | `--shadow-sm`, `--border-sm` | Set manually; shadows are not natively representable as a single Figma Variable |

Run `npm run sync-tokens` to see the full skip list with reasons printed to stdout.
