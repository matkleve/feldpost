# Idea → Shippable Code — The Pipeline & Stage Gates

Companion to [`dev-acceleration.md`](dev-acceleration.md) and the **Change
Classification** rules in root `AGENTS.md`. This defines *how an idea becomes
shipped code*, iteratively and agile, with explicit **pass/fail criteria at every
stage** — so that what the spec promises is what the code does, and bugs like
"clicked a different chat, the details changed but the message area didn't" are
caught by the contract, not by the user.

Last reviewed: 2026-06-17.

---

## 1. The pipeline at a glance

The industry-standard agile flow is bracketed by two gates: a **Definition of
Ready (DoR)** controls what's allowed *into* development, and a **Definition of
Done (DoD)** controls what's allowed *out*. In between sits the spec-driven loop
(Specify → Plan → Tasks → Implement → Verify). Nothing advances to the next stage
until it passes the current stage's exit criteria.

| Stage | Question it answers | Exit gate (must be true to advance) | Owner |
| --- | --- | --- | --- |
| **0 · Intake** | Is this worth doing? | One sentence of user value + a change-class guess (Trivial/Standard/Sensitive) | Product |
| **1 · Shape (DoR)** | Is it ready to build? | Passes Definition of Ready (below) | Product + lead agent |
| **2 · Specify** | What should happen? | Spec exists with behavior-level, testable acceptance criteria (EARS / Given-When-Then) + state-coherence contract if multi-pane | spec-writer |
| **3 · Plan** | How, and what's touched? | File map, reuse decision (no new component without registry check), change-class confirmed, one named runnable check | planner |
| **4 · Tasks** | What are the slices? | Decomposed into thin vertical slices, each independently verifiable | planner |
| **5 · Implement** | Build it | Code matches spec; `ng build` green; the named check passes | implementer |
| **6 · Verify** | Does it really work? | Acceptance criteria demonstrated with evidence; fresh-context review; LIVE VERIFICATION for Sensitive | checker + reviewer |
| **7 · Ship (DoD)** | Is it done-done? | Passes Definition of Done (below); spec & types carry no leftovers | reviewer |
| **8 · Learn** | What did we miss? | Feedback → spec update in the *same* session; diary note if it'll recur | all |

It is a **loop, not a waterfall**: stage 8 feeds back into stage 0/2. You go
around it once per *thin slice*, not once per giant feature.

---

## 2. The two bracket gates

### Definition of Ready (entry to stage 2+)

A work item is **Ready** when:

- [ ] **User value** is stated in one sentence ("a field tech can …").
- [ ] **Scope boundary** is explicit — what's in, and what's deliberately *out*.
- [ ] **Change-class** declared (Trivial / Standard / Sensitive — see `AGENTS.md`).
- [ ] **Acceptance criteria** are written and *testable* (behavior, not implementation).
- [ ] **Dependencies/data** named — tables, services, adapters it touches (verified against `docs/architecture/database-schema.md`, not guessed).
- [ ] **Open questions** are resolved or explicitly deferred — no "we'll figure it out in code."

If it fails DoR, it goes back to Shape. Half-baked items entering the pipeline is
the #1 source of rework.

### Definition of Done (exit from stage 7)

Done means **all** of:

- [ ] Every acceptance criterion demonstrated with **evidence** (test output, screenshot, or live-check console) — not asserted.
- [ ] **Red-test-first proven**: the acceptance test was shown **failing before** implementation and **passing after**. A test that was never red is not evidence — it may assert nothing. (Especially load-bearing for flaky areas like upload: a test that flakes is not a gate.)
- [ ] `ng build` green; relevant gate scripts green (`design-system:check`, `i18n:check`, `lint:specs`, RLS/DSGVO for Sensitive).
- [ ] **Change-Completeness** holds: `grep`-to-zero for every removed symbol/concept across `apps/web/src` *and* `docs/specs` (see `AGENTS.md`).
- [ ] Spec synced to final behavior; no new component added without a registry/reuse decision.
- [ ] Fresh-context adversarial review passed (correctness/requirement gaps only).
- [ ] For Sensitive work: LIVE VERIFICATION block run.

Acceptance criteria are *per-story*; the DoD is the *universal* checklist that
applies to everything. Don't conflate them.

---

## 3. Write acceptance criteria that a machine can check

A spec only "translates to code" reliably if its criteria are **behavioral and
testable**. Two compatible formats, both already endorsed by this repo's
direction:

- **EARS** (for system rules): *"When `<trigger>`, the `<component>` shall `<response>`."*
- **Given-When-Then** (for user scenarios): *"Given `<context>`, when `<action>`, then `<observable outcome>`."*

The hard rule: **describe behavior, not implementation.** "Given an unauthenticated
user, when they open `/colleagues`, then they're redirected to login" is testable;
"call `AuthGuard.canActivate`" is not — it pins the *how* and rots immediately.

Each spec ends with **one runnable check** that exercises these criteria (a
`vitest`/Playwright spec or a script). "It builds" is never acceptance.

---

## 4. The state-coherence contract — fixing the messaging bug at the spec level

The messaging bug ("I clicked another chat in the list; the details rail changed
but the message area didn't") is not a coding slip — it's a **missing contract**.
Looking at the current spec, `app-chat-area` receives `channel`, `headerTitle`,
and `messages` as *three separate inputs*, and the details rail derives
independently. Nothing in the spec says they must all reflect the **same** active
chat at the same time. So an implementer can wire one and forget another, and no
gate catches it.

### The rule (proposed addition to the element-spec template)

> **State-Coherence Contract** — required for any feature where **selecting one
> thing updates two or more panes** (list + header + body + details, etc.).
>
> 1. **Single source of truth.** There is exactly one signal for the selection
>    (e.g. `activeChannelId`). Every pane is a *derived* view of it — none holds
>    its own copy.
> 2. **Atomic propagation.** When the source changes, *all* derived panes
>    re-derive in the same change. No pane may lag, retain stale data, or update
>    independently.
> 3. **Coherence acceptance criteria.** The spec must include Given-When-Then
>    criteria that assert the *whole set* of panes after a selection change.

### Worked example — what `chat-area.md` should say

```gherkin
Scenario: Switching the active conversation updates every pane coherently
  Given conversation A is active
  And the message list, header, composer, and details rail all show A
  When I click conversation B in the channel list
  Then the header title shows B
  And the message list shows B's messages (not A's, not empty-then-A)
  And the composer targets B (draft/typing scoped to B)
  And the details rail shows B's members/info
  And no pane still shows any data from A

Scenario: Selecting the already-active conversation is a no-op
  Given conversation B is active
  When I click conversation B again
  Then no pane reloads or flickers
```

### How it translates to code

A single `activeChannelId = signal<string | null>(null)`. `messages`,
`headerTitle`, `channelMembers`, and the details rail are **`computed()` off that
signal** (or off one `activeChannel` computed). Clicking a list row sets *only*
`activeChannelId`; every pane follows because it's derived. The bug becomes
*structurally impossible* — you can't update the details rail "without" the
message area, because neither owns selection state.

The runnable check is the first Gherkin scenario as a `vitest` component test:
set channel A, assert all panes; switch to B, assert all panes including "no A
residue." That test failing is what should have blocked the original change.

---

## 5. Autonomy — the "80% without asking" policy

The goal is that "create a messaging service" runs ~80% autonomously. The way to
get there safely (per the AI-autonomy-levels literature) is **not** "ask less" —
it's **"specify more, then let the agent run inside the spec's boundaries."** A
well-specified, well-tested module is exactly where an agent can be let loose;
ambiguity is where it must stop. Tie autonomy to the change-class:

| Decide autonomously (just do it, ~the 80%) | Must ask first (the ~20%) |
| --- | --- |
| Anything fully determined by the spec, glossary, tokens, or an existing pattern | A **new data shape / table / RLS** decision, or anything Sensitive-class |
| Reusing a registered shared component or adapter | Adding a **new component** when a registry entry might cover it (reuse vs build) |
| File layout following service-module symmetry | **Merging or splitting** existing components/services (structural change) |
| Naming from the glossary; standard signals/computed wiring | A genuine **product-behavior ambiguity** the spec doesn't resolve |
| Writing the tests the acceptance criteria imply | A **security/data-protection** trade-off (DSGVO, org scoping) |
| Trivial/Standard-class work end-to-end | Anything that would **change a published contract** other code depends on |

Operating rules:

- **Front-load the questions, then go.** For a big ask, the agent interviews the
  user *once* (batched questions) to reach DoR, writes the spec, then executes
  the rest without re-confirming each step. Don't drip-feed questions mid-build.
- **Boundaries, not babysitting.** Inside the spec + acceptance tests, proceed.
  At a spec gap, stop and emit `⚠ SPEC GAP:` (already in the spec format) rather
  than guessing.
- **Evidence replaces approval.** Instead of asking "is this right?", show the
  passing check. Verification is what makes high autonomy safe.
- **Two corrections ⇒ reset.** If the user corrects the same thing twice, the
  context is polluted — re-read the baseline and re-prompt, don't keep patching.

This is how you get 80% hands-off *without* the agent confidently shipping the
wrong thing: the autonomy lives inside a spec tight enough to be checked.

---

## 6. Component discipline — stop creating/merging components you don't need

The "big unnecessary issues with creating/merging components" is a stage-3 (Plan)
failure. The gates already exist; the pipeline just has to *force the decision
before the first line of HTML*:

- **Reuse-before-build is a planning gate.** Before any new component, consult
  `docs/specs/component/registry.md` (+ supplements) and the
  `component-reuse-gate.mdc` rule. If a component or variant exists, use it. If a
  variant is missing, **flag and ask** — don't fork a near-duplicate.
- **Merging/splitting is a structural (ask-first) change**, never a side effect
  of a feature PR. Consolidating two components is its own Standard-class task
  with its own spec, not something an implementer does mid-feature "while here."
- **Ownership matrix before HTML** (already a hard blocker) is what makes "do I
  even need a new component?" an explicit, answered question.

The pattern to avoid: a feature task quietly spawns a third button component that
duplicates two existing ones, or merges two services because it was momentarily
convenient. Both are out-of-scope structural changes — they get their own item,
their own class, their own review.

---

## 7. One-paragraph summary

An idea becomes shippable by passing through gated stages: **Ready** (clear value,
scope, testable criteria) → **Specify** (behavior, not implementation; a
state-coherence contract when multiple panes share a selection) → **Plan** (reuse
decided, files mapped, one runnable check named) → **Tasks** (thin vertical
slices) → **Implement** → **Verify** (evidence, fresh-context review) → **Done**
(universal checklist, no leftovers). Agents run ~80% of it autonomously *because*
the spec is tight enough to check, and stop only at the ~20% that the spec can't
resolve — new data shapes, structural component changes, security trade-offs.
The messaging bug disappears when "all panes derive from one selection signal" is
a written, tested contract instead of an unstated assumption.

---

## Sources

- Definition of Ready vs. Definition of Done (Scrum Alliance): https://resources.scrumalliance.org/Article/definition-vs-ready
- Acceptance Criteria vs Definition of Done (AltexSoft): https://www.altexsoft.com/blog/acceptance-criteria-definition-of-done/
- Definition of Done — 2026 guide (LUCKiwi): https://www.luckiwi.com/en/blog/article/definition-of-done/
- Given-When-Then acceptance criteria (Ranorex): https://www.ranorex.com/blog/given-when-then-tests/
- Gherkin acceptance criteria — 2026 guide (TestQuality): https://testquality.com/gherkin-user-stories-acceptance-criteria-guide/
- Five levels of AI coding agent autonomy (Swarmia): https://www.swarmia.com/blog/five-levels-ai-agent-autonomy/
- The 5 levels of AI agent autonomy (Tessl): https://tessl.io/blog/the-5-levels-of-ai-agent-autonomy-learning-from-self-driving-cars/
- Measuring AI agent autonomy (Anthropic): https://www.anthropic.com/research/measuring-agent-autonomy
</content>
