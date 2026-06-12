# Archived — Legacy Figma system-role reference tables

**Status:** Historical design export only. **Do not** use `--fp-sys-*` names in `apps/web` or active specs.

**Superseded by:** tweakcn semantics in `apps/web/src/styles.scss` (`--primary`, `--background`, `--foreground`, …) and shipped primitives (`--radius-*`, `--spacing-*`, `--font-size-*`, `--shadow-*`, `--motion-*`). Active guidance: [`docs/design/tokens.md`](../design/tokens.md) §3.1a.

**Removed from runtime:** Phase 7 Batch 16–17 (2026-05-17). See [`docs/migration/phase-7-token-migration.md`](../migration/phase-7-token-migration.md).

---

## System color roles (retired labels)

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

---

## Shape (`--fp-sys-shape-*`)

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `--fp-sys-shape-none` | `0` | 0 | Sharp corners |
| `--fp-sys-shape-extra-small` | `0.25rem` | 4px | Chips, badges |
| `--fp-sys-shape-small` | `0.5rem` | 8px | Buttons, inputs |
| `--fp-sys-shape-medium` | `0.75rem` | 12px | Cards |
| `--fp-sys-shape-large` | `1rem` | 16px | Panels |
| `--fp-sys-shape-extra-large` | `1.75rem` | 28px | Modals |
| `--fp-sys-shape-full` | `9999px` | — | Pills, avatars |

**Use instead:** `var(--radius-*)` — see `tokens.md` §3.3.

---

## Spacing (`--fp-sys-spacing-*`)

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

**Use instead:** `var(--spacing-*)` — see `tokens.md` §3.3.

---

## Elevation (`--fp-sys-elevation-*`)

Reference shadow levels 0–5 (not on `:root`). **Use instead:** `var(--shadow-sm|md|lg|xl)` — see `tokens.md` §3.5.

---

## Typescale (`--fp-sys-typescale-*`)

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

**Use instead:** `var(--font-size-*)` and global heading rules — see `tokens.md` §3.2. **Label-small in specs:** `var(--font-size-2xs)` (size), default line-height/weight from typography baseline.

---

## State layers (`--fp-sys-state-*`)

| Token | Value | State |
|-------|-------|-------|
| `--fp-sys-state-hover` | `0.08` | Pointer enters |
| `--fp-sys-state-focus` | `0.12` | Keyboard focus |
| `--fp-sys-state-pressed` | `0.12` | Active / pressed |
| `--fp-sys-state-dragged` | `0.16` | Drag in progress |
| `--fp-sys-state-disabled` | `0.38` | Disabled content opacity |

---

## Motion (`--fp-sys-motion-*`)

**Use instead:** `var(--motion-duration-fast)`, `var(--motion-ease-out)` — see `tokens.md` §3.6.
