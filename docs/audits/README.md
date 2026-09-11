# Documentation audits (`docs/audits/`)

> **Closed to new documents (2026-09-10).** New reasoning — an analysis, an investigation, a review, a proposal — goes to [`docs/study/`](../study/README.md), which carries the two axes this folder never had: an evidence grade on every claim and a status saying whether it still holds. **An audit is a study with `type: review` and `status: historical`.** The files below stay where they are and stay readable; each is reclassified into `docs/study/` **when it is next edited**, not in a bulk pass. Mapping and procedure: [`docs/study/README.md`](../study/README.md) § Where new reasoning goes.

**Purpose:** Point-in-time inventories, move passes, and gap analyses. These files are **not** implementation contracts and can drift as the tree changes.

## How to read this folder

The three kinds below are how this folder has always been indexed. They map onto study `status` values one-to-one, which is what a reclassified file carries:

| Kind | Meaning | Action | Study `status` |
| --- | --- | --- | --- |
| **Historical** | Dated pass (e.g. `2026-04-15`) recording what moved where | Use for archaeology only; do not drive new behavior from tables alone. | `historical` |
| **Reference** | Product or UX investigation that may still inform design | Cross-check against `docs/design/` and current `docs/specs/` before relying on it. | `active`, or `partially-remediated` once part of it has been acted on |
| **Superseded** | Entire approach replaced (e.g. old filter panel) | Prefer linked current spec in `docs/specs/`. | `superseded` + `corrected-by` |

**Normative contracts** always live under **`docs/specs/`** (see [`docs/specs/README.md`](../specs/README.md) and [`docs/specs/service/README.md`](../specs/service/README.md)). **`docs/implementation-blueprints/`** still exists but is likewise closed to new documents ([its README](../implementation-blueprints/README.md)) — link to specs instead.

## File index

| File | Kind | Summary |
| --- | --- | --- |
| [file-status-consolidated-2026-04-15.md](file-status-consolidated-2026-04-15.md) | Historical | Large per-path MOVED/ARCHIVED/PROTECTED matrix from doc cleanup. |
| [file-status-counts-2026-04-15.md](file-status-counts-2026-04-15.md) | Historical | Aggregate counts for that pass. |
| [moved-all-files-2026-04-15.md](moved-all-files-2026-04-15.md) | Historical | MOVED list snapshot. |
| [root-docs-coverage-2026-04-15.md](root-docs-coverage-2026-04-15.md) | Historical | Coverage notes for root docs. |
| [root-docs-move-pass-2026-04-15.md](root-docs-move-pass-2026-04-15.md) | Historical | Move pass log. |
| [root-docs-open-after-move-2026-04-15.md](root-docs-open-after-move-2026-04-15.md) | Historical | Open items after move (German headings). |
| [untouched-files-updated-root-and-readme-2026-04-15.md](untouched-files-updated-root-and-readme-2026-04-15.md) | Historical | README touch list. |
| [ui-containers-audit.md](ui-containers-audit.md) | Reference | Container system research / plan (2026-03-25); verify against current layout specs before execution. |
| [upload-process-analysis-2026-09-08/](upload-process-analysis-2026-09-08/10-findings.md) | Reference | Full static analysis of the upload subsystem (2026-09-08, commit `8e4b1e09`): structure, happy path, 51-row branch matrix, FSM, spec drift, health, failure modes, data/security, coverage, 50 findings + proposals. Read-only pass; not normative. |
| [2026-09-08-grundriss-adoption.md](2026-09-08-grundriss-adoption.md) | Reference | Grundriss ↔ Feldpost process comparison; 31 proposed adoptions with a priority table. Proposals only — nothing here is a contract until it lands in `AGENTS.md`, a gate script, or a spec. |
| [2026-09-08-design-system-adoption.md](2026-09-08-design-system-adoption.md) | Reference | Grundriss ↔ Feldpost comparison at the design-system level (interaction states, motion, type, contrast); 24 proposals with a priority table. Proposals only. |
| [2026-09-09-ui-primitives-conformance.md](2026-09-09-ui-primitives-conformance.md) | Reference | Per-primitive conformance pass over `shared/ui/` (17 primitives) against the state, motion, token, spec-coverage and dead-code rules. Proposals only. |
| [2026-09-10-map-shell-test-migration-plan.md](2026-09-10-map-shell-test-migration-plan.md) | Reference | Old-API-to-new-facade mapping table for `MapShellComponent`'s spec files, and the completion note: all 7 spec files rewritten and passing, plus the `window.matchMedia`/`setupFiles` test-infra gap that was masking 3 of them. |
| [2026-09-10-engagement-summary.md](2026-09-10-engagement-summary.md) | Reference | What the 2026-09-08 → 2026-09-10 pass found, fixed, and deliberately left alone across process, design system, UI primitives, and the test suite — one synthesis linking the four detailed audits above. |
| [upload-flow-review-2026-09-10/](upload-flow-review-2026-09-10/01-flow-walkthrough.md) | Reference | Flow-level review of the upload path (2026-09-10): walkthrough, new issues, hard cases and PO decisions, status of prior findings, address-resolution and UI findings, improvement plan, product intent vs code. Proposals only. |
| [2026-09-10-spartan-and-state.md](2026-09-10-spartan-and-state.md) | Reference | Real Spartan (`@spartan-ng`) dependency footprint (2 of 52 "TODO" files actually import it) and a state-architecture check across all 172 `@Injectable` services (1 encapsulation leak found and fixed). Proposals for the rest. |

**Do not add a file to this folder.** Write the study instead: `docs/study/NNN-slug.md`, `type: review`, with a grade on every claim ([`STUDY-FORMAT.md`](../study/STUDY-FORMAT.md)). If you are editing one of the files above, that is the moment to reclassify it — the mapping is in [`docs/study/README.md`](../study/README.md) § Migrating an existing document.
