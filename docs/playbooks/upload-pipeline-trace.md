# Upload pipeline trace harness

Pushes a synthetic batch of files through the **real** upload pipeline, headless, and prints what
happened at every step: intake, Search Object creation and filling, grouping, dedup, geocode,
placement, trays, storage and `media_items`.

It exists because the upload pipeline is the largest stateful surface in the app and its behaviour
is hard to see: most of it happens between the moment a folder is dropped and the moment a row
appears, across a dozen services, and the only window into it is a `localStorage` debug flag and a
browser console. The harness replaces "read the code and reason about it" with "run it and read
what it did".

- **Harness:** `apps/web/src/app/core/upload/trace/upload-pipeline-trace.spec.ts`
- **Runner:** `scripts/trace-upload-pipeline.mjs`
- **Contracts it exercises:** [upload-manager-pipeline.md](../specs/service/media-upload-service/upload-manager-pipeline.md) ·
  [upload-search-object.md](../specs/service/media-upload-service/upload-search-object.md) ·
  [upload-address-resolution-pipeline.md](../specs/service/media-upload-service/upload-address-resolution-pipeline.md)

## Run it

```bash
npm run trace:upload                                     # 15 curated files
npm run trace:upload -- --count=150                      # + generated corpus, seed 7
npm run trace:upload -- --count=150 --seed=42 --detail=5  # 5 files in full, rest aggregated
npm run trace:upload -- --answer-trays                   # keep going past the user gate
npm run trace:upload -- --out=trace.txt                  # keep the report
```

150 files take about 8 seconds. No network, no Supabase, no browser.

| Flag | Meaning |
| --- | --- |
| `--count=N` | Corpus size. Up to 15 uses the curated scenarios; beyond that the generator fills the rest. |
| `--seed=N` | Generator seed (default 7). Same seed, same 150 paths. |
| `--detail=N` | How many files get a full per-file section. The rest appear only in the aggregate tables. |
| `--answer-trays` | Answer every resolver tray with its first candidate so the trace continues past the gate. Off by default — see [Real vs mock](#real-vs-mock). |
| `--out=FILE` | Write the report to `FILE` instead of a temp file. |

The harness is also a normal unit test: without `UPLOAD_TRACE=1` it prints nothing and only
asserts. That is deliberate — a diagnostic that nothing keeps honest rots. Run it as a test with:

```bash
cd apps/web && npx vitest run src/app/core/upload/trace/upload-pipeline-trace.spec.ts
```

It is **not** yet exercised by `npm run verify`: the `test` gate's bundle does not compile on
`main` (type errors in `upload-address-persist.acceptance.spec.ts` and
`upload-new-pre-resolve-dedup-disambiguation.integration.spec.ts`, part of the gate's recorded
debt), so `ng test` runs no specs at all today. Once that bundle compiles, this harness runs with
the rest.

## Three runs, because the pipeline has three shapes

| Run | Submit | `locationRequirementMode` | What it shows |
| --- | --- | --- | --- |
| **A** | folder (`submitWebkitFolder`) | `required` | The whole address pipeline: Search Object, grouping, geocode branches, resolver trays. Stops at the user gate. |
| **B** | flat files (`submit`) | `optional` | The persistence path: content hash, dedup, conflict check, storage upload, `media_items` insert. |
| **C** | folder | `optional` | What the optional mode actually skips. |

## The steps, and where each one lives

### 1 · Intake — one batch, one job per file

`submitUploadManagerFiles` / `submitUploadManagerFolder` / `submitUploadManagerWebkitFolder`
(`core/upload/manager/upload-manager-submit.util.ts`) create the batch and one `UploadJob` per
file, with `relativePath` captured immutably. For a folder submit each job also gets a
**folder address hint** (`titleAddress`, `titleAddressSource: 'folder'`) derived leaf→root from at
most `maxDirectorySegmentsForHint` segments. `Project: <name>` as the root folder name resolves or
creates a project first, but only when the folder contained at least one file.

### 2 · Search Object — created here, once per file, then collapsed per group

`UploadAddressResolutionOrchestrator.classifyBatch(batchId)`
(`core/upload/address-resolution/upload-address-resolution.orchestrator.ts`) runs immediately after
the jobs are queued and before the queue drains. Per job:

1. `resolveLayersForJob(relativePath, fileName, geo, folderDisplayPath)` builds the **layer
   packages** — one competing interpretation per folder level plus one for the file name — and
   collapses them into the flat **Search Object**.
2. Token classification (`path-token-classifier.ts`) runs per path segment, non-numeric tokens
   first (project prefix, `Tür`/`Top`, `Stiege`, country alias, then state/city via a Fuse match
   against the AT gazetteer **only when `country === 'AT'`**, remainder → street fragments), then
   numeric tokens (postcode if the country is known and the pattern matches, else house number).
3. Every admin write is recorded in `adminLevelMap` with its folder level: **0 = file name**,
   1 = direct parent, higher = ancestors. The flat field keeps the **lowest** level index.
4. `groupingKey` = `country|state|postcode|city|street|houseNumber`, normalized — **units excluded**,
   so one building is geocoded once no matter how many `Stiege`/`Top` folders sit under it.

The report prints each Search Object with **per-field provenance** — value, source (`folder` /
`filename`) and confidence — which is the only way to see why a field holds what it holds.

The job then gets `groupingKey`, `folderDisplayPath` and `titleAddress` written onto it. Three
outcomes short-circuit before grouping: `adminLevelConflicts` (→ admin tray), a layer package
conflict (→ layer tray), and a "meaningless" Search Object (skipped entirely — the job will route
on EXIF or land in Issues).

### 3 · Grouping and the local gate

Jobs with the same `groupingKey` become one group. Per group,
`evaluateLocalResolution` → `classifySearchObjectCompleteness` picks the branch:

| Branch | Condition | Consequence |
| --- | --- | --- |
| `branch_a` | street AND (city OR postcode) | structured forward geocode |
| `branch_b` | street, no locality, project centroid exists | biased forward geocode |
| `branch_c` | street, no locality, no centroid | street + country geocode, then a city/house tray |
| `metadata_only` | admin fields only, no street | no geocode, admin centroid |
| `postcode_blocked` / `incomplete` | ambiguous postcode without city, or nothing usable | `partial` |

`houseNumber` is never a gate — it only sharpens a geocode that already has a street.

Before geocoding, `get_location_by_address_components` is asked whether the org already has a
`locations` row for the Search Object. A hit resolves the whole group with no geocoder call at all.

### 4 · Geocode

`UploadLocationGeocodeGroupService` calls Photon once per group and `classifySearchHits` turns the
hits into `auto` (score ≥ 0.95, or a clear top gap, or an EXIF hit within
`exifAssistRadiusMeters`), `ambiguous`, or `failed`. Thresholds come from
`DEFAULT_UPLOAD_LOCATION_CONFIG` (`core/upload/location/upload-location-config.ts`).

### 5 · Trays — every question the user has to answer

`layer_package`, `admin_level_conflict`, `geocode`, `city_step` (1A) / `house_step` (1B), `source`
(text vs EXIF beyond `sourceAgreementRadiusMeters`), `containment_check`. A gated group holds its
jobs in `awaiting_disambiguation`; the queue slot is released, so the batch keeps moving.

### 6 · Dedup

Runs **before** geocode in the per-job pipeline (`runPreUploadLocationResolve` →
`finishPreResolveDedup`). `photo_v1` hashes head bytes + size + EXIF GPS/date/direction;
`binary_v1` (documents, video) hashes head bytes + size. `check_dedup_hashes` is org-scoped: a
match registered by the same user auto-skips (resume), a colleague's match becomes a
`duplicate_file` issue. A same-batch collision is caught by the in-flight registry before either
file is uploaded.

### 7 · Placement precedence

Text coordinates first, EXIF second, Issues last — `completePlacementAfterLocationResolve`
(`core/upload/pipelines/new/upload-new-pre-resolve.util.ts`). When both exist and disagree by more
than `sourceAgreementRadiusMeters` (150 m) a `source` tray opens; a difference above
`mismatchToleranceMeters` (15 m) is persisted as `media_items.location_mismatch_meters` after save.

### 8 · Persist

`persistUploadFile` (`core/upload/support/upload-file-persist.util.ts`): profile → `organization_id`,
storage key `{orgId}/{userId}/{uuid}.{ext}`, upload to the `media` bucket, then the `media_items`
insert. Storage bytes are removed again if the insert fails — the ordering that prevents orphaned
objects. `dedup_hashes` is written fire-and-forget afterwards, and `resolve_media_location`
persists the address (text-derived context when one was established, otherwise a reverse geocode).

The report prints the actual insert payload and RPC parameters.

## Real vs mock

The harness prints this table at the end of every run, and
`apps/web/src/app/core/upload/trace/upload-trace-legend.ts` is its source. Short version:

**Real** — every decision. Job creation and folder hints, `classifyBatch`, token classification and
layer packages, the shipped AT geo assets, branch classification, hit classification, content
hashing, the dedup registries, the queue and the phase FSM (illegal transitions throw in tests),
all three pipelines, `persistUploadFile`, and the tuning defaults.

**Mock** — every boundary:

| Boundary | Substitute | How a real run can differ |
| --- | --- | --- |
| File bytes | one repeated byte | nothing decodes; no thumbnails, no real EXIF |
| EXIF | injected per scenario at `UploadService.parseExif` | `exifr` never runs |
| Photon / Nominatim | 12-row stub gazetteer, fixed `importance` | real ranking is fuzzy; a path that auto-resolves here can open a tray in production, and the reverse |
| Supabase | in memory | no RLS, no triggers, no constraints, no PostGIS, no `address_dedupe_key` uniqueness |
| `get_location_by_address_components` | always misses | in production an existing `locations` row skips the geocode |
| `list_project_locations` | empty | no project centroid, so **Branch B is never taken** |
| Storage | acknowledged without bytes | no latency, no 180 s timeout, no partial-upload rollback |
| Org search tuning | defaults | an org's saved tuning changes distance gates |
| `--answer-trays` | picks the **first** candidate every time | a real user picks the right one; coordinates past a tray are arbitrary |

**Not covered at all:** HEIC conversion, the folder pickers, panel and tray rendering, thumbnail and
document-preview generation, and anything RLS decides.

## Findings

The harness computes findings from each run (`upload-trace-findings.ts`) and prints them as
observations, never as assertions — several are correct per spec and still surprising in the field.
Baseline, 2026-09-12, curated 15 + generated 150, seed 7:

- **`SO-FILENAME-OVERRIDES-FOLDER`** — a 4-digit number in the file name is classified as a
  postcode (spec pass 2: the country is known, the pattern matches) and, sitting at level 0, it
  **replaces the folder postcode** in the flat Search Object and in `groupingKey`. So
  `AT/Wien/1090/Währinger Straße 12/IMG_1274.jpg` resolves as postcode **1274**, not 1090 —
  and `IMG_1275.jpg` in the same folder gets 1275, which puts two photos of one building in two
  groups. The street-level guard `isWeakFilenameStreetLevel` has no numeric counterpart.
- **`SO-CITY-NOT-IN-PATH`** — `at-gemeinden-bev.json` contains `Wien-Alsergrund` … and
  `Schottwien`, but no plain **`Wien`**. The Fuse match for the token `Wien` therefore lands on
  `Schottwien` at score 0.992, above the 0.98 write threshold. Every Vienna folder gets
  `city = Schottwien`, which then disagrees with `state = Wien` and opens an
  `admin_level_conflict` tray for a path that was never ambiguous.
- **`GROUP-SPLIT-WITHIN-FOLDER`** — the two effects above split folders that should be one group,
  so the batch geocodes per file instead of once per building.
- **City classification needs an explicit country segment.** `Graz/Annenstraße 10/DSC_0001.jpg`
  has no `AT` segment, so the gazetteer is skipped, `Graz` becomes a street fragment, and the
  Search Object ends up **empty** (`groupingKey` `|||||`).
- **Ordinary file names form competing street packages.** `foto.jpg`, `Abnahmeprotokoll.pdf`,
  `Kopie von IMG_1274.jpg` each produce a filename layer package that conflicts with the folder
  package and opens a `layer_package` tray.
- **Volume.** With plain camera file names, 150 files produced **131 tray questions** and 9
  automatic placements. In run B (no address pipeline) the same 150 files uploaded 144 rows and
  skipped 6 duplicates.
- **`locationRequirementMode: 'optional'` does not skip the address pipeline** on a folder submit.
  The trigger matrix in
  [upload-address-resolution.phases.md](../specs/service/media-upload-service/upload-address-resolution.phases.md)
  says `optional` skips it; in fact `classifyBatch` runs regardless and its trays still gate, so
  13 of 15 files parked in `awaiting_disambiguation` before hashing. Only the per-job geocode step
  reads the mode.

None of these are fixed by this change — it is a diagnostic, and the upload pipeline is
**Sensitive** class. Two of them are spec-level, not implementation slips, so they need a spec
decision first.

## What the harness asserts

Run A: every file gets exactly one job, every job keeps its `relativePath`, no classified group is
left without jobs. Run B: nothing is left in an active phase, every `complete` job carries
`mediaId`, `storagePath` and `contentHash`, one `media_items` row per completed job, and the
byte-identical pair produces a skip. Run C: nothing stuck. Plus, via
`src/test/vitest.setup.ts`, any illegal `UploadPhase` transition throws — so a green run is also
evidence that the FSM held for the whole corpus.

## Adding a scenario

Add an entry to `TRACE_SCENARIOS` in
`apps/web/src/app/core/upload/trace/upload-trace-fixtures.ts` with an `intent` saying what it is
meant to exercise. `intent` is a note, not an assertion — when the pipeline disagrees with it, the
disagreement is the finding. Two scenarios sharing `contentByte` and `sizeBytes` hash identically,
which is how duplicates are made. For a new geocodable street, add a row to the stub gazetteer in
`upload-trace-geocoder.stub.ts`.
