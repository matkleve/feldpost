# Phase 11 — Specification sync (post-migration drift)

**Status:** Planned  
**Depends on:** Phases 6–7 materially complete (templates + tokens). Phase 10 visual QA is optional but recommended as ground truth before large batch spec edits.

## Goal

Bring every element spec under `docs/specs/` in line with the shipped Spartan / CVA migration: directive names (`hlm*`, Brain / `Brn*` primitives where applicable), token vocabulary (tweakcn semantic CSS variables instead of documenting legacy `--color-*` except where explicitly historical), deprecated `ui-*` and legacy primitive language, Ownership Matrix rows that point at real selectors/classes in the tree, and links to Phase 10 acceptance where visuals are normative.

## Pre-flight scan

From repository root (record counts + representative paths in a short baseline note before editing):

```bash
rg "\bui-" docs/specs
rg "--color-|tokens\.scss|primitive" docs/specs
rg "segmented-switch|segmented_switch" docs/specs
```

Re-run after substantive edits; attach deltas to the phase PR or decisions log if naming choices change.

## Work items

1. **Component and UI specs** — For each migrated component area in `apps/web`, confirm a matching spec exists under `docs/specs/component/` or `docs/specs/ui/`, and that Acceptance Criteria describe Spartan `hlm*` directives and Brain primitives only (no normative dependency on deleted `ui-*` class contracts).
2. **Service specs** — Update cross-references that still name old UI primitives or legacy token / file names so agents do not reintroduce removed paths.
3. **Registry** — `docs/specs/component/registry.md` is the **index**; catalog rows live in `docs/specs/component/registry.*.supplement.md`. Those tables document local `hlm*` / helm shims versus future published `@spartan-ng/ui-*-helm` (see [phase-9-spartan-upgrade.md](./phase-9-spartan-upgrade.md)) so ownership of “where the directive lives” stays explicit.
4. **Lint gate** — Run `node scripts/lint-specs.mjs` and fix regressions before merge.

## Acceptance

- No normative spec text that depends on deleted primitives (for example `container.scss`, `row-shell`) unless clearly marked **historical** with a footnote pointing at the Phase 11 archive or migration doc that superseded it — never as the active build contract.
- `node scripts/lint-specs.mjs` exits **0**.

## Definition of done

- Acceptance bullets satisfied.
- Any glossary or registry drift fixed in the same session as the spec edits that caused it (repository `AGENTS.md` / `docs/AGENTS.md` cross-links remain accurate).
