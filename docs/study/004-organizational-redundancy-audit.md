---
id: STUDY-004
type: review
status: proposed
supersedes: none
corrected-by: none
---

Measured on branch `main` at commit `870963cb632b78a4537a9e8bbb94410fc512b7e7` (2026-09-11, post–PR #129). Methods: read precedence chain (`docs/CONSTITUTION.md` → `AGENTS.md` § Document Authority → `docs/adr/README.md`); inventory of organizational layers; heading/section overlap and near-verbatim comparison; `node scripts/check-doc-links.mjs` (pass); `node scripts/check-skills-source.mjs` (pass); `rg` across `scripts/` for guards asserting doc text; spot-check of `.github/instructions/` vs `.cursor/rules/` vs `AGENTS.md`; sample of closed-folder legacy docs (`docs/audits/`, `docs/backlog/`, `docs/implementation-blueprints/`, `docs/migration/reports/`). No files were edited except this study and its index row.

---

## 1. Executive summary

| Severity | Count | One-line rationale |
| --- | ---: | --- |
| **Critical** | 0 | No open guard pins stale verbatim text in `AGENTS.md`; `guard-visual-behavior.mjs` was fixed 2026-09-10 [A]. |
| **High** | 5 | ADR-0006 violated by Copilot instruction surfaces; triple workflow-doc stack; intentional `AGENTS.md` + `.cursor/rules` dual normative layer with drift risk; stale `CONTRIBUTING.md` debt table; legacy token names in Copilot styling instructions. |
| **Medium** | 8 | TRAPS ↔ rules overlap; token doc triple stack; styling-gate triple pointer; stale governance report; 64 unmigrated reasoning docs; element-spec template duplicated; weak `idea-to-ship` linkage; registry `composed-of` still names stale selector. |
| **Low** | 4 | Removed `docs/skills/` path still cited; `GOVERNANCE-*` artifacts rarely read; agent persona files restate review gates; `element-spec-format` vs spec README boundary blur. |
| **Informational** | 6 | Pointer files (`CLAUDE.md`, `docs/AGENTS.md`); CONSTITUTION ↔ design chapter; skills dedup gate working; package `AGENTS.md` pointer pattern; `gates-and-commands.md` anti-copy policy; ADR index routing. |

**Top 3 risks**

1. **Copilot harness bypasses the single-instruction-file decision.** [ADR-0006](adr/0006-one-instruction-file.md) accepts `.cursor/rules/*.mdc` as extensions but forbids restating rules in tool overlays. `.github/copilot-instructions.md` (~113 lines) and nine `.github/instructions/*.md` files (~345 lines combined) still carry normative rules, some with removed token names [A][B].
2. **Always-applied rules + `AGENTS.md` index duplicate the same subjects.** Seven `.mdc` files (379 lines) extend root `AGENTS.md` (147 lines) per ADR-0006 — correct by policy, but agents loading both pay ~526 lines before feature specs, with paraphrased overlap on FSM, tokens, i18n, component reuse, and visual behavior [A][C].
3. **Human-facing gate docs drift from `scripts/verify.mjs`.** `CONTRIBUTING.md` still lists three soft checks and 2026-09-08 debt numbers; `verify.mjs` registers four soft checks with 2026-09-10 counts and adds `spec-code-paths`, `skills-source`, `component-registry` [A].

**Estimated agent token tax (UI component task)**

A Cursor agent touching a new shared component typically loads: root `AGENTS.md` (147) + seven always-applied rules (379) + `apps/web/AGENTS.md` (52) + `element-spec-format.md` or target spec + `agent-css-variable-contract.md` (128) + often `component-structure` skill — **~8–12 organizational documents, ~900–1,400 lines of instruction-layer prose** before the feature spec [C]. Not all lines repeat the same rule, but **~120–200 lines** restate the same decisions (FSM, ownership matrix, tokens, i18n steps, verify gate) in different words [C].

**Automation checks (this run)**

```
✓ doc-links: every relative link in 566 documents resolves
✓ skills-source: 12 skills in .cursor/skills/, 12 pointer stub(s) across 1 mirror tree(s) (.github/skills), no duplicated content
```

---

## 2. Inventory (organizational layers)

| Path | Stated purpose | Audience | Update signal | Normative / reference |
| --- | --- | --- | --- | --- |
| `docs/CONSTITUTION.md` (130 lines) | Eight product non-negotiables; outranks all | Agent + human | 2026-09-10 stream merge [B] | **Normative** (constitutional) |
| `AGENTS.md` (147 lines, cap 150) | Single instruction file; precedence map | Agent + CI (`agents-md-max-lines`) | 2026-09-10 [A] | **Normative** |
| `.cursor/rules/*.mdc` (7 files, 379 lines) | Normative extensions (item 3 precedence) | Cursor agents (always applied) | 2026-09-10 [A] | **Normative** |
| `CLAUDE.md` (5 lines) | Pointer to `AGENTS.md` | Claude Code | 2026-09-10 [A] | Pointer |
| `docs/AGENTS.md` (24 lines) | Docs package index | Agents in `docs/` | 2026-09-10 [B] | Pointer |
| `apps/web/AGENTS.md` (52 lines) | Angular package narrowing + pointers | Web agents | 2026-09-10 [A] | Pointer + narrow rules |
| `supabase/AGENTS.md` (73 lines) | DB/migration/hosted-history rules | Supabase agents | Pre-2026-09 [B] | Normative (package) |
| `.github/copilot-instructions.md` (113 lines) | Copilot shortcut | Copilot | Mixed pointer + body [A] | **Conflicts with ADR-0006** |
| `.github/instructions/*.md` (9 files, ~345 lines) | Path-scoped Copilot rules | Copilot | Legacy tokens in styling [A] | **Conflicts with ADR-0006** |
| `.github/agents/*.md` (5 personas + README) | Pipeline personas | Copilot agents | 2026-09 [B] | Mixed pointer + restatement |
| `.cursor/skills/**/SKILL.md` (12 live) | Task skills (canonical) | Cursor | 2026-09-10 dedup [A] | Normative when invoked |
| `.github/skills/**/SKILL.md` (12 stubs) | Pointers to `.cursor/skills` | Copilot | Gate-enforced [A] | Pointer |
| `docs/specs/README.md` (103 lines) | Spec governance authority | Agent + human | 2026-09-10 [A] | **Normative** |
| `docs/specs/GOVERNANCE-*.md` (4 files) | Generated/heuristic reports | CI/human | Duplication report **2026-04-15** [A] | Reference (stale date) |
| `docs/agent-workflows/*.md` (10 files, ~1,579 lines) | Workflows, gates detail, communication | Agent | `gates-and-commands` 2026-09-10 [A] | Normative (by `AGENTS.md` map) |
| `docs/playbooks/idea-to-ship-pipeline.md` (302 lines) | DoR/DoD, 8 stages | Agent | Pre-2026-09 [B] | Normative (weakly linked) |
| `docs/study/` (3 prior + this) | Graded reasoning | Agent + human | 2026-09-10 folder closure [A] | Reference (`proposed` = not contract) |
| `docs/audits/` + `backlog/` + `implementation-blueprints/` + `migration/reports/` | Legacy reasoning | Human archaeology | **Closed 2026-09-10**; **64** `.md` files remain [A] | Historical |
| `docs/TRAPS.md` (269 lines) | Misleading-code catalogue | Agent | 2026-09-10 [A] | Reference (promoted lessons) |
| `docs/design/tokens.md` (571 lines) | Token semantics | Agent + human | Ongoing [B] | Reference + partial normative |
| `docs/design/agent-css-variable-contract.md` (128 lines) | SCSS variable decision tree | Agent | 2026-09 [B] | **Normative** for SCSS |
| `docs/design/constitution.md` (99 lines) | Design chapter of CONSTITUTION | Agent | Linked from CONSTITUTION [A] | **Normative** (design slice) |
| `docs/adr/0001`–`0007` | Decisions + rejected alternatives | Human + agent | 2026-09-10 (0006, 0007) [A] | Normative (decisions) |
| `scripts/verify.mjs` + gate scripts | Enforced checks | CI + agent | 2026-09-10 [A] | **Normative** (mechanical) |

---

## 3. Redundancy map

| ID | Locations | Relationship | Severity | Evidence |
| --- | --- | --- | --- | --- |
| R-01 | `AGENTS.md` L88–97 + `.cursor/rules/visual-behavior.mdc` L6–41 | paraphrase | Medium | Ownership matrix / triad / stacking: AGENTS indexes rule file; rule file is normative body [A]. |
| R-02 | `AGENTS.md` L86 + `.cursor/rules/ui-state-machine.mdc` L6–24 + `idea-to-ship-pipeline.md` § State coherence | paraphrase | Medium | FSM required for stateful UI stated in three places [A]. |
| R-03 | `AGENTS.md` L143–146 + seven `.mdc` Sub-rules Index | pointer-ok | Informational | Index-only in `AGENTS.md`; bodies in `.mdc` — matches ADR-0006 [A]. |
| R-04 | `.cursor/rules/i18n-workflow.mdc` + `.github/copilot-instructions.md` L84–93 | verbatim | High | Same CSV → SQL pipeline steps in both [A]. |
| R-05 | `.cursor/rules/bulk-operation-safety.mdc` + `.github/copilot-instructions.md` L103–113 | paraphrase | High | Bulk-replace gates duplicated for Copilot [A]. |
| R-06 | `docs/agent-workflows/service-symmetry-standard.md` + `.github/copilot-instructions.md` L52–82 + `.github/instructions/service-symmetry.instructions.md` | paraphrase | High | Service symmetry in three Copilot-visible places [A]. |
| R-07 | `.github/copilot-instructions.md` L26–36 + `AGENTS.md` L43–50 | paraphrase | High | Angular coding conventions restated; ADR-0006 forbids [A]. |
| R-08 | `.github/instructions/*.md` (9) + `AGENTS.md` / `.cursor/rules` / `docs/agent-workflows` | paraphrase | High | Parallel Copilot-only rule layer (~345 lines); no drift gate [A][C]. |
| R-09 | `docs/agent-workflows/agent-communication.md` L148–150 + `.github/agents/README.md` L15–32 | paraphrase | Medium | Component styling gate: mutual pointers, same content twice [A]. |
| R-10 | `docs/TRAPS.md` TRAP-004/005 + `.cursor/rules/token-usage-gate.mdc` §6–7 + `scss-ownership.mdc` | paraphrase | Medium | Cascade layer + `hlmBtn` specificity traps in TRAPS and rules [A]. |
| R-11 | `docs/design/tokens.md` + `agent-css-variable-contract.md` + `token-usage-gate.mdc` | paraphrase | Medium | Token lookup table vs full semantics vs decision tree [A][C]. |
| R-12 | `docs/CONSTITUTION.md` §5 + `AGENTS.md` L72–82 | paraphrase | Low | Change-completeness: constitution states rule; AGENTS enforces operational floor [A]. |
| R-13 | `docs/agent-workflows/element-spec-format.md` + `.github/instructions/element-specs.instructions.md` | paraphrase | Medium | Required sections overlap; instructions file shorter but parallel [A]. |
| R-14 | `docs/agent-workflows/agent-daily-workflow.md` (302) + `agent-quick-reference.md` (261) + `idea-to-ship-pipeline.md` (302) | paraphrase | High | Three workflow narratives; only latter cited weakly from `AGENTS.md` [A][C]. |
| R-15 | `docs/agent-workflows/gates-and-commands.md` + `CONTRIBUTING.md` L3–37 + `AGENTS.md` L34–39 | paraphrase | Medium | Verify gate described thrice; `gates-and-commands` is canonical detail [A]. |
| R-16 | `scripts/guard-visual-behavior.mjs` L105–125 + `.cursor/rules/visual-behavior.mdc` | guard-enforced | Low (remediated) | Guard now asserts **owner doc** + package **pointer**, not `AGENTS.md` verbatim [A]. |
| R-17 | `scripts/lint-specs.mjs` `agents-md-max-lines` + `AGENTS.md` L6 | guard-enforced | Informational | Line cap enforces relocation, not duplicate text [A]. |
| R-18 | `scripts/check-skills-source.mjs` + `.github/skills/` stubs | guard-enforced | Informational | Prevents skill-tree drift; **0** pairs out of sync at measurement [A]. |
| R-19 | `docs/specs/GOVERNANCE-DUPLICATION-REPORT.md` + live `.mdc`/`AGENTS.md` stack | stale-reference | Medium | Report dated 2026-04-15, claims zero duplication; predates `.cursor/rules` always-applied layer [A]. |
| R-20 | `docs/specs/component/registry.json` `app-sorting-controls` + `component-reuse-gate.mdc` L26 | stale-reference | Medium | Registry entry `status: "stale"` but `composed-of` still lists selector [A]; reuse gate table fixed to `app-sort-dropdown` [A]. |
| R-21 | `docs/migration/*.md` + audits | stale-reference | Low | References removed `docs/skills/feldpost-component/SKILL.md`; path absent on disk [A]. |
| R-22 | `.github/instructions/styling.instructions.md` L13–16 | conflict | High | Documents `--color-clay`, `--color-bg-base`, etc. — forbidden per `token-usage-gate.mdc` §7 [A]. |

**Guard scripts asserting organizational text (count)**

| Script | Asserts in org files | Type |
| --- | --- | --- |
| `guard-visual-behavior.mjs` | `.cursor/rules/visual-behavior.mdc` (section + table header); `apps/web/AGENTS.md` (pointer substring) | ownership + pointer [A] |
| `lint-specs.mjs` | `AGENTS.md` line count ≤150; `docs/ai-diary/*.md` filename shape | structural [A] |
| `check-skills-source.mjs` | stub byte equality vs canonical | structural [A] |
| `check-component-registry.mjs` | registry.json vs code (not `AGENTS.md` text) | code sync [A] |

**No script** currently asserts verbatim paragraphs inside root `AGENTS.md` [A]. The 2026-09-10 seam failure (diary § stream reconciliation) was remediated in `guard-visual-behavior.mjs` comments L98–104 [A].

**Skills dual tree:** 12 canonical, 12 mirror stubs, **0** content drift at measurement [A].

---

## 4. Conflict register

| ID | Source A | Source B | Disagreement | Precedence winner | Reality matches winner? |
| --- | --- | --- | --- | --- | --- |
| C-01 | [ADR-0006](adr/0006-one-instruction-file.md) L24–27 | `.github/copilot-instructions.md` L26–113 | ADR: tool files must not restate rules; Copilot file has coding style, symmetry, i18n, bulk gates | ADR-0006 (item 7 under CONSTITUTION chain) | **No** [A] |
| C-02 | [ADR-0006](adr/0006-one-instruction-file.md) | `.github/instructions/*.md` | Nine path-scoped instruction files carry rules not in pointer form | ADR-0006 | **No** [A] |
| C-03 | `CONTRIBUTING.md` L26–33 | `scripts/verify.mjs` L32–70 | CONTRIBUTING: 3 soft checks, specs 201, lint 151+1068, test "does not compile"; verify: 4 soft checks, specs 198, lint 145+1038, test 34 runtime failures | `verify.mjs` (CI runs it) | **No** [A] |
| C-04 | `.github/instructions/styling.instructions.md` L13–16 | `.cursor/rules/token-usage-gate.mdc` §7 | Legacy `--color-*` vs forbidden legacy names | `.cursor/rules` (item 3) + `agent-css-variable-contract.md` | **No** for Copilot-only readers [A] |
| C-05 | `docs/study/STUDY-FORMAT.md` trust order | `AGENTS.md` § Instruction precedence | Study: owner → spec → code → study; AGENTS: CONSTITUTION → … → study not listed | Different domains; no direct clash | **Yes** (study subordinate) [A] |
| C-06 | `docs/audits/README.md` (2026-09-10) | Older audit prose | Closure vs "implementation-blueprints removed" | `docs/study/README.md` closure rule | **Fixed** in audits README 2026-09-10 [A] |
| C-07 | `AGENTS.md` L99–106 Required Feature Workflow | `idea-to-ship-pipeline.md` | DoR/DoD not in workflow numbered list; pipeline mentions verify once | `AGENTS.md` workflow list is what agents follow | **Weak link** — pipeline optional in practice [C] |

---

## 5. Staleness register

| Artifact | Issue | Suggested action | Migration target |
| --- | --- | --- | --- |
| `docs/specs/GOVERNANCE-DUPLICATION-REPORT.md` | Last updated 2026-04-15; predates `.mdc` layer | Re-run heuristic or archive with `status: historical` study note | Regenerate or `docs/study/` review |
| `CONTRIBUTING.md` § Known debt | Counts and soft-check set wrong | Phase A: one-line pointer to `node scripts/verify.mjs --list` | `gates-and-commands.md` |
| `.github/instructions/styling.instructions.md` | Phase-7-removed token names | Phase A: pointer to `token-usage-gate.mdc` + `tokens.md` | Same |
| `docs/migration/phase-11-spec-sync.md`, audits | Cite `docs/skills/feldpost-component/` | Phase A: replace with `.cursor/skills/component-structure` | Pointer only |
| `docs/specs/component/registry.json` | `app-sorting-controls` stale but in `composed-of` | Phase B: remove from composition string or finish deletion | Registry generator |
| `docs/audits/2026-09-08-grundriss-adoption.md` | Open recommendations partially done | Phase D: reclassify to study when next touched | `docs/study/` `type: review`, `status: partially-remediated` |
| 64 legacy reasoning docs | No status/grade axis | Phase D: migrate on edit per study README | `docs/study/NNN-*.md` |
| `issues-2026-09-10-upload-and-cleanup.json` | Embedded stale test-debt narrative | Low: issue bodies are snapshots | GitHub issues |

---

## 6. Consolidation proposal

### Phase A — zero-risk (pointers, dates, links)

| Item | Files touched | Gate | Risk if skipped |
| --- | --- | --- | --- |
| A1 | `CONTRIBUTING.md` — replace debt table with pointer to `verify.mjs --list` | `doc-links`, `verify` | Agents trust wrong soft-check story [A] |
| A2 | `.github/instructions/styling.instructions.md` — remove `--color-*` lines; link tokens | `design-system:check`, `i18n:check` | Copilot proposes removed variables [A] |
| A3 | `GOVERNANCE-DUPLICATION-REPORT.md` — update date + disclaimer that `.mdc` layer is out of scope | `lint:specs` | False "zero duplication" signal [A] |
| A4 | Fix migration/audit references to `docs/skills/feldpost-component` | `check-doc-links` | Broken mental model of skill location [A] |

### Phase B — dedupe (one owner, others one-line pointers)

| Item | Files touched | Gate | Risk if skipped |
| --- | --- | --- | --- |
| B1 | Shrink `.github/copilot-instructions.md` to ADR-0006 pointer (like `CLAUDE.md`) + harness-only notes | Review + ADR-0006 compliance | Copilot/Cursor instruction drift [A] |
| B2 | Convert `.github/instructions/*.md` to `applyTo` pointers OR generate from canonical docs | New gate optional (ADR-0006 cites gap) | Path-scoped wrong answers [A] |
| B3 | Merge `agent-daily-workflow` + `agent-quick-reference` into `idea-to-ship-pipeline` TOC; deprecate duplicates | `doc-links` | 865 lines of parallel workflow [C] |
| B4 | `element-specs.instructions.md` → pointer to `element-spec-format.md` | `lint:specs` | Spec section drift [A] |
| B5 | Component styling gate: single normative paragraph in `agent-communication.md`; reduce `.github/agents/README` to link | `doc-links` | Triple maintenance [A] |
| B6 | Clean registry `composed-of` stale selector | `check-component-registry` | Misleading composition graph [A] |

**Proposed spec/ADR target:** extend ADR-0006 gate list with `check-copilot-instructions.mjs` (pointer-only assertion) — not implemented in this study [D].

### Phase C — guard fixes (ownership not address)

| Item | Files touched | Gate | Risk if skipped |
| --- | --- | --- | --- |
| C1 | Audit all `scripts/guard-*.mjs` for `expectContains` on instruction files | `design-system:check` | Repeat of 2026-09-10 seam failure [A] |
| C2 | Add soft assertion: `CONTRIBUTING.md` must not embed numeric debt (only link) | New lint in `lint-specs.mjs` or `check-doc-links` helper | Debt table goes stale again [D] |

`guard-visual-behavior.mjs` **already fixed** (ownership in `.mdc`, pointer in `apps/web/AGENTS.md`) [A].

### Phase D — migration (reasoning folder backlog)

| Item | Files touched | Gate | Risk if skipped |
| --- | --- | --- | --- |
| D1 | On-edit reclassify high-traffic audits (e.g. `2026-09-08-grundriss-adoption.md`) to `docs/study/` | `diary-entry-filename`, study index | Ungraded claims acted on as contract [C] |
| D2 | Bulk **not** recommended per study README — track count ratchet down on touch | — | Fragmentation returns if bulk-migrated [A] |

---

## 7. What NOT to consolidate

| Overlap | Why intentional |
| --- | --- |
| `docs/CONSTITUTION.md` ↔ `docs/design/constitution.md` | CONSTITUTION L122–126 names design file as **design chapter**; same authority, scoped audience [A]. |
| `AGENTS.md` ↔ `.cursor/rules/*.mdc` | ADR-0006 L29–31: extensions with precedence item 3; index in AGENTS, body in `.mdc` [A]. |
| `docs/specs/` ↔ `docs/study/` | Trust order: spec wins; study holds graded reasoning (`STUDY-FORMAT.md`) [A]. |
| `docs/ai-diary/` ↔ `docs/TRAPS.md` | Diary = narrative; TRAPS = promoted, skimmable patterns [A]. |
| Package `AGENTS.md` (`apps/web`, `supabase`, `docs`) | Narrow scope per `AGENTS.md` item 6 [A]. |
| `docs/agent-workflows/gates-and-commands.md` ↔ `scripts/verify.mjs` | Doc deliberately does not copy check names/counts (L21–27) to avoid stale copy [A]. |
| `CLAUDE.md` | Five-line pointer; exemplar for B1 [A]. |
| Skills canonical + mirror stubs | Structural dedup with `check-skills-source.mjs` [A]. |
| Per-component spec Visual Behavior matrices | Component-specific instances of global column contract in `visual-behavior.mdc` [A]. |
| ADRs ↔ specs | ADR = decision; spec = contract (`docs/adr/README.md` table) [A]. |

---

## 8. Quantification summary

| Layer | File count | Lines (approx.) | Notes |
| --- | ---: | ---: | --- |
| Instruction precedence surfaces | 6 + 7 rules | 526 always-loaded (Cursor) | `AGENTS.md` + `.mdc` [A] |
| Copilot-only instructions | 1 + 9 | ~458 | ADR violation surface [A] |
| Agent workflows | 10 | ~1,579 | Overlap cluster [A] |
| Skills (canonical) | 12 | not measured | 0 drift [A] |
| Legacy closed folders | 64 | not measured | Unmigrated reasoning [A] |
| Guards asserting org doc text | 2 scripts | 3 assertion sites | Down from pre-2026-09-10 [A] |
| Near-verbatim duplicate paragraphs (≥3 lines, Copilot vs rules) | ≥4 pairs | ~80–120 lines | i18n, bulk, symmetry, Angular style [A] |

---

## 9. What this study could not prove

- **Runtime agent behavior** — whether agents actually read `idea-to-ship-pipeline.md` or Copilot instructions before coding is `[C]`; no telemetry [C].
- **Full byte-diff of all 64 legacy reasoning docs** against `docs/study/` — sampled closure READMEs and adoption audit only [B].
- **Grundriss study-format parity** — `STUDY-FORMAT.md` documents unverified port [A].

**Proposed spec/ADR targets (not in this change):** ADR-0006 amendment or companion gate for Copilot instruction pointer-only compliance; optional `check-copilot-instructions.mjs` [D].

---

## 10. Index cross-reference

Add row to [`docs/study/README.md`](./README.md) § Index (applied in same commit as this file).
