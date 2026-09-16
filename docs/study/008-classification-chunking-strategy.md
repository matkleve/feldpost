---
id: STUDY-008
type: investigation
status: proposed
supersedes: none
corrected-by: none
---

**Measured 2026-09-15** on `claude/uploader-pipeline-test-badges-kktrpg` @ `8420035`, by timing the
real `exifr` build against the 20 shipped sample photos in `apps/web/public/vienna_sample_photos/`,
timing path/grouping work over 100 000 synthetic paths in Node 22, and reading the group-registration
source. No browser measurement; see § 7.

# Chunking classification without splitting what belongs together

[STUDY-006 Phase 3.3](./006-upload-pipeline-correction-plan.md) says to chunk `classifyBatch` so it
yields to the event loop and the queue starts after the first chunk instead of the whole tree. The
owner's framing of the hard part is exact:

> *"Taking in at a fixed value the first 300 may cause issues cause the 301 belongs to a group of
> pictures in the first one."*

And the real-world shape that makes it concrete: company folders named by street, then number, then
`(1)`, `(2)`, `(3)` … because it is the same street.

This study answers three questions: how cheap is the structural pass really, what actually goes
wrong when a chunk boundary splits a group, and what the chunker therefore has to be clever about.

## 1 · The measurement that reframes the problem

The owner asked how fast just reading the folder/file structure and EXIF would be. Measured: `[B]`

| Pass | ms per file | 100 000 files |
| --- | --- | --- |
| Path split into segments | 0.0017 | **0.17 s** |
| Group files by folder | 0.0005 | **0.05 s** |
| EXIF GPS read (`exifr.gps`, real files) | 0.071 | **7.1 s** |
| **Gazetteer classification** | **4.9** | **8.2 min** |

**Structure is ~2 900× cheaper than classification.** `[B]` The owner's instinct — that we might
read the whole tree quickly and clarify things before the expensive work — is not merely viable, it
is dramatic: the entire shape of a 100 000-file import is knowable in **under a fifth of a second**.

Caveats, stated because they matter: the sample photos are 13 KB and synthetic, while real photos are
3–8 MB. `exifr` reads only the header, so parse cost should hold, but browser File-API I/O over
large files is unmeasured and could dominate the 7 s figure. `[C]` The 4.9 ms/file classification is
the post-Phase-3.2 number measured on the same machine. `[B]`

**Consequence.** The choice is not "chunk blindly or block". It is a **two-pass** design: a cheap
pass over *everything* that learns the shape, then an expensive pass that uses the shape to decide
order and boundaries. Everything below assumes that.

## 2 · What actually breaks when a boundary splits a group

This is the question the owner's 301st file poses, and the answer is not what it looks like.

`registerDisambiguationGroup` (`upload-location-disambiguation-registration.service.ts:44-50`) looks
for an existing group with the **same `batchId` and `queryKey`** and, if it finds one, adds the new
jobs to it instead of creating a second group. `[A]` So a group formed in chunk 1 **absorbs** files
from chunk 2 that ask the same question. A split boundary is, by itself, harmless.

But the lookup is filtered by `isGroupBlocked(g)`, which is
`resolutionGateOpen && resolutionStatus === 'pending'` (`upload-location-resolution.helpers.ts:614`).
`[A]` Once the user has **answered** that tray, it no longer matches, and chunk 2's files create a
**second group asking the identical question**.

So the failure mode is precise, and it is a **race with the user, not a property of the boundary**:

> A chunk boundary only costs a duplicate question when the user answers the tray **before** the
> remaining members of that group have been classified. `[A]`

That reframes the whole design. The expensive thing to get right is not where the cut falls — it is
making sure a group cannot be answered while it is still filling up.

## 3 · The options

| | Option | Boundary quality | Complexity |
| --- | --- | --- | --- |
| **A** | Fixed-size chunks (e.g. 300), trays activate immediately | Splits groups constantly | Trivial |
| **B** | Fixed-size chunks, **tray activation deferred** until classification completes | Irrelevant — nothing can be answered early | Trivial + one flag |
| **C** | Folder-boundary chunks | Good while folders are small; fails on a 10 000-file folder | Low |
| **D** | Folder boundaries, oversized folders split at **naming discontinuities** | Best | Moderate |
| **E** | D + deferred activation | Best, and correct regardless | Moderate |

**A is the version that must not ship.** It is the one the owner's objection describes, and § 2 says
why it bites: immediate activation plus arbitrary cuts is exactly the combination that duplicates
questions.

**B is the surprising one.** Deferring tray *activation* (not classification, not uploading) until
the batch is fully classified makes chunk size irrelevant for correctness. Uploading still starts
after chunk 1 — which is the entire point of Phase 3.3 — because uploading is gated on a job's
location being resolved or absent, not on trays being open. The user gets files moving in under a
second and questions once, in one settled set, instead of a drip that can duplicate.

`[C]` This is inferred from the registration logic, not yet demonstrated end-to-end; § 6 makes it the
first experiment precisely because it is cheap to test and would make D unnecessary for correctness.

## 4 · The naming-discontinuity algorithm

Even with B, D remains valuable — not for correctness but for **ordering and responsiveness**: a
chunk that contains a whole coherent group produces its tray sooner and lets the user start
answering while the rest classifies.

The owner's pattern (`Mariahilfer Straße 100 (1).jpg`, `(2)`, `(3)` …) suggests the rule:

1. **Sort** the folder's files by name. `webkitdirectory` order is not guaranteed, and the algorithm
   is meaningless unsorted. Sorting 100 000 strings is tens of milliseconds. `[C]`
2. **Reduce each name to a stem**: strip the extension, strip a trailing sequence marker
   (`(12)`, `_0012`, `-12`, ` 12` at the end), strip a leading camera prefix (`IMG_`, `DSC`).
3. **Cut where the stem changes.** Consecutive files sharing a stem stay together.
4. **Cap the run**: if one stem covers more files than the chunk budget, cut inside it. A single
   address with 5 000 photos is one question anyway, so splitting it is harmless *given B*.

Cost is string work at the 0.0005 ms/file order measured in § 1 `[B]` — negligible against 4.9 ms of
classification.

**What it must not pretend to be.** This is a cheap *approximation* of the grouping the pipeline
computes properly downstream. It does not need to be right; it needs to avoid obvious splits. Any
design where a wrong stem guess produces a wrong *answer* rather than a slightly worse *chunk* has
overreached. `[D]`

## 5 · Ordering — the free win

Once § 1's cheap pass has run, chunks can be ordered rather than taken in directory order. `[D]`
Useful orders, in rough value:

- **Smallest folders first.** Maximises the number of folders fully classified early, so early trays
  are complete ones.
- **Folders whose names already look like addresses first.** They are likeliest to resolve without a
  question at all, so uploads start flowing before any tray appears.
- **Largest folders last.** One 10 000-file folder is one question; it does not need to be early.

None of this is available to a blind chunker, and all of it is free once the structural pass exists.

## 6 · Recommendations

| # | Recommendation | Grade |
| --- | --- | --- |
| **R1** | Two passes: cheap structural scan over everything (< 1 s at 100 k), then chunked classification | `[D]` |
| **R2** | **Defer tray activation until classification finishes.** Test this first — it may make R4 optional | `[D]` |
| **R3** | Start the queue after the first chunk; uploading is gated on location state, not on trays | `[D]` |
| **R4** | Chunk on folder boundaries; split oversized folders at naming discontinuities (§ 4) | `[D]` |
| **R5** | Order chunks smallest-first / address-like-first | `[D]` |
| **R6** | Do **not** ship fixed-size chunks with immediate tray activation (option A) | `[D]` |
| **R7** | Measure duplicate-question count in the harness as the acceptance metric, not just time-to-first-upload | `[D]` |

R7 matters because time-to-first-upload alone would score option A as a success while it quietly
doubles the question count — the one number that already governs whether an import is usable
([F-08](./005-upload-pipeline-trace-findings.md#f-08)).

## 7 · What would change this study

- **A browser measurement.** `[D]` All timings are Node on one core. The File API, not the CPU, may
  dominate the EXIF pass over multi-megabyte files, which would change § 1's 7 s.
- **A real company folder export.** `[D]` The naming rule in § 4 is built from one described pattern.
  A real tree would show whether stem-change boundaries actually fall where groups do.
- **Demonstrating R2 end-to-end.** `[C]` → `[A]` If deferred activation does prevent duplicates, § 3
  option B is the whole answer and § 4 becomes optional polish. That experiment is one harness run.
