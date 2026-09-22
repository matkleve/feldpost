---
id: STUDY-012
type: investigation
status: proposed
supersedes: none
corrected-by: none
---

# The city-disambiguation model: what it can and cannot decide

**Measured:** 2026-09-22 · **Branch:** `claude/study-system-audit-enforce-4e6oov` at `17891a2`
· **How:** by executing the shipped code, not by reading it. `LocationPathParserService`'s own
`resolveDisambiguation` and `resolveIssue` were driven directly over **28 280 input combinations**
under Vitest with the real `UploadLocationConfigService` defaults; `runDisambiguation` was driven
separately against the real `CITY_REGISTRY` for the probability tables. No database, no network, no
upload. Reproduction recipe in § How to re-run this.

**Why this file exists — read this before trusting its history.** Issues
[#241](https://github.com/matkleve/feldpost/issues/241) and
[#242](https://github.com/matkleve/feldpost/issues/242) have cited a study for this work since
2026-09-22, first as `STUDY-009`, then as `docs/study/010-jev-system-one-model-evaluation.md`.
**That file never existed**, in any branch or any commit
([STUDY-013](./013-study-system-audit.md) § S-03). The measurements quoted in those issues are
therefore unverifiable as filed — not wrong, but unbacked.

So nothing here is inherited. **Every number below was re-measured from scratch**, and where a
re-measurement disagrees with what the issues claim, this study says so and the issue is wrong.
Two of them are.

### What `jev` was, and what this study is therefore *not*

`grep -rni '\bjev\b'` returns nothing in this repository outside quotations of the citation itself.
`[A]` The owner supplied the missing context on 2026-09-22:

> **JEV is the new "System One" agent by Diogo.** The lost study was an evaluation of **whether
> Feldpost could use it.**

That is a **different question from the one this file answers**, and the difference matters enough to
state plainly:

| | The lost study | This study |
| --- | --- | --- |
| Question | *Should we adopt JEV System One?* | *What can the disambiguation model we already ship decide?* |
| Subject | An external agent, outside this repository | `location-path-parser.service.ts`, `disambiguation-algorithms.ts` |
| Evidence available here | **None** — the agent is not reachable from this environment | The shipped code, executed |

The measurements quoted in #241 and #242 are *about the internal model*, so re-running them was
possible and is what this file is. **The adoption evaluation is not recoverable and has to be done
again** — it needs access to JEV System One, and a scope nobody has restated.

**So this study does not close the question the original was asked.** `[D]` It closes the half that
could be re-measured, and it establishes what the internal model can and cannot do — which is the
baseline any adoption comparison needs anyway: you cannot say whether an external agent is better
without knowing what the incumbent scores. Read § F-4 as that baseline.

**What the redo owes**, when someone has access: `[D]`

1. What JEV System One is asked to do here — city disambiguation only, or the whole address
   resolution path?
2. The same corpus through both, scored the same way. The internal side's numbers are in this file.
3. The cost and dependency side an internal model does not have: latency per file at 10 000 files
   (compare [STUDY-008](./008-classification-chunking-strategy.md)'s 0.17 s structure-read against
   8.2 min classification), what leaves the machine, and what happens when it is unavailable.
4. A `[D]` on adoption that says who owns it, kept separate from the `[A]`s about either model.

Tracked in the same issues that cited it — see § Related.

---

## Summary

The disambiguation model is asked one question — *"the path gave a street and a house number but no
city; which city is it?"* — and it is structurally incapable of answering. Not badly calibrated:
**incapable**, by a factor of about twenty.

| | Finding | |
| --- | --- | :---: |
| **F-1** | `DisambiguationContext` is declared, read by all three rankers, and never supplied | `[A]` |
| **F-2** | `parserConfidence` enters as a constant added to every candidate, so **more confidence produces a lower top probability** | `[A]` |
| **F-3** | `needs_review` and `low_disambiguation_probability` are unreachable as `issue` values | `[A]` |
| **F-4** | Auto-assign is reachable only at `parserConfidence ≤ 0.013`; the parser's floor is `0.5` | `[A]` |
| **F-5** | Supplying `batchResolvedCities` helps, then **saturates at one item** — so F-1's obvious fix does not fix F-4 | `[A]` |

F-5 is the one that matters for planning: #242's acceptance criteria describe supplying the batch
context, and the measurement says that alone leaves the model still unable to auto-assign.

---

## F-1 · The context is declared, read, and never supplied `[A]`

`location-path-parser.service.ts:444` passes an empty object where the context belongs:

```ts
const result = runDisambiguation(
  this.disambiguationAlgorithm,
  candidates,
  {},                       // ← DisambiguationContext
  …autoAssignThreshold, …reviewLowerBound,
);
```

`DisambiguationContext` (`disambiguation-strategy.ts:17-22`) declares `batchResolvedCities`,
`cityPrior`, `defaultPrior` and `clusterCentroid`. `[A]` All three ranking functions read it:
`rankByClusterMajority` reads `batchResolvedCities`, `rankByDistanceWeighted` reads
`clusterCentroid`, `rankByBayesianContext` reads `cityPrior` and `defaultPrior`. `[A]` Nothing in
`apps/web/src` ever writes any of them.

The shipped algorithm is `cluster-majority` (`upload-location-config.ts`). `[A]` With no context its
`prior` term is `(freq.get(city) ?? 0) / maxFreq` where `freq` is empty — **0 for every candidate**.
`[A]` So the majority ranker ranks by no majority: the term the algorithm is named after is
identically zero in production.

## F-2 · Confidence is subtracted from discrimination `[A]`

`rankByClusterMajority` scores each candidate:

```
score = prior + 0.35·zipMatch + 0.20·countryMatch + 0.45·parserConfidence
```

`prior` is 0 (F-1). `parserConfidence` is a **per-file** value, so the same number is added to every
candidate, and `normalize()` then divides by the total. Adding a constant to every score moves the
distribution toward uniform. **Higher confidence therefore flattens the ranking.** `[A]`

Measured, shipped registry and defaults, `zip 1030 + country AT`:

| `parserConfidence` | top | p(top) | `auto_assigned` (≥ 0.95) |
| --- | --- | --- | :---: |
| 1.0 | Wien | **0.2740** | false |
| 0.5 | Wien | **0.3370** | false |
| 0.0 | Wien | **0.5788** | false |

`[A]` The two upper rows reproduce the table in #242 exactly (0.274, 0.337), which is the only
reason that issue's figures can now be relied on. The third row is new and completes the picture:
the model is **most** decisive when the parser is **least** confident.

`streetExact: true` and `houseNumberExact: true` are hardcoded for every candidate
(`location-path-parser.service.ts:438-439`) `[A]`, so under `cluster-majority` they contribute
nothing at all, and under `distance-weighted` they cancel — 0.70 added to every score.

This is Constitution § 3. `DisambiguationOutcome.probability` is a **normalised share of an
unbounded score**, and it is compared against `disambiguationAutoAssignThreshold: 0.95` as though it
were a calibrated probability. The name claims a meaning the value does not have.

## F-3 · Two `issue` values can never be produced `[A]`

`resolveIssue` (`location-path-parser.service.ts:455`) tests in this order:

```ts
if (conflict) return conflict;
if (!context.city || !context.zip) return 'missing_anchor';
if (disambiguation.needs_review) return 'needs_review';
if (!disambiguation.auto_assigned && disambiguation.probability > 0 && …)
  return 'low_disambiguation_probability';
```

`context.city` is written only by `resolveDisambiguation`, and only when `auto_assigned` is true.
`resolveDisambiguation` in turn only runs when `!context.city`. `auto_assigned` and `needs_review`
are mutually exclusive by construction (`runDisambiguation`: `needs_review` requires
`probability < autoAssignThreshold`). So whenever `needs_review` could be true, `context.city` is
still null and `'missing_anchor'` has already returned. `[A]`

**Measured**, exhaustive sweep of 28 280 combinations (street × house number × city × 7 postcodes ×
5 countries × 101 confidence steps, `conflict = null`), driving the shipped private methods: `[A]`

```
combinations          28 280
issue values reached  missing_anchor  18 172
                      null            10 108
'needs_review'                        reachable? false
'low_disambiguation_probability'      reachable? false
```

**A correction to #241.** That issue says these values are unreachable, which is right, and its
wording invites the reading that the *flags* never fire, which is wrong. In the same sweep
`disambiguation.needs_review` was true **58** times and `auto_assigned` **10** times. `[A]` The
flags fire; the `issue` strings are shadowed by `missing_anchor`. The distinction matters because it
says where the fix goes: reordering `resolveIssue` would make both values reachable immediately, with
no change to the model.

## F-4 · Auto-assign is unreachable in production, by a factor of twenty `[A]`

Not *never* — #242 says "auto_assigned never fires" and that is too strong. It is reachable, in a
band the parser cannot enter.

Best case for the model — one candidate matching both zip and country, every other matching neither —
swept over the confidence range: `[A]`

| | |
| --- | --- |
| Highest `parserConfidence` at which `p(top) ≥ 0.95` (auto-assign) | **0.013** |
| Highest `parserConfidence` at which `p(top) ≥ 0.70` (review band) | **0.114** |
| Maximum `p(top)` achievable at all | **0.9991**, at confidence `0.00` |
| `parserBaseConfidence` — the parser's starting value | **0.5** |
| Every `confidenceBoost` in `applyFolderSegment` | **non-negative** `[A]` |

Confidence starts at 0.5 and only rises (`location-path-parser.service.ts:92`, `:96`). `[A]` The
model can auto-assign only below 0.013. **The gap is about 20×, and nothing in the parser can close
it**, because the only way to reach the auto-assign band is to be almost totally unconfident — and
if the parser were, the answer would not deserve auto-assignment.

So the honest statement is not "the threshold is too high". It is that **`parserConfidence` and
`disambiguationAutoAssignThreshold` are pulling in opposite directions by construction**: the term
that expresses confidence is the same term that destroys the model's ability to clear the bar.

**Consequence.** Every path-derived address without a city becomes a resolver-tray question. `[C]`
That is the volume [STUDY-009](./009-tray-question-budget-and-priority.md) measured and proposed
budgeting; this is one mechanism producing it.

## F-5 · Supplying the batch context helps, then saturates at one `[A]`

This is the finding that changes what #242 should ask for. Its acceptance criteria are *"supply
`batchResolvedCities` from the batch that is actually being resolved"* — so: measured, with the
context actually supplied.

| `batchResolvedCities` | p(top) | `auto_assigned` |
| --- | --- | :---: |
| `{}` (today) | 0.2740 | false |
| 1 × `Wien` | **0.4301** | false |
| 10 × `Wien` | **0.4301** | false |
| 380 × `Wien` | **0.4301** | false |

`[A]` Supplying it is a real improvement — 0.274 → 0.430 — and then **380 resolved items are worth
exactly as much as one.** The cause is in `rankByClusterMajority`:

```ts
const maxFreq = Math.max(1, ...freq.values(), 1);
const prior = (freq.get(candidate.city) ?? 0) / maxFreq;
```

`prior` is a share of the *most frequent* city, not a weight of evidence. When one city dominates the
batch it is its own maximum, so `prior = 1` whether it appeared once or 380 times. `[A]` The strength
of the evidence is normalised away.

**So fixing F-1 as #242 currently specifies it would not make auto-assign reachable** (0.430 against
a 0.95 threshold), and the issue's acceptance criterion *"a test shows the same input producing a
different, better-ranked outcome"* would pass while the user-visible behaviour — a tray question for
every city-less address — did not change at all. `[C]` That is the shape of a green test over an
unfixed problem.

---

## What this means, as options rather than decisions

All `[D]`. Someone owns these and it is not this study.

1. **Reorder `resolveIssue` before anything else.** F-3 is independent of the model and is a
   few lines: test `needs_review` and `low_disambiguation_probability` before `missing_anchor`, or
   delete both values and every reference (Constitution § 5). Cheap, and it makes the model's
   behaviour observable instead of silently collapsed into `missing_anchor`.
2. **Treat F-2 as the root cause, not the threshold.** Lowering `disambiguationAutoAssignThreshold`
   would make auto-assign fire on a score that still means nothing. The defensible fixes are to stop
   adding a per-file constant to per-candidate scores, or to stop comparing a normalised share against
   a probability threshold. Do not retune constants without deciding which.
3. **If F-1 is fixed, fix F-5 in the same change**, or the fix is invisible. `prior` needs to express
   how much evidence there is, not which city has the most.
4. **Decide whether this model should exist at all.** `[C]` `CITY_REGISTRY` holds **6** cities, while
   `at-gemeinden-bev.json` ships **2 118** municipalities with their states
   ([STUDY-005](./005-upload-pipeline-trace-findings.md) F-18). A six-row registry cannot disambiguate
   Austrian addresses, and the gazetteer path already does this job elsewhere in the pipeline. The
   cheapest correct outcome may be deletion rather than repair.

## What this study could not prove

| Claim | Why | What would settle it |
| --- | --- | --- |
| Real uploads never auto-assign | The sweep is constructed inputs, not a corpus. The confidence floor argument is `[A]`, but "no real path produces confidence below 0.013" is reasoned, not observed. `[C]` | Run the trace harness over the corpus profiles and record the confidence distribution. |
| The tray-question volume attributable to this | Nothing was run end to end; no tray was opened. `[C]` | `upload-trace-report.ts` already counts `disambiguationGroups()` — measure before and after option 1. |
| That deletion (option 4) is safe | No caller inventory was taken. `[C]` | `grep` every reader of `DisambiguationOutcome` and `CITY_REGISTRY` and check what depends on the shape. |
| Anything about `distance-weighted` or `bayesian-context` in production | Neither is the shipped algorithm; they were read, not exercised. `[B]` | Only matters if `disambiguationAlgorithm` is ever changed. |
| **Whether JEV System One should replace any of this** | The agent is not reachable from this environment, and the original evaluation was never filed. `[D]` — not even `[C]`: there is no evidence here, only an open question. | The redo described in § What `jev` was. It needs access to the agent and a restated scope, and it is the only part of the original citation this file does not recover. |

## How to re-run this

The harness was a temporary spec under
`apps/web/src/app/core/location-path-parser/`, deleted after measurement — it asserted nothing and
would have been a test that tests nothing. To reproduce, drive the shipped code directly:

- **F-3 sweep:** instantiate `LocationPathParserService` via `TestBed`, call its `resolveDisambiguation`
  and `resolveIssue` over the product of `street ∈ {null, 'Hauptstrasse'}`,
  `house_number ∈ {null, '12'}`, `city ∈ {null, 'Wien'}`,
  `zip ∈ {null, '1010', '1030', '1090', '8010', '99999', ''}`,
  `country ∈ {null, 'AT', 'DE', 'CH', 'XX'}`, `confidence ∈ {0.00 … 1.00 step 0.01}`, with
  `conflict = null`. Tally the returned `issue`.
- **F-2, F-4, F-5:** build candidates exactly as `resolveDisambiguation` does from `CITY_REGISTRY`,
  then call `runDisambiguation` with the real config values and the context under test.

## Related

- [#241](https://github.com/matkleve/feldpost/issues/241) — F-3. Its "unreachable" claim is confirmed; its implied "the flags never fire" is corrected here.
- [#242](https://github.com/matkleve/feldpost/issues/242) — F-1, F-2, F-4. Its table is reproduced exactly; its "never fires" is sharpened, and F-5 says its acceptance criteria are not sufficient.
- [STUDY-009](./009-tray-question-budget-and-priority.md) — the tray-question volume this feeds
- [STUDY-005](./005-upload-pipeline-trace-findings.md) F-18 — the 2 118-municipality gazetteer, against this model's 6-city registry
- [STUDY-013](./013-study-system-audit.md) § S-03 — why this study had to be written from scratch, and the id cascade around it
- **The JEV System One adoption evaluation — still owed.** Not in this repository, not recoverable from here, and not answered by this file. See § What `jev` was.
