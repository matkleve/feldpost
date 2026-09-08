> **Audits:** Reference / investigation (**not normative**). Verify against current `docs/specs/` and `docs/design/` before acting. [How to read `docs/audits/`](README.md).

# Grundriss → Feldpost — adoption audit

**Date:** 2026-09-08
**Compared:** `matkleve/feldpost` @ `4133082` ↔ `matkleve/grundriss` @ `db2242e`
**Question:** which conventions that Grundriss distilled from other projects are worth importing into Feldpost, and in what order?

**Status:** **Wave 1 landed** on 2026-09-08 (A1, A2, A3, A5-partial, B4, E1, F4 — marked ✅ in § 6). Everything else is still a proposal. Nothing in this file is normative; the parts that landed are normative where they now live — `AGENTS.md`, `CONTRIBUTING.md`, `scripts/verify.mjs`.

---

## 1. TL;DR

Grundriss is a **spec-driven base project** (Next.js 15 / React 19 / Tailwind v4) whose entire value is its process layer: 147 lines of `AGENTS.md`, 13 doc types, and nine executable gates behind **one** command. Feldpost is a real product (Angular 21 + Supabase + PostGIS) with **more domain rigour** than Grundriss will ever have — RLS gates, i18n pipeline, service symmetry, ownership matrices, LIVE VERIFICATION.

The gap is not knowledge. Feldpost *has* most of the rules. The gap is **enforcement and consolidation**:

| | Feldpost | Grundriss |
| --- | --- | --- |
| Rules written down | 1,126 lines across 19 instruction files | 147 lines + linked docs |
| One command that runs every gate | ✅ `npm run verify` (was: 5 npm scripts + `ng build`, chosen by hand) | ✓ `npm run verify` |
| CI runs what you run locally | ✅ `verify.yml`, no path filter (was: 5 path-filtered workflows) | ✓ one workflow, `npm run verify` |
| Broken relative links in `docs/` | ✅ 0, gated (was: **109**) | 0 (gated) |
| Specs naming a runnable check | **0 of 307** | required, gated |
| Specs linked to a use case, both ways | **18 of 307**, one-way | required, gated |
| Use cases with a stable ID | **0 of 21** | `UC-NNN`, gated |
| Token gate | value **denylist** (5 hexes, 4 var prefixes, 1 file's z-index) | **pattern rules** + reference resolution |
| Raw `z-index:` / `ms` / `cubic-bezier()` in SCSS | 77 / 165 / 11 | gated to 0 |
| Component registry | 1,370 lines of hand-written prose, no drift gate | `registry.json` + generator + scan gate |
| Skills | 11 skills × **2 copies** (`.github/`, `.cursor/`), 2 already drifted | one source |
| `.claude/` harness | ✅ working `PreToolUse` hook + permissions (was: an inert hook) | settings + SessionStart hook + subagent |
| "How the code misleads" doc (TRAPS) | ✗ (lessons scattered in 11 diary files) | ✓ |
| ADRs | ✗ (decisions in 3 unrelated files) | ✓ `docs/adr/` |

Every number above is measured, not estimated — the commands are in § 7.

**31 proposed changes** follow, with a priority table in § 6. Roughly two thirds are ≤ 1 hour each; the expensive ones (registry, studies, spec traceability backfill) are staged so nothing needs a big-bang migration.

---

## 2. What Grundriss actually encodes (the five ideas worth stealing)

Not the framework — Feldpost is Angular and stays Angular. These five ideas are framework-free:

1. **One gate, one answer.** `npm run verify` runs typecheck → lint → specs → study → registry → tokens → contrast → test → build, *continues after a failure*, and prints one summary. Six separate npm scripts is how a check gets skipped: not laziness, but because nobody can hold the list. CI runs the identical command, so the two can never drift.

2. **A rule that isn't executable is a suggestion.** Grundriss converts prose into scripts wherever it can: "specs describe token names, not hex" is a script; "every spec names a check" is a script; "every doc link resolves" is a script. Feldpost writes the same rules — and 109 broken links and 0/307 named checks showed what unenforced prose is worth.

3. **One owner per rule.** `CLAUDE.md` in Grundriss is five lines that point at `AGENTS.md`, recorded as ADR-0003. Feldpost maintains parallel rule sets for Copilot, Cursor and Claude, plus two full copies of its skills — and the copies *have already drifted* (`.cursor/skills/component-structure` gained an FSM section `.github/skills/` never got).

4. **Four kinds of memory, consulted at different moments.** specs (what it *should* do) · study (why this and not the alternatives, with evidence grades) · diary (what happened) · TRAPS/PITFALLS (how this misleads people). Merging them means each gets read at the wrong time. Feldpost has specs and a diary; its "why" and "how it misleads" content is spread across `audits/`, `backlog/`, `migration/reports/` and 11 diary files with no type discipline and no "this may be wrong" marker.

5. **Traceability is a chain, checked in both directions.** `use case → spec → named runnable check`. A spec with no use case is a solution looking for a problem; a use case with no spec is an unkept promise; a spec with no check has no verification. Feldpost has all three artifacts and none of the links.

---

## 3. What Feldpost already does better (do **not** import Grundriss here)

Stated so the adoption list is not read as "Grundriss wins":

- **RLS as the security boundary**, `validate-*-rls.sql`, DSGVO validation — Grundriss has a page of prose about "add a backend later".
- **Service–module symmetry** (docs mirror `core/<name>/`, adapters, one central `types.ts`) — genuinely better than Grundriss's `lib/`.
- **Ownership matrix** and the visual-behavior/stacking triad — Grundriss has nothing at this resolution.
- **LIVE VERIFICATION** with a named route and a second-visit step — Grundriss copied the *idea* ("LIVE CHECK (you)") but not the domain detail.
- **i18n pipeline** (workbench CSV → normalize → validate → SQL) — Grundriss's `I18N.md` is a staged plan, not a pipeline.
- **Change-classification worked example** and the state-machine invariants for *services* — arguably the origin of Grundriss's version.

Two things should flow **back** to Grundriss: the service-symmetry standard, and `bulk-operation-safety.mdc`'s audit-first discipline (Grundriss has the rule in prose only). See § 8.

---

## 4. The 31 changes

Each: **what**, **why here** (with Feldpost evidence), **how**. Priority and effort are in § 6.

### A · One gate

**A1 — Add `npm run verify` as the single gate.**
*Why:* today an agent must pick from `design-system:check`, `i18n:check`, `lint:specs`, `supabase:smoke`, `ng build` — and `AGENTS.md` describes each separately, per change class. The Trivial row says "the gate script for the touched area", which requires knowing the mapping. Nobody holds that list.
*How:* port `scripts/verify.mjs` from Grundriss (56 lines). Checks: `typecheck`, `lint`, `lint:specs`, `design-system:check`, `i18n:check`, `test`, `build`. It must **run all checks even after one fails** and print a ✓/✗ summary, plus `node scripts/verify.mjs <name>` to re-run one. Then replace every "run X before commit" sentence in `AGENTS.md`/`CONTRIBUTING.md` with `npm run verify`.

**A2 — One CI workflow that runs `npm run verify`, unconditionally.**
*Why:* the five current workflows are path-filtered, and the filters do not match what the scripts actually inspect. `guard-visual-behavior.mjs` makes assertions about specific **`.html` templates** (`media-item.component.html`, `item-state-frame.component.html`, …), but `design-system-check.yml` lists `apps/web/src/app/**/*.scss` and no `*.html` — so editing one of the very templates the guard protects does not run the guard. Likewise a PR touching only `AGENTS.md`, `.cursor/rules/` or `docs/use-cases/` runs **nothing at all**. Path filters optimise the wrong thing: CI minutes, at the cost of trust.
*How:* keep the heavy/slow jobs (Supabase contract check, e2e) as separate filtered workflows; add `verify.yml` with no path filter, running exactly `npm ci && npm run verify`. Comment in the file: *CI runs exactly what you run locally; if those drift, CI stops being trusted.*

**A3 — Root `typecheck` / `lint` / `test` / `build` scripts that delegate into `apps/web`.**
*Why:* root `package.json` has no `test`, no `build`, no `lint`. `AGENTS.md` says `cd apps/web && ng test`. A gate cannot orchestrate what has no name.
*How:* `"build": "npm --prefix apps/web run build"` etc. Prerequisite for A1.

**A4 — Pin Node: `.nvmrc` + `engines`.**
*Why:* neither exists at the root; CI picks a version, contributors pick another, `ng build` fails differently in each. Grundriss ships `.nvmrc` + `"engines": { "node": ">=22" }`.

**A5 — Get `lint:specs` back to green before folding it into the gate. It is red on `main` today.**
*Why:* `node scripts/lint-specs.mjs` currently exits **1** with **201 errors and 32 warnings across 183 specs** — mostly `spec-max-lines` and missing required sections. The `spec-lint` workflow runs `npm run lint:specs` with no `continue-on-error`, so it is failing on `main`, but its path filter means most PRs never trigger it. Two secondary symptoms confirm how long this has been true: `docs/specs/SPEC-SIZE-BACKLOG.md` still states *"`npm run lint:specs` is **green** (0 errors, 0 warnings)"*, and the committed `lint-specs-full.txt` is a dump of an older run (89 specs, 18 errors) that no longer matches anything. **A check people learn to ignore has stopped being a check** — and folding a red gate into A1 would poison the new one on day one.
*Landed:* wired into `verify` as a **soft** check (reports, does not fail), and the false "green (0 errors, 0 warnings)" line in `docs/specs/SPEC-SIZE-BACKLOG.md` replaced with the real numbers and a no-new-debt rule. *Still open:* working the 201 errors off and promoting the check to hard.

*How:* decide per rule, not per file. Either (a) fix the class — most errors are size caps with a documented split remedy — or (b) move the genuinely-exempt paths into `shouldIncludeSpecFile()` where the existing exclusions already live, with the reason in the commit. Then correct the false "green" line in `SPEC-SIZE-BACKLOG.md` and delete `lint-specs-full.txt` (F4). Only then add `lint:specs` to `verify`. Until it is green, wire it into `verify` as a **warning** step so the new gate starts trustworthy.

### B · Gates that catch what prose cannot

**B1 — Turn `lint-design-tokens.mjs` from a value denylist into pattern rules.**
*Why:* it currently forbids **five specific hex strings**, four `var(--…)` prefixes and one file's z-index. A brand-new `#3a7bd5` in a component passes. Measured debt for the pattern rules: **77** raw numeric `z-index:`, **165** raw `…ms` durations, **11** `cubic-bezier(`. Meanwhile raw hex outside `styles.scss` is already **0** — so the color rule can be switched on *today* at zero migration cost. That is the cheapest gate in this document.
*How:* adopt the `RULES` array shape from Grundriss's `check-tokens.mjs`: `hex-color`, `color-function`, `arbitrary-z-index`, `off-scale-duration`, `raw-easing`, each with a message naming the fix. Scope: `apps/web/src/app/**` (exclude `styles.scss` and `styles/**`, which *are* the token source). Add the `token-check-ignore` escape hatch — same line, plus a reason — so the rule never has to be weakened for a legitimate exception. Land colors as errors immediately; land z-index/duration/easing as **warnings** with a burn-down, promote to errors when the count hits 0.

**B2 — Assert that every `var(--x)` resolves.**
*Why:* a `var(--transition-geometry)` that does not exist does not error — the declaration is dropped and the property never applies. The symptom is "the animation does nothing", which reliably sends people off refactoring logic. `docs/design/agent-css-variable-contract.md` already says **"no invented variable names"** and lists forbidden legacy names — but nothing checks, and the legacy-token denylist only knows the four prefixes someone remembered to add.
*How:* collect defined custom properties from `apps/web/src/styles.scss` (+ `styles/**`), scan every `.scss`/`.ts`/`.html` for `var(--…)`, fail on any name that is not defined. ~30 lines. Expect a first-run list; treat unknown-but-intentional names (third-party, runtime-injected) via an explicit allowlist constant, not by loosening the regex.

**B3 — Put contrast into the pipeline instead of next to it.**
*Why:* `scripts/audit-theme-contrast.mjs` exists but is wired to `design-system:contrast-audit` only — it is **not** in `design-system:check`, so it never runs in CI. A palette tuned by eye in light mode and a dark variant that quietly drops below 4.5:1 is exactly what a gate is for, and Feldpost has two themes plus a sandstone variant.
*How:* add it to `design-system:check` (and thus to `verify`). Adopt Grundriss's structure: an explicit `PAIRS` list `[foreground, background, minRatio, what it is used for]`, evaluated in **both** themes, and — the part that matters — **fail when a token has no pair**, so a new token is untested loudly rather than silently.

**B4 — A docs link checker. 95 links are already broken.**
*Why:* measured: **109 broken relative links across 509 scanned documents**, excluding `docs/archive/`. And the gate only sees markdown *links* — a path written as a code span is invisible to it, which is how `CONTRIBUTING.md` sent every contributor to `docs/design-system/…` (the folder is `docs/design/design-system/`) in five consecutive lines, and how `docs/audits/README.md` came to state that "the removed `docs/implementation-blueprints/` folder is not coming back" while `docs/implementation-blueprints/universal-search-provider-system.md` sits in the tree. *A doc that points at a file someone renamed is worse than no doc, because people trust it.*
*How:* extend `lint-specs.mjs` (it already resolves child-spec links) to walk all of `docs/` + root markdown, resolve every relative link, and report file:line. Run once, fix the 95, then it stays at 0. This is the highest evidence-to-effort ratio in the list.

**B5 — Two-way traceability: spec ↔ use case.**
*Why:* Feldpost has 21 use-case documents and 307 specs. **18 specs** reference a use case; **0 use cases** carry an ID. So there is no way to answer "if this requirement changes, what breaks?" — and three use-case files still link `../archive/use-cases-README.md`, which no longer exists.
*How:* Grundriss's shape: `<!-- id: UC-NNN -->` / `<!-- specs: … -->` in the use case, `<!-- use-case: UC-NNN -->` in the spec, and `lint-specs.mjs` fails when either side does not resolve. Stage it: **new and edited** specs must carry the link; backfill per area when that area is touched. Do not attempt 307 at once.

**B6 — Every spec names one runnable check.**
*Why:* `REQUIRED_SECTIONS` in `lint-specs.mjs` already demands *Acceptance Criteria* — but nothing demands a way to run them. **0 of 307** specs have a `## Check` section; 36 mention any command at all. "It builds" is currently the de facto acceptance for most contracts.
*How:* add `## Check` to `element-spec-format.md` and to `CANONICAL_ORDER`; the line names one command (`ng test --include=…`, `npm run design-system:check`, a `*.spec.ts` path) and the linter asserts the referenced test file exists. Enforce for new/edited specs first (a `git diff`-scoped mode), then per area.

**B7 — Ban raw color values inside spec markdown.**
*Why:* `docs/specs/README.md` already says *"Specs describe token names … not hex literals"*. Unenforced prose again.
*How:* one rule in `lint-specs.mjs`: hex / `rgb(` / `oklch(` in a spec body → error, with the message "values live in `apps/web/src/styles.scss`". Exempt `docs/design/tokens.md` and the archive.

### C · Registry and scaffolding

**C1 — Make the component registry machine-readable and gated.**
*Why:* the registry is **1,370 lines of hand-maintained prose** across three supplements (75 `###` entries) versus **82** `*.component.ts` files in `shared/` alone plus the feature-local set. `validate-design-system-registry.mjs` validates a *different* registry (`docs/design/design-system/registry.json`, a schema check). Nothing compares the component catalog to the code, so the reuse gate — a Hard Blocker in `AGENTS.md` — rests on a document that can silently go stale. `docs/design/design-system/registry-format-decision.md` already chose JSON-as-source for the design-system registry; this extends the same decision one folder over.
*How:* `docs/specs/component/registry.json` becomes the source (name, selector, path, spec, specId, useFor, notFor, slice). A generator renders the three supplements from it; a checker asserts (a) every shared component has an entry, (b) every entry's path and spec file exist, (c) the entry's `specId` matches the spec's declared id, (d) the rendered supplements are not stale. Grundriss's `check-component-registry.mjs` + `generate-component-registry.mjs` are ~200 lines together and port almost unchanged. Largest single item here — schedule it as its own slice.

**C2 — `npm run new:spec` and `npm run new:use-case`.**
*Why:* Feldpost's format lives in `docs/agent-workflows/element-spec-format.md` — a document an agent must find, read and obey. A scaffolder makes the correct shape the *default* output: the skeleton, the required sections in canonical order, the next free `UC-NNN`, the id comments, and the index row.
*How:* port `new-spec.mjs`/`new-study.mjs` (161/94 lines). This is what makes B5/B6 cheap instead of a tax.

**C3 — Cap `AGENTS.md` and enforce it.**
*Why:* **292 lines**, and it has absorbed a phase-specific migration exemption, a dead-code inventory naming three components, and a parallel-streams coordination note. Grundriss caps at 150 and checks it, on the reasoning that *anything longer gets skimmed instead of read* — and skimming an instruction file is worse than a short one, because the reader believes they read it.
*How:* move the migration exemption to `docs/migration/README.md`, the archive inventory to `apps/web/src/app/archive/README.md`, the parallel-streams note to the migration index (it already says the index is the single queue), and the spec-split policy body to `docs/specs/README.md` — leaving a one-line pointer for each. Then add the line-cap assertion to `lint-specs.mjs`. Target ≤ 150.

### D · The knowledge system

**D1 — Create `docs/TRAPS.md`.**
*Why:* Feldpost's most expensive lessons exist, but only as narrative inside dated diary files and one Cursor rule: the stale unlayered-CSS escape hatch (`2026-07-01`, second recurrence), cross-file injector pollution in the upload spec (`2026-05-27`), the warm-revisit media-grid regression (`migration/reports/…-2026-05-27`), the dead `project_address_a/b` fields (`2026-06-13`), the photon curl gate (`2026-05-25`). An agent resuming work reads *the latest* diary entry for its area — it will not find a trap recorded eight weeks earlier in a different area's entry.
*How:* one file, newest at top, three lines per entry: **what looked right · what was actually true · the check that would have caught it**. Seed it by harvesting the five above. Rule: entries are never deleted, only marked resolved. Link it from `AGENTS.md` as *"read this before your second attempt"* — that is the moment it pays for itself.

**D2 — `docs/adr/` with a template and sequential numbering.**
*Why:* Feldpost's hard, expensive-to-reverse decisions are recorded in whatever file was open at the time: `docs/design/design-system/registry-format-decision.md`, `docs/migration/decisions-log.md`, `docs/migration/reports/agent-token-decision-closure.md`. None is findable from a decision-shaped question, and none records the *rejected* alternative — which is the part that stops the decision being quietly reversed.
*How:* `0000-template.md` + `README.md` index. Write ADRs going forward; retro-fit only the four or five that keep getting re-litigated (spec folder taxonomy; registry format; RLS as *the* boundary; Tailwind + SCSS coexistence; `docs/specs/` over `docs/element-specs/`). Never edit history — a superseded ADR stays, marked superseded.

**D3 — A product-level `CONSTITUTION.md`.**
*Why:* `docs/design/constitution.md` covers *design* non-negotiables. There is no equivalent for correctness, data and failure — and Feldpost handles personal data under DSGVO with RLS as its only real boundary. The rules that must outrank a direct instruction ("delete means delete", "no silent failure", "an empty `catch` is a bug", "accessibility is not waivable for a deadline", "nothing ships that nobody can explain") are currently implicit.
*How:* one page at `docs/CONSTITUTION.md`, seven clauses, explicitly ranked above every other doc; `design/constitution.md` becomes its design chapter. Amendment = a PR that changes only that file.

**D4 — Adopt the study type and evidence grades `[A]`–`[D]`.**
*Why:* `docs/audits/` (8), `docs/backlog/` (6), `docs/migration/reports/` (18) and `docs/implementation-blueprints/` are all *reasoning* documents — analyses, proposals, investigations — with no shared marker for how well-evidenced a claim is and no status field saying whether it still holds. `docs/audits/README.md` already invented a three-kind taxonomy (Historical / Reference / Superseded) for one folder; the study format generalises it and adds the missing axis: **how sure are we, and can this be wrong?** A `[D]` (a decision, changeable) read as an `[A]` (verified) is how an old proposal gets implemented as if it were a contract.
*How:* `docs/study/` + `STUDY-FORMAT.md` with frontmatter (`id`, `type`, `status`, `supersedes`, `corrected-by`) and the trust order *owner correction → spec → live code → study*. Do **not** migrate 30 documents in one pass: apply to new reasoning docs, and reclassify a folder when it is next touched. `docs/backlog/` is the natural first candidate.

**D5 — Give use cases IDs and an index.**
*Why:* 21 use-case files named by slug, no IDs, no README, three with links into a deleted archive. They cannot be cited from a spec, an issue, or a PR without pasting a path.
*How:* `UC-NNN-slug.md` + a `README.md` index table + the `specs:` frontmatter that B5 checks. Renaming 21 files is a `git mv` batch — do it with the audit-first discipline from `bulk-operation-safety.mdc`, and update the 18 inbound references in the same commit.

**D6 — Write down the diary's rules.**
*Why:* `docs/ai-diary/README.md` explains what the diary *is* but not how to keep it honest. Grundriss's three rules are load-bearing: **append, never rewrite** (a past entry that turned out wrong stays, the correction goes in a later entry); **entries are never deleted**; **skip the day if nothing was learned** (a diary of empty entries teaches people to stop opening it). Plus the promotion rule: a lesson is *noticed* in the diary and *promoted* to a trap, a pitfall or a spec — a rule that lives only in a diary entry will be missed. That last one is exactly the D1 gap, stated as policy.
*How:* eight lines appended to the existing README, plus a filename assertion (`YYYY-MM-DD.md`) in `lint-specs.mjs` so "the latest entry" is a question with an answer.

**D7 — Turn `docs/README.md` into a router.**
*Why:* it currently opens with a feature tour (quick start, project structure, tech stack). Grundriss's opens with an *"I want to…"* table mapping intent → document, plus the four-kinds-of-memory table. An agent arrives with an intent, not a curiosity about the stack.
*How:* lead with the intent table and the memory table; keep the tour below the fold.

### E · The agent harness

**E1 — Fix `.claude/settings.json`. The one hook it has does nothing.**
*Why:* the file declares `PreToolUse: [{ "matcher": "eslint.config.*", "action": "block", "message": "…" }]`. Two things are wrong at once: a hook entry needs a nested `hooks` array of `{ type: "command", command: … }` (there is no `action`/`message` form), and a `PreToolUse` matcher matches **tool names** (`Edit`, `Write`), not file paths — so even in valid form that pattern would never fire. As written it is silently ignored, and the ESLint config the message claims is write-protected **is not protected at all**. A guard that is believed to exist is worse than no guard.
*How:* rewrite as a real `PreToolUse` command hook that exits non-zero for the protected paths (and covers `apps/web/eslint.config.mjs`, the file that actually exists), and add a `permissions.allow` list for the read-only and gate commands — `npm run verify`, `npm run lint:specs`, `git status`, `git diff`, `git log`, `node scripts/*` — so routine work stops generating approval prompts.

**E2 — Replace `docs/SESSION_START.md` with a real SessionStart hook.**
*Why:* it is a prompt a human is asked to copy-paste into Cursor every session ("Copy this into Cursor at the start of every session"). Anything that depends on a human remembering to paste a prompt fails at exactly the moment it matters — a fresh cloud session with no `node_modules`, where the agent's first `npm test` fails for a reason that has nothing to do with the code, and the usual response is to start debugging the code.
*How:* `.claude/hooks/session-start.sh` — install dependencies if missing, print the three orientation lines (branch, last 5 commits, where the specs index is). Keep `SESSION_START.md` as the documented equivalent for tools without hooks, but make the hook the primary path.

**E3 — One skills source. Delete the copies.**
*Why:* 11 skills exist twice — `.github/skills/<name>/SKILL.md` and `.cursor/skills/<name>/SKILL.md`. Nine pairs are byte-identical; **two have already drifted**: `.cursor/skills/component-structure` carries an *FSM ↔ CSS ↔ DOM* section and `.cursor/skills/implement-from-spec` carries *Stateful / layered UI (FSM) — extra gates*, neither of which exists in the `.github/` copy. So a Copilot session is running an older contract than a Cursor session, and nothing reports it. This is the ADR-0003 failure in miniature: *keeping one file means the rules cannot drift apart per tool.*
*How:* pick one canonical location (`.claude/skills/` is the natural home given Claude Code is the primary harness here; `.github/skills/` is defensible if Copilot matters more), make the others pointers, and re-apply the two drifted sections to the survivor **first** so nothing is lost. Then a gate: fail if two files with the same skill name differ. The same reasoning applies to `.github/copilot-instructions.md`, which restates ~50 lines of `AGENTS.md` — reduce it to a pointer plus genuinely Copilot-specific notes.

**E4 — Ship the reviewer subagent that the Sensitive class requires.**
*Why:* `AGENTS.md` requires "fresh-context adversarial review by a different agent than the implementer" for Sensitive changes. `.github/agents/revy-the-reviewer.agent.md` exists for Copilot; Claude Code has no equivalent, so in practice the requirement is satisfied by the implementer re-reading their own diff — which is precisely the thing it forbids, since *the implementer cannot see the assumption they made*.
*How:* `.claude/agents/reviewer.md` with a restricted tool set (`Read, Grep, Glob, Bash`) and a priority order: unmet acceptance criteria → leftovers (grep the removed symbol across `apps/web/src` **and** `docs/specs/`) → state coherence → terminal states → tests that cannot fail → `AGENTS.md` boundaries. Explicitly *not* style. Grundriss's file is 53 lines and needs only the Feldpost-specific boundaries swapped in.

**E5 — Add a five-line `CLAUDE.md` pointer, and record the rule as an ADR.**
*Why:* there is no `CLAUDE.md`; Claude Code falls back to `AGENTS.md`, which works today but leaves the convention undocumented — so the next person who wants a Claude-specific rule will start a second instruction file. The rule worth recording is *why* there is only one.
*How:* five lines pointing at `AGENTS.md`, plus a "do not add project rules here" sentence; ADR: *`AGENTS.md` is the single instruction file*.

### F · Process rules and hygiene

**F1 — Promote the pipeline out of `docs/playbooks/`.**
*Why:* `docs/playbooks/idea-to-ship-pipeline.md` is excellent — 8 stages, Definition of Ready, Definition of Done, EARS/Given-When-Then, the state-coherence contract. It is also mentioned in `AGENTS.md` only twice, both times *inside* a sentence about something else (service state invariants, convention defaults). The **Required Feature Workflow** section — the one an agent actually follows — does not link it, so the DoR/DoD gates are effectively optional.
*How:* add it to the top of the document-authority list as the workflow document, and make stage 1 (Definition of Ready) an explicit precondition in the change-class table.

**F2 — Add the two-attempt rule and revert-before-retry.**
*Why:* `agent-communication.md` § Anti-patterns has no stopping rule. The failure it prevents is documented in Feldpost's own history — `docs/ai-diary/2026-07-01.md` records a bug caused by an escape hatch added during an *earlier* attempt at a different problem. **A fix that did not work is not neutral; it is now a confounding variable.** And after two failed attempts, picking a third approach unilaterally is how a small bug becomes a rewrite.
*How:* two paragraphs in the anti-patterns section: (a) revert the failed attempt before trying the next idea; (b) after two failures, stop, summarise what was tried and what the user is actually seeing, and offer **two** options with a recommendation. Plus: *when the user says "it works if I turn this off", that is the answer* — treat it as the lead, not as one data point among many.

**F3 — Add the sibling-repository rule to the pitfalls.**
*Why:* the rule this whole audit is an instance of. Before inventing a convention — a doc format, a folder layout, an ID scheme — grep the sibling repository for it. Generalising from the one repo you happen to be looking at produces a parallel, weaker system whose vocabulary collides with the working one. Grundriss learned this the hard way and recorded it (`docs/diary/2026-09-05.md`: an invented study system replaced by the one that already existed).
*How:* one paragraph in `agent-communication.md` next to "do not guess table names from prompts" — same failure, larger scale.

**F4 — Remove committed build artifacts.**
*Why:* `lint-specs-full.txt` (12 KB of linter output) sits at the repository root and `apps/web/build_output.log` (14 KB) in the app root. Both are tool output from a past session. They are the visible half of *leave the campsite readable*, and they teach every future agent that dumping output into the tree is normal.
*How:* delete both, add the patterns to `.gitignore` (the root one is 29 bytes today).

---

## 5. Sequencing

Four waves. Each is independently shippable and leaves the repo better than it found it.

| Wave | Contents | Rationale |
| --- | --- | --- |
| **1 — Make the gate real** ✅ *landed 2026-09-08* | A3, A5 (soft), A1, A2, B4, E1, F4 | Nothing else is trustworthy until one command runs everything and CI runs the same command. B4 is here because it is one script and 95 real defects; A5 because a gate that starts red is a gate nobody will trust. |
| **2 — Close the silent-failure gaps** (2–3 days) | B1, B2, B3, C2, E2, E3, E4, F1, F2, F3 | The gates that catch what prose cannot, plus the harness fixes. All are small and independent. |
| **3 — Repair the knowledge system** (3–5 days) | D1, D2, D3, D6, D7, C3, B7, A4 | Documents and consolidation. Nothing here blocks feature work. |
| **4 — Structural, staged** (ongoing) | C1, B5, B6, D4, D5 | The three that need a migration strategy. Enforce on new/edited artifacts first; backfill per area when that area is touched. Never big-bang. |

---

## 6. Priority table

**Impact** = how much recurring failure it prevents. **Effort:** S ≤ 1 h · M ≤ ½ day · L > 1 day. **Risk** = chance the change itself breaks something.

| # | Change | Prio | Effort | Impact | Risk | Evidence in Feldpost today |
| --- | --- | :---: | :---: | :---: | :---: | --- |
| ✅ **A1** | `npm run verify` — one gate | **P0** | S | High | Low | 5 scripts + `ng build`, chosen by hand per change class |
| ✅ **A2** | One unconditional CI workflow running it | **P0** | S | High | Low | filters miss what the scripts check: template edits skip the template guard |
| ✅ **A3** | Root `typecheck`/`lint`/`test`/`build` scripts | **P0** | S | High | Low | root `package.json` has none of the four |
| 🟡 **A5** | Get `lint:specs` green before it joins the gate | **P0** | M | High | Low | wired in soft + status line corrected; the **201 errors / 32 warnings** still have to be worked off |
| ✅ **B4** | Docs link checker | **P0** | S | High | Low | **95 broken links / 1,876**; `CONTRIBUTING.md` points at a folder that doesn't exist |
| **B2** | `var(--x)` resolution check | **P0** | S | High | Low | contract says "no invented variable names"; nothing checks |
| ✅ **E1** | Fix `.claude/settings.json` (invalid hook) + permissions | **P0** | S | Med | Low | the ESLint "write protection" is silently inactive |
| **E3** | One skills source; delete the duplicate tree | **P0** | M | High | Med | 11 skills × 2 copies, **2 already drifted** |
| **D1** | `docs/TRAPS.md` | **P0** | M | High | Low | 5 recurring traps live only in dated diary entries |
| **F2** | Two-attempt rule + revert-before-retry | **P0** | S | High | Low | `2026-07-01`: bug caused by a stale patch from an earlier attempt |
| **B1** | Token gate: denylist → pattern rules | **P1** | M | High | Med | denylist knows 5 hexes; 77 raw z-index, 165 raw ms, 11 `cubic-bezier` |
| **B3** | Contrast gate into `design-system:check` | **P1** | M | High | Low | script exists, wired to nothing that runs in CI |
| **C2** | `new:spec` / `new:use-case` scaffolders | **P1** | S | Med | Low | format is a doc to obey, not a default to accept |
| **E2** | SessionStart hook | **P1** | S | Med | Low | `SESSION_START.md` = "copy this into Cursor every session" |
| **E4** | `reviewer` subagent | **P1** | S | High | Low | Sensitive class demands fresh-context review; no mechanism exists |
| **F1** | Promote DoR/DoD into the required workflow | **P1** | S | High | Low | pipeline lives in `playbooks/`, unlinked from the workflow section |
| **D2** | `docs/adr/` + template | **P1** | M | Med | Low | decisions in 3 unrelated files, rejected alternatives unrecorded |
| **D3** | Product `CONSTITUTION.md` | **P1** | S | Med | Low | constitution covers design only; DSGVO/failure rules implicit |
| **C3** | Cap + split `AGENTS.md` to ≤ 150 lines | **P1** | M | Med | Med | **292 lines**, incl. a phase-specific exemption and a dead-code inventory |
| **D6** | Diary rules (append-only, promote-or-lose) | **P1** | S | Med | Low | README says what it is, not how to keep it honest |
| **B5** | Spec ↔ use-case traceability, both ways | **P1** | L | High | Med | 18/307 one-way; 0/21 use cases have IDs |
| **B6** | `## Check` — one runnable check per spec | **P1** | L | High | Med | **0 of 307**; "it builds" is the de facto acceptance |
| **A4** | `.nvmrc` + `engines` | **P2** | S | Low | Low | neither exists at the root |
| **B7** | Ban raw color values in spec markdown | **P2** | S | Low | Low | rule stated in `specs/README.md`, unenforced |
| **D7** | `docs/README.md` as an intent router | **P2** | S | Med | Low | opens with a feature tour, not with "I want to…" |
| **D5** | `UC-NNN` IDs + use-case index | **P2** | M | Med | Med | 21 slug-named files, 3 linking a deleted archive |
| **E5** | `CLAUDE.md` pointer + ADR | **P2** | S | Low | Low | no `CLAUDE.md`; convention undocumented |
| **F3** | Sibling-repository rule in the pitfalls | **P2** | S | Med | Low | this audit is the instance |
| ✅ **F4** | Delete committed build artifacts | **P2** | S | Low | Low | `lint-specs-full.txt`, `apps/web/build_output.log` |
| **C1** | Registry as JSON + generator + scan gate | **P3** | L | High | Med | 1,370 prose lines, 75 entries, no drift gate, 82 shared components |
| **D4** | Studies + evidence grades `[A]`–`[D]` | **P3** | L | Med | Low | ~32 reasoning docs with no confidence or status axis |

P3 is not "unimportant" — C1 has high impact. It is *later* because both P3 items need a migration plan, and both get cheaper once the gate (P0) and the scaffolders (C2) exist.

---

## 7. How the numbers were measured

Reproducible from the repository root:

```bash
wc -l AGENTS.md                                              # 292
find docs/specs -name '*.md' | wc -l                         # 307
rg -l 'use-cases/' docs/specs --glob '*.md' | wc -l          # 18
rg -l '^##+ Check' docs/specs --glob '*.md' | wc -l          # 0
rg -l '<!-- id:' docs/use-cases | wc -l                      # 0
rg -o 'z-index:\s*[0-9]+' apps/web/src --glob '*.scss' | wc -l   # 77
rg -o '[0-9]+ms'          apps/web/src --glob '*.scss' | wc -l   # 165
rg -o 'cubic-bezier\('    apps/web/src --glob '*.scss' | wc -l   # 11
rg -n '#[0-9a-fA-F]{6}\b' apps/web/src --glob '*.scss'           # 9, all in styles.scss
grep -h '^### `' docs/specs/component/registry.*.supplement.md | wc -l   # 75
find apps/web/src/app/shared -name '*.component.ts' | wc -l             # 82
```

Broken links (109 across 509 scanned documents, `docs/archive/` excluded) are now counted by `scripts/check-doc-links.mjs`, which is the gate B4 proposed; the count is 0 after the repair pass in the same commit.

---

## 8. What should flow the other way

Grundriss is the base project for future work, so its gaps matter too:

| From Feldpost | Why Grundriss needs it |
| --- | --- |
| Service–module symmetry standard | Grundriss's `lib/` has no structural contract at all |
| `bulk-operation-safety` as an executable rule | Grundriss states audit-first in prose only |
| Ownership matrix / visual-behavior triad | Grundriss's design system has no ownership column |
| LIVE VERIFICATION with named routes | Grundriss has the idea, not the practice |
| RLS-first debugging order | Grundriss's `BACKEND.md` is a plan, not experience |

---

## 9. What was deliberately **not** proposed

- **Grundriss's file layout** (`features/` · `components/ui/` · `lib/`) — Feldpost's `core/<module>/` + `shared/` + `features/` is equivalent and load-bearing for service symmetry. Changing it would be churn.
- **`cn()` / `cva`** — React-specific. The Angular equivalent (host bindings + `hlm*` variants) already exists.
- **Deleting the `.cursor/rules/*.mdc` rule files** — they are normative extensions with a stated precedence, not duplicates. Only the *skills* are duplicated (E3).
- **A second `AGENTS.md` cap for package-level files** — `apps/web/AGENTS.md` (107) and `supabase/AGENTS.md` (108) are within budget and correctly scoped to narrowing.
- **Grundriss's `docs/reach/` module** — marketing/acquisition; no overlap with Feldpost's domain.
