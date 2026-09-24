# Archive Import Mode — phase transitions (supplement)

> **Parent:** [upload-archive-import-mode.md](./upload-archive-import-mode.md)
> **Sibling:** [upload-manager.phase-fsm.supplement.md](./upload-manager.phase-fsm.supplement.md) — the phase map this one narrows
> **Related:** [upload-manager-pipeline.chunked-classification.supplement.md](./upload-manager-pipeline.chunked-classification.supplement.md)

## What It Is

Which phase edges an archive import may take, and — more importantly — which one it may not.

## The single narrowing

An archive import uses the same FSM as an interactive upload, with one phase removed:

> **`awaiting_disambiguation` is unreachable in an archive import.**

Everything else follows from that. A job that an interactive run would park for a question is routed
to `missing_data` with `issueKind: 'address_deferred'` instead.

| Situation | Interactive | Archive import |
| --- | --- | --- |
| Group resolves cleanly | `resolving_location → queued → … → complete` | identical |
| Group needs a layer-package choice | `→ awaiting_disambiguation` | `→ missing_data` (`address_deferred`) |
| Group has an area conflict | `→ awaiting_disambiguation` | `→ missing_data` (`address_deferred`) |
| Geocoder returns nothing | `→ awaiting_disambiguation` (containment check) | `→ missing_data` (`address_deferred`) |
| Path carries no address at all | `→ missing_data` | identical |
| Duplicate by content hash | `→ skipped` | identical |
| Upload fails | `→ error` | identical |

`missing_data` is already terminal and already the Clarifications lane
([phase FSM supplement](./upload-manager.phase-fsm.supplement.md)), so this adds no new phase and no
new terminal — which is the point. The archive mode is a **narrowing** of an existing machine, not a
second machine.

## Suppress registration, not presentation

Phase 3.3 holds tray **presentation** until a batch finishes classifying, while still **registering**
groups per chunk — because a job must be marked `awaiting_disambiguation` before it drains, and
registration is what marks it.

**Archive mode must do the opposite: suppress registration itself.** Holding presentation would
still mark jobs `awaiting_disambiguation`, which is exactly the phase this mode forbids — the jobs
would sit in a phase whose tray never appears, which is
[TRAP-021](../../../TRAPS.md)'s shape: a job that looks like it is waiting for a user who has nothing
to answer.

| | Phase 3.3 (interactive) | Archive import |
| --- | --- | --- |
| Group registered | yes, per chunk | **no** |
| Job marked `awaiting_disambiguation` | yes | **no** |
| Tray presented | after the batch classifies | never |

So the gate belongs at `registerDisambiguationGroup` / the tray-flow entry points, keyed on the
batch's `importMode`, not at the presentation step the pre-resolve wave owns.

## Ordering guarantee

Because no group is registered, nothing in an archive import can be answered, and therefore the
"group gains members after its tray was answered" race that
[chunked classification](./upload-manager-pipeline.chunked-classification.supplement.md) closes
cannot arise. Chunk size is free in this mode for a second, independent reason.

## Resurrection

`missing_data` is terminal, so items leave it only by an explicit action, exactly as today:

| Action | Edge | Channel |
| --- | --- | --- |
| Bulk resolve a folder | `missing_data → resolving_location → …` | system |
| Resolve a single item from media detail | same | user |
| Operator deletes the item | removed from the store | user |

Bulk resolution must go through the normal resolution path, so a resurrected job re-enters the FSM
by a legal edge rather than being written straight to `complete`.

## Acceptance Criteria

- [ ] No job in an archive import ever holds `awaiting_disambiguation` — asserted over a full
      harness run, not sampled.
- [ ] `registerDisambiguationGroup` is never called for an archive batch.
- [ ] Every job that an interactive run resolves silently reaches `complete` here too.
- [ ] Every job an interactive run would have asked about reaches `missing_data` with
      `issueKind: 'address_deferred'`.
- [ ] Bulk resolution moves such a job out of `missing_data` by a legal transition, and the FSM
      assertion in `vitest.setup.ts` stays silent throughout.
- [ ] No new phase and no new terminal phase is introduced.
