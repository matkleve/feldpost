# ADR-0005 — Implementation contracts live in `docs/specs/`, not `docs/element-specs/`

- **Status:** accepted
- **Date:** 2026-04-04 (folder moved, `e84de6c6`); repository-wide reference sweep 2026-04-28 (`838c698d`)
- **Deciders:** repository owner
- **Applies to:** every reference to a contract document, in docs, code comments and tooling

## Context

The folder was originally `docs/element-specs/`, from a period when every contract described a
UI *element*. It stopped being true: the folder now holds service-module contracts mirrored to
`apps/web/src/app/core/`, cross-cutting behaviour systems, and route-level page contracts. A
folder name that describes one of five contents teaches the wrong mental model to every new
reader, and it invited a second folder for the contracts that "are not element specs".

This ADR exists because the old name keeps resurfacing — in older documents, in archived
trees, in tooling, and in the memory of anyone who read the repository before April.

## Decision

`docs/specs/` is the only location for implementation contracts. **Any `docs/element-specs/`
path encountered anywhere is a rename, not a missing file** — resolve it to the same path
under `docs/specs/` — unless it sits under an archive tree, where it is frozen history and
must not be followed as guidance.

The term "element spec" survives as vocabulary (the writing template is still
[`element-spec-format.md`](../agent-workflows/element-spec-format.md)); only the *path* changed.

## Alternatives considered

### Keep `docs/element-specs/` and add sibling folders for services and systems

Rejected because it splits one contract system across sibling top-level folders, so "where is
the contract for X?" gains a prior question. The five slices of [ADR-0001](./0001-spec-folder-taxonomy.md)
answer the same need one level down, under a name that stays true.

### Rename the concept too — "contracts" instead of "specs"

Rejected as churn with no gain: hundreds of documents, code comments and rule files already
say *spec*, and the glossary discipline in this repository is worth more than a marginally
better word.

## Consequences

- **Good:** one path, and a deterministic rule for the legacy one.
- **Cost:** archived trees still contain `element-specs/` paths that resolve *inside the
  archive*. They are frozen on purpose; do not repoint them and do not cite them.
- **Gate:** [`scripts/check-doc-links.mjs`](../../scripts/check-doc-links.mjs) (hard, in
  `npm run verify`) catches a markdown link to a moved file. It does **not** catch a path
  written as a code span — those were swept by hand in `838c698d` and can regress.

## Evidence

- `AGENTS.md`: "Implementation contracts live under **`docs/specs/`** (not
  `docs/element-specs/`). Treat any legacy `element-specs` path as a rename unless explicitly
  archived." `[A]`
- No `docs/element-specs/` directory exists; the surviving occurrences are in
  `scripts/lint-specs.mjs`, archived trees, historical audits and one migration comment `[A]`.

## Superseded by

*none*
