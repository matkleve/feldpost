# Studies (`docs/study/`)

Reasoning documents — analyses, investigations, comparisons, proposals — where every claim carries an **evidence grade** (`[A]`–`[D]`) and every file carries a **status** saying whether it still holds.

Read [`STUDY-FORMAT.md`](./STUDY-FORMAT.md) before writing or citing one. Two things from it matter most when reading:

- **Trust order:** owner correction → spec → live code → study. A study never outranks the code it describes.
- **`[D]` is a decision, not a fact.** Implementing a `[D]` as though it were an `[A]` is the failure this folder exists to prevent.

Studies are never deleted and never rewritten into agreement. Corrections arrive as a new study; the old one gets `corrected-by` and a `superseded` status.

## Where new reasoning goes

**This folder, and no other.** `docs/audits/`, `docs/backlog/` and `docs/implementation-blueprints/` are **closed to new documents** as of 2026-09-10. `docs/migration/reports/` is in scope for the same rule and closes with it.

The rule exists because the problem this folder was created to solve is *fragmentation*, and a new folder that merely joins the old ones makes fragmentation worse. When this rule was written there were 63 reasoning documents across four folders — 36 in `audits/`, 18 in `migration/reports/`, 8 in `backlog/`, 1 in `implementation-blueprints/` — with **no status field and no confidence axis**, so nothing in any of them says whether it still holds or how well-evidenced it is. Adding a fifth folder would have made that 64.

| Folder | Status | What to do instead |
| --- | --- | --- |
| [`docs/audits/`](../audits/README.md) | Closed to new files | New findings are a study with `type: review`. |
| [`docs/backlog/`](../backlog/README.md) | Closed to new files | Open work is a **GitHub Issue**; the reasoning behind a plan is a study with `type: proposal`. |
| [`docs/implementation-blueprints/`](../implementation-blueprints/README.md) | Closed to new files | Normative behaviour is a spec under [`docs/specs/`](../specs/README.md); the design reasoning is a study with `type: proposal`. |
| `docs/migration/reports/` | Closed to new files | Same rule. Owned by the migration index — see [`docs/migration/README.md`](../migration/README.md). |

### Migrating an existing document

Deliberately **not** a bulk pass. [Audit item D4](../audits/2026-09-08-grundriss-adoption.md) is explicit that 30 documents must not be migrated at once; a file is reclassified **when it is next edited**, by whoever edits it. Reclassifying means: add the frontmatter, pick the `type` and `status` from the table below, grade the claims that could be acted on, move the file to `docs/study/NNN-slug.md`, and add a row to the index — then fix the inbound links in the same commit.

| It is today | It becomes |
| --- | --- |
| An audit — a dated pass recording what was true | `type: review`, `status: historical` |
| An audit whose findings are partly fixed | `type: review`, `status: partially-remediated` (name which, and where the fix landed) |
| An audit whose approach was replaced wholesale | `type: review`, `status: superseded` + `corrected-by` |
| A backlog plan nobody has accepted | `type: proposal`, `status: proposed` |
| A backlog plan the owner signed off | `type: proposal`, `status: accepted` — the normative half moves to a spec |
| An implementation blueprint | `type: proposal` — normative behaviour moves to [`docs/specs/`](../specs/README.md), reasoning stays |
| A migration report | `type: review` or `type: analysis`, usually `status: historical` |

A file that is merely *read* is not edited. Leave it alone; the old folder's README says how to read it.

## Index

| id | Study | Type | Status | Subject |
| --- | --- | --- | --- | --- |
| STUDY-001 | [Area-selection geometry with variable location precision](./001-area-selection-geometry.md) | analysis | `proposed` | What "the photo's area is inside the circle" should mean geometrically; proposes equal-area discs instead of bbox-corner containment. |
| STUDY-002 | [UX for coarse-precision media on the map](./002-coarse-precision-map-ux.md) | analysis | `proposed` | What the user sees when a photo's location is known only to city precision; retrieval, disclosure, and what must replace `locationPinEligible`. |
| STUDY-003 | [Data and contract layer of the upload precision branch](./003-upload-precision-data-contract-review.md) | review | `partially-remediated` | Static review of the `address_precision` migration, RPCs, and spec drift. No database was reachable; nothing was executed. |
| STUDY-004 | [Organizational redundancy audit](./004-organizational-redundancy-audit.md) | review | `proposed` | Maps duplicated, stale, and conflicting instruction layers (AGENTS.md, rules, Copilot, workflows, guards); phased consolidation proposal. |

## Related folders

| Folder | Holds |
| --- | --- |
| [`docs/specs/`](../specs/README.md) | The contract. Normative. |
| [`docs/TRAPS.md`](../TRAPS.md) | How the code misleads people. Read before your second attempt at a bug. |
| [`docs/ai-diary/`](../ai-diary/README.md) | What happened, day by day. |
| [`docs/audits/`](../audits/README.md) | Point-in-time findings. Not normative, dated, **closed to new files**. |
| [`docs/backlog/`](../backlog/README.md) | Deferred engineering work and plans. **Closed to new files.** |

Open tasks belong in **GitHub Issues**, not here — see [`docs/backlog/README.md`](../backlog/README.md) § Where open work lives.
