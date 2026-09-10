# ADR-0001 — Organise `docs/specs/` by contract kind, not by feature

- **Status:** accepted
- **Date:** 2026-04-04 (folders introduced with the `element-specs` → `specs` move, `e84de6c6`)
- **Deciders:** repository owner
- **Applies to:** everything under `docs/specs/`

## Context

Specs are contracts, and a contract is only useful if the reader can find it from what they
are holding. Two different readers arrive at this folder: one is looking at a *file* in
`apps/web/src/app/core/<module>/` and needs the contract that binds it; the other is looking
at a *screen* and needs the contract that describes it. A single flat folder serves neither,
and a feature-shaped folder serves only the second — while the service half of the repository
has a hard structural rule (service–module symmetry) that a feature layout cannot express.

## Decision

Five top-level slices, by the kind of contract, each with its own README index:

| Folder | Holds |
| --- | --- |
| `ui/` | feature-level UI contracts (map, workspace, media-detail systems) |
| `component/` | reusable UI building blocks and local component contracts |
| `service/` | service-module contracts, mirrored one-to-one to `apps/web/src/app/core/<name>/` |
| `system/` | cross-cutting behaviour systems and orchestration matrices |
| `page/` | route/page-level contracts |

The normative statement lives in [`docs/specs/README.md`](../specs/README.md) § Folder Taxonomy
(moved there from root `AGENTS.md` on 2026-09-10 when that file was capped) and is narrowed
for the docs package in [`docs/AGENTS.md`](../AGENTS.md).

## Alternatives considered

### Flat `docs/specs/*.md`

Rejected because the folder is not small: 312 spec files today (55 `ui/`, 123 `component/`,
110 `service/`, 13 `system/`, 11 `page/`). A flat folder of that size is a search problem,
not a navigation problem, and it gives the split-and-index policy nowhere to put children.

### Mirror the Angular source tree exactly (`features/`, `shared/`, `core/`)

Rejected because only one of the five kinds has a code mirror worth enforcing. `service/`
must mirror `core/<name>/` — that is service–module symmetry, and it is checkable. Extending
the same mirror to UI would force page-level and cross-cutting contracts into folders named
after the component that happens to host them today, so a refactor that moves a host would
move the contract.

### Group by feature (`upload/`, `map/`, `projects/` at the top level)

Rejected because cross-cutting systems have no owning feature, and the ones that matter most
(secondary-click routing, interaction emphasis, user lifecycle) would each have to be
arbitrarily assigned to one feature or duplicated across several. Feature grouping survives
one level down, inside `component/` (`filters/`, `map/`, `upload/`, …), where it works.

## Consequences

- **Good:** "which folder?" has one answer per contract kind; the service slice can be checked
  against `core/` mechanically; the split policy has a home for `*.supplement.md` children.
- **Cost:** a reader who thinks in features must go one level deeper, and a contract that is
  genuinely both UI and service has to pick one and stub the other — the policy says the stub
  links, never duplicates.
- **Gate:** `node scripts/lint-specs.mjs` (soft in `npm run verify`) enforces the split and
  size policy; folder placement itself is reviewed, not scripted.

## Evidence

- [`docs/specs/README.md`](../specs/README.md) § Folder Taxonomy — normative text.
- Folder counts measured 2026-09-10 with `find docs/specs/<slice> -name '*.md' | wc -l` `[A]`.
- `scripts/lint-specs.mjs` — `shouldIncludeSpecFile()` / `isSplitChildSpec()` encode the slice
  rules the taxonomy assumes.

## Superseded by

*none*
