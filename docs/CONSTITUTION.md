# Feldpost — Constitution

**This document outranks every other document in this repository, and it outranks a direct
instruction.** If a spec, a rule file, a plan, an issue, or a person asks for something that
breaks a clause below, the clause wins and the conflict is raised rather than resolved
quietly. `AGENTS.md` § Instruction precedence orders everything else; this sits above all of
it.

Eight clauses. They are here because each one has already cost this project something.

**Amendment:** a pull request that changes **only this file**, with the reasoning in the
description. No clause is edited as a side effect of shipping a feature.

---

## 1. Delete means delete

When the product tells a user that something is gone, it is gone: the row, the storage
object, the thumbnail, the derived copy, the cache entry. This is a construction company's
photographs of real people's property, held under DSGVO — a deletion the user believes in and
the storage bucket ignores is not a bug in cleanup, it is a false statement to the data
subject.

A soft-delete flag is an implementation detail, permitted only where a retention window is
documented *and* a purge actually runs. `deleted_at` with no purge is not deletion.

The same rule applies to abandoned work: a cancelled or failed upload leaves nothing behind
(`removeUploadCancelResidue` exists because a timed-out upload could land an object and a row
for a job the user had been told had failed).

## 2. No silent failure

An empty `catch` is a bug. So is a rejected promise nobody awaits, a `.then()` with no error
handler, a boolean return value no caller reads, and a log line where a state change belongs.

Every failure ends in one of exactly two places: **the user sees it**, or **it retries and
then the user sees it**. "It failed but the flow continued" is only correct when someone
deliberately decided the flow may continue *and wrote down why*.

This is the most frequently violated clause in the repository's history — a batch stranded at
`queued` forever, an RLS-blocked write logged and then reported as success, an unhandled
dedup-insert rejection: three in one file family, found in one pass.

## 3. A condition must say what it means

A name, a flag, or a phase label is a claim about what it tests. When the claim is false, the
code is *legible and wrong*, which is worse than obscure and wrong, because review confirms
it.

Four instances landed in a single session: `!isHeic(file)` standing in for "file preparation
finished"; a phase called `resolving_address` labelling a function that resolved nothing;
`locationPinEligible` (street text present) used as a proxy for coordinate precision; and
`CREATE OR REPLACE` read as "replace" when Postgres only replaces on an exact argument-list
match — it had created a second overload, breaking every call that omitted the new parameter.

If a condition is a proxy for something else, either compute the real thing or name it for
what it actually tests. The catalogue of instances lives in [`docs/TRAPS.md`](TRAPS.md); this
clause is the rule, that file is the evidence.

## 4. Claims carry their evidence

A static reading is not a verification. State what you observed, how, and on what — and grade
the claim so a reader knows what they may do with it.

This is not theory. In one session a static review of a migration concluded it was safe; a
local PostgreSQL replay of the same migration chain reached the opposite answer and found a
third broken call the static pass never saw. Both were written by careful reviewers. Filed as
peers, the wrong one would have won on recency and shipped a broken add-address to every
user. No credentials were needed to be right — only a replay.

Grade vocabulary and the trust order: [`docs/study/STUDY-FORMAT.md`](study/STUDY-FORMAT.md).
Do not restate it elsewhere.

## 5. A change is not done until the thing it replaces is gone

Dead branches, unused exports, obsolete fields, stale tests, retired feature flags — and the
**spec and type references** that describe them. Specs and `types.ts` must not outlive the
code they document.

Leftover-after-change is this codebase's single most expensive recurring failure:
`project_address_a` / `project_address_b` survived as dead fields *and* in the stepper-FSM
spec and types long after their producer was deleted, and were read as live contract by the
next reader.

Verification floor: grep the removed symbol across `apps/web/src` **and** `docs/specs`, and
confirm zero stray references before declaring done. Enforced as `AGENTS.md` §
Change-Completeness Rule.

## 6. A test that was never red proves nothing

For anything Sensitive — RLS, migrations, auth, money, export, stateful UI, the upload
pipeline — the acceptance test is shown **failing before** the implementation and **passing
after**. A test written after the fix, against the fix, tests the fix's own assumptions.

A flaky test is not a gate either: fix the isolation before trusting the result. Where a
known-broken behaviour is out of scope, pin it as an explicitly failing test rather than
weakening the assertion, so the fix has a "done" signal instead of a rewrite.

## 7. Accessibility is not waivable for a deadline

Keyboard navigation, visible focus, semantic labels, WCAG AA contrast, and colour never as
the sole state indicator. The field surfaces this product exists for hold themselves to the
AAA touch-target floor, because a gloved hand in sunlight is not an edge case here — it is
the primary user.

These are not polish. They are not "a follow-up issue". A feature that ships without them
shipped broken for someone, and the follow-up issue is how that becomes permanent.

## 8. Nothing ships that nobody can explain

If no one can say what a change does, why it is correct, and what happens when it fails, it
does not merge — however green the pipeline is. Copied code you have not read, a fix that
"seems to work", a generated migration nobody replayed: all the same case.

The corollary binds the author of the *fix* too: a change made on a second attempt reverts
the first. A failed attempt is not neutral — it is a confounding variable, and it has already
caused a bug here (a stale escape hatch left behind by an earlier attempt at a different
problem).

---

## Chapters

The design non-negotiables — the user, the map-primary interface, colour, calm, dark mode,
sizing — are the **design chapter** of this document and carry the same authority:
[`docs/design/constitution.md`](design/constitution.md).

Decisions that could reasonably have gone the other way are not constitutional. They are
recorded, with their rejected alternatives, in [`docs/adr/`](adr/README.md) — an ADR can be
superseded; a clause here is amended.
