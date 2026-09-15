# Search Object — gazetteer lookup contract (supplement)

> **Parent:** [upload-search-object.md](./upload-search-object.md)
> **Siblings:** [upload-search-object.country-derivation.md](./upload-search-object.country-derivation.md) · [upload-search-object.evidence-model.md](./upload-search-object.evidence-model.md)
> **Code:** `apps/web/src/app/core/location-path-parser/path-token-classifier.ts`
> **Decision:** [STUDY-006 Phase 3.2](../../../study/006-upload-pipeline-correction-plan.md) · **Findings:** [F-02](../../../study/005-upload-pipeline-trace-findings.md#f-02), [F-06](../../../study/005-upload-pipeline-trace-findings.md#f-06)

## What It Is

Classifying one path token as a state or a municipality is the hot path of the whole upload
pipeline: it runs for every token of every segment of every file, **synchronously on the main
thread, before the queue drains**, and it costs ~9 ms per file
([F-06](../../../study/005-upload-pipeline-trace-findings.md#f-06)). This file states what that
lookup guarantees, so its caches can change without anyone having to re-derive the answer rules
from the implementation.

## The lookup is two-stage, and the order is a correctness rule

| Stage | What it does | Confidence |
| --- | --- | --- |
| **1 · Exact** | Normalized name/alias match against a `Map` built once per dataset. | `1` |
| **2 · Fuzzy** | Fuse search over the same dataset, `threshold: 0.4`, keys `n` (0.7) / `a` (0.3), `ignoreLocation`. | `1 - score`, rejected below `UNCERTAIN_LOW` |

Stage 2 runs **only** when stage 1 misses. That is not an optimisation: `Wien` fuzzy-matches
`Schottwien` at 0.992 and was stored as a Semmering village until exact-before-fuzzy landed
([F-02](../../../study/005-upload-pipeline-trace-findings.md#f-02)). A fuzzy hit is additionally
rejected when its length is implausible for the token (`isPlausibleFuzzyLength`), so a gap fails
visibly instead of substituting a neighbour.

## Guarantees

| # | Guarantee | Why it matters |
| --- | --- | --- |
| **G1** | An exact name or alias hit always wins over any fuzzy hit. | F-02. A cache must never reorder the stages. |
| **G2** | Every index is built **once per dataset**, not once per token — for both stages. | F-06. The datasets are module-level constants read thousands of times per batch. |
| **G3** | Caching is **transparent**: for the same token and dataset, a cached lookup returns exactly what an uncached one would. | A cache that changes an answer is a bug, not a speed-up. |
| **G4** | The caches are keyed by the dataset's **identity**, and hold no strong reference to it. | Datasets are swapped wholesale (tests, future per-country loading); a keyed-by-identity `WeakMap` cannot go stale or leak. |
| **G5** | An empty dataset classifies nothing and builds no index. | Cheap guard; also what makes a country without shipped data a miss rather than a throw. |

**G4 has a precondition the callers already keep:** a dataset array is treated as **immutable** once
observed. Mutating one in place after a lookup would leave both caches stale. The gazetteers are
imported JSON constants, so this holds by construction.

## Cost model

Let `n` be the dataset size (2 114 AT municipalities, 9 states) and `t` the tokens classified in a
batch.

| | Before Phase 3.2 | After |
| --- | --- | --- |
| Exact index builds | 1 per dataset (already cached, F-02) | unchanged |
| Fuse index builds | **1 per fuzzy lookup** — `O(t · n)` | **1 per dataset** — `O(n)` |
| Fuse searches | `t_miss` searches | unchanged |

Only index *construction* is removed. The fuzzy search itself is inherent and stays: measured
separately, building the index cost 1.06 ms and the search 2.75 ms, so this bounds the win at
roughly the construction share of tokens that miss the exact index.

## Acceptance criteria

- [x] Classifying many tokens against one dataset constructs the Fuse index **once** (G2) —
      asserted as index *identity*: the same dataset returns the identical object before and after
      a run of fuzzy lookups.
- [x] Two lookups of the same token return identical results, cached or not (G3).
- [x] A different dataset array gets its own index; results do not bleed between datasets (G4).
- [x] An exact hit still beats a fuzzy one, and `Wien` still does not resolve to `Schottwien` (G1).
- [x] An empty dataset returns `null` (G5). That it also builds no index is the `!items.length`
      early return in `classifyWithFuse`, one line above the lookup — visible, not asserted.
- [x] Harness scale tier: **6.97 / 6.86 → 4.89 / 4.91 ms per file** at 2 000 paths (camera and
      neutral naming), a 29 % drop — within a point of the share the separate measurement predicted
      for index construction. Groups (1 483) and trays (634) identical before and after.

Tested in `path-token-classifier.fuse-cache.spec.ts`. G2 is red without the cache and green with it;
the other four passed beforehand and stand as regression guards, which is what a transparent cache
should do to them.

**Why identity rather than a construction count.** The first version of this test mocked `fuse.js`
with a counting subclass. It passed in isolation and failed in a full run — the Angular test builder
bundles the dependency, so `vi.mock` never intercepts it and the counter reads zero. A count is only
observable through a mock that does not reliably apply here; identity is observable directly, which
is why `fuseIndexFor` is exported.
