---
id: STUDY-017
type: proposal
status: proposed
supersedes: none
corrected-by: none
---

# What to fix after the 1…100 000 upload measurement

**Written:** 2026-09-23 · **From:** [STUDY-016](./016-upload-flow-scale-and-folder-shapes.md), product commit `54e7f192` · **How:** the same headless harness, plus one re-run that printed the single `upload_error`. No product code in this change.

This is an order of work. It is not a contract and not permission to implement. `[D]` The order is a choice made here so the next change has a sequence. An owner can reorder it.

Class of every code step below is **Sensitive** (upload pipeline, FSM, or a stateful panel). Step 6 is a measurement. Step 7 is the hover, and it waits on steps 1 and 2 so the copy is not a lie.

## What the recommendation means

`[D]` People may upload any folder. The product does not reject a shape.

`[A]` There is no tips spec and no tips component. Intake hover copy today is two native `title`s: `upload.folder.unsupported.hint` on the folder button only while folder import is disabled (`upload-panel.component.html`), and `upload.archive.import.hint` on the archive button. A native `title` is one line. A list does not fit there.

`[D]` The list lives in [upload-panel.folder-shape-tips.supplement.md](../specs/component/upload/upload-panel.folder-shape-tips.supplement.md), shown on hover of the enabled **Upload folder** button, chrome `app-popover`. Building that hover is step 7.

## Order

The misreads in steps 1 and 2 are deterministic and do not depend on the stub geocoder. They also merge different towns into one street key. The scale ceiling and the stub's `missing_gps` counts are real, and they are not the company failure rate. So the parser comes first.

### 1. Multi-word municipalities

`[A]` `tokenizeSegment` splits on spaces, hyphens, dots, underscores, and commas (`path-token-classifier.ts:400-404`). `Wiener Neustadt`, `St. Pölten`, and `Krems an der Donau` lose city and postcode. On `company_street` the street survives, so those towns share keys such as `||||getreidegasse|10` (360 files on one key at 100 000). Country is derived only from an exact place match, and a postcode is recognised only after the country is known (STUDY-016 § 2).

Fix the read so one folder segment that is a known municipality stays one place, including a dot inside `St. Pölten`, and so the postcode beside it is kept. Do not require the user to rename the folder.

Verify: the locality probe from STUDY-016 § 2, same seed, those three folders come back with city and postcode. A one-word city (`Wien`, `Linz`, `Graz`) does not change.

### 2. Klagenfurt spelling

`[A]` `Klagenfurt` is an alias of `Klagenfurt am Wörthersee`, and `at-plz.json` maps `9020` to the string `Klagenfurt`. The local gate reports `admin_conflict:city`. One tray, 4 740 files at 100 000.

Same change as step 1 if it falls out of the alias rule. Otherwise immediately after. Verify: `Klagenfurt/9020` is one city, no `admin_conflict`.

### 3. House step with no candidates

`[A]` Required-mode runs that include the curated corpus leave one group on `house_step` for `Hauptstraße 5` with 0 candidates. That group is curated S05, not the generated tree. The auto-answerer calls `applyTrayHouseSelection(group.id, null)` (`upload-trace-tray-answers.ts:62-69`) and the group stays gated.

Decide the product behaviour when the house list is empty (skip the step, or ask something else). Verify: a required run of the 21 curated files no longer has a job stuck on that empty house step.

### 4. Dedup skip while a job is already in a tray

`[A]` Re-run on 2026-09-23, same harness, `--count=1000 --profile=company_street --answer-trays --detail=0`, seed 7, `UPLOAD_TRACE_COMPARE_PROFILES=0`, test filter `location required`. Exit 0. Phases: `awaiting_disambiguation=60 complete=279 error=1 missing_data=653 skipped=7`. One `upload_error`.

Path: `Wiener Neustadt/2700/Maria-Theresien-Straße 31/IMG_2901.jpg`

Message: `[upload-phase] illegal transition awaiting_disambiguation → skipped (channel=pipeline, job=2fa2184f-0e46-47fe-bf5d-4b4b15397936)`

`failedAt=awaiting_disambiguation`. The job id is from this process; the path is the stable one.

`[A]` `skipped` is a legal pipeline edge only from `dedup_check` (`upload-phase-transitions.ts:79`). From `awaiting_disambiguation` the map lists `queued`, `resolving_location`, and `missing_data` (`:96-98`). The only production writer of phase `skipped` is `handleDedupSkip` (`upload-dedup-skip.util.ts:17`), called for a same-user hash match (`upload-dedup-match.util.ts:33-44`).

`[A]` Vitest's reporter throws on that detail (`vitest.setup.ts:19-21`). `handleUploadPipelineError` then `failJob`s with the exception text (`upload-manager-error.util.ts:42`). In the app, `reportTransitionViolation` logs and `transitionTo` still writes the phase (`upload-job-state.service.ts:216-222`). `[C]` In the browser this file becomes `skipped`, not `error`. The `upload_error` is the test throw. The defect is the unlisted edge.

`[A]` The same class showed up on the 100 000 flat run: 7 × `queued → missing_data`, 4 × `hashing → missing_data` (STUDY-016 § 4). Colleague duplicates write `missing_data` from `applyDedupMatch` (`upload-dedup-match.util.ts:47`). Those edges are not in the map either.

Fix: a duplicate decision must be legal from the phases a job can already be in, or dedup must not run after the job has entered the tray. Add the edges to the map only if the pipeline is supposed to skip from a tray. Verify: this path no longer throws, and a same-user duplicate that is already `awaiting_disambiguation` ends in the phase the spec names.

### 5. Settle ceiling and the panel list

`[A]` Required `adversarial` at 10 000 timed out at 300 s. The 100 000 flat full run timed out at 300 s on runs A–D. `MAX_CONCURRENT` is 3. `waitForBatchSettled` stops at 180 s. The panel's `visibleLaneJobs` returns the whole lane (`upload-panel-view-model.service.ts:64-80`).

Do this after steps 1–4. A correct parser cuts the tray count that makes adversarial slow, and the 10 000 `company_area` required run already settled. Do not treat the stub's `missing_gps` majority as the thing to optimise.

Verify: a required `company_street` run at 10 000 settles or names the phase that is still moving, and a lane of more than the visible window does not mount every row. The DOM part was not measured in a browser (STUDY-016 § 5).

### 6. Re-measure street `missing_gps` on a real geocoder

`[B]` At 1 000 `company_street`, 653 jobs were `missing_gps`. The stub Photon has 12 rows. That count is not a production rate.

No code change until a run against the real geocoder says otherwise. If the rate collapses, close the item.

### 7. Show the folder-shape hover

Build action 4h from the supplement. After steps 1 and 2, the multi-word city line and the Klagenfurt line match what the parser does. Register the six i18n keys in the same change.

## Update 2026-09-24 — implemented and re-measured

The order above was carried out. This section does not delete the earlier claims.

`[A]` A folder segment that is an exact municipality is classified as that place before the splitter runs (`path-token-classifier.ts`, `classifyTokensInSegment`). `Wiener Neustadt`, `St. Pölten`, and `Krems an der Donau` keep the city and derive AT, so the postcode beside them is kept. The 1 000-file `company_street` re-run geocodes `Getreidegasse 10` with `city=Wiener Neustadt` and `postcode=2700`.

`[A]` A city matches a PLZ city when either string is the municipality name or one of its aliases (`upload-area-evidence.helpers.ts`, `cityMatchesPlzCities`). The same run geocodes `Herrengasse 20` as `Klagenfurt am Wörthersee` / `9020` with no `admin_conflict`.

`[A]` An empty house list closes the tray via `deferGroup` (`upload-location-tray-flow.service.ts`). The re-run has `awaiting_disambiguation=0`. `Hauptstraße 5` is `city_step` with `gate=false`. One job is `address_deferred`.

`[A]` Pipeline edges `awaiting_disambiguation → skipped`, `queued → skipped`, `queued → missing_data`, `hashing → skipped`, and `hashing → missing_data` are in the map. The 1 000-file re-run no longer has `phase=error` or `upload_error`. Phases: `complete=144 missing_data=850 skipped=6`.

`[A]` The 10 000-file `company_street` required run exited 0 in 114 s. Phases: `complete=1705 missing_data=8228 skipped=67`. Jobs still active: 0. The lane mounts at most 12 rows (`LANE_MOUNT_WINDOW`) and advances that window on scroll.

`[B]` Eight stub misses from the 1 000-file run (street queries Photon was not asked by the harness) all returned one Photon hit on 2026-09-24 (`photon.komoot.io`, limit 1). The harness `missing_gps` count is the stub. No product change for that count.

`[A]` The folder button hover shows the six strings from the supplement. `app-popover` is not used: `brnPopoverContent` inside the intake block made sibling row bindings fail in the panel DOM test. The list is `role="tooltip"`.

## What this plan does not do

It does not change chunk size, `MAX_CONCURRENT`, or the tray budget. STUDY-009 already closed the budget. It does not treat `adversarial` tray counts as a company rate. It does not add a tips component.
