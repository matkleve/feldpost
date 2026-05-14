# Cursor session handoff — Feldpost migration

## How to use this

Paste the **Continuation prompt** block below into a new Cursor chat or Composer at session start so the next assistant picks up Feldpost’s Angular + Spartan/Tailwind migration without re-reading the whole repo. Treat this file as a checkpoint, not a transcript; cross-check plans and phases in `docs/MIGRATION_PLAN.md` and `docs/migration/phase-*.md` before changing code.

## Continuation prompt

You are continuing Feldpost migration work in `c:\Users\kleve\Projects\feldpost`.

- **Stack**: Angular SPA; UI moving toward Spartan (`hlm*` / `brn*`) + Tailwind; component SCSS where owned per project rules.
- **Status**: Phase 6 template cleanup is largely done; ongoing burn-down aligns with Phase 7 direction — converge on `apps/web/src/styles.scss` and retire legacy token usage surfaced via `apps/web/src/styles/_legacy-design-tokens.scss` (and related app SCSS) per `docs/migration/phase-7-token-migration.md` and `docs/MIGRATION_PLAN.md`.
- **Verify before/after substantive edits**:
  - `rg "var(--color-" apps/web/src`
  - `rg "uiDropdownTrigger|UiRangeControl" apps/web/src` (templates and TS as applicable)
  - `cd apps/web && npx ng build`
- **Open follow-ups**:
  - Migrate remaining `uiDropdownTrigger` usages to the Spartan/Tailwind pattern used elsewhere in the migration.
  - Confirm `UiRangeControlDirective` is unused; remove or finish migration when nothing references it.
  - Phase 11 / spec hygiene: run `node scripts/lint-specs.mjs`, keep `docs/settings-registry.md` and spec registries in sync when specs change (`docs/migration/phase-11-spec-sync.md`).
- **Authoritative migration context** (read as needed): `docs/MIGRATION_PLAN.md`, `docs/migration/phase-*.md`.

Do not restate `AGENTS.md`; follow repo rules and i18n/SCSS gates when touching UI.
