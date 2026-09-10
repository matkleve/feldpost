# ADR-0002 — JSON is the source for the design-system registry; prose is generated or secondary

- **Status:** accepted (implemented for the design-system registry; not yet extended to the component registry)
- **Date:** 2026-03-20
- **Deciders:** design-system owner
- **Applies to:** `docs/design/design-system/registry.json`; proposed extension to `docs/specs/component/registry*.md`

## Context

A registry exists to be checked, not read end to end: does this component exist, what
variants does it have, what is its lifecycle status, which spec binds it. Hand-written prose
answers those questions for a human and for nobody else — nothing can compare it to the code,
so it goes stale silently and the reuse gate that depends on it degrades without a signal.

The decision was forced before Wave 2 of the design-system migration, which needed a
machine-readable catalogue to gate on.

## Decision

The design-system registry's **source of truth is JSON**
([`registry.json`](../design/design-system/registry.json)), validated against a committed
schema ([`registry.schema.json`](../design/design-system/registry.schema.json)) by
`scripts/validate-design-system-registry.mjs`, which runs inside `npm run design-system:check`
and therefore inside `npm run verify`. Markdown about the registry describes it; it does not
define it.

Recorded at the time in
[`docs/design/design-system/registry-format-decision.md`](../design/design-system/registry-format-decision.md),
which remains the detailed contract (scope, schema v1, rollout gate). This ADR exists because
that file is not findable from a decision-shaped question.

## Alternatives considered

### YAML

Rejected because the advantage is authoring comfort and the cost is parsing ambiguity
(implicit typing, multiple ways to write the same document) in a file whose whole purpose is
being machine-checked. Nothing in this repository already parses YAML.

### Markdown tables as the source, scripts parsing them

Rejected because a table is a rendering, not a schema: column order, optional cells and
inline formatting all have to be re-derived by every consumer, and a malformed row degrades
into a silently-skipped entry rather than a validation error.

### A TypeScript module as the source

Rejected because it ties the catalogue to the app's build and type-checking, and because the
registry has to be readable by scripts that do not (and should not) compile the Angular app.

## Consequences

- **Good:** an entry that is wrong fails a check instead of misleading a reader; schema
  changes are reviewable as a diff on `registry.schema.json`.
- **Cost:** JSON is unpleasant to hand-edit, so the value only fully arrives with a generator
  that renders the human-readable views from the source.
- **Open — the decision has not been carried one folder over.** The **component** registry is
  still 1,413 lines of hand-maintained prose across `docs/specs/component/registry.md` and its
  three supplements, with no drift gate, while the reuse gate in `AGENTS.md` treats it as
  authoritative. That gap is audit item C1 in
  [`docs/audits/2026-09-08-grundriss-adoption.md`](../audits/2026-09-08-grundriss-adoption.md).
- **Gate:** `node scripts/validate-design-system-registry.mjs` — schema validity only. It does
  **not** compare the registry to the components that exist in `apps/web/src/app/shared/`.

## Evidence

- [`registry-format-decision.md`](../design/design-system/registry-format-decision.md) —
  "Selected format: JSON", decision date 2026-03-20, status implemented `[A]`.
- `docs/design/design-system/registry.json`, `registry.schema.json`,
  `scripts/validate-design-system-registry.mjs` all exist `[A]`.
- Component-registry prose measured 2026-09-10: 1,413 lines across four files `[A]`.

## Superseded by

*none*
