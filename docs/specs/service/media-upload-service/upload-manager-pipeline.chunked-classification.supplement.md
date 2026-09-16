# Upload Manager Pipeline — chunked classification (supplement)

> **Parent:** [upload-manager-pipeline.md](./upload-manager-pipeline.md)
> **Siblings:** [upload-manager.job-store.supplement.md](./upload-manager.job-store.supplement.md) · [upload-resolver-tray-orchestrator](./upload-resolver-tray-orchestrator.md)
> **Decision:** [STUDY-006 Phase 3.3](../../../study/006-upload-pipeline-correction-plan.md) · **Study:** [STUDY-008](../../../study/008-classification-chunking-strategy.md) · **Finding:** [F-06](../../../study/005-upload-pipeline-trace-findings.md#f-06)

## What It Is

How a submitted batch is classified in chunks that yield to the event loop, so uploading starts
after the first chunk instead of after the whole tree — without splitting a tray question in two.

## Why the naive version is wrong

Classification was awaited in full before `drainQueue()` in all three submit paths, so nothing
uploaded until every file had been through the gazetteer: ~8 minutes of frozen main thread for
100 000 files at the post-Phase-3.2 rate of 4.9 ms/file
([F-06](../../../study/005-upload-pipeline-trace-findings.md#f-06)).

Simply cutting the batch into fixed chunks and letting each one drain immediately would break
something that currently works. `registerDisambiguationGroup` merges a late job into an existing
group with the same `batchId + queryKey`, **but only while that group is still unanswered**
(`isGroupBlocked`). So if the user answers a tray before the rest of its members have been
classified, the remaining files open a **second group asking the identical question**
([STUDY-008 § 2](../../../study/008-classification-chunking-strategy.md)).

The failure is therefore a **race with the user**, not a property of where the cut falls — which is
why this contract closes the race rather than trying to cut in clever places.

## Guarantees

| # | Guarantee | Why it matters |
| --- | --- | --- |
| **G1** | A job becomes drainable only after **its own chunk** has been classified and its group is in the batch cache. | A job that drains before its group exists resolves against nothing and lands in Issues. |
| **G2** | Classification yields to the event loop between chunks. | This is the responsiveness the phase exists for. |
| **G3** | Chunking never changes the outcome: same groups, same lanes, same tray count as an unchunked run. | A performance change that moves a file to a different lane is a bug, not a speed-up. |
| **G4** | No tray is **presented** to the user until the whole batch is classified. | Closes the race in § 2; makes chunk size irrelevant to correctness. |
| **G5** | The batch group cache **merges** across chunks: a grouping key seen twice unions its job ids, never replaces them. | The cache-level form of the same "301st file" problem. |
| **G6** | A failing chunk is logged and skipped; the batch still drains. | Preserves the existing guard (UP-13) — an unguarded throw stranded whole batches at `queued`. |

**G4 is about presentation, not registration.** Groups are registered as they are found; what waits
is `notifyScanIdle`, the call that shows the collected trays. Uploading does not wait for either.

## How it works

1. Jobs for the whole batch are built up front — this is cheap string work, not gazetteer work
   ([STUDY-008 § 1](../../../study/008-classification-chunking-strategy.md): 0.0017 ms/file).
2. The pre-resolve wave is armed **once** with the full batch count, before any chunk runs, so the
   wave cannot complete early.
3. For each chunk: add its jobs, classify only those jobs, drain, then yield.
4. After the last chunk: register trays, then release tray presentation (G4).

Chunk size is a tuning constant, not a correctness parameter — that is what G4 buys.

## Cost model

| | Before | After |
| --- | --- | --- |
| Time to first upload | whole batch classified | one chunk classified |
| Main thread | blocked for the whole batch | yields every chunk |
| Total classification | unchanged | unchanged |

Total work is deliberately unchanged; this phase moves *when* it is paid, after Phases 3.1 and 3.2
made it cheaper.

## Acceptance Criteria

- [ ] Uploading begins after the first chunk, not after the whole batch (G1, G2).
- [ ] A chunked run and an unchunked run of the same corpus produce identical lanes, identical group
      counts and identical tray counts (G3).
- [ ] A grouping key spanning two chunks yields **one** group holding all its jobs (G5).
- [ ] Answering a tray mid-classification cannot produce a duplicate question (G4).
- [ ] No job starts before its own group is in the batch cache (G1).
- [ ] A chunk that throws is logged, and the remaining chunks and the drain still run (G6).
