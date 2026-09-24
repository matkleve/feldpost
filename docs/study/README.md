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

## Read before touching

Routing lives here, not in `.cursor/rules/`. A rule file is always-applied and normative; a study has a status that changes and `[D]`s that are somebody's changeable opinion, and a study cited inside an always-applied rule gets read as carrying that rule's authority — which is the exact confusion the evidence grades exist to prevent. So the rules stay clean and the index does the routing.

| Before you touch | Read | Why |
| --- | --- | --- |
| The **upload pipeline** (also in `AGENTS.md` § Document Authority) | [STUDY-005](./005-upload-pipeline-trace-findings.md), [STUDY-006](./006-upload-pipeline-correction-plan.md) | What is broken, and the decisions + phase plan. STUDY-006 § Phase 5 is what is still open. |
| **Path parsing, grouping keys, the Search Object** | [STUDY-005](./005-upload-pipeline-trace-findings.md) F-01…F-04, F-11, F-15, [STUDY-008](./008-classification-chunking-strategy.md) | Why the classifier ranks folders over file names, and why chunking is shaped the way it is. |
| **EXIF as address evidence** | [STUDY-007](./007-exif-coordinates-as-address-evidence.md) | A GPS tag records the camera, not the subject. Confirm-only is a decision, not an oversight. |
| **Tray questions** — adding one, suppressing one, counting them | [STUDY-009](./009-tray-question-budget-and-priority.md) | Question volume is decided by folder shape, not file count. Read § The measurement before proposing a budget. |
| **Map geometry, area selection, coarse precision** | [STUDY-001](./001-area-selection-geometry.md), [STUDY-002](./002-coarse-precision-map-ux.md) | Both still `proposed` — reasoning to build on, not permission to implement. |
| **`address_precision`, location RPCs** | [STUDY-003](./003-upload-precision-data-contract-review.md) | Four of eight findings remediated; the open four are named. Nothing in it was executed — read the ceiling. |
| **`AGENTS.md`, `.cursor/rules/`, `.github/instructions/`, CONTRIBUTING** — any instruction layer | [STUDY-004](./004-organizational-redundancy-audit.md) | The duplication map and the conflict register. C-01…C-03 are still open. |
| **`docs/study/` itself** — writing, citing or gating a study | [STUDY-013](./013-study-system-audit.md), [`STUDY-FORMAT.md`](./STUDY-FORMAT.md) | What drifted, what is now enforced, and what a gate deliberately does not check. |
| **Authenticated shell / grid layout** ([#257](https://github.com/matkleve/feldpost/issues/257)) | [STUDY-015](./015-shell-grid-layout-change-plan.md) | Primitive-first shell plan — shared surface, generic main canvas, control containers, panel stack. Still `proposed`. **Read § 13 and § 14 first** — § 13 supersedes two build-order claims and names the gates that force specs before components; § 14 carries the owner's decisions, which move Settings and Account into the canvas and make the rails a widget-list render. |
| **Addable apps (widgets)** ([#258](https://github.com/matkleve/feldpost/issues/258)) | [STUDY-016](./016-addable-apps-repo-shape.md), [STUDY-017](./017-addable-apps-change-plan.md) | 016 is the repo shape. 017 is the change plan. Read 017’s last section, **current record**. Both `proposed`. Do not add tables until a spec exists. |

## Index

| id | Study | Type | Status | Subject |
| --- | --- | --- | --- | --- |
| STUDY-001 | [Area-selection geometry with variable location precision](./001-area-selection-geometry.md) | analysis | `proposed` | What "the photo's area is inside the circle" should mean geometrically; proposes equal-area discs instead of bbox-corner containment. |
| STUDY-002 | [UX for coarse-precision media on the map](./002-coarse-precision-map-ux.md) | analysis | `proposed` | What the user sees when a photo's location is known only to city precision; retrieval, disclosure, and what must replace `locationPinEligible`. |
| STUDY-003 | [Data and contract layer of the upload precision branch](./003-upload-precision-data-contract-review.md) | review | `partially-remediated` | Static review of the `address_precision` migration, RPCs, and spec drift. No database was reachable; nothing was executed. |
| STUDY-004 | [Organizational redundancy audit](./004-organizational-redundancy-audit.md) | review | `proposed` | Maps duplicated, stale, and conflicting instruction layers (AGENTS.md, rules, Copilot, workflows, guards); phased consolidation proposal. |
| STUDY-005 | [Upload pipeline — findings from the trace harness](./005-upload-pipeline-trace-findings.md) | review | `partially-remediated` | F-01 … F-10 found by running the pipeline headlessly: file names writing admin fields, `Wien` → `Schottwien`, city classification needing a country segment, O(n²) job store, ~9 ms/file classification, and a `test` gate that compiles nothing. |
| STUDY-006 | [Upload pipeline — decisions to take, and the plan to correct it](./006-upload-pipeline-correction-plan.md) | proposal | `accepted` | Six owner decisions (D-01 … D-06) that four of STUDY-005's findings depend on, then a five-phase correction plan with the verification for each step. |
| STUDY-007 | [EXIF coordinates as address evidence](./007-exif-coordinates-as-address-evidence.md) | investigation | `accepted` | Whether GPS may supply a house number (D-09), and whether nearby EXIF points may be clustered into one address. Argues that a GPS tag records the camera, not the subject — so proximity of camera positions anti-correlates with identity of address in the common construction case — and recommends confirm-only adoption asked once per address, corroboration and outlier alarms instead of distance clustering. |
| STUDY-008 | [Chunking classification without splitting what belongs together](./008-classification-chunking-strategy.md) | investigation | `accepted` | How to chunk `classifyBatch` (Phase 3.3). Measures that reading structure is ~2 900× cheaper than classifying it (0.17 s vs 8.2 min at 100 000 files), and finds that a split chunk boundary only costs a duplicate question when the user answers a tray before its remaining members arrive — so deferring tray activation may matter more than where the cut falls. |
| STUDY-009 | [Tray question budget and priority](./009-tray-question-budget-and-priority.md) | proposal | `accepted` | Owner's proposal to prioritise tray questions and suppress low-priority ones on large batches. Separates it into priority (cheap, static, buildable now), budget (needs a measurement that does not exist) and a deferred-improvement surface. Finds that the budget must count **questions after merge, not files** — 10 000 files in one folder is one question — that "20 m" is a leaky proxy for stakes where question *kind* is not, that `presentationBundleMaxDialogueUnits` is dead config that looks like an existing budget, and that suppression without a visible backlog is TRAP-021's shape. **Measured 2026-09-21 (#229): the worst of five corpus shapes asks 29 questions of 10 000 files and every one is `critical`, so the budget was closed as not planned — priority (#231) and the backlog surface (#232) shipped.** |
| STUDY-010 | [Defensive security review (static) — September 2026](./010-defensive-security-review.md) | review | `historical` | F-01…F-07 remediated in git + hosted; local-verify PASS. Do not redo — TRAP-024. |
| STUDY-011 | [The unit for EXIF inheritance is the resolution group, not the folder](./011-exif-inheritance-grouping-unit.md) | investigation | `proposed` | Whether a document with no GPS may inherit the location of the photos it arrived with ([#245](https://github.com/matkleve/feldpost/issues/245)). Measures that the **folder is the wrong unit and the resolution group is the right one**: a document in an address folder already shares its photos' `groupingKey`, media type never enters the key, and a large import already splits per street — so grouping by folder would have merged two sites into one donor set. Two customer folders on one street are one group **by decision**, and that ruling is not yet in any spec. Inheritance must be written at a site-level precision tier, which is why STUDY-007 does not forbid it. |
| STUDY-012 | [The city-disambiguation model: what it can and cannot decide](./012-disambiguation-model-evaluation.md) | investigation | `proposed` | Re-measures the disambiguation model from scratch after its cited study turned out never to have existed ([#241](https://github.com/matkleve/feldpost/issues/241), [#242](https://github.com/matkleve/feldpost/issues/242)). `DisambiguationContext` is declared, read by all three rankers and never supplied; `parserConfidence` is added as a constant to every candidate so **more confidence yields a lower top probability**; two `issue` values are unreachable; and auto-assign is reachable only below confidence `0.013` while the parser floor is `0.5` — a 20× gap. Supplying the batch context helps but **saturates at one item**, so the fix #242 specifies would leave the behaviour unchanged. |
| STUDY-013 | [The study system audits itself](./013-study-system-audit.md) | review | `proposed` | Audits `docs/study/` against its own rules. Structure holds — 9 studies, 9 index rows, unique ids, and **zero** files added to the four closed folders since 2026-09-10 (65 tracked, 61 documents) — but STUDY-009 carries an undocumented `status: decided` and a `corrected-by` that is not an id; STUDY-005 F-13 is stale (`angular.json` set `runnerConfig: true` on 2026-09-16 and closed it); STUDY-007 and STUDY-008 are still `proposed` after shipping; two studies that do not exist are cited from open issues, one reusing the live id STUDY-009; and a graded `[A]` claim was deleted from STUDY-006 on 2026-09-22. Produces the `study-format` verify check. |
| STUDY-014 | [Where a System One model would fit in Feldpost — and where it would not](./014-where-a-system-one-model-would-fit.md) | analysis | `proposed` | Answers the question STUDY-012 could not: not *is Jev good*, but *where in our own repo would a typed-decision model make sense*. Inventories 25+ closed-set decisions in `core/` — most are state, config or correct rules, with **no** fit — and finds three candidates, all links of the path→address chain. Measured: the classifier is **better than expected** (0 of 30 trade words misread as a street), so the cost is **silence, not error**, and the case is coverage rather than correctness. Also measures a new defect: `Baustelle Seestadtstrasse 5` yields street `Baustelle Seestadtstrasse`, splitting one building into two grouping keys and two tray questions. Recommends calibrating the existing classifier first — in-house, zero cost, nobody has done it — and puts Constitution § 1 data egress ahead of any quality question. **Owner 2026-09-22: no use for a typed-decision model yet; the adoption question is parked and the ordered work below it stands.** The measured defect is filed as [#261](https://github.com/matkleve/feldpost/issues/261). |
| STUDY-015 | [Shell grid layout — change plan (authenticated app)](./015-shell-grid-layout-change-plan.md) | proposal | `proposed` | [#257](https://github.com/matkleve/feldpost/issues/257): primitive-first shell — shared `shell-box` surface, four-track grid, generic main canvas, backgroundless control areas with frosted containers, panel stack, phased build Layers 0–5 then feature wiring. Mock: `docs/design/mockups/grid-shell-owner-mock-2026-09-22.png`. **Update 2026-09-22 (§ 13):** measured against the code and the gates — the rail width is stated in three places and synchronised through `document.documentElement`, which is the argument for the grid that § 1 does not make; `shell-layout-tokens.md` is stale about that mechanism; § 3's `--shell-panel-column-max` is forbidden (use an `auto` track) and § 2.3/§ 8's Storybook gate cannot run (there is no Storybook); `check-spec-coverage` forces specs before components. **Owner decisions 2026-09-22 (§ 14):** left rail drives the canvas, right rail drives the panel column, so Settings and Account are canvas content and not panels (supersedes § 5.3); four tracks with a conditional panel column; rails render an installed-widget list, joining [#258](https://github.com/matkleve/feldpost/issues/258); flex spacer between rail groups, `gap` within one; upload is right-rail only and the workspace upload tab is deleted; selection is unified and double-selection removed. Mobile is the one question still open. **Delivery plan 2026-09-22 (§ 15):** seven PRs to a flagged grid shell with the settings overlay left in place; `shellGridLayout` flag module specified; corrects § 13.1 — the rail-width property survives the grid phase because the overlay reads it; settings-to-canvas is cheaper than § 14.10 implied, since `AppComponent` already drives settings from the URL. |
| STUDY-016 | [Addable apps — how the repo can hold them](./016-addable-apps-repo-shape.md) | proposal | `proposed` | Owner’s widget means an addable app (Map, Media, later vehicles or storage), not a projects-dashboard card. Existing feature folder + page spec + lazy route is the pattern. No install table until a spec names one. |
| STUDY-017 | [Addable apps — change plan](./017-addable-apps-change-plan.md) | proposal | `proposed` | Phased plan. Current record is the last section: new signups start with Map and Media; existing apps stay unless the organization turned them off; uninstall does not delete data. Still `proposed`. Not a migration. |

## Related folders

| Folder | Holds |
| --- | --- |
| [`docs/specs/`](../specs/README.md) | The contract. Normative. |
| [`docs/TRAPS.md`](../TRAPS.md) | How the code misleads people. Read before your second attempt at a bug. |
| [`docs/ai-diary/`](../ai-diary/README.md) | What happened, day by day. |
| [`docs/audits/`](../audits/README.md) | Point-in-time findings. Not normative, dated, **closed to new files**. |
| [`docs/backlog/`](../backlog/README.md) | Deferred engineering work and plans. **Closed to new files.** |

Open tasks belong in **GitHub Issues**, not here — see [`docs/backlog/README.md`](../backlog/README.md) § Where open work lives.
