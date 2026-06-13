# Feldpost – Design Tokens

Load this file for any task involving visual styling, sizing, or color.

Layer ownership and alias architecture are defined in `docs/design/token-layers.md`.
Use this file for concrete values; use `token-layers.md` for layering and override rules.

## Legacy bridge (retired — `_legacy-design-tokens.scss`)

**Code is canonical** — this section mirrors **`docs/design/token-layers.md`** § *Legacy bridge (retired)* (keep both in lockstep). **Shipped tree (verify):** **`apps/web/src/styles/_legacy-design-tokens.scss` does not exist**; **`rg 'legacy-design-tokens|_legacy-design-tokens' apps/web`** → **0** matches; **`styles.scss`** has **no** **`@include meta.load-css('styles/legacy-design-tokens')`** (removed **2026-05-18**). **Batch 50** removed the last **`:root`** scaffold (zero **`--*`** emit), dropped legacy **`load-css`**, then **deleted** the partial from **`apps/web`** — migration history and token names live in **`docs/migration/phase-7-token-migration.md`** and the tables below, not on disk. **`--interactive-focus-ring`** + dark overrides: **`_typography-baseline.scss`** (**Batch 47**). **`--shadow-md|lg|xl`** and tweakcn semantics in §3.1 are **not** sourced from a bridge partial in **`apps/web`**.

### Typography baseline (`_typography-baseline.scss`)

**`:root`** in **`apps/web/src/styles/_typography-baseline.scss`** (loaded **after** **`styles.scss` `@theme inline`** via **`@include meta.load-css('styles/typography-baseline')`**) defines modular **`--font-size-*`**, **`--font-weight-*`**, **`--line-height-{tight,solid,reading,comfortable}`**, **`--motion-duration-fast`** / **`--motion-ease-out`**, **`--spacing-1`…`--spacing-8`**, **`--radius-full`**, **`--container-radius-control|panel`**, and **`--interactive-focus-ring`** (light) — Phase 7 **Batch 41** (three line-heights) + **Batch 42** (font scale, weights, comfortable line-height, motion primitives) + **Batch 44** (spacing + pill radius + container radius aliases) + **Batch 47** (focus ring + **`typography-baseline-dark-focus-ring`** for **`[data-theme='dark']`** / system dark **`:root:not([data-theme='light'])`**).

| Token |
| --- |
| `--line-height-tight`, `--line-height-solid`, `--line-height-reading`, `--line-height-comfortable` |
| `--font-size-2xs`, `--font-size-xs`, `--font-size-sm`, `--font-size-md`, `--font-size-lg`, `--font-size-xl`, `--font-size-2xl` |
| `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold` |
| `--motion-duration-fast`, `--motion-ease-out` |
| `--spacing-1` … `--spacing-6`, `--spacing-8` (the **48px** / **12×4px** step uses **`calc(0.25rem * 12)`** at callsites — **Batch 41** removed **`--spacing-7`**) |
| `--radius-full`, `--container-radius-control`, `--container-radius-panel` |
| **`--interactive-focus-ring`** (light + dark via **`_typography-baseline.scss`** selectors) |

### Tailwind theme radius (`styles.scss` `@theme inline`)

**Emitted in `styles.scss` `@theme inline`** (after tweakcn **`:root` / `html[data-theme]`** semantic blocks — **Batch 50:** no legacy bridge partial in the runtime pipeline) — **`--radius-sm`**, **`--radius-md`**, **`--radius-lg`**, **`--radius-xl`** (computed from tweakcn **`--radius`**). **Batch 44** removed duplicate **`--radius-sm|md|lg`** rows that used to live on the bridge file (components still use **`var(--radius-sm|md|lg)`** unchanged).

**Layer A (legacy bridge — retired; file absent from `apps/web`)**

| Note |
| --- |
| **Phase 7 Batch 50:** legacy bridge file **removed** from **`apps/web`** — primitives below live on tweakcn **`styles.scss`** and **`_typography-baseline.scss`**. |
| **Phase 7 Batch 45:** no physical **`--shadow-*`** rows on the bridge — use tweakcn **`styles.scss`** `:root` / dark palette. |

**Phase 7 Batch 43:** product **z-index** planes (**`200`** map chrome CTAs, **`300`** dropdown / popover shells and **`302`** filter picker flyout `+2`, **`500`** modal plane and **`501`** workspace footer drag) are **not** **`--z-*`** custom properties on the legacy bridge — use literals in SCSS / **`theme.extend.zIndex`** in **`tailwind.config.js`** (`z-upload-btn`, `z-dropdown`, `z-modal`).

**Layer B (bridge):** **none on the removed legacy bridge file** after **Batch 47** — **`--interactive-focus-ring`** lives on **`_typography-baseline.scss`** (see subsection above).

**Layer C (roles — not on `_legacy-design-tokens.scss` after Batch 48–50; file now absent)**

| Note |
| --- |
| **Phase 7 Batch 49:** **`--action-*`** rows removed from **`_legacy-design-tokens.scss`** — use **`var(--primary)`**, per-component **`:host`** vars (ex-bridge **`color-mix`** / sandstone literals), or **`--settings-action-bg-hover`** — **`docs/migration/phase-7-token-migration.md`** §Batch 49. |

**Phase 7 Batch 48** removed **`--menu-surface-border`**, **`--menu-item-bg-hover`**, **`--menu-item-text`** from the bridge; menu surfaces use **`var(--border)`**, **`var(--primary)`**, **`var(--foreground)`** in **`color-mix`** / per-component **`:host`** custom properties (see **`docs/migration/phase-7-token-migration.md`** §Batch 48). For dropdown shell / menu composition contracts, see [`docs/specs/component/filters/dropdown-system.md`](../specs/component/filters/dropdown-system.md).

## Frosted chrome (map / floating shells)

Canonical **frosted floating chrome** (nav sidebar panel, map style switch, search bar, upload preview chips, settings overlay shell fill) is defined once in **`apps/web/src/styles/_frosted-chrome.scss`**:

| Mixin | Use |
| --- | --- |
| `frosted-chrome.fill` | `var(--card)` at **85%** + `backdrop-filter: blur(16px) saturate(1.2)` |
| `frosted-chrome.surface` | `fill` + border `color-mix(var(--border) 50%)` + `var(--shadow-md)` |
| `frosted-chrome.outline-control` | Semi-transparent fill + lighter blur for **`hlmBtn` `variant="outline"`** on frosted shells (upload intake rows, map upload FAB) |
| `frosted-chrome.outline-control-hover` | Primary-tinted hover/focus wash while keeping blur |

Component SCSS must `@use '../../../styles/frosted-chrome'` (adjust depth) and `@include` — do not duplicate `%` / blur literals on map-overlay surfaces.

**Outline on frosted chrome:** Global `hlmBtn` outline uses opaque `bg-background` on solid surfaces. On map/upload frosted panels only, override with `outline-control` mixins — do **not** apply app-wide to every outline button.

## 3.1 Color Tokens

Design tokens are CSS custom properties. All components use tokens — never raw hex or Tailwind arbitrary values in design-sensitive contexts.

### §3.1a — Brand colors and tonal palettes

**Runtime:** tweakcn semantics in `apps/web/src/styles.scss` on `:root` (light), `@mixin tweakcn-dark-semantic-palette` (dark / system dark). **Tailwind v4** `@theme inline` maps `--color-primary` → `var(--primary)` (`bg-primary`, `ring-ring`, etc.).

| Tweakcn token | Role | Light (2026-05-27) | Dark |
|---------------|------|--------------------|------|
| `--primary` | Brand CTA, links, focus, charts | `#c9a84c` → `oklch(0.748 0.128 84.6)` | `#e6c364` → `oklch(0.796 0.134 80)` |
| `--primary-foreground` | Text on filled primary | white | `var(--background)` |
| `--ring` | Focus rings | matches `--primary` | matches `--primary` |
| `--destructive` | Errors | see `styles.scss` | see dark mixin |
| `--secondary` / `--muted` / `--accent` | Surfaces, chips, quiet fills | see `styles.scss` | see dark mixin |

**Tonal stop tables** below are hex design reference only (not emitted on `:root`). Use **`var(--primary)`**, **`color-mix(in srgb, var(--primary) …)`**, or a stop hex when Figma labels a ladder step. Retired Figma CSS names: [`docs/archive/design-retired-reference-tokens.md`](../archive/design-retired-reference-tokens.md), [`docs/archive/design-legacy-fp-sys-reference-tables.md`](../archive/design-legacy-fp-sys-reference-tables.md).

#### Phase 7 handoff — Tailwind `dark:` vs semantic CSS variables

- **Semantic CSS custom properties** (`--foreground`, `--background`, `--primary`, …): Under **`html[data-theme="dark"]`** and under **`@media (prefers-color-scheme: dark)`** on **`:root:not([data-theme])`**, the app applies **`@mixin tweakcn-dark-semantic-palette`**, so **values read via `var(--…)`** track **ThemeService “system”** when the OS prefers dark (no `data-theme` on `<html>`).
- **Tailwind `dark:` utilities** (for example `dark:bg-muted`): **`@custom-variant dark`** in **`apps/web/src/styles.scss`** is **`&:is([data-theme="dark"] *)`** only, so **`dark:`** classes **do not** activate for **system + OS dark** unless **`data-theme="dark"`** is present.
- **Why `dark:` is not extended in `styles.scss`:** A long-form variant that also matches system dark would use Tailwind **`@slot`** in a way Angular’s Sass pass rejects (`Top-level selectors may not contain the parent selector "&"`). Inline comment above **`@custom-variant dark`** in **`styles.scss`**; mitigations and manual QA matrix in [`phase-7-token-migration.md`](../migration/phase-7-token-migration.md) § **Risks / QA**.

#### Interaction emphasis (product semantic — `styles.scss` `:root`)

| Token | Value | Use |
| ----- | ----- | --- |
| `--interaction-selected-ink` | `var(--filetype-document)` | Persistent **selected/on** ink for quiet controls (nav active route, toggle `data-state=on`). **Not** the same as tweakcn `--secondary` (olive filled button in light mode). |
| Hover / attention ink | `var(--primary)` | Quiet control hover/focus; see `docs/design/state-visuals.md` § Interaction emphasis |

Emitted on light `:root` and in `@mixin tweakcn-dark-semantic-palette` (dark redefines `--filetype-document` for contrast).

#### Reference palette — primary (gold-amber, seed `#c9a84c` @ stop 70)

| Stop | Hex |
|------|-----|
| 0 | `#000000` |
| 5 | `#171000` |
| 10 | `#241a00` |
| 15 | `#302400` |
| 20 | `#3d2e00` |
| 25 | `#4b3900` |
| 30 | `#584400` |
| 35 | `#664f00` |
| 40 | `#755b00` |
| 50 | `#90741b` |
| 60 | `#ac8d34` |
| 70 | `#c9a84c` | **seed** |
| 80 | `#e6c364` |
| 90 | `#ffe08f` |
| 95 | `#ffefce` |
| 98 | `#fff8f1` |
| 99 | `#fffbff` |
| 100 | `#ffffff` |

#### Reference palette — secondary (blue-indigo)

| Stop | Hex |
|------|-----|
| 0 | `#000000` |
| 5 | `#001127` |
| 10 | `#001c3a` |
| 15 | `#00264b` |
| 20 | `#00315e` |
| 25 | `#003c71` |
| 30 | `#064883` |
| 35 | `#1c538f` |
| 40 | `#2c609c` |
| 50 | `#4979b7` |
| 60 | `#6493d2` |
| 70 | `#7fadef` |
| 80 | `#a4c8ff` |
| 90 | `#d4e3ff` |
| 95 | `#ebf1ff` |
| 98 | `#f9f9ff` |
| 99 | `#fdfcff` |
| 100 | `#ffffff` |

#### Reference palette — tertiary (violet-purple)

| Stop | Hex |
|------|-----|
| 0 | `#000000` |
| 5 | `#1a0b1e` |
| 10 | `#261629` |
| 15 | `#312034` |
| 20 | `#3c2a3f` |
| 25 | `#48354a` |
| 30 | `#544056` |
| 35 | `#604c62` |
| 40 | `#6c576e` |
| 50 | `#867088` |
| 60 | `#a189a2` |
| 70 | `#bca3bd` |
| 80 | `#d9bed9` |
| 90 | `#f6daf6` |
| 95 | `#ffebfd` |
| 98 | `#fff7fb` |
| 99 | `#fffbff` |
| 100 | `#ffffff` |

#### Reference palette — neutral (warm grey)

| Stop | Hex |
|------|-----|
| 0 | `#000000` |
| 5 | `#13110d` |
| 10 | `#1d1b17` |
| 15 | `#282521` |
| 20 | `#33302b` |
| 25 | `#3e3b36` |
| 30 | `#494641` |
| 35 | `#55524d` |
| 40 | `#615e58` |
| 50 | `#7b7670` |
| 60 | `#95908a` |
| 70 | `#b0aaa4` |
| 80 | `#cbc6bf` |
| 90 | `#e8e1da` |
| 95 | `#f6f0e8` |
| 98 | `#fff8f1` |
| 99 | `#fffbff` |
| 100 | `#ffffff` |

#### Reference palette — neutral-variant (warm taupe)

| Stop | Hex |
|------|-----|
| 0 | `#000000` |
| 5 | `#141108` |
| 10 | `#1f1b12` |
| 15 | `#29251c` |
| 20 | `#343026` |
| 25 | `#403b31` |
| 30 | `#4b463b` |
| 35 | `#575247` |
| 40 | `#645e52` |
| 50 | `#7d766a` |
| 60 | `#979083` |
| 70 | `#b2aa9d` |
| 80 | `#cec5b7` |
| 90 | `#eae1d3` |
| 95 | `#f9f0e1` |
| 98 | `#fff8f1` |
| 99 | `#fffbff` |
| 100 | `#ffffff` |

#### Migration rule

**New work:** use **tweakcn** semantics (`--primary`, `--background`, `--foreground`, `--muted`, `--border`, …) and shipped layout/typography/motion primitives (`--radius-*`, `--spacing-*`, `--font-size-*`, `--motion-*`, **`--shadow-sm`…`--shadow-2xl`**). Do **not** use retired **`--fp-sys-*`** or **`--fp-ref-*`** names (archived tables only). **Legacy:** the v1 **`--color-*`** story below is historical; do not add new `var(--color-*)` in component SCSS.

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
| `--color-primary`            | `#C9A84C`   | `#E6C364`  | Primary actions, active markers, focus rings (superseded by `--primary`) |
| `--color-primary-hover`      | `#AC8D34`   | `#E6C364`  | Hover state for primary                                       |
| `--color-accent-brand`       | `#C9A84C`   | `#E6C364`  | Canonical brand accent for CTA/selection intent               |
| `--color-accent-brand-hover` | `#AC8D34`   | `#E6C364`  | Hover variant of brand accent                                 |
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

**Retired Figma system-role tables** (shape, spacing, elevation, typescale labels, state, motion): [`docs/archive/design-legacy-fp-sys-reference-tables.md`](../archive/design-legacy-fp-sys-reference-tables.md). **Shipped primitives:** §§3.2–3.6 below.

---

## 3.2 Typography

All UI text uses **Source Sans 3** via **`--font-sans`**. Headings (`h1`–`h6`) use **Libre Caslon Text** via **`--font-serif`**. Short metadata strings (timestamps, coordinates, toast code pointers) use **`--font-mono`** (Courier Prime).

```
font-family: "Source Sans 3", ui-sans-serif, system-ui, sans-serif;   /* --font-sans / body + UI */
font-family: "Libre Caslon Text", ui-serif, Georgia, serif;         /* --font-serif / headings */
font-family: "Courier Prime", ui-monospace, monospace;              /* --font-mono / metadata only */
```

**Weights:** body **`400`** (`styles.scss` `@layer base` on `body`); headings **`700`** (`--font-weight-bold` on `h1`–`h6` in `_typography-baseline.scss` — Libre Caslon Text has only 400/700, so heading levels differentiate by **size** only). Labels and buttons use **`500`** (`--font-weight-medium`) where a second UI weight is needed.

**Type scale (rem, base 16px, ratio 1.13):** the modular steps are emitted on **`_typography-baseline.scss`** `:root` (Phase 7 **Batch 42** — moved from the legacy bridge; same **`calc(* * 1.13)`** chain). **Batch 31** removed the **`--font-size-ratio`** indirection — steps multiply by the literal **1.13** factor.

There is **no** separate **`--font-size-3xs`** step: a deprecated **`--font-size-3xs`** alias (same size as **2xs**) lived only in the legacy bridge **`LEGACY MAPPING`** block and was **removed** in Phase 7 **Batch 20** (2026-05-17)—use **`--font-size-2xs`** for captions and dense meta.

| Step | Token             | Approx size      | Usage guideline               |
| ---- | ----------------- | ---------------- | ----------------------------- |
| 2xs  | `--font-size-2xs` | 0.75rem (12px)   | Caption / dense meta text     |
| xs   | `--font-size-xs`  | 0.85rem (13.6px) | Secondary labels              |
| sm   | `--font-size-sm`  | 0.96rem (15.3px) | Compact body text             |
| md   | `--font-size-md`  | 1.08rem (17.3px) | Default reading/body emphasis |
| lg   | `--font-size-lg`  | 1.22rem (19.6px) | Section headings              |
| xl   | `--font-size-xl`  | 1.38rem (22.1px) | Panel headings                |
| 2xl  | `--font-size-2xl` | 1.56rem (25.0px) | Major titles                  |
| 3xl  | **(not on `:root` — Batch 33)** — use **`calc(var(--font-size-2xl) * 1.13)`** at callsites | ~1.76rem (28.2px) | Hero/state titles             |
| 4xl  | **(not on `:root` — Batch 40)** — use **`calc(var(--font-size-2xl) * 1.13 * 1.13)`** at callsites | ~1.99rem (31.9px) | Display-level emphasis        |

Minimum rendered text size: **12px / 0.75rem** (caption only). Body text is never below 15px.

## 3.3 Spacing and Grid

Feldpost uses a **0.25rem (4px) base unit** with a modular scale on `:root` (**Phase 7 Batch 31** inlined the former **`--spacing-unit`** indirection — spacing rows use **`calc(0.25rem * N)`** directly on **`apps/web/src/styles/_typography-baseline.scss` `:root`** after **Batch 44**; the legacy bridge no longer emits **`--spacing-*`**).

| Token         | Value               |
| ------------- | ------------------- |
| `--spacing-1` | `calc(0.25rem * 1)` |
| `--spacing-2` | `calc(0.25rem * 2)` |
| `--spacing-3` | `calc(0.25rem * 3)` |
| `--spacing-4` | `calc(0.25rem * 4)` |
| `--spacing-5` | `calc(0.25rem * 6)` |
| `--spacing-6` | `calc(0.25rem * 8)` |
| `--spacing-8` | `calc(0.25rem * 16)` |

**Batch 41:** the **12×4px** step (**48px**) is **`calc(0.25rem * 12)`** at callsites — **`--spacing-7`** is not a bridge `var()` anymore.

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
| `.ui-container`          | Shared panel shell for sidebar, search surfaces, upload panel, and similar overlays | Panel radius **`--container-radius-panel`**; internal padding/gap via **`var(--spacing-*)`** (Batch 40 removed **`--container-padding-*`** / **`--container-gap-*`** from the bridge) | Defines the outer geometry boundary. Sidebar, Search Bar, Upload Panel, Filter Panel, and future panels should all start from this same shell. |
| `.ui-container--compact` | Compact container variant                                                           | Denser **`var(--spacing-*)`** padding                                                                 | Use when the surface needs denser internal spacing without changing outer corners.                                                             |
| `.ui-item`               | Shared row/item shell for nav rows, dropdown items, search results, and menu rows   | Fixed leading media column, flexible label column, control radius, token-driven padding/gap | Row geometry is stable across states. Do not animate padding, row height, icon column width, or gap.                                           |
| `.ui-item-media`         | Fixed leading media column                                                          | `2rem` (32px) square by default                                                             | Width stays fixed while labels, subtitles, or meta text change.                                                                                |
| `.ui-item-label`         | Flexible label/meta column                                                          | Stacks primary text and optional secondary text                                             | Use clipping/ellipsis for overflow rather than changing the row shell.                                                                         |
| `.ui-spacer`             | Flex spacer in vertical layouts                                                     | `flex: 1 1 auto`                                                                            | Use to push footer/account/actions to the end of a vertical container instead of hard-coded margins.                                           |

Primitive invariants:

- Sidebar is the reference implementation for `.ui-container`, `.ui-item`, and `.ui-spacer`.
- Search Bar uses `.ui-container` with the same panel corners as the sidebar, not a rounded-pill radius change between idle/open states.
- Sidebar, Search Bar, Upload Panel, and similar panel surfaces should share the same panel padding and gap tokens so alignment starts from a common boundary.
- Panel shells use **`var(--spacing-*)`** for inline/block padding and gaps (**Batch 40** removed **`--container-padding-inline-panel`**, **`--container-padding-block-panel`**, **`--container-padding-inline|block-compact`**, **`--container-gap-panel`**, and **`--container-gap`** from the bridge).
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

Four physical shadows define elevation only. Components should consume **`--interactive-focus-ring`** from **`_typography-baseline.scss`** and the **`--shadow-sm|md|lg|xl`** scale from **tweakcn `styles.scss`** (**Batch 37** — former **`--elevation-*`** aliases removed; **Batch 45** — former **`--shadow-focus`** bridge alias removed — compose stacks at callsites per § *Focus stacks* below; **Batch 47** — focus ring definitions moved off **`_legacy-design-tokens.scss`**) instead of hardcoding physical levels directly.

**Batch 39 — which file owns which name:** **`--shadow-sm`…`--shadow-2xl`** are **tweakcn** names on **`:root`** / dark palette in **`apps/web/src/styles.scss`** (**Batch 39** removed duplicate **`md|lg|xl`** rows from **`_legacy-design-tokens.scss`**; **Batch 45** removed warm **`--shadow-sm`** + **`--shadow-focus`** from the bridge file when it still emitted CSS). **`var(--shadow-md|lg|xl)`** in components resolves from **tweakcn** in the main stylesheet chain (**Batch 50:** legacy bridge **`load-css`** removed; file **deleted**). **`@include meta.load-css('styles/typography-baseline')`** is **last** in **`styles.scss`** for heading order and does **not** supply **`--shadow-*`**. The table below is the **documented physical reference** for product elevation steps; tweakcn theme values should stay aligned with it at review time.

| Token                 | Light mode value                                                      | Purpose                              |
| --------------------- | --------------------------------------------------------------------- | ------------------------------------ |
| `--shadow-sm`         | `0 1px 3px rgba(15,14,12,.12), 0 1px 2px rgba(15,14,12,.08)` (reference — shipped tweakcn uses its own stack) | Lightest lift                        |
| `--shadow-md`         | `0 4px 12px rgba(15,14,12,.15), 0 2px 4px rgba(15,14,12,.10)`         | Standard overlay                     |
| `--shadow-lg`         | `0 8px 24px rgba(15,14,12,.18), 0 4px 8px rgba(15,14,12,.12)`         | Dropdown/popover                     |
| `--shadow-xl`         | `0 16px 48px rgba(15,14,12,.22), 0 6px 16px rgba(15,14,12,.14)`       | Modal-level                          |

**Phase 7 Batch 31:** the separate **`--shadow-focus-ring`** primitive was **removed** — **`--interactive-focus-ring`** is emitted on **`_typography-baseline.scss` `:root`** (light) and overridden via **`@mixin typography-baseline-dark-focus-ring`** for dark (**Batch 47** moved these rows off **`_legacy-design-tokens.scss`**).

### Focus stacks (elevation + ring)

**Phase 7 Batch 45:** **`--shadow-focus`** was removed from **`_legacy-design-tokens.scss`**. Use **`box-shadow: var(--shadow-sm)`** for the lightest lift alone, and **`box-shadow: var(--shadow-sm), var(--interactive-focus-ring)`** when dark theme needs the former composite (**`html[data-theme='dark']`** + **`@media (prefers-color-scheme: dark)`** with **`:root:not([data-theme='light'])`** — see **`media-detail-view.component.scss`**, **`metadata-property-row.component.scss`**, **`text-input-dialog.component.scss`**, **`project-select-dialog.component.scss`**). Components that need only a focus ring without changing elevation continue to use **`outline` / `border-color`** plus **`--interactive-focus-ring`** as appropriate.

### Border tokens

**Phase 7 Batch 28:** metric **`--border-sm`** … **`--border-xl`** were **removed from the bridge** — there were **no** `var(--border-(sm|md|lg|xl))` consumers under `apps/web`. For neutral strokes, use tweakcn **`var(--border)`** (and explicit `width`/`style` where needed) or a local **`color-mix(in srgb, var(--border) 72%, transparent)`** when a muted stroke is required. **Batch 39** removed **`--border-hover`** from the bridge — inline hover border mixes at callsites (for example **`media-item.component.scss`**); selected media frames use **`0.125rem solid var(--primary)`** directly (**Batch 36** removed **`--border-selected`** from the bridge).

### Z-index ladder

Use the **numeric product ladder** below (literals in SCSS or Tailwind **`z-*`** theme keys — **Phase 7 Batch 43** removed **`--z-upload-button`**, **`--z-dropdown`**, **`--z-modal`** from **`_legacy-design-tokens.scss`**). **Phase 7 Batch 32:** the base map plane no longer uses **`--z-map`** on **`_legacy-design-tokens.scss`** — **`apps/web/src/app/features/map/map-shell/_map-shell-layout.scss`** sets **`z-index: 0`** on **`.map-container`**.

| Plane / role | Value | Layer intent |
| --------------------- | ----- | ------------------------------ |
| Panel / rail stack | **`100`** | Literal **`z-index`** or Tailwind **`z-panel`** (**Batch 41** — **`--z-panel`** bridge row removed) |
| Map chrome / upload CTA | **`200`** | Search bar, upload FAB, GPS, style switch, placement banner |
| Dropdown / popover shell | **`300`** | **`DropdownShellComponent`** host, popover, inline overlays |
| Filter picker flyout (`+2`) | **`302`** | **`filter-dropdown.component.scss`** — above rule stack |
| Toast stack | **`400`** | **`toast-container.component.scss`** |
| Modal / workspace modal chrome | **`500`** | Settings overlay, media detail, account, upload panel chrome |
| Workspace footer drag (`+1`) | **`501`** | **`workspace-pane-footer.component.scss`** — above modal chrome |

**Phase 7 Batch 35:** **`--z-toast`** was removed from the bridge — **`toast-container.component.scss`** uses literal **`z-index: 400`** (between **dropdown plane `300`** and **modal plane `500`**).

### Elevation (physical shadows)

**Phase 7 Batch 37:** **`--elevation-subtle`**, **`--elevation-overlay`**, and **`--elevation-dropdown`** were **removed** from **`_legacy-design-tokens.scss`** — bind **`box-shadow`** directly to **`var(--shadow-sm)`**, **`var(--shadow-md)`**, or **`var(--shadow-lg)`** (same intent as the former aliases). **Batch 39:** legacy **`@mixin dark-theme-overrides`** no longer overrode **`--shadow-md|lg|xl`** — those names track **tweakcn** dark palette. **Batch 45:** bridge **`--shadow-sm`** / **`--shadow-focus`** rows removed. **Batch 47:** **`@mixin dark-theme-overrides`** removed from **`_legacy-design-tokens.scss`** entirely — focus ring dark overrides live on **`_typography-baseline.scss`**.

| Visual plane        | Use                    | Typical elements                                                                                                                      |
| ------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Subtle lift         | **`var(--shadow-sm)`** | Mobile bottom bar, drag divider (rest), location marker rings                                                                        |
| Map chrome / panels | **`var(--shadow-md)`** | Sidebar, search bar, upload FAB, GPS button, placement banner, upload panel, workspace pane, photo panel, toast chrome (see specs)   |
| Menus / popovers    | **`var(--shadow-lg)`** | Context menus, popovers, toolbar dropdowns (sort/group/filter), auth card                                                           |

**Phase 7 Batch 35:** **`--elevation-modal`** was removed — use **`var(--shadow-xl)`** for modal-plane shadows (e.g. CDK drag preview in **`grouping-dropdown.component.scss`**).

| Modal / top-layer shadow | Use                    | Elements                                                                                           |
| ------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------- |
| Top-layer / modal        | **`var(--shadow-xl)`** | Delete confirmation dialog, image detail overlay, drag preview                                    |

**Rule:** if two elements visually sit at the same plane, they must use the same **`--shadow-*`** step so light/dark theme stacks stay coherent (**tweakcn `styles.scss` `:root` / dark palette** — **Batch 45** removed legacy bridge shadow overrides).

**Photo marker drop shadow** — **`--photo-marker-drop-shadow`** was **removed from the bridge (Batch 39)**; **`_map-shell-leaflet-global.scss`** inlines **`filter: drop-shadow(...)`** so it traces the SVG/image shape. Reference values: light **`rgba(15,14,12,0.45)`**; dark **`rgba(0,0,0,0.65)`**.

## 3.6 Motion and Micro-Interactions

Motion tokens are the source of truth for interaction timing and easing. **`--motion-duration-slow`** was **removed from the bridge (Batch 40)** — use literal **`300ms`** where that duration is still required.

| Group          | Token                    | Value                                                     |
| -------------- | ------------------------ | --------------------------------------------------------- |
| Duration       | `--motion-duration-fast` | `100ms`                                                   |
| Easing         | `--motion-ease-out`      | `cubic-bezier(0, 0, 0.2, 1)`                              |

**Phase 7 Batch 36:** **`--motion-duration-base`** (`200ms`) and **`--motion-ease-standard`** (`cubic-bezier(0.4, 0, 0.2, 1)`) were **removed** from **`_legacy-design-tokens.scss`** — inline those literals at choreography callsites (see **`docs/migration/phase-7-token-migration.md`** §Batch 36) or use **`var(--motion-duration-fast)`** / **`var(--motion-ease-out)`** where Batch 31 already applies.

**Phase 7 Batch 31:** **`--motion-ease-in`**, **`--transition-interactive`**, and **`--transition-emphasis`** were **removed from the bridge** — use **`var(--motion-duration-fast) var(--motion-ease-out)`** (interactive fades), literal **`200ms`** for skeleton / emphasis duration (same value as the former **`--motion-duration-base`**), and **`cubic-bezier(0.4, 0, 1, 1)`** inline for fade-out where needed.

**Panel-level open/close choreography:** use **`200ms cubic-bezier(0.4, 0, 0.2, 1)`** (same duration/easing as the former **`--transition-panel`** shorthand removed in Phase 7 Batch 30) or Tailwind duration/easing utilities — see `docs/design/motion.md`.

**Phase 7 Batch 37:** **`--transition-fade-in`** and **`--transition-fade-out`** were **removed** from the bridge — use **`var(--motion-duration-fast) var(--motion-ease-out)`** and **`var(--motion-duration-fast) cubic-bezier(0.4, 0, 1, 1)`** respectively at callsites (same resolved values as the former aliases).

- **Batch 33:** **`--transition-reveal-delay`** removed from the bridge — media display reveal uses literal **`60ms`** as the transition delay after **`var(--motion-duration-fast) var(--motion-ease-out)`** (see **`docs/design/motion.md`**).

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
apps/web/src/styles.scss (+ _typography-baseline.scss)  →  docs/design/figma-tokens.json  →  Figma Variables
```

Figma represents code values; it does not define them. Token changes always flow through a code PR first, then a re-export. Figma changes do not flow back to code without a PR that updates `apps/web/src/styles.scss` (and related partials).

**Legacy note:** `scripts/sync-tokens.mjs` previously parsed **`apps/web/src/styles/_legacy-design-tokens.scss`** (removed Phase 7 Batch 50). **`npm run sync-tokens`** now **exits with an error** until the script is rewired to a supported source file — use manual JSON maintenance or a new exporter keyed off tweakcn **`styles.scss`** / **`_typography-baseline.scss`**.

### Generating the export

```bash
npm run sync-tokens
```

When rewired, this script should parse the chosen canonical SCSS and overwrite `docs/design/figma-tokens.json` with a W3C Design Token Community Group (DTCG) format file containing `light` and `dark` token sets. **Today:** the command prints a remediation message and exits **non-zero** if the legacy bridge path is missing.

Re-run whenever the canonical token SCSS changes. Commit `figma-tokens.json` together with the SCSS change.

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
| `--spacing-1` | `Spacing/1` | — | ✗ `calc()` |
| `--font-size-2xs` | `Font/Size/2xs` | `dimension` | ✓ primitive |
| `--font-size-md` | `Font/Size/Md` | — | ✗ `calc()` |
| `--font-weight-medium` | `Font/Weight/Medium` | `number` | ✓ primitive |
| `--motion-duration-fast` | `Motion/Duration/Fast` | `duration` | ✓ primitive |
| **removed from bridge** — **Batch 36** | **`Motion/Duration/Base`**, **`Motion/Ease/Standard`** | `duration` / `cubicBezier` | Use **`Motion/Duration/Fast`** / **`Slow`** + **`Motion/Ease/Out`** in Figma, or literals **`200ms`** / **`cubic-bezier(0.4, 0, 0.2, 1)`** at callsites |
| **removed from bridge** — **Batch 43** | **`Z/UploadBtn`**, **`Z/Dropdown`**, **`Z/Modal`** | `number` | Use literals **`200`**, **`300`**, **`500`** (plus **`302`** / **`501`** where `+2` / `+1` calcs apply) at callsites — not emitted as **`--z-*`** on legacy bridge |

### What is skipped and why

| Reason | Examples | Action in Figma |
|---|---|---|
| `alias` — resolves to another token via `var()` | `--color-primary`; **`--shadow-md|lg|xl`** are **tweakcn `:root`** names (**Batch 39** removed duplicate bridge definitions — not “missing,” wrong layer) | Set manually as a Variable alias after primitives are imported |
| **removed from bridge** — no longer defined for sync | e.g. former **`--font-size-3xs`** → **`--font-size-2xs`** (Batch 20) | Use **`Font/Size/2xs`** only; do not reintroduce a duplicate 3xs variable |
| **removed from bridge** — no longer defined for sync | **`--font-weight-regular`** (Batch 32) | Use **`Font/Weight/Medium`** / **`Semibold`** from the bridge where applicable, or literal **`400`** at the sole former callsite |
| `calc` — computed from another token | `--spacing-1`, `--font-size-md` | Set manually or derive from the base token |
| `color-mix` — computed at render time | Former menu mixes (**`--menu-surface-border`**, **`--menu-item-bg-hover`** — **removed Batch 48**; live as **`color-mix`** on component **`:host`**, not on **`_legacy-design-tokens.scss`**) | Approximate with a manual opacity or solid value; dropdown/menu wiring: [`docs/specs/component/filters/dropdown-system.md`](../specs/component/filters/dropdown-system.md) |
| `complex` — multi-value shorthand | **`--shadow-sm`…`--shadow-2xl`** on tweakcn **`styles.scss` `:root`** / dark palette (**Batch 45** — not bridge rows) | Set manually; shadows are not natively representable as a single Figma Variable |

Run `npm run sync-tokens` after rewiring `scripts/sync-tokens.mjs` to see the full skip list with reasons printed to stdout. Until then, the command fails fast when the legacy bridge file is absent.
