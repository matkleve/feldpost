# Worked Example — Change Classification & Completeness on the Upload Pipeline

Companion to [`docs/playbooks/dev-acceleration.md`](dev-acceleration.md) and the
**Change Classification** + **Change-Completeness Rule** sections in root `AGENTS.md`.

This takes the hardest, messiest part of the codebase — the **upload pipeline** —
and shows exactly how the new rules would have changed how it was built. It's
written as an example to learn from, not a re-litigation of past work.

---

## Why the upload pipeline is the right example

It is the textbook **Sensitive-class** subsystem, and the diary records every
failure mode the new rules target:

| Symptom | Diary entry | What it cost |
| --- | --- | --- |
| Dead fields left after a change, **still referenced in spec + types** | `2026-06-13.md` — `project_address_a`/`project_address_b` "are dead code (no producer) but types and stepper-FSM spec still reference them" | Confusion about what's real; agents implementing against phantom contracts |
| A service grew to **~1625 lines** before an emergency split | `2026-05-27.md` — `upload-location-resolution.service.ts` ~1625 lines; `upload-manager.service.ts` ~709 lines | A whole separate "mechanical split" PR + ESLint line caps retrofitted |
| **Fixes layered on fixes** without re-checking the baseline | `2026-05-21.md` — "a long detour caused by layering fixes on top of each other without re-checking the baseline" | Rework; regressions reintroduced |
| Post-implementation **regressions** found only by live use | `2026-05-25.md` (N:N map regression), `2026-05-27.md` (re-upload loop, duplicate `runPipeline`) | Bugs shipped past "it builds" because there was no behavioral check |
| **Flaky cross-file tests** (injector pollution) | `2026-05-27.md` — `LocalGeoDataAdapter` fetch pollution across spec files | Tests that can't be trusted as a gate |

Every row maps to a rule below.

---

## 1. Classify it up front → **Sensitive**

The upload pipeline touches `organization_id`-scoped data, RLS
(`validate-upload-role-rls.sql`), a multi-step FSM (resolver tray / stepper), and
storage. Under the new matrix it is **Sensitive** by definition, which means
*before the first edit* the contributor owes:

- an ownership matrix + FSM/transition table for the touched surface,
- the matching `validate-upload-role-rls.sql` and DSGVO check,
- a named **LIVE VERIFICATION** step (the diary already mandates one — e.g.
  *"folder upload → tray shows only conflict job(s) → Save photo location → one DB
  row per file; no duplicate `runPipeline` for same id"* from `2026-05-27.md`),
- **fresh-context adversarial review by a different agent than the implementer.**

Declaring this up front is what stops the "small diff, big blast radius" trap —
the re-upload loop and N:N map regression were both small diffs in a Sensitive
subsystem.

## 2. The Change-Completeness Rule, applied

The `project_address_a/b` incident is the canonical violation: the producer was
removed, but the **fields, the types, and the stepper-FSM spec** kept referencing
them. Under the rule, that change was **not done**. The completion gate is one
command per removed concept:

```bash
# After removing a concept, BOTH of these must return zero stray hits:
rg -n 'project_address_a|project_address_b' apps/web/src
rg -n 'project_address_a|project_address_b' docs/specs
```

If either is non-zero, the change isn't finished — either the removal is
incomplete or the spec/types still describe a contract the code no longer honors.
This is cheap, deterministic, and would have caught the exact issue the diary
logged. (Candidate to wire as a Stop hook for `core/upload/**` edits — see
"Make it automatic" below.)

## 3. Re-read the baseline before layering a fix

`2026-05-21.md`'s "long detour" came from stacking fixes without re-reading
current state. The rule: **before adding a fix to a Sensitive surface, read the
current code/spec baseline first** (don't trust your memory of it from earlier in
the session). In agent terms — `/clear` or a fresh subagent to re-read the file,
rather than patching on top of a polluted context. Two failed corrections on the
same spot ⇒ stop, re-read, re-prompt.

## 4. Verify behavior, not compilation

Every upload regression in the diary (`runPipeline` duplication, N:N map coords,
re-upload loop) passed `ng build`. "It builds" is not acceptance for
Sensitive-class work. Each upload change should end in a **runnable check**:

- the existing `vitest` specs (`upload-location-resolution.service.spec.ts`,
  `upload-manager.service.spec.ts`), **and**
- the named LIVE VERIFICATION block, with evidence pasted (console showing no
  duplicate `runPipeline` for the same id; one DB row per file).

Note the diary's own flag: those two upload specs **flake when run together**
(`LocalGeoDataAdapter` injector pollution). A flaky test is not a gate — fixing
that isolation is itself a Standard-class task worth doing, because it's what
makes the verification loop trustworthy.

## 5. Size as an early-warning signal

`upload-location-resolution.service.ts` reaching ~1625 lines was a lagging
indicator that completeness had been skipped for months — orphaned branches and
parallel code paths accumulate as length. The ESLint caps now in place
(≤300 code lines per `core/upload/**/*.service.ts`, ≤80 per function — `2026-05-27.md`)
are the right deterministic gate; the matrix just makes the split a planned
Standard task instead of an emergency.

---

## Make it automatic (optional next step)

The completeness check is a natural **Claude Code Stop hook** scoped to upload
edits — it turns rule #2 from "the agent must remember" into "the session cannot
end dirty." Sketch only; wire it deliberately, not blindly:

```jsonc
// .claude/settings.json (illustrative)
{
  "hooks": {
    "Stop": [
      {
        // If a removed-concept marker is left behind in code or specs, block the stop.
        // Real version reads a small allowlist of "concepts removed this change".
        "command": "node scripts/check-change-completeness.mjs"
      }
    ]
  }
}
```

Keep it lean: a dead-code linter that cries wolf would *add* the friction this
whole effort is meant to remove. Start with the explicit `rg` check in PR
review; promote to a hook only once it's proven to catch real leftovers without
false positives.

---

## One-line takeaway

The upload pipeline was hard because it was **Sensitive-class work run without
Sensitive-class ceremony, and changes were declared "done" at compile time
instead of at completeness + behavior**. The two new rules — classify up front,
and don't finish until what you replaced is gone — target precisely that.
</content>
