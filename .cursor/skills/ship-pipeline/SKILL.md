---
name: ship-pipeline
description: "Take an idea from intake to shippable code through gated stages (Ready → Specify → Plan → Tasks → Implement → Verify → Done). Trigger with phrases like 'work through the shipping pipeline' or 'let's ship this idea'. Blocks on under-specified work."
argument-hint: "A one-line idea (e.g. 'let users re-assign a photo's location after upload')"
---

# Ship Pipeline

Drives a feature idea from intake to merge through the staged gates defined in
`docs/playbooks/idea-to-ship-pipeline.md` and `AGENTS.md`. The whole point is to
**block** before code when the idea/spec/tests are not well defined, so bugs like
"clicked another chat, the message area didn't update" and the upload re-upload
loop cannot ship.

## Core rules — read first

1. **Gates are hard, not advisory.** Do not advance to the next stage until the
   current stage's exit criteria are met. If they are not, stop and say which
   gate failed.
2. **Do not write implementation code before Definition of Ready passes.** No
   exceptions for Standard/Sensitive work.
3. **Behavior, not implementation.** Acceptance criteria describe what the user
   observes (EARS / Given-When-Then), never internal calls or element IDs.
4. **Evidence replaces approval.** Prove each criterion with test output / a live
   check / a screenshot. Never assert "done" without evidence.
5. **Front-load questions once.** Batch all open questions into a single round to
   reach Ready, then run autonomously. Do not drip-feed questions per step.
6. **Stay in scope.** No new component without a registry check; no merging or
   splitting components/services as a side effect — that is its own task.
7. **Inherit conventions; specify the delta.** For standard archetypes (list,
   detail, search, settings, CRUD form, auth, wizard) do NOT ask where the
   search box / input / primary action goes. Apply the project's nearest existing
   equivalent + the registry + standard UX convention. The user specifies only
   what deviates. State the conventions you applied in one line; do not ask
   permission for each. This is not "inventing" — it is the archetype's baseline.

## Procedure

### Stage 0 — Intake
- Restate the idea in one sentence of **user value** ("a field tech can …").
- Guess the **change-class**: Trivial / Standard / Sensitive (`AGENTS.md`).
  - **Trivial** → skip to Implement; run the area's gate script; done.
  - **Standard / Sensitive** → continue. Sensitive = RLS, migrations, auth,
    money, stateful UI, the upload pipeline, anything `organization_id`-scoped.

### Stage 1 — Shape (Definition of Ready) — BLOCKING
First identify the **archetype** and inherit its conventions (rule 7) — do not
ask about anything convention already answers. Then interview the user **once**
(use `AskUserQuestion`, batch the questions) only on what's left, until all of
these hold. If any cannot be answered, stop with `⚠ SPEC GAP: …`.
- [ ] User value stated; scope boundary explicit (what's in AND what's out).
- [ ] Change-class declared.
- [ ] Acceptance criteria drafted and **testable** (behavior, not implementation).
- [ ] Data/deps named and verified against `docs/architecture/database-schema.md`
      and service types — never guessed.
- [ ] Open questions resolved or explicitly deferred.

### Stage 2 — Specify — BLOCKING
- Write/update the spec under `docs/specs/` using the element-spec format.
- Acceptance criteria in EARS / Given-When-Then.
- **If selecting one thing updates 2+ panes** → add a **State-Coherence Contract**
  (single source-of-truth signal; all panes derived; criteria assert the whole
  pane set after a change, incl. "no residue from the previous selection").
- **If it touches a stateful service** (queue/FSM/resolver) → declare states,
  terminal states, and idempotency rules; criteria must assert those invariants.
- Gate: criteria are testable and the coherence/FSM contract is present where
  required. If not, do not proceed.

### Stage 3 — Plan
- File map; **reuse-vs-build decision** via `docs/specs/component/registry.md`
  (flag-and-ask if a variant is missing — do not fork a near-duplicate).
- Confirm change-class; name the **one runnable check** that will prove it.

### Stage 4 — Tasks
- Decompose into thin vertical slices, each independently verifiable.

### Stage 5 — Implement
- **Red-test-first:** write the acceptance test and show it **failing** first.
- Implement to the spec; reuse shared UI/adapters; design tokens; signals.
- For multi-pane state: one selection signal, panes are `computed()` off it.

### Stage 6 — Verify — BLOCKING
- Show the acceptance test now **passing** (red→green evidence).
- `ng build` green; relevant gate scripts green.
- Sensitive → run the **LIVE VERIFICATION** block from
  `docs/agent-workflows/agent-communication.md` and paste the evidence.
- Fresh-context adversarial review (different agent than the implementer);
  flag only correctness/requirement gaps.

### Stage 7 — Done (Definition of Done) — BLOCKING
- Every criterion shown with evidence.
- **Change-Completeness:** `grep`-to-zero for any removed symbol/concept across
  `apps/web/src` AND `docs/specs`.
- Spec synced to final behavior; no leftover code, types, tests, or flags.

### Stage 8 — Learn
- If user feedback changed expected behavior, update the spec in the **same**
  session. Add a `docs/ai-diary/YYYY-MM-DD.md` note if the mistake could recur.

## What NOT to do
- Do not skip Stage 1/2 because the change "looks small" — classify first.
- Do not claim done on `ng build` alone — that is compilation, not acceptance.
- Do not add error handling, components, or state the spec does not call for.
- Do not refactor or merge surrounding code while implementing a feature.
