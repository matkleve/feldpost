# Phase 6 — Redirect (split 2026-05-14)

This document **formerly** held the full “full legacy removal” checklist (templates + tokens + globals in one phase).

That scope is now **split for execution clarity**:

| Topic | Canonical doc |
|-------|----------------|
| Template `ui-*` removal, `hlmToggleGroup` wiring, `hlmBtn`, delete `ui-primitives.directive.ts` | [**phase-6-template-cleanup.md**](./phase-6-template-cleanup.md) |
| Delete `tokens.scss`, migrate `var(--color-*)` / `--fp-*` in component SCSS | [**phase-7-token-migration.md**](./phase-7-token-migration.md) |
| Remove `styles/primitives/*`, slim `styles.scss`, retire `hlm-toggle-group.scss` | [**phase-8-global-scss-elimination.md**](./phase-8-global-scss-elimination.md) |
| Published `@spartan-ng/ui-*-helm` swap | [**phase-9-spartan-upgrade.md**](./phase-9-spartan-upgrade.md) |
| Cross-theme visual QA | [**phase-10-visual-qa.md**](./phase-10-visual-qa.md) |

**Status:** Use **phase-6-template-cleanup.md** for Phase 6 execution tracking.
