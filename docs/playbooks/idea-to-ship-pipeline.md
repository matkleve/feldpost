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

### State coherence also applies to *services*, not just panes

The UI-pane version above is the visible half. The other half — and the one a
retrospective on the **upload queue** exposed — is **service state machines**.
The re-upload-loop bug (`docs/ai-diary/2026-05-27.md`: a `queued` job that
already had a `mediaId` got re-run by `drainQueue`, uploading the whole folder)
was not a pane bug. It was a violated **state-machine invariant**: *a job with a
`mediaId` is terminal and must never run again.*

So the contract extends:

> **Service state-machine invariants** — any stateful service (queues, FSMs,
> resolvers) MUST declare in its spec: (a) the set of states, (b) the **terminal**
> states, and (c) **idempotency rules** ("an action on a job in state X is a
> no-op"). Acceptance criteria MUST assert these invariants directly.

For the upload queue, the missing criteria were exactly:

```gherkin
Scenario: A job that already produced a media row is terminal
  Given a job is "queued" and already has a mediaId
  When drainQueue runs
  Then that job does not start a second pipeline run
  And no duplicate upload is attempted (no dedup_hashes 409)

Scenario: Save applies only to the conflict group, not the whole batch
  Given the resolver tray shows 1 conflict job out of an 8-file folder
  When I Save a photo location
  Then only the 1 tray job receives that location
  And the other 7 keep their own EXIF / folder address
```

This connects to the existing FSM contract in `.cursor/rules/ui-state-machine.mdc`
— previously that rule was framed for *UI* state machines; the pipeline now
requires the same rigor for *service* state machines. **The lesson from the
retrospective: "state coherence" is not just "panes agree" — it's "the state
machine's invariants are written down and tested."**

---

## 5. Conventions & autonomy — "don't make me re-specify the obvious"

The real ask is not a percentage. It's: **for a page concept that's been built a
million times, nobody should have to tell the agent where the search box or the
input field goes.** Standard archetypes carry standard layouts; the agent brings
them. You specify the *delta*, not the universe.

### Convention default (specify-the-delta) — the primary rule

- **Recognize the archetype.** List page, detail page, search, settings, CRUD
  form, auth screen, master-detail, wizard — each has a conventional layout and a
  conventional set of states (loading / empty / error / populated).
- **Inherit conventions automatically**, from two sources, in this order:
  1. **This project's existing equivalent** — the nearest page/component and the
     `docs/specs/component/registry.md` entry. Match it (placement, tokens,
     shared primitives, interaction emphasis) so the app stays coherent.
  2. **Standard UX convention** for that archetype where the project has no
     precedent (e.g. search top of list, primary action top-right, destructive
     actions guarded, pagination at the foot of long lists).
- **The spec names the archetype and records only deviations.** "Standard list
  page" + "search filters the current project, not the org" is a complete
  contract. It does **not** need to enumerate where the search field sits — that
  is inherited. This keeps *spec-is-contract* intact: the contract is
  "archetype + deltas," not silence, and not a pixel inventory.
- **Surface, don't ask.** The agent states the conventions it applied in one line
  ("standard list page: search top, new-item top-right, empty-state CTA") so the
  choices are visible — but it does **not** ask permission for each. You correct
  the few that are wrong; you don't dictate the many that are obvious.

This is the counterweight to `implement-from-spec`'s "don't add anything the spec
doesn't mention": that rule prevents *invented behavior*; this one permits
*inherited convention*. Convention for a named archetype is not invention — it's
the baseline the archetype already implies. (Genuinely novel UI, new product
behavior, or anything Sensitive-class still gets specified explicitly.)

### When the agent still must stop and ask

Conventions cover layout and standard states. They do **not** cover product
decisions. Stop and ask (or emit `⚠ SPEC GAP:`) for:

| Inherited from convention — just do it | Must ask / specify explicitly |
| --- | --- |
| Archetype layout: field/search/action placement, standard loading/empty/error states | **What the data means** — which records, which scope (`organization_id`), which filters |
| Reusing a registered shared component, adapter, design token | A **new data shape / table / RLS**, or anything Sensitive-class |
| Naming from the glossary; standard signals/`computed` wiring | Adding a **new component** when a registry variant might cover it (reuse vs build) |
| Matching an existing equivalent page in the app | **Merging/splitting** components or services (structural — its own task) |
| Writing the tests the acceptance criteria imply | A genuine **product-behavior** choice or **security/DSGVO** trade-off the spec doesn't resolve |

Operating rules:

- **Front-load questions once.** For a big ask, interview *once* (batched) to
  reach Definition of Ready, then execute without re-confirming each step. Don't
  drip-feed questions — and don't ask about anything convention already answers.
- **Boundaries, not babysitting.** Inside the spec + acceptance tests + inherited
  conventions, proceed. At a real product gap, stop — don't guess.
- **Evidence replaces approval.** Instead of "is this right?", show the passing
  check and the conventions applied.
- **Two corrections ⇒ reset.** If the user corrects the same thing twice, re-read
  the baseline and re-prompt rather than patching on a polluted context.

The result is what you actually wanted: say "build a standard settings page for
X," and the agent lays it out the conventional way on the first try, asking only
about the handful of things that are specific to *your* product.

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
(universal checklist, no leftovers). For standard archetypes the agent **inherits
conventions** (where the search/input/actions go) from the project's existing
pages and standard UX — you specify only the *delta* that's specific to your
product. It runs hands-off *because* the spec is tight enough to check, and stops
only for genuine product/data/security decisions the spec can't resolve. The
messaging bug disappears when "all panes derive from one selection signal" is a
written, tested contract instead of an unstated assumption.

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
