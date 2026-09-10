# ADR-0007 — The upload phase transition map asserts; only terminality vetoes

- **Status:** accepted
- **Date:** 2026-09-10
- **Deciders:** repository owner, on the adversarial review of PR #129
- **Applies to:** `apps/web/src/app/core/upload/support/upload-phase-transitions.ts` and every caller of `setPhase` / `transitionTo`

## Context

The upload queue is a state machine, and `AGENTS.md` requires stateful services to declare
their states, their terminal states and their idempotency rules. UP-11 added a
`Record<UploadPhase, UploadPhase[]>` transition map and made `setPhase` reject anything the
map did not list.

Then the map turned out to be wrong. NF-38 moved dedup ahead of location resolution, so
`dedup_check → resolving_location` / `→ awaiting_disambiguation` / `→ conflict_check` were all
missing, and every caller ignores the boolean return — ambiguous-address tray resolution was
functionally dead. A global audit found six more missing edges. An eighth surfaced during
review: `awaiting_conflict_resolution → queued`, whose `USER_TERMINAL_RESURRECTIONS` entry was
unreachable because that phase is not terminal, so conflict resolution silently failed to
requeue. **Eight wrong edges in a map that had authority over user work.**

The first remedy proposed was to `failJob` on an illegal transition, reasoning that a silent
stall is invisible. That is worse, and checkably so: because call sites run on regardless, a
missing edge previously produced a wrong *label* on a job that still finished. With `failJob`,
`upload-replace-pipeline-finish.util.ts` would store the file, save the record, mark it done —
and then tell the user the upload failed, inviting them to re-upload a file that is already
stored. Failing in the destructive direction, on the authority of a map that had been wrong
eight times.

## Decision

**Terminality is the only hard invariant.** A pipeline-channel transition out of a terminal
phase (`complete`, `error`, `missing_data`, `skipped`) is rejected with no mutation, so
background work can never resurrect a finished job; `failJob` enforces the same rule
independently.

**Every other edge in the map is an assertion about pipeline structure, not a permission.** An
unmapped non-terminal transition is reported through `reportTransitionViolation` — the Vitest
hook in `src/test/vitest.setup.ts` throws, `ngDevMode` logs `console.error` — and is then
**applied**. When the map and the running pipeline disagree, the pipeline is the authority and
the map is the bug.

`setPhase` and `transitionTo` return `false` only for an unknown job id or a terminal source.
Callers should read `false` as "this job is gone", not "retry".

## Alternatives considered

### Full veto — reject any unmapped transition (the shipped UP-11 behaviour)

Rejected: it produced a silently stranded job and a dead tray-resolution path, and nothing
surfaced it because callers ignore the return value.

### `failJob` on an unmapped transition

Rejected: converts a wrong label into a false failure on a *successful* upload, and invites
a duplicate re-upload. Loud was right; fatal inverted the failure into the destructive
direction.

### Delete the map

Rejected: the map is the only written statement of the pipeline's intended shape, it is what
made the eight defects findable at all, and the state-machine invariants rule requires a
declared state model. Its authority is what was wrong, not its existence.

## Consequences

- **Good:** a map defect can no longer destroy or strand user work; it fails the test suite
  and shouts in dev, which is where a documentation defect belongs.
- **Cost:** production silently tolerates an unmapped transition. The map's accuracy now
  depends on dev and CI runs exercising the path, so a rarely-taken branch can stay wrong
  until someone tests it.
- **Cost:** the guard no longer protects against a genuinely illegal non-terminal jump — that
  protection was never real, since the map was the thing being wrong.
- **Gate:** the Vitest reporter throws on any unmapped non-terminal transition, so the upload
  suite fails on map drift. Terminality is covered by the idempotency table in the supplement.

## Evidence

- [`upload-manager.phase-fsm.supplement.md`](../specs/service/media-upload-service/upload-manager.phase-fsm.supplement.md)
  § Guard policy — the normative statement `[A]`.
- `apps/web/src/app/core/upload/support/upload-phase-transitions.ts` —
  `TERMINAL_PHASES`, `reportTransitionViolation`, the `ngDevMode` branch `[A]`.
- `apps/web/src/test/vitest.setup.ts` — `setTransitionViolationReporter` installs a throwing
  reporter for the suite `[A]`.
- [`docs/ai-diary/2026-09-10.md`](../ai-diary/2026-09-10.md) § "The transition map shipped
  wrong on eight edges" — the eight edges and the `failJob` reversal `[A]`.

## Superseded by

*none*
