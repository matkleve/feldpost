# Phase 2 — spartan/ui Installation & Foundation

**Status:** Done

- [x] **Phase 2** — spartan/ui Installation & Foundation ✅ (2026-05-13)
  - [x] Upgrade Tailwind v3 → v4 (`tailwindcss@4.3.0`, `@tailwindcss/postcss@4.3.0`)
  - [x] Wire tweakcn CSS variables as single token foundation in `styles.scss`
  - [x] `[data-theme="dark"]` dark mode wired via `@custom-variant dark`
  - [x] `[data-theme="sandstone"]` sandstone theme preserved with tweakcn variable overrides
  - [x] Legacy aliases block in `styles.scss` preserves backward compat for all existing components
  - [x] `postcss.config.json` created for Angular builder compatibility (Angular's `@angular/build` only reads JSON postcss configs)
  - [x] Run `ng build` — green baseline ✅ (exit 0, 61s)
