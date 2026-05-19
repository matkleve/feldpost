## Open Questions / Blockers

**Phase 6 / `tokens.scss`:** **N/A for Phase 7 closure (2026-05-19)** — monolithic **`tokens.scss`** successor **`_legacy-design-tokens.scss`** is **removed from `apps/web`**; component SCSS has **no** `var(--color-*)` / `var(--fp-*)` consumer hand-offs per [phase-7 § Closure verification](./phase-7-token-migration.md#closure-verification-2026-05-19). Any future **`tokens.scss`** work is Phase 8 global-SCSS scope, not a Phase 7 blocker.

1. ~~**Primary color decision (Phase 1 blocker):**~~ **RESOLVED (2026-05-13)**: `--primary = oklch(0.6716 0.1368 48.5130)` ≈ warm orange `#cc7a4a`. MD3 gold `#745b0c` kept only as `--fp-sys-color-primary` alias.

2. **spartan version pin:** spartan is under active development. Phase 3 pins `@spartan-ng/brain` to `^0.0.1-alpha.691` (verify Angular 21 + Tailwind v4 on each bump).

3. **Gap analysis vs npm (2026-05-13):** Table package names `brain-*` / `ui-*-helm` pairs are largely outdated; use `@spartan-ng/brain` subpaths. **`@spartan-ng/ui-core` ↔ Tailwind v4** peer conflict blocks installing published `@spartan-ng/ui-button-helm` without `--legacy-peer-deps` or upstream fix.

4. **Button atom shim vs icon sizing:** `buttonVariants` `size="icon"` is fixed `h-10 w-10`; legacy `uiButtonSizeSm` + `uiButtonIconOnly` had smaller hit targets — revisit when migrating map/toolbar icon-only clusters.

5. **CDK dependency overlap:** `@angular/cdk` is already installed for drag-drop. spartan uses CDK internally for overlay, focus-trap, and dialog. Both will coexist on the same CDK version — confirm no version mismatch issues.

6. **`tailwindcss-animate` dependency:** spartan requires this Tailwind plugin for component animations. Currently absent from `tailwind.config.js`. Will `npm run design-system:check` / stylelint rules need updating?

7. **`DropdownShell` vs `BrnMenu` positioning model:** The current `DropdownShell` computes `top/left` in pixels from trigger `getBoundingClientRect()`. `BrnMenu` uses CDK `FlexibleConnectedPositionStrategy`. Any component that manually calculates dropdown position must be refactored to use anchor-based positioning.

8. **Upload panel / Settings overlay as Sheet:** `BrnSheet` slides in from a side edge. The settings overlay is a two-column app-shell-level pane, and the upload panel is a slide-in panel. Evaluate whether `BrnSheet` provides enough layout flexibility or if these panels should remain custom.

9. **Toast / Sonner integration:** `ToastService` exposes a signals-based API (`toasts()` signal). spartan's Sonner-backed toast uses an imperative API (`toast.message(…)`). An adapter layer is needed to bridge the signal-based store to Sonner calls — or `ToastService` needs a refactor.

10. **Archive components:** `apps/web/src/app/archive/` contains 3 legacy components (`media-card`, `media-grid`, `media-loading`). These are not actively used. Confirm: migrate in Phase 3 or delete before migration starts?

11. **Workspace pane resizable divider:** `shared/workspace-pane/shell/drag-divider/drag-divider.component.ts` uses raw pointer events and CSS custom properties for resizing. spartan has no `ResizablePanels` primitive. Keep as custom.

12. **`@angular/cdk/overlay-prebuilt.css` import:** **Resolved for Phase 7 (2026-05-19)** — import lives in **`apps/web/src/styles.scss`** (relocated when **`tokens.scss`** graph was retired); re-verify only when changing global load order ([phase-7 Special cases §1](./phase-7-token-migration.md#special-cases), [phase-8 Preconditions](./phase-8-global-scss-elimination.md#preconditions)).

13. **Molecules (Card, Dialog, Popover, Select):** Published `@spartan-ng/ui-*-helm` packages remain Tailwind **^3**–peered — continue **local CVA + `@spartan-ng/brain`** until spartan ships v4-compatible helm. **Select:** confirm `BrnSelect` + overlay stacking with map/workspace panes. **Popover / Menu:** `DropdownShell` pixel positioning vs CDK `FlexibleConnectedPositionStrategy` (see Q7) blocks drop-in. **Dialog:** five custom dialogs need `BrnDialog` contract + focus trap parity audit before swap.
