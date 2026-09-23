---
id: STUDY-016
type: investigation
status: active
supersedes: none
corrected-by: none
---

# Upload flow from intake to persist, at six sizes and seven folder shapes

**Measured:** 2026-09-23 · **Commit:** `54e7f192` on `main` (this study changes no product code) · **Node:** 22.14.0 · **How:** the existing headless harness `npm run trace:upload`, which drives the real Angular upload services with a stub geocoder and an in-memory Supabase. Classification-only runs used `vitest -t scale` so the end-to-end tests were not in the timing. No browser, no network, no hosted database.

This is a measurement of where a batch stops, stalls, or is misread. It does not change the pipeline.

## What was run, and what a pass does not mean

Two instruments, because they answer different questions:

| Instrument | What it executes | Sizes |
| --- | --- | --- |
| Scale tier (`measureClassifyAtScale`) | Search Object + local gate only. No jobs, no `File` bodies, no queue. | 10, 100, 1 000, 10 000, and 100 000, all seven profiles. Every one exited 0. |
| Full harness, runs A–D | Intake → classify → group → stub geocode → trays → hash → dedup → fake storage → `media_items`. | 1, 10, 21 (curated), 100, 1 000, 10 000, and one 100 000 flat run. |

`[A]` The scale tier's own caveat still says classification runs to completion before the queue drains (`upload-trace-scale-report.ts`). The submit path no longer does that: `CLASSIFY_CHUNK_SIZE` is 250 and `drainQueue()` runs after each chunk (`upload-manager-submit.util.ts:229`, `:275-283`). The scale numbers are the cost of the classifier, not time-to-first-byte.

`[A]` A green harness exit is not "every file uploaded". Run A's assertions do not require `settled === true`. They check job count, `relativePath`, and that S01 and S02 share a grouping key (`upload-pipeline-trace.spec.ts:132-148`). A batch can time out or sit in `resolving_location` and the other three runs can still pass.

`[A]` When `--count` is larger than the curated list, those curated files are prepended (`upload-pipeline-trace.spec.ts:82-92`). The curated list is 21 paths (`upload-trace-fixtures.ts:47` plus `TRACE_AREA_ONLY_SCENARIOS`). A "100 company_street" run is 21 curated paths plus 79 generated ones. The single `house_step:Hauptstraße 5` that appears in almost every required-mode run is curated S05, not a property of the generated tree.

`[B]` File bodies are 512 bytes (`TRACE_PHOTO_SIZE_BYTES`, `upload-trace-fixtures.ts:41`). The hash reads 64 KB (`content-hash.util.ts:17`), so it never sees a real photo. Photon is a 12-row stub. Supabase is in memory: no RLS, no triggers, no storage timeout. The legend printed by the harness says the same thing.

## 1 · Classification does not throw. Folder shape decides the outcome.

Camera naming, seed 7, `filesPerLocation` left at the harness default of 30. `ms/file` is the measured classification rate. Trays here are local-gate questions (`layer_conflict`, `admin_conflict`, `street_only`) before any geocode.

| Profile | 10 files | 100 | 1 000 | 10 000 | 100 000 |
| --- | --- | --- | --- | --- | --- |
| `flat` | 1 group, 0 trays, 0.060 ms | 1 / 0 / 0.038 | 1 / 0 / 0.027 | 1 / 0 / 0.026 | 1 / 0 / 0.025 (2.5 s) |
| `company_area` | 1 / 0 / 2.574 | 4 / 0 / 2.292 | 19 / 1 / 2.191 | 19 / 1 / 2.277 | 19 / 1 / 2.196 (3.7 min) |
| `company_street` | 1 / 0 / 2.516 | 4 / 0 / 2.422 | 34 / 7 / 2.950 | 320 / 49 / 3.165 | 760 / 80 / 3.219 (5.4 min) |
| `mixed` | 1 / 0 / 2.450 | 4 / 0 / 2.352 | 20 / 0 / 2.019 | 83 / 7 / 2.241 | 171 / 17 / 2.269 (3.8 min) |
| `firma_at_archive` | 1 / 0 / 2.521 | 5 / 0 / 6.117 | 21 / 1 / 5.921 | 101 / 10 / 6.441 | 704 / 98 / 6.489 (10.8 min) |
| `adversarial` | 10 / 4 / 3.809 | 85 / 41 / 3.457 | 823 / 386 / 3.543 | 5 620 / 2 577 / 3.371 | 15 022 / 9 587 / 3.419 (5.7 min) |
| `shallow_many` | identical to `company_area` at every size, including 100 000 (19 groups, 1 tray, same outcome counts) | | | | |

`[A]` No scale run threw. Heap of the streaming counters stayed under 300 MB. The 100 000-file `firma_at_archive` pass was the slow one: 6.489 ms/file, 10.8 min for camera naming alone, wall clock 1 296 s because the spec also runs neutral naming and the job-store samples.

`[A]` Neutral file names (six-digit leaves that cannot be an AT postcode) produced the same outcome counts as camera names on `company_area`, `company_street`, `flat`, `mixed`, and `firma_at_archive` at 100 000. The misreads in § 2 are the folder text, not `IMG_####`.

`[A]` `shallow_many` is not a sparse tree in this table. The profile's own default is 3 files per place (`upload-trace-generator.ts:245-249`). The compare runner always passes `filesPerLocation: 30` (`upload-pipeline-trace.spec.ts:283-287`), and a positive override wins. At 100 000 the two profiles printed the same line: `area_only=80950 incomplete=14310 admin_conflict=4740`.

`[A]` Group count does not stay linear, so the report's own extrapolation overstates geocodes once the generator wraps. `company_area` is 4 groups at 100 files and 19 groups at 1 000, 10 000, and 100 000. The 100 000 report still prints "1 000 000 files → 190 geocodes". `adversarial` trays were 2 577 at 10 000 (the linear guess for 100 000 is 25 770) and measured 9 587 at 100 000.

### Outcomes at 100 000 (camera)

| Profile | What the local gate returned |
| --- | --- |
| `flat` | `incomplete=100000`. One empty grouping key `\|\|\|\|\|`. |
| `company_area` | `area_only=80950`, `incomplete=14310`, `admin_conflict=4740`. |
| `company_street` | `street_locality=80950`, `street_only=14310`, `admin_conflict=4740`. |
| `mixed` | `area_only=56620`, `incomplete=20040`, `street_locality=16230`, `admin_conflict=4260`, `street_only=2850`. 171 groups, 17 trays. |
| `firma_at_archive` | `street_locality=72660`, `area_only=17299`, `admin_conflict=7279`, `street_only=2762`. 704 groups, 98 trays. |
| `adversarial` | `street_locality=46014`, `layer_conflict=24890`, `street_only=12514`, `incomplete=12452`, `admin_conflict=4130`. |

`[A]` The three non-`area_only` buckets on `company_area` are the same three sizes as the non-`street_locality` buckets on `company_street` (14 310 and 4 740). Same places, different leftover once the street segment is or isn't there.

## 2 · Where the folder text is misread

One file per locality slot (index `slot * 30`, seed 7), through `resolveLayersForJob` and `evaluateLocalResolution`. The gazetteer contains every name (`at-gemeinden-bev.json`, `at-plz.json`).

| Folder | `company_area` | `company_street` |
| --- | --- | --- |
| `Wien/1010` … `Wien/1090`, `Linz/4020`, `Steyr/4400`, `Gmunden/4810`, `Salzburg/5020`, `Innsbruck/6020`, `Bregenz/6900`, `Graz/8010`, `Villach/9500` | `area_only`, city and PLZ kept | `street_locality`, city, PLZ and street kept |
| `Wiener Neustadt/2700` | `incomplete`, key `\|\|\|\|\|` | `street_only`, key `\|\|\|\|getreidegasse\|10` — city and PLZ gone |
| `St. Pölten/3100` | `incomplete` | `street_only`, street kept, city and PLZ gone |
| `Krems an der Donau/3500` | `incomplete` | `street_only`, street kept, city and PLZ gone |
| `Klagenfurt/9020` | `admin_conflict:city`. Parsed city is `Klagenfurt am Wörthersee`, not `Klagenfurt` | same city conflict, street `Herrengasse` kept |

`[A]` `tokenizeSegment` splits on spaces, hyphens, dots, underscores and commas (`path-token-classifier.ts:400-404`). `Wiener Neustadt` becomes `Wiener` + `Neustadt`. `St. Pölten` becomes `St` + `Pölten` because `.` is a separator. `Krems an der Donau` becomes four tokens. None of those tokens is an exact municipality name. `[A]` Exact place match is what derives the country (`path-token-classifier.ts:290-310`). Fuzzy match does not run until the country is already AT (`:313-314`). `[A]` A postcode is only recognised once a country pattern exists (`postcode-patterns.ts:33-38`), and a 4-digit token is not a house number while the country is unknown (`path-token-classifier.ts:374-382`). So `2700`, `3100` and `3500` are dropped, not stored as a PLZ. The street segment is a separate folder and still parses, which is why the street profile keeps `Getreidegasse` and loses the town.

`[A]` Those street-only keys have no city. `Getreidegasse 10` from Wiener Neustadt and the same street number from the other dropped towns share `||||getreidegasse|10`. At 100 000 `company_street` files the largest such keys hold 360 files each. Different towns become one geocode group.

`[A]` `Klagenfurt` is an alias of `Klagenfurt am Wörthersee` in the municipality file, while `at-plz.json` maps `9020` to the string `Klagenfurt`. The conflict field is `city`. One locality, 4 740 files, one tray, at 100 000.

`[A]` Below 270 generated files (`9 * 30`), `company_area` has not reached Wiener Neustadt yet. At 100 files the gate was `area_only=100`. The failure is invisible in a small batch of the first Vienna districts.

## 3 · End to end: where the batch actually stops

Runs A–D, `--answer-trays`, seed 7. Run A is folder submit with location required. Run B is flat files, location optional. Run C is folder submit, location optional. Run D is archive import.

### Small curated trees

| Run | 1 file (S01 only) | 10 curated | 21 curated |
| --- | --- | --- | --- |
| A required | `complete=1`, settled. Harness **failed**: it also asserts S02's grouping key (`spec.ts:145`). | `complete=9`, `awaiting_disambiguation=1`. Harness **failed** on run B: it requires a `skipped` duplicate, and S14 is not in the first 10 (`spec.ts:181`). | `complete=19`, `awaiting_disambiguation=1`, `missing_data=1` (`missing_gps`). Exit 0. |
| B optional | `complete=1`. The same S14 assertion failed. | `complete=10`. | `complete=20`, `skipped=1` (`duplicate_file`). |
| D archive | 0 deferred. | 7 uploaded, 3 `address_deferred`. | 16 uploaded, 4 `address_deferred`. |

`[A]` The hold that answering does not clear is `house_step` for `Hauptstraße 5`, with **0 candidates** (curated S05, street only). The auto-answerer calls `applyTrayHouseSelection` with a null house id when the list is empty (`upload-trace-tray-answers.ts:62-69`) and then records the group as still gated. S11 `Baustelle Süd/Woche 12/IMG_8001.jpg` is the `missing_gps` row: the findings section names it under `SO-EMPTY`.

### Generated trees, required mode (run A)

| | 100 | 1 000 | 10 000 |
| --- | --- | --- | --- |
| `flat` | 31 complete, 68 `missing_gps`, 1 still on Hauptstraße. Settled. 3 s. | 202 complete, 789 `missing_gps`, 8 skipped, 1 waiting. 6 s. | 1 892 complete, 7 999 `missing_gps`, 108 skipped, 1 waiting. 105 s for all four runs. Exit 0. |
| `company_area` | 98 complete, 1 `missing_gps`, 1 waiting. | 828 complete, 170 `missing_gps`, 1 waiting. | 8 556 complete, 1 440 `missing_gps`, 1 waiting. Exit 0. 175 s. |
| `company_street` | 31 complete, 68 `missing_gps`, 1 waiting. | 279 complete, 653 `missing_gps`, 60 still `awaiting_disambiguation`, **1 `error` / `upload_error`**, 7 skipped. | not run at 10 000. |
| `firma_at_archive` | 35 complete, 64 `missing_gps`, 1 waiting. | 361 complete, 632 `missing_gps`, 1 waiting. | not run at 10 000. |
| `adversarial` | 42 complete, 36 `missing_gps`, 6 waiting, **15 left in `resolving_location`**. 207 s. Exit 0. | 294 complete, 352 `missing_gps`, 290 waiting, **51 left in `resolving_location`**. Answered exactly 60 trays. 231 s. Exit 0. | **Test A timed out at 300 s.** Snapshot: 2 568 complete, 3 971 `missing_gps`, 3 335 waiting, 64 still `resolving_location`, 62 skipped. Answered exactly 60. Exit 1. Runs B–D of the same command still passed. |

`[A]` `MAX_TRAY_ROUNDS` is 60 (`upload-trace-tray-answers.ts:24`). Both adversarial runs that answered 60 hit that cap. The printed line `still gated after answering: none` only means the stall list was empty. That list is filled when a round finds no unseen open group (`:149-154`). It is not filled when the loop exhausts 60 rounds. The phase counts are the record: thousands of jobs were still in `awaiting_disambiguation`.

`[A]` The 15 and 51 `resolving_location` jobs are past the settle budget. `waitForBatchSettled` gives up after 180 s (`upload-trace-harness.ts:154`) and returns false. Run A does not fail the test for that. The harness reports the count and continues.

`[A]` The one `upload_error` is real in the 1 000-file `company_street` run (`phases: error=1`, `issueKinds: upload_error=1`). `--detail=0` did not print the message or the path. The cause of that single failure was not recovered.

`[B]` The large `missing_gps` counts on `company_street`, `firma_at_archive` and `adversarial` are not safe to read as production. The stub geocoder has 12 rows. A street the stub cannot place becomes `missing_gps` here and can be a normal geocode against Photon. `company_area` completing ~85 % at 10 000 is the local `area_only` path, which does not need a street hit. The flat `missing_gps` majority is the generator: a `Rohdaten/` tree has no address, and about one file in five carries stub EXIF (`EXIF_SHARE = 0.2`).

### Location optional and archive import

`[A]` Runs B and C, through 10 000 files, on every profile that was run: every job is `complete` or `skipped` / `duplicate_file`. Nothing parked, nothing in `error`, nothing left active. Skip counts track the generator, which reuses a body every 17th file (`DUPLICATE_EVERY`, `upload-trace-generator.ts:173`): 587 skips in 10 000 is 5.87 %, and 1/17 is 5.88 %.

`[A]` Run C does not classify (`upload-manager-submit.util.ts:260-270`). "Upload without a location" is the path that stays boring as N grows, up to the ceiling in § 4.

`[A]` Archive import asks nothing (0 jobs in `awaiting_disambiguation` on every archive run). It uploads what the local gate can place and defers the rest as `address_deferred`. At 10 000 `company_area`: 8 103 uploaded, 454 deferred. At 10 000 adversarial: 2 564 uploaded, 3 394 deferred. The emit does not print skips, so those two figures do not add up to 10 000; the test's accounting assertion passed on the runs that exited 0.

## 4 · 100 000 files through the full pipeline

One run: `--count=100000 --profile=flat --answer-trays`. Wall clock 1 204 s. Exit 1.

`[A]` Runs A, B, C and D each failed with `Test timed out in 300000ms` (`TRACE_TIMEOUT_MS`, `upload-pipeline-trace.spec.ts:58`). No outcome table was written for them. The worker RSS during the run was about 2.8 GB. After the four timeouts the scale check inside the same process saw `heapUsed` of 1 871 MB and failed its own `MAX_SCALE_HEAP_MB` of 512 — that heap is the leftover 100 000-job process, not the one-file scale sample the assertion thinks it is measuring. `UPLOAD_TRACE_SCALE` was 1 on purpose.

`[A]` Eleven times the test reporter threw, and `classifyBatch` logged `classifyBatch failed; draining queue without it`:

- 7 × `illegal transition queued → missing_data`
- 4 × `illegal transition hashing → missing_data`

`queued` may go to `validating`, `uploading`, `awaiting_disambiguation`, or `complete` (`upload-phase-transitions.ts:54-57`). `hashing` may go to `dedup_check`, `resolving_location`, or `awaiting_disambiguation` (`:70-75`). `missing_data` is not in either set. The same two job ids repeat, so this is a handful of jobs, not 100 000. `[A]` In production `reportTransitionViolation` logs and the write still happens (`upload-job-state.service.ts:216-222`). In Vitest the reporter throws (`vitest.setup.ts:19-21`), the write is skipped, and the chunk's classification is abandoned (`upload-manager-submit.util.ts:217-218`). The harness and the browser do not fail the same way.

`[C]` Why 100 000 flat files do not finish inside five minutes, extrapolated from the 10 000 flat run (105 s for four runs, on the order of a few milliseconds of queue time per file) and from `MAX_CONCURRENT = 3` (`upload-queue.service.ts:10`): draining 100 000 jobs three at a time is on the order of the 300 s test timeout before the settle budget of 180 s. This was not separated from GC. The RSS figure is the part that was observed.

## 5 · What was not executed

`[A]` Not run, and not claimed:

- A browser. The panel renders every job in the current lane: `visibleLaneJobs` returns the lane array with no window (`upload-panel-view-model.service.ts:64-80`), and `laneJobs` is the whole bucket (`upload-panel-state.service.ts:57`). The comment above that service says "max 5 running". The code does not slice. Whether 10 000 DOM rows freezes the tab was not measured.
- `jobs()` allocates a new array of every job on each read (`upload-job-state.service.ts:106-110`), and `updateJob` bumps `revision` on every patch (`:153-159`). The scale tier's flat `updateJob` time does not include a subscriber. The panel's computed buckets are a subscriber.
- Real Photon / Nominatim. `GeocodingService` serialises its own calls (`geocoding.service.ts:193`, `:632-636`). How many of the upload's geocodes go through that queue was not counted in this run.
- Real Storage, RLS, triggers, PostGIS, or a 25 MB file (`MAX_FILE_SIZE`, `upload-file-types.ts:2`).
- `shallow_many` at its real density of 3 files per place.
- A full required-mode run of `firma_at_archive` or `company_street` at 10 000, or of anything but `flat` at 100 000. Classification for those was measured; the queue was not.

## What this does not decide

Nothing here is a proposal to change chunk size, concurrency, or the tokenizer. The measurements stand on their own. The three dropped towns and the Klagenfurt alias conflict are defects in the current classifier. The 100 000-file full run does not finish inside the harness budgets, and a few jobs attempt a phase edge the map does not list.

## Update 2026-09-23 — the one `upload_error`

The paragraph in § 3 that says the cause was not recovered still stands as the state of the first run (`--detail=0`). This section adds the re-run. It does not delete that sentence. The ordered work is [STUDY-017](./017-upload-scale-action-plan.md).

`[A]` Same harness, `--count=1000 --profile=company_street --answer-trays --detail=0`, seed 7, `UPLOAD_TRACE_COMPARE_PROFILES=0`, Vitest filter `location required`. Exit 0 in 6.4 s. Phases matched the first run: `awaiting_disambiguation=60 complete=279 error=1 missing_data=653 skipped=7`.

`[A]` The error job is `Wiener Neustadt/2700/Maria-Theresien-Straße 31/IMG_2901.jpg`, `issueKind=upload_error`, `failedAt=awaiting_disambiguation`, `errorKey` empty. Message: `[upload-phase] illegal transition awaiting_disambiguation → skipped (channel=pipeline, job=2fa2184f-0e46-47fe-bf5d-4b4b15397936)`. The job id belongs to that process.

`[A]` That edge is not in the map. `skipped` is legal from `dedup_check` only (`upload-phase-transitions.ts:79`). The only writer of `skipped` is `handleDedupSkip` (`upload-dedup-skip.util.ts:17`). Vitest throws on the violation (`vitest.setup.ts:19-21`), and `handleUploadPipelineError` stores the throw as `job.error` (`upload-manager-error.util.ts:42`). In the app the same call logs and then writes the new phase (`upload-job-state.service.ts:216-222`). `[C]` In the browser this file is a skipped duplicate, not a failed upload.
