# Project Hope — Development Acceleration Playbook

**Goal:** ship world-class software faster, make the spec→code path less painful to
qualify, and keep the bar high on the two things that matter commercially —
**it makes money** (we ship value users pay for) and **it is safe** (security and
data-protection are structural, not bolted on).

This is a strategy + tactics document, not a contract. It does not override
`AGENTS.md` or anything under `docs/specs/`. It proposes how to *evolve* the
process so the existing governance pays for itself in speed instead of taxing it.

> **See also:** [`idea-to-ship-pipeline.md`](idea-to-ship-pipeline.md) — the
> stage-by-stage pipeline (Ready → Specify → Plan → Tasks → Implement → Verify →
> Done) with pass/fail criteria at each gate, the state-coherence contract that
> kills "wrong pane updated" bugs, and the 80%-autonomy policy.

Last reviewed: 2026-06-17.

---

## 1. Honest diagnosis: what we have today

Feldpost already runs one of the more mature AI-agent development systems you'll
find in a private codebase. The raw weight:

| Asset | Count / Scope |
| --- | --- |
| Element/contract specs under `docs/specs/` | **292 markdown files** |
| Always-applied normative rule files (`.cursor/rules/*.mdc`) | **7** |
| Governance/validation/guard scripts (`scripts/*.mjs`, `*.sql`) | **~21** |
| npm gate scripts (`design-system:*`, `i18n:*`, `supabase:smoke*`, `lint:specs`) | **~25** |
| CI workflows enforcing gates | `design-system-check`, `i18n-check`, `spec-lint`, `supabase-contract-check` |
| Agent roles (`.github/agents/`) | `planner`, `spec-writer`, `implementer`, `reviewer`, `checker` |
| Reusable skills (`.github/skills/`, `.cursor/skills/`) | `write-element-spec`, `implement-from-spec`, `check-spec`, `spec-audit`, `service-symmetry`, `component-structure`, `safe-file-split`, `issue-triage-next`, … |

**What's good (keep it):** RLS-first security boundary, the design constitution,
the glossary as canonical naming, the ownership matrix discipline, the spec lint
cap (150 warn / 180 error), and — crucially — a *role suite and skill library
that already mirror the canonical AI spec-driven pipeline*. Most teams trying to
"accelerate with AI" in 2026 are building exactly this from scratch.

**Where the time actually goes (the friction the request is pointing at):**

1. **One-speed governance.** A typo fix, a Tailwind migration, and a brand-new
   stateful component all pass through (or feel like they must pass through) the
   same heavyweight ritual: ownership matrix, FSM tables, spec split policy,
   multiple gate scripts. The *Migration Exemption* in `AGENTS.md` proves the
   team already knows tiering works — it just isn't generalized.
2. **Advisory rules that depend on the agent remembering them.** Many of the
   7 `.cursor/rules` and the AGENTS conventions are *prose the agent must recall*
   rather than a script that blocks a bad commit. Anthropic's own guidance is
   blunt about this: a long instruction file means "Claude ignores half of it,"
   and "hooks are deterministic and guarantee the action happens." We have ~21
   guard scripts but they aren't all wired as pre-commit/Stop hooks, so
   qualification still leans on attention.
3. **Spec authoring is artisanal.** `write-element-spec` exists, but there is no
   single `spec → plan → tasks → implement → verify` command that a contributor
   (human or agent) runs end-to-end. Each phase is a separate hand-off.
4. **Verification is mostly "did it build."** `ng build` proves compilation, not
   behavior. The strongest single accelerator in agentic coding — *give the
   agent an executable check it can loop against* — is underused outside
   design-system/i18n gates. (`ng test` exists; specs rarely ship a runnable
   acceptance check.)
5. **Context cost.** 292 specs + 7 always-on rules + a 19KB `AGENTS.md` is a lot
   of mandatory reading. Token budget spent re-reading governance is token budget
   not spent solving the problem.

The headline: **the process is world-class at *consistency and safety* and
under-built at *throughput*.** We don't need a new framework. We need to make the
existing one tiered, deterministic, and loop-driven.

---

## 2. What the rest of the field does ("what bros do") — 2025/2026

Spec-driven development (SDD) with AI agents converged in 2025 around a handful
of tools. They all implement the same backbone, which is worth naming because
feldpost already has the pieces scattered across folders:

**The canonical SDD pipeline** (Constitution → Specify → Plan → Tasks → Implement → Verify):

| Phase | What it is | Feldpost already has |
| --- | --- | --- |
| **Constitution** | Non-negotiable project principles the agent must never violate | `docs/design/constitution.md`, `AGENTS.md` invariants |
| **Specify** | Human-readable *what/why* (not how) — the requirement | `docs/specs/**`, `write-element-spec` skill |
| **Plan** | Technical approach, files touched, architecture decisions | `planner` agent, plan mode |
| **Tasks** | Decomposition into small, independently verifiable units | (gap — mostly implicit) |
| **Implement** | Agent writes code against the task + spec | `implementer` agent, `implement-from-spec` |
| **Verify** | Executable acceptance check, adversarial review | `checker`/`reviewer` agents, gate scripts |

The notable tools and what to **borrow, not adopt wholesale**:

- **GitHub Spec Kit** (open-source CLI, the most widely adopted): formalizes the
  pipeline as slash commands (`/constitution`, `/specify`, `/plan`, `/tasks`,
  `/implement`). *Borrow:* the idea that each phase is a single repeatable
  command, not a manual ritual. We already have skills — wire them into one flow.
- **AWS Kiro** (agentic IDE): uses **EARS** (Easy Approach to Requirements
  Syntax) for unambiguous, testable requirements, plus event "hooks." *Borrow:*
  EARS phrasing for our Acceptance Criteria (below) and Kiro's hook-on-save
  discipline — which maps onto Claude Code Stop hooks.
- **BMAD-METHOD**: simulates a full agile team (Analyst, PM, Architect, SM, Dev,
  QA…) as 12+ specialized agents. *Borrow nothing new* — feldpost's 5-role suite
  (`planner/spec-writer/implementer/reviewer/checker`) is a leaner version of the
  same idea. Don't expand to 12 roles; that adds coordination cost.
- **OpenSpec / Cursor `.cursor/rules`**: lightweight, "specs as living rules the
  agent reads every time." *Borrow:* keep rules short and deterministic; we
  already use `.cursor/rules`, the lesson is *prune them*.

**The failure mode every SDD writeup warns about** is precisely feldpost's risk:
*spec/process overhead growing faster than the value it protects.* The fix the
field converged on is **tiering** — heavy ceremony only where the blast radius is
real (data model, RLS, money, stateful UI), light ceremony everywhere else.

---

## 3. The acceleration plan

Seven concrete moves, ordered by leverage. Each is small and reversible.

### Move 1 — Tier the governance ("fast lane" vs "full lane")

Generalize the existing Migration Exemption into an explicit **change-class**
matrix. Declare the class in the PR/issue and the required ceremony follows:

| Class | Examples | Required before merge |
| --- | --- | --- |
| **Trivial** | typo, log line, copy text, token swap, rename | build + relevant gate script only. No matrix, no spec edit. |
| **Standard** | new non-stateful component, service method, list/filter | spec touched, `ng build`, registry/reuse check, code-review skill |
| **Sensitive** | RLS, migrations, money/billing, auth, FSM/stateful UI, export | full ceremony: ownership matrix + FSM tables + security-review skill + live verification |

This is the single highest-leverage change. It tells contributors (and agents)
*how much process to spend* up front, which is the thing that's currently
ambiguous and therefore defaulted to "maximum."

> **Implemented (this branch):** the change-class matrix and a
> **Change-Completeness Rule** ("a change isn't done until what it replaces is
> gone") are now in root `AGENTS.md`. A worked example on the upload pipeline —
> the codebase's hardest subsystem, where dead `project_address_a/b` fields
> outlived their producer in both code *and* spec — is in
> [`change-classification-upload-example.md`](change-classification-upload-example.md).

### Move 2 — Turn advisory rules into deterministic gates

For every `.cursor/rule` or AGENTS convention that can be checked by a script,
wire the existing guard (`guard-visual-behavior`, `lint-design-tokens`,
`guard-interaction-emphasis`, `validate-*-imports`, …) as:

- a **pre-commit hook** (fast subset), and
- a **Claude Code Stop hook** in `.claude/settings.json`, so an agent session
  literally cannot end with the gate red.

Deterministic gates let us *delete prose from the rules and AGENTS.md*, which
shrinks mandatory context and stops the "agent forgot rule #5" failure mode.
Rule of thumb from Anthropic's best-practices: *if a script can enforce it, it
should not be a paragraph an agent has to remember.*

### Move 3 — One spec→ship command chain

Compose the existing skills into a single, named flow (a slash command / skill
that calls the others), mirroring Spec Kit:

```
/feature  →  spec-writer (write-element-spec)
          →  planner     (plan + file map + change-class)
          →  task split  (small verifiable units)
          →  implementer (implement-from-spec)
          →  checker     (run gates + acceptance check)
          →  reviewer    (adversarial diff review, fresh context)
```

Today these are five agents and a dozen skills a human stitches by hand. Stitched
into one command, a Standard-class feature goes from prompt to reviewed PR in one
session instead of five hand-offs.

### Move 4 — Make every spec end in an executable check (EARS + a test)

This is the biggest throughput unlock per Anthropic's guidance: *"Give Claude a
check it can run … the loop closes on its own."* Two cheap changes to the spec
template (`element-spec-format.md`):

1. Write Acceptance Criteria in **EARS** form so each line is unambiguous and
   testable: *"When `<trigger>`, the `<component>` shall `<response>`."*
2. Require each spec to name **one runnable verification** — an `ng test` spec
   file, a Playwright/route check, or a script that diffs output. "It builds" is
   not acceptance.

Then implementation becomes a closed loop: implement → run the named check →
fix → repeat, unattended, until green.

### Move 5 — Use the subagent pipeline the way it's designed

Adopt the **Writer/Reviewer split** for Sensitive-class work: the agent that
wrote the code is never the one that grades it. We already have `reviewer` and
`checker` agents — run them in a *fresh context* against the diff + spec, told to
"flag only gaps that affect correctness or stated requirements" (avoids the
over-engineering trap). Delegate codebase investigation to subagents so the main
session's context stays clean for implementation.

### Move 6 — Shrink mandatory context

- Audit `AGENTS.md` (19KB) and the 7 rule files against the question Anthropic
  recommends per line: *"Would removing this cause the agent to make mistakes?"*
  Move "sometimes relevant" knowledge into on-demand **skills** (loaded only when
  invoked) instead of always-applied rules.
- Convert enforceable prose to hooks (Move 2) and delete it from the doc.
- Target: meaningfully less always-on reading, so more budget goes to the task.

### Move 7 — Treat the spec/process system as a product with a budget

Add a recurring (e.g. monthly) **process-debt review**: run `lint:specs`, the
`GOVERNANCE-*` reports, and ask "which gate caught a real bug this month, and
which only generated friction?" Retire gates that never catch anything. A
governance system that only grows is the failure mode; give it a delete key.

---

## 4. "Makes money" — keep velocity pointed at value

Speed only makes money if it's aimed correctly. Guardrails:

- **Ship Standard-class features to real field users fast**, behind the existing
  RLS/org scoping. The construction field-tech persona in the constitution is the
  customer — every feature should trace to a workflow they'd pay for. If a change
  doesn't, it's process for its own sake.
- **Sequence by revenue/retention impact, not by spec backlog tidiness.** The
  `docs/backlog/` priorities should be framed as "what makes a paying crew renew."
- **Time-box ceremony.** The fast lane (Move 1) exists so that 80% of changes
  cost 20% of the process. That delta *is* the money — it's shipped features per
  week.
- **Don't gold-plate.** The adversarial reviewer will always find "gaps." Tell it
  to flag correctness/requirement gaps only; over-engineering is negative ROI.

Solo/lean SaaS reality (2026): AI tooling realistically gives a ~2–3× build-speed
multiplier, but the moat is *reliable, secure, well-targeted* shipping — which is
exactly where feldpost's governance becomes an advantage once it's tiered.

## 5. "Safe AF" — security and data protection as structure

Feldpost is already ahead here; the job is to make it loop-driven, not heroic.

- **RLS stays the boundary.** Frontend is untrusted. Keep `validate-dsgvo-security.sql`,
  `validate-upload-role-rls.sql`, and supabase contract checks in CI. For any
  Sensitive-class change, RLS review is mandatory ceremony (Move 1).
- **Run the bundled `/security-review` skill on every Sensitive-class diff** — and
  wire a `security-reviewer` subagent (Read/Grep/Glob/Bash, opus) for injection,
  authz, secrets-in-code, and insecure data handling, per Anthropic's template.
- **Secret scanning + dependency/supply-chain gates** in CI (GitHub secret
  scanning is already available via the MCP toolset; add an SCA/Semgrep-style
  static pass for the web app and edge functions).
- **GDPR/DSGVO is a first-class gate, not a footnote** — image/geo data of job
  sites is personal-data-adjacent. Keep the DSGVO validation in the Sensitive
  lane and document the data-flow in the relevant service spec.
- **Sandbox the agents.** Use scoped `--allowedTools` for unattended/batch runs
  and OS-level sandboxing for autonomous sessions so "ship fast" never means
  "ran an unreviewed destructive command."
- **Security is an accelerator, not a tax** — fixing while context is fresh (the
  agent just wrote the code) is far cheaper than a later audit. Bake the review
  into the spec→ship chain (Move 3), don't append it.

---

## 6. Courses & learning resources

Curated for this stack (agentic coding + SDD + secure SaaS). Start with the first
two; they map directly onto how feldpost already works.

**Agentic coding with Claude Code**
- [DeepLearning.AI — *Claude Code: A Highly Agentic Coding Assistant*](https://www.deeplearning.ai/courses/claude-code-a-highly-agentic-coding-assistant) — built with Anthropic, taught by their Head of Technical Education. Best single starting point.
- [Coursera (Vanderbilt) — *Claude Code: Software Engineering with Generative AI Agents*](https://www.coursera.org/learn/claude-code) — broader, project-based.
- [Anthropic — *Best practices for Claude Code* (docs)](https://code.claude.com/docs/en/best-practices) — free, and the source of most tactics in §3. Read this before any course.
- [Udemy — *Claude Code & Agentic Engineering: Next-Level AI Development*](https://www.udemy.com/course/claude-code-agentic-engineering-next-level-ai-development/) — self-validating/self-correcting agent loops.
- [Udemy — *AI Coder: Complete Claude Code & Coding Agents Course*](https://www.udemy.com/course/ai-coder-from-vibe-coder-to-agentic-engineer/) — Claude Code + Cursor + MCP ecosystem.

**Spec-driven development**
- [Spec-Driven Development: the 2026 guide (BCMS)](https://thebcms.com/blog/spec-driven-development) — the pipeline phases + EARS.
- [9 Best AI Tools for Spec-Driven Development in 2026 (MarkTechPost)](https://www.marktechpost.com/2026/05/08/9-best-ai-tools-for-spec-driven-development-in-2026-kiro-bmad-gsd-and-more-compare/) — tool landscape (Kiro, BMAD, Spec Kit, OpenSpec).
- [BMAD vs Spec Kit vs OpenSpec — choosing a framework (Reenbit)](https://reenbit.com/bmad-vs-spec-kit-vs-openspec-choosing-your-spec-driven-ai-framework/) — when each fits.
- [GitHub Spec Kit](https://github.com/github/spec-kit) — read the command structure even if we don't adopt the CLI.

**Secure-by-design SaaS**
- [Sonatype — *Guardrails Make AI-Assisted Development Safer By Design*](https://www.sonatype.com/blog/guardrails-make-ai-assisted-development-safer-by-design)
- [Semgrep — *The Future of SaaS Security: AI-Driven, Fast, and Secure*](https://semgrep.dev/blog/2025/the-future-of-saas-security-ai-driven-fast-and-secure/)
- [How solo founders build $1M+ SaaS with AI tools (Aakash Gupta)](https://aakashgupta.medium.com/how-solo-founders-are-building-1m-saas-businesses-using-only-ai-tools-3538d161f03d) — realistic speed multipliers and where solo builders fail.

---

## 7. Suggested rollout (small, reversible steps)

| Phase | Action | Outcome |
| --- | --- | --- |
| **1 — Tiering** | Write the change-class matrix (Move 1) into `AGENTS.md`, generalizing the Migration Exemption | 80% of changes get a fast lane |
| **2 — Determinism** | Wire existing guard scripts as pre-commit + Stop hooks; delete the prose they now enforce (Moves 2, 6) | Less context, fewer "forgot the rule" misses |
| **3 — One chain** | Compose skills into a single `/feature` flow; add EARS + a runnable check to the spec template (Moves 3, 4) | Spec→reviewed-PR in one session |
| **4 — Review split** | Standardize fresh-context adversarial review + `/security-review` on Sensitive class (Moves 5, §5) | Safety without serial hand-offs |
| **5 — Budget** | Monthly process-debt review; retire gates that never catch bugs (Move 7) | Governance that shrinks, not just grows |

Each phase is independently shippable and independently revertible. None of it
requires adopting a new external framework — it's making the system feldpost
*already built* tiered, deterministic, and loop-driven.

---

## Sources

- Anthropic — Best practices for Claude Code: https://code.claude.com/docs/en/best-practices
- Spec-Driven Development 2026 guide (BCMS): https://thebcms.com/blog/spec-driven-development
- 9 Best AI Tools for Spec-Driven Development in 2026 (MarkTechPost): https://www.marktechpost.com/2026/05/08/9-best-ai-tools-for-spec-driven-development-in-2026-kiro-bmad-gsd-and-more-compare/
- BMAD vs Spec Kit vs OpenSpec (Reenbit): https://reenbit.com/bmad-vs-spec-kit-vs-openspec-choosing-your-spec-driven-ai-framework/
- Augment Code — Best Spec-Driven Development Tools: https://www.augmentcode.com/tools/best-spec-driven-development-tools
- Sonatype — Guardrails Make AI-Assisted Development Safer By Design: https://www.sonatype.com/blog/guardrails-make-ai-assisted-development-safer-by-design
- Semgrep — Future of SaaS Security: https://semgrep.dev/blog/2025/the-future-of-saas-security-ai-driven-fast-and-secure/
- Solo founders building $1M+ SaaS with AI (Aakash Gupta): https://aakashgupta.medium.com/how-solo-founders-are-building-1m-saas-businesses-using-only-ai-tools-3538d161f03d
- DeepLearning.AI — Claude Code course: https://www.deeplearning.ai/courses/claude-code-a-highly-agentic-coding-assistant
- Coursera (Vanderbilt) — Claude Code: https://www.coursera.org/learn/claude-code
</content>
</invoke>
