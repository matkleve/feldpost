# Phase 4 — Cleanup & Build Verification

**Status:** Done

- [x] **Phase 4** — Cleanup & Build Verification ✅ (2026-05-13) — hygiene + token pass; **folder/barrel removals deferred** (still blocked on callsite migration; unchanged from Phase 3)
  - [ ] Remove `apps/web/src/styles/primitives/` folder (all sheets replaced) — **deferred:** shims still reference legacy classes
  - [ ] Remove `apps/web/src/styles/patterns/` folder (all patterns replaced) — **deferred:** same
  - [ ] Remove `shared/ui-primitives/ui-primitives.directive.ts` (all directives replaced) — **deferred:** shims route through legacy directives
  - [ ] Remove `shared/dropdown-trigger/dropdown-shell.component.ts` — **deferred**
  - [x] Partial audit: `#fff` on primary/clay surfaces → `var(--primary-foreground)` in `button.scss`, `pane-header`, `captured-date-editor`, `nav`; full `#hex` / `rgba()` table sweep **deferred** (gradients / map overlays / domain scrims)
  - [x] Run `npm run design-system:check` (2026-05-13)
  - [x] Run `ng build` — zero errors (pre-existing CommonJS + component-style budget warnings acceptable)
  - [x] Run `npm run lint` in `apps/web` — **exit 1:** ESLint reports existing issues (e.g. missing rule definition, `consistent-type-imports`, `no-unused-vars`, plus many `max-warnings`-failing warnings); **no new issues** in files touched only for Phase 4 (`angular.json`, `index.html`, `tokens.scss`, `styles.scss`, `button.scss`, pane/nav SCSS). `ng lint` has **no** architect target in this workspace — use `npm run lint`.
  - [x] Remove duplicate `apps/web/postcss.config.js` (Angular reads `postcss.config.json` only)
  - [x] Sass: `stylePreprocessorOptions.sass.silenceDeprecations: ["import"]` for Tailwind v4 `@import "tailwindcss"` in `styles.scss`
  - [x] Google Fonts: moved from `tokens.scss` to `<link>` in `index.html` (fixes invalid `@import` after inlined CDK overlay CSS)
