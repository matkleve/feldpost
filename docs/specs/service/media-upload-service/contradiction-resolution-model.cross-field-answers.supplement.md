# Contradiction Resolution Model — answering a cross-field conflict (supplement)

> **Parent:** [contradiction-resolution-model.md](./contradiction-resolution-model.md) § Class C, gap **G7**
> **Decision:** [STUDY-006 D-12](../../../study/006-upload-pipeline-correction-plan.md#d-12) — option **C** (re-derive) **+ D** (loop guard)
> **Findings:** [F-21](../../../study/005-upload-pipeline-trace-findings.md#f-21), [F-22](../../../study/005-upload-pipeline-trace-findings.md#f-22)

## What It Is

An `admin_level_conflict` tray can carry entries from **more than one field**. `detectAreaConflicts`
merges a contradicting `state` or `postcode` entry into the `city` conflict's own entry list (the AT
gazetteer and postcode cross-checks), so the question *"which city?"* is really *"which of these two
mutually exclusive readings of the path?"*.

Answering wrote only the chosen field. The other side of the contradiction survived untouched, the
conflict re-formed on the next detect pass, and the identical tray re-opened — measured at **55
answers to one question in a single run** ([F-21](../../../study/005-upload-pipeline-trace-findings.md#f-21)).
This document defines what an answer must do instead.

## Rule 1 — a tray answer is authoritative for everything it implies

When the user answers a field, that value **wins over path evidence on other fields that contradicts
it**. Concretely, in `applyAdminLevelSelectionsToSearchObject`, after the chosen field is written:

1. **Drop the contradicting evidence.** Only the three contradictions `detectAreaConflicts` itself
   checks, in the same direction, using the same predicates — nothing new is invented:

   | Answer on | Drops | Test |
   | --- | --- | --- |
   | `city` | `state` entries the city cannot sit in | `cityBelongsToState` |
   | `city` | `postcode` entries whose known expansion excludes the city | PLZ map |
   | `state` | `city` entries that cannot sit in the state | `cityBelongsToState` |
   | `state` | `postcode` entries implausible for the state | `isPostcodePlausibleForState` |
   | `postcode` | `city` entries outside the postcode's known expansion | PLZ map |
   | `country` | — | no cross-check consumes it |

   A field whose evidence is emptied loses its flat value too; it is not left stale.

2. **Re-run the derivation pass** (`corroborateAreaEvidence`). With the contradicting `state` gone,
   the existing **`city→state`** rule fills it from the answer — `Mödling` → `Niederösterreich`,
   written as a normal derived entry (`origin: 'derived'`, `rule: 'city→state'`,
   `derivedFrom: 'Mödling'`). This is the rule the derivation pass already owns; the only gap was
   that it never ran again after a tray answer (`deriveStateFromCity` returns early when `state`
   evidence exists, which is correct for path evidence and wrong for evidence the answer just
   overrode).

3. **Re-collapse the flat view** (`collapseAreaFlatFields`) so the Search Object's fields match the
   evidence, then rebuild `groupingKey` as today.

**Cost, accepted with the decision:** a tray answer silently overrides a value the path really did
assert (`1160 Wien` in the filename, when the user picks `Mödling`). That is the point — the user
answered the question the contradiction posed, and one of the two readings has to lose.

**Convergence.** After step 2 the detect pass has nothing left to contradict, so the answer settles
the conflict in one round. This is a property of the rule, not of the data: the drop set is defined
as exactly the contradictions the detector raises.

## Rule 2 — an answer that moves nothing must not be asked again (loop guard)

Rule 1 makes the tray converge; the guard makes a **failure** to converge visible instead of
infinite. An answer may only re-register a tray if it made **progress**, defined as: the Search
Object's four area fields (`country`, `state`, `postcode`, `city`) are not identical to what they
were before the answer was applied.

If an answer leaves that tuple unchanged and a conflict still stands, the pipeline MUST NOT
re-register the tray. The jobs go to Issues (`phase: 'missing_data'`,
`issueKind: 'address_deferred'`) where a human can set the address directly.

**Why not key on the conflict signature.** The obvious guard — "never ask the same
`areaConflictQueryKey` twice" — produces false positives. `detectAreaConflicts` pass 3 synthesizes a
`city` entry for every city a contradicting postcode expands to, so the legitimate follow-up
question after answering `state = Niederösterreich` (*"Mödling, or the `1160` that says Wien?"*)
carries the **same** signature `city|modling,wien` as the question just answered — while being a
different, answerable question that converges on the next click. `[A]` Measured in
`upload-location-area-choice.util.spec.ts`. Progress on the Search Object distinguishes the two
cases exactly; the signature does not.

This is a safety net, not a resolution path: with Rule 1 in place it should never fire, and if it
does, something is wrong and Issues is the honest destination.

## Rule 3 — answering a tray returns the job to the queue

Every tray answer that places a job MUST return it to `phase: 'queued'` and drain the queue.
`applyPreResolveFromOrchestrator` applies the placement and reports `'continue' | 'held' | 'partial'`;
it does **not** move the phase on, and the drain only ever selects `phase === 'queued'`
(`selectQueuedJobsForStart`). A job left in `resolving_location` is invisible to the queue forever —
shown in the **Active** lane, never uploading
([F-22](../../../study/005-upload-pipeline-trace-findings.md#f-22)).

| `applyPreResolveFromOrchestrator` | Then |
| --- | --- |
| `'continue'` | placement decided → `setPhase('queued')`, drain |
| `'held'` | a further tray opened → leave the job parked, it is waiting on a real question |
| `'partial'` | routed to Issues → leave it |

This applies to `applyLayerPackageChoice` and `applyAreaConflictChoice`. The plain candidate path,
both source-conflict paths, and `containment_check`'s "Keep" already do it explicitly.

## Acceptance criteria

- [x] Answering `city = Mödling` on `Mödling/Wilhelminenstraße 141/Wilhelminenstr 141, 1160 Wien.jpg`
      clears the conflict in **one** round: `state` becomes `Niederösterreich` (derived, `city→state`),
      the contradicting `1160` is dropped, `areaConflicts` is empty.
- [x] The derived `state` carries `origin: 'derived'`, `rule: 'city→state'`, `derivedFrom`.
- [x] An answer that leaves the four area fields unchanged routes to Issues instead of re-registering
      a tray.
- [x] An answer that moves the area fields still opens its follow-up tray, even when the conflict
      signature is unchanged (cascade preserved).
- [x] `applyLayerPackageChoice` and `applyAreaConflictChoice` re-queue on `'continue'` and leave the
      job parked on `'held'`.
