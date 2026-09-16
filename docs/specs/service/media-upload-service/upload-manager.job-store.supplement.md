# Upload Manager — job store contract (supplement)

> **Parent:** [upload-manager.md](./upload-manager.md)
> **Sibling:** [upload-manager.phase-fsm.supplement.md](./upload-manager.phase-fsm.supplement.md) — which phase edges are legal
> **Code:** `apps/web/src/app/core/upload/support/upload-job-state.service.ts`
> **Decision:** [STUDY-006 Phase 3.1](../../../study/006-upload-pipeline-correction-plan.md) · **Finding:** [F-07](../../../study/005-upload-pipeline-trace-findings.md#f-07)

## What It Is

`UploadJobStateService` is the single owner of upload job state for the whole session: every
pipeline step, the queue, the trays and the panel read and write jobs through it and nowhere else.
This file states what the store guarantees, so the representation behind it can change without
anyone having to re-derive the guarantees from the implementation.

## Why the representation is part of the contract

A batch writes roughly **15 times per job**. While the store was a plain array, every write rebuilt
the whole array (`prev.map(...)`) and every read scanned it (`prev.find(...)`), so one write cost
`O(n)` and a batch cost `O(n²)`: 0.002 ms per write at 100 jobs, **0.573 ms at 20 000**, which is
2.9 minutes of main-thread work for one 20 000-file import and the single largest cost at size
([F-07](../../../study/005-upload-pipeline-trace-findings.md#f-07)).

The store is therefore **id-keyed**: a `Map<jobId, UploadJob>` is the source of truth, and the array
the UI renders is derived from it.

## Guarantees

| # | Guarantee | Why it matters |
| --- | --- | --- |
| **G1** | `findJob(id)` and `updateJob(id, patch)` are `O(1)` in the number of jobs held. | The whole point of F-07; a batch must not be quadratic. |
| **G2** | `jobs()` yields jobs in **insertion order**, stable across updates. | Panel rows must not reorder when a job's phase changes. |
| **G3** | A write replaces **only** the patched job's object; every other job keeps its identity. | Change detection and `@for` tracking must not see the whole list change. |
| **G4** | A write to an unknown id is a no-op and notifies nobody. | A late write for a removed job must not wake the UI. |
| **G5** | `snapshot()` and `jobs()` return the same jobs in the same order; neither exposes the internal map. | Callers iterate a stable list; nobody mutates the store from outside. |
| **G6** | Terminality is enforced on transition, not on storage: a terminal job stays terminal (`transitionTo` rejects a pipeline-channel write out of a terminal phase), and reaching a terminal phase releases the in-flight dedup hash. | Unchanged from before; restated here because the store owns it. |

G6 is stated in full, with the phase map, in
[upload-manager.phase-fsm.supplement.md](./upload-manager.phase-fsm.supplement.md).

## Cost model

| Operation | Cost | Note |
| --- | --- | --- |
| `findJob`, `updateJob`, `removeJob` | `O(1)` | map lookup + one object spread |
| `addJobs(k)` | `O(k)` | |
| `jobs()`, `snapshot()`, `activeJobs()` | `O(n)` **per read**, recomputed only after a write | Angular batches reads; writes outnumber reads ~15:1 per job |
| `removeTerminalJobs` | `O(n)` | runs once per cleanup, not per job |

Moving the `O(n)` from *every write* to *reads that actually happen* is the change. A read still
costs `O(n)`, and that is correct: the UI genuinely needs the whole list.

## Acceptance criteria

- [x] `updateJob` cost is flat from 100 to 20 000 jobs in the harness scale tier, instead of rising
      0.002 → 0.573 ms.
- [x] Job order in `jobs()` matches insertion order after arbitrary updates (G2).
- [x] Updating one job leaves every other job object identical by reference (G3).
- [x] `updateJob` with an unknown id changes nothing and emits nothing (G4).
- [x] The existing phase-FSM and dedup-release behaviour is unchanged (G6) — the phase-transition
      suite passes untouched.
