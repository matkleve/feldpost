# 01 — The upload flow, end to end

**Measured:** 2026-09-10 · **Method:** static reading of `apps/web/src/app/core/upload/**`, `…/core/upload-resolver-tray-orchestrator/**`, `…/features/upload/**`, `supabase/migrations/**`. No test executed against a live backend; no browser session.

This is the plain-language companion to the line-level trace in
[`../upload-process-analysis-2026-09-08/02-happy-path.md`](../upload-process-analysis-2026-09-08/02-happy-path.md).
Where that document tables 36 steps with `path:line` anchors, this one explains what
the flow is *trying* to do, so the rest of the review has somewhere to attach:

| Document | Contents |
| --- | --- |
| [`02-new-issues.md`](./02-new-issues.md) | NF-01 … NF-16 — attach/replace pipelines, HEIC, dedup, and the incomplete 2026-09-09/10 fixes |
| [`03-hard-cases-and-decisions.md`](./03-hard-cases-and-decisions.md) | The decisions that are expensive to revisit, what each gave up, and the ones that were reversed |
| [`04-status-of-prior-findings.md`](./04-status-of-prior-findings.md) | Every UP-xx finding from 2026-09-08 re-measured against HEAD |
| [`05-address-resolution-and-ui-findings.md`](./05-address-resolution-and-ui-findings.md) | NF-17 … NF-37 — Branch C / orchestrator, and the panel and tray UI |
| [`06-improvement-plan.md`](./06-improvement-plan.md) | Post-integration improvement plan — open questions answered, ranked work, dependencies, and what not to do |
| [`07-what-happens-when.md`](./07-what-happens-when.md) | Product-owner walkthrough — phase-by-phase "what you see vs what runs", branch points, geocoding directions |
| [`08-product-intent-vs-code.md`](./08-product-intent-vs-code.md) | Product intent vs code — eight PO statements, city-only fabrication trace, G4 vs post-upload refinement |

---

## 1. The shape of it

An upload is not one operation. It is three separate problems that happen to share a
progress bar:

1. **Getting the bytes into storage and a row into the database.** Mostly mechanical.
2. **Deciding where the photo is.** The hard part, and the reason the subsystem is
   19,000 lines instead of 2,000.
3. **Deciding whether we already have this file.** Content-hash deduplication.

Problem 2 is what makes the flow unusual. A construction photo is worth very little
without a location, and the location can come from four disagreeing sources: the
camera's EXIF GPS, the folder path the user dragged in, the filename, and the project
the user is uploading into. The system's job is to reconcile them, and to ask the user
only when it genuinely cannot decide.

## 2. Intake

The panel hands a `FileList` to `UploadManagerService.submit()`. One `UploadBatch` is
created; one `UploadJob` per file, each with `phase: 'queued'` and an immediate
object-URL thumbnail so the user sees rows appear instantly.

Then `classifyBatch` runs **once for the whole batch**, before any file is touched. This
is the Search Object pass: folder segments and filenames are parsed into address fields,
competing interpretations are detected, and every job gets a `groupingKey` — the
fingerprint of "these files claim to be at the same address". Jobs that share a
`groupingKey` will later share one geocode call and one tray question.

Only after that does `drainQueue()` start work, three jobs at a time
(`MAX_CONCURRENT = 3` in `apps/web/src/app/core/upload/support/upload-queue.service.ts`).

**Two intake routes exist and they are not equivalent.** A folder picked through the
file dialog (`webkitdirectory`) arrives with `webkitRelativePath` populated, so
`scanFilesFromWebkitDirectory` can reconstruct `directorySegments` and the whole
folder-as-address machinery works. A folder *dragged* onto the panel does not: `onDrop`
reads only `dataTransfer.files`, so a dropped folder contributes nothing at all
(UP-33, still open).

## 3. Per job: prepare

Per file, in order: `validating` → `parsing_exif` → (`converting_format` for HEIC) →
title/folder merge (`extracting_title`) → `hashing` → `dedup_check`.

EXIF parsing and HEIC→JPEG conversion are deliberately started **in parallel** —
they both read the original file and neither needs the other. That is a real
optimisation on a phone-sized HEIC.

Note the distinction the code maintains carefully and the names hide:
`job.parsedExif.coords` is *sensor metadata*, while `job.coords` is the *placement
decision*. They live in separate database columns and the second is still undefined at
this point. Confusing the two is the easiest way to break location handling.

## 4. Per job: deciding where it is

This is the eight-step model in
[`docs/specs/service/media-upload-service/address-resolution-model.md`](../../specs/service/media-upload-service/address-resolution-model.md).
Compressed:

- **If the Search Object has a street**, forward-geocode it through Photon. Which branch
  runs depends on how much of the address the text already pins down (Branch A/B/C).
  Hits further from the job's anchor than the org's `contextDistanceMaxMeters` are
  dropped as unrealistic.
- **If it has no street** — only a city, or only a state — no pin is placed. The job gets
  an admin centroid and `locationPinEligible = false`. This is a deliberate refusal to
  fake precision.
- **If EXIF GPS lands within `exifAssistRadiusMeters` (default 80 m)** of a geocode hit,
  it is used to pick which of several hits is the right one and to fine-tune the
  placement. The two sources agree, so the more precise one wins.
- **If EXIF GPS and the text address disagree by more than
  `sourceAgreementRadiusMeters` (150 m)**, nobody wins and the user is asked. This is
  contradiction class C1.
- **If neither source produces anything** and location is required, the job stops at
  `missing_data` in the Issues lane rather than uploading a locationless photo.

The tray (`UploadResolverTray`) is the human-in-the-loop escape hatch, and the spec is
emphatic that it is **a contradiction resolver, not an address picker**: it fires only
when evidence sources disagree or are insufficient. One question per card, highest
conflicting tier first, and the answer propagates to every job sharing that
contradiction before the next question is asked. The full taxonomy is
[`contradiction-resolution-model.md`](../../specs/service/media-upload-service/contradiction-resolution-model.md).

## 5. Per job: bytes and row

`uploading` → `saving_record` → `resolving_address` → `complete`.

The bytes go to the private `media` bucket at `{orgId}/{userId}/{uuid}.{ext}`; the
storage RLS policy requires the first path segment to be the caller's org and the second
to be their own user id, which is what makes cross-tenant writes unrepresentable rather
than merely forbidden. Then the `media_items` insert, then the dedup hash is registered,
then a reverse geocode fills in the human-readable address label.

Several of those last steps are fire-and-forget by design — the user should not wait for
an address label — which is also why several of them can fail without anybody noticing.
See [**NF-39**](./02-new-issues.md) § 3 and the product walkthrough
[`07-what-happens-when.md`](./07-what-happens-when.md) for how reverse geocode timing
and phase labels diverge today.

## 6. What the user sees

The panel derives everything. There is no stored lane: `getLaneForJob` maps the phase
(and `issueKind`) onto Uploading / Issues / Uploaded at render time. A job in
`missing_data` or `awaiting_disambiguation` shows up in Issues with row actions
appropriate to *why* it is stuck; a job at `complete` moves to Uploaded and the map and
`/media` grid get patched through separate subscriptions.

## 7. The other two pipelines

`submit()` is the **new** pipeline. Two more exist and share the same job/phase
vocabulary:

- **attach** — the file is added to an existing `media_items` row (the photoless-conflict
  flow: somebody recorded an address without a photo, and now the photo arrives).
- **replace** — the file replaces the bytes of an existing row, keeping its identity.

They matter for review because they re-implement parts of the new pipeline's tail
(dedup-hash registration, storage cleanup, phase writes) rather than sharing it.
