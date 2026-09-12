---
id: STUDY-005
type: review
status: active
supersedes: none
corrected-by: none
---

# Upload pipeline — findings from the trace harness

**Measured:** 2026-09-12 · **Branch:** `claude/uploader-pipeline-test-badges-kktrpg` at `650f495`
(based on `main` at `568b44b`) · **How:** by running the pipeline, not by reading it.

Every finding below came out of
[`npm run trace:upload`](../playbooks/upload-pipeline-trace.md) — a headless harness that pushes a
synthetic corpus through the real `UploadManagerService`, `classifyBatch`, token classifier, layer
map, branch gates, content hashing, queue, phase FSM and `persistUploadFile`, against an in-memory
Supabase and a stub geocoder. What is real and what is substituted is listed in the playbook's
[Real vs mock](../playbooks/upload-pipeline-trace.md#real-vs-mock) table and printed by the harness
itself.

**Companion:** decisions and the correction plan are [STUDY-006](./006-upload-pipeline-correction-plan.md).
Nothing here has been fixed. The upload pipeline is **Sensitive** class
([`AGENTS.md`](../../AGENTS.md) § Change Classification), and four of these findings are
spec-level — the spec says what the code does, so a fix needs a contract decision first.

## Severity

| | Meaning |
| --- | --- |
| **High** | Wrong data reaches the database, or the feature does not work at the size it is sold for. |
| **Medium** | Correct output, but the user pays for it in questions or waiting. |
| **Low** | Internal or documentation inaccuracy with no direct user consequence. |

## Register

| id | Finding | Severity | Layer |
| --- | --- | --- | --- |
| [F-01](#f-01) | A number in the file name is classified as a postcode and overrides the folder | High | **Spec** |
| [F-02](#f-02) | `Wien` resolves to the municipality `Schottwien` | High | Data + code |
| [F-03](#f-03) | City classification requires an explicit country segment in the path | High | **Spec** |
| [F-04](#f-04) | Ordinary file names form competing street-level layer packages | Medium | Code |
| [F-05](#f-05) | `locationRequirementMode: 'optional'` does not skip the address pipeline | Medium | **Spec** ↔ code |
| [F-06](#f-06) | Classification costs ~9 ms/file and blocks the first upload | High | Code |
| [F-07](#f-07) | The job store is `O(n)` per write, so a batch is `O(n²)` | High | Code |
| [F-08](#f-08) | Tray volume scales linearly with the file count | High | **Spec** (product) |
| [F-09](#f-09) | The `test` gate compiles nothing, so it runs no specs | Medium | Repo |
| [F-10](#f-10) | Two gate debt notes state numbers that no longer match | Low | Repo |

---

### F-01 · A number in the file name is classified as a postcode and overrides the folder {#f-01}

**What happens.** `AT/Wien/1090/Währinger Straße 12/IMG_1274.jpg` produces a Search Object whose
postcode is **1274**, not 1090. `IMG_1275.jpg` in the same folder produces **1275**. The two photos
therefore get different `groupingKey`s and are geocoded separately. `[A]` — harness output, run A of
`npm run trace:upload`:

```
    postcode     = 1090                     ← folder (conf 1)
    postcode     = 1274                     ← filename (conf 1)
    groupingKey: at|wien|1274|schottwien|wahringer straße|12
    adminLevelMap: … postcode@[L2:1090 L0:1274]
    adminLevelConflicts: postcode, city
```

**Why.** Two rules compose into this, and both are as specified:

1. `path-token-classifier.ts:182-183` classifies any token matching the country's postcode pattern
   as a postcode once the country is known. `[A]` AT's pattern is four digits, and `IMG_1274`
   tokenizes to `IMG` + `1274`. The spec mandates exactly this — `upload-search-object.md`
   § Token classification order, pass 2 point 1. `[A]`
2. `upload-address-level-map.helpers.ts:139-156` (`collapseAdminFlatFields`) keeps the entry with
   the **lowest** level index, and level 0 **is the file name**. `[A]` Also mandated —
   `upload-search-object.md` § Admin level map, "Flat fields MUST collapse to the entry with the
   lowest level index". `[A]`

**Consequence.** Three, compounding: the stored postcode is wrong; one building fragments into one
group per file, so batch geocoding stops working; and `city`/`postcode` then disagree across levels,
which raises `adminLevelConflicts` and opens an `admin_level_conflict` tray — a question about a
path that was never ambiguous. `[A]`

**Scale.** With camera file naming, **zero** of 2 000 generated paths reached `branch_a`; with
6-digit leaf numbers that cannot parse as an AT postcode, 549 of 2 000 (27 %) did. `[B]` — synthetic
corpus, real classifier.

**Note.** There is a guard for exactly this shape on the street side — `isWeakFilenameStreetLevel`
(`upload-search-object.layer-map.ts:89-98`) special-cases `^img_\d+$` so `IMG_1274` does not form a
street package. `[A]` No numeric counterpart exists. `[A]`

---

### F-02 · `Wien` resolves to the municipality `Schottwien` {#f-02}

**What happens.** Every path segment `Wien` sets `city = Schottwien` at confidence 0.992. `[A]`

```
    state        = Wien                     ← folder (conf 0.9999999999999999)
    city         = Schottwien               ← folder (conf 0.9920567176527572)
```

**Why.** `apps/web/src/assets/geo/at-gemeinden-bev.json` contains `Wien-Alsergrund`,
`Wien-Brigittenau`, … and `Schottwien`, but **no plain `Wien`** — verified: filtering the 2 114
records for `n === 'Wien'` returns an empty array. `[A]` `classifyWithFuse`
(`path-token-classifier.ts:86-109`) searches it with `threshold: 0.4` and accepts any hit at
confidence ≥ 0.9 `[A]`; `Schottwien` scores 0.992, which the spec's confidence table treats as a
plain write, not even an uncertain one (`upload-search-object.md` § Confidence thresholds: ≥ 0.98 →
"Write field"). `[A]`

**Consequence.** Vienna is Austria's largest city and the wrong city is written with full
confidence. It then disagrees with `state = Wien`, which raises an `adminLevelConflicts` entry and
opens a tray. `[A]` Six of the 15 curated scenarios hit it. `[A]`

**Wider risk.** `[C]` This is a class, not one row: any token that is not itself in the gazetteer but
is a substring of an entry can be substituted at ≥ 0.9 confidence. The harness reports the class as
`SO-CITY-NOT-IN-PATH` (a city value that does not occur literally in the path); postcode expansion
is excluded from that check, since those cities are looked up rather than matched.

---

### F-03 · City classification requires an explicit country segment in the path {#f-03}

**What happens.** `Graz/Annenstraße 10/DSC_0001.jpg` produces a Search Object with **no fields at
all** — `groupingKey` is `|||||`. `Graz` becomes a street fragment at confidence 0.5. `[A]`

**Why.** `path-token-classifier.ts:210` computes `useAtGeo = countryCode === 'AT'` and line 138 only
consults the gazetteer when it is true. `[A]` Without an `AT` segment earlier in the path there is
no country, so neither state nor city is ever attempted. Specified: `upload-search-object.md`
§ Token classification order, step 5, "AT gazetteer only when `country === 'AT'`". `[A]`

**Consequence.** A construction company that names folders `Graz/Annenstraße 10` — the natural
shape, and the one a user would expect to work — gets no address at all, and the file lands in a
tray or in Issues. `[A]` Combined with [F-04](#f-04) the folder's own street is offered back to the
user as one option among several. `[A]`

---

### F-04 · Ordinary file names form competing street-level layer packages {#f-04}

**What happens.** `foto.jpg`, `Abnahmeprotokoll.pdf` and `Kopie von IMG_1274.jpg` each build a
filename layer package that conflicts with the folder package, which opens a `layer_package` tray.
`[A]`

```
  layer packages: at/4020/landstraße 7→{"street":"Landstraße","houseNumber":"7",…}
                | __filename__→{"street":"foto",…}
  package conflict: layer|at/4020/landstraße 7|__filename__:filename: foto|…
```

**Why.** `isWeakFilenameStreetLevel` (`upload-search-object.layer-map.ts:89-98`) rejects only
`^img_\d+$`, a bare `img`, and a bare `file`. `[A]` Everything else with any text becomes a
candidate street.

**Consequence.** Medium rather than High because the tray merges by conflict signature, so a
thousand files named `foto.jpg` under one folder ask once — but a document named after its content,
which is the normal case for a report, always asks. `[A]`

---

### F-05 · `locationRequirementMode: 'optional'` does not skip the address pipeline {#f-05}

**What happens.** Submitting a folder with `locationRequirementMode: 'optional'` still parks 13 of
15 files in `awaiting_disambiguation` **before hashing**. `[A]` — harness run C.

**Why.** `classifyBatch` is awaited unconditionally in all three submit paths
(`upload-manager-submit.util.ts:67`, `:142`, `:195`) and its layer/admin trays gate the jobs. `[A]`
Only the per-job geocode step reads the mode, at `upload-new-pre-resolve.util.ts:320`. `[A]`

**The divergence.** `upload-address-resolution.phases.md` § Trigger matrix states
`locationRequirementMode === optional` → **"Skip pipeline"**. `[A]` It does not skip it.

**Consequence.** The one escape hatch for "just get these files in" does not escape. `[A]` It is
listed as Medium because the flat multi-file path (`submit`) does behave as intended — 150 files
uploaded 142 rows and skipped 8 duplicates with no questions. `[A]`

---

### F-06 · Classification costs ~9 ms per file and blocks the first upload {#f-06}

**Measurement.** `9.82` / `9.48` / `9.59` ms per file at 1 000 / 5 000 / 20 000 paths — linear, and
dominated by the gazetteer. `[B]` (real classifier, synthetic paths, one core, Node + jsdom; a
browser on a field laptop will not be faster.)

**Where it goes.** `path-token-classifier.ts:86` constructs `new Fuse(items, …)` **per candidate
token**, then searches 2 114 municipalities across two keys. Measured separately: building the index
1.06 ms, running the search 2.75 ms. `[B]` So caching the index recovers ~30 %; the fuzzy search is
the remainder.

**Why it is time-to-first-byte, not background work.** `submitUploadManagerWebkitFolder` awaits
`runClassifyBatchGuarded(batchId, deps)` at `upload-manager-submit.util.ts:195` and only then calls
`deps.drainQueue()` at `:196`. `[A]` Nothing uploads until the whole tree is classified, and the
work is synchronous on the main thread.

**Extrapolated** at the measured rate, linear, the optimistic bound: 1.5 min at 10 000 files,
**15 min at 100 000**, 2.5 h at 1 000 000. `[C]`

---

### F-07 · The job store is `O(n)` per write, so a batch is `O(n²)` {#f-07}

**Where.** `upload-job-state.service.ts:126` —
`this._jobs.update((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...patch } : j)))` —
reallocates an array of every job in the batch on **every** field write; `:122` (`findJob`) is a
linear scan. `[A]`

**Measurement**, real `UploadJobStateService`: `[B]`

| Jobs held | `updateJob` | `findJob` |
| --- | --- | --- |
| 100 | 0.0020 ms | 0.0014 ms |
| 1 000 | 0.0164 ms | 0.0130 ms |
| 5 000 | 0.0799 ms | 0.0644 ms |
| 20 000 | 0.5732 ms | 0.3829 ms |

**Writes per job**, counted rather than assumed by wrapping the injected singleton: **13.9** over a
complete new-upload run. `[A]`

**Extrapolated:** ~43 s of pure job-store work for 10 000 files, **~72 min for 100 000**. `[C]`
Superlinear in practice (allocation and GC), so linear extrapolation understates it.

---

### F-08 · Tray volume scales linearly with the file count {#f-08}

**Measured.** 13 tray questions for 15 files; 137 for 150; 3 728 for 5 000. `[B]` Extrapolated:
~45 000 for 100 000 files. `[C]`

Merging works — the largest single group covered 549 files with one question `[B]` — but with camera
file naming **every** group needs a question, because [F-01](#f-01) puts every file in conflict.
`[B]`

**Why it is a product finding, not only an engineering one.** `[C]` No interaction design answers
45 000 questions. The trays were designed for a batch; a database import needs a different mode —
answer-once-per-folder, defer-all-and-fix-later, or import without location and resolve afterwards.
That is a decision, not a bug fix; see [STUDY-006](./006-upload-pipeline-correction-plan.md) D-04.

---

### F-09 · The `test` gate compiles nothing, so it runs no specs {#f-09}

**What happens.** `node scripts/verify.mjs test` reports `known debt` and exits 0, but the `ng test`
bundle fails to compile, so **zero** specs run. `[A]` Reproduced on a clean checkout of the base
commit with the branch stashed. `[A]`

Seven type errors, all pre-existing and none in the harness: `[A]`

- `upload-address-persist.acceptance.spec.ts:248` — `id` not in
  `Pick<UploadJob, 'groupingKey' | 'titleAddress' | 'locationSourceUsed' | 'batchId'>`
- `upload-new-pre-resolve-dedup-disambiguation.integration.spec.ts:147-148` and others — partial
  object literals assigned to full service types (`UploadQueueService`, `UploadService`)

**Consequence.** Every unit test in the repository is currently unverified by CI, and the gate's own
note says the opposite (see [F-10](#f-10)). `[A]`

---

### F-10 · Two gate debt notes state numbers that no longer match {#f-10}

**`test`.** The note reads "The test bundle now compiles cleanly and all 7 map-shell spec files …
pass." It does not compile. `[A]`

**`lint`.** The note records "145 errors + 1038 warnings on main (2026-09-10)". Measured on this
branch's base, with all local changes stashed: **147 errors, 1064 warnings**. `[A]` The ratchet is
therefore stated 2 errors and 26 warnings below its real value, which means the gate would accept 26
new warnings as "no worse than main".

---

## What this study could not prove

- **Nothing here was observed against a real Supabase project or a real Photon instance.** `[A]`
  RLS, triggers, constraints, `address_dedupe_key` uniqueness and PostGIS are all absent from the
  harness, and real geocoding ranks fuzzily where the stub is exact. A path that auto-resolves in
  the harness can still land in a tray in production, and the reverse.
- **The timing numbers are Node + jsdom on one core**, not a browser on a site laptop. `[A]` They
  establish the shape of the curve and the hot spots, not the absolute wall time a customer sees.
- **Branch B (street + project centroid bias) was never exercised**, because the harness returns no
  project locations. `[A]`
- **No user research backs [F-08](#f-08)'s claim that 45 000 questions is unusable.** `[C]`
- **File-name and folder conventions in the corpus are invented.** `[A]` What real customer archives
  look like — how many files, how deep, how they are named — is unmeasured, and it decides how much
  [F-01](#f-01) and [F-03](#f-03) actually cost. Settling it needs one real exported folder tree.
