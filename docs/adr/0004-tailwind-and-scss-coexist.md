# ADR-0004 — Tailwind utilities and component SCSS coexist; the rule is one owner per visual concern

- **Status:** accepted
- **Date:** 2026-04-28 (rule written into `AGENTS.md`, `838c698d`; Tailwind v4 + tweakcn foundation landed 2026-05-13)
- **Deciders:** design-system owner
- **Applies to:** every component under `apps/web/src/app/`

## Context

The migration brought Tailwind v4 and the `hlm*` (spartan) primitives into a codebase whose
components already had SCSS files, and SCSS is where this repository keeps its ownership
discipline: the geometry/state/visual triad, `@layer components` vs `@layer states`, the
two-element rule. A "no mixing" slogan appeared and was read as *never use both languages*,
which is a rule nothing in the tree follows and which would mean rewriting working components
to remove utilities that are doing no harm.

The failure the slogan was actually pointing at is different, and it is real: the same visual
concern declared twice, once in a utility class and once in SCSS, so that changing one does
nothing and the reader cannot tell which is live.

## Decision

Both are standard. **A visual concern has exactly one owner** — do not solve the same concern
(spacing, colour, radius, a state's appearance) in both Tailwind and SCSS for the same element
without an explicit, written plan. Choosing which is not a style preference:

- Design-system primitives and their variants come from `hlm*` / Tailwind.
- Ownership-bearing structure — geometry, stacking context, state layers, anything the
  ownership matrix names — belongs in component SCSS, where the layer discipline exists.

## Alternatives considered

### Tailwind-only

Rejected because the repository's hardest visual rules are expressed as CSS-layer and
ownership constraints (`@layer components` / `@layer states`, one stacking context per
component, `:host` `min-height: 0`). Utilities have no vocabulary for "this property's resting
value is declared here and its hover value there, in that order".

### SCSS-only

Rejected because the shipped design-system primitives are Tailwind-based. Rewriting `hlm*`
variants into SCSS would fork the design system to keep a slogan.

## Consequences

- **Good:** existing components stay as they are; new work uses whichever layer owns the
  concern, and the ownership question has a written answer.
- **Cost — the specificity trap.** Angular component SCSS is attribute-scoped, so a
  `color:` you set on an `hlmBtn` element outranks the primitive's Tailwind `hover:` state and
  freezes the button on hover. If you set it, you own the hover too. Documented in
  `.cursor/rules/token-usage-gate.mdc` § 5.
- **Cost — the cascade-layer trap.** Unlayered CSS beats every `@layer` rule regardless of
  specificity, so a base rule left unlayered "to beat a third-party class" also beats your own
  `@layer states` hover. Second recurrence recorded in
  [`docs/ai-diary/2026-07-01.md`](../ai-diary/2026-07-01.md); rule in
  `.cursor/rules/token-usage-gate.mdc` § 6.
- **Gate:** `npm run design-system:check` and `.cursor/rules/scss-ownership.mdc` review. The
  "same concern twice" rule itself is **not** scripted — it is a review obligation.

## Evidence

- `AGENTS.md` § Component Structure Rules → **Styling stack (default)** `[A]`.
- `.cursor/rules/scss-ownership.mdc`, `.cursor/rules/token-usage-gate.mdc` §§ 5–6 `[A]`.
- [`docs/migration/decisions-log.md`](../migration/decisions-log.md) 2026-05-13 — Tailwind v4
  and the tweakcn variable foundation `[A]`.

## Superseded by

*none*
