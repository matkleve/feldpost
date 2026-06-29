# Upload Panel — Dedup UX (supplement)

> **Parent:** [upload-panel.md](./upload-panel.md)  
> **Service:** [upload-manager-pipeline.dedup-scope.supplement.md](../../service/media-upload-service/upload-manager-pipeline.dedup-scope.supplement.md)

## Status taxonomy

| State | Lane | Status label (en) | User meaning |
| --- | --- | --- | --- |
| Same-user resume skip | `issues` (skipped row) | Already uploaded | Your prior upload finished; bytes not sent again |
| Duplicate, address added | `issues` (skipped row) | Already uploaded · address added | Same file under a different folder address — bytes not re-sent, the address was added to the one media |
| Colleague duplicate | `issues` | File already in workspace | Someone in your org uploaded this file; choose next step |
| Upload in progress | `uploading` | Checking duplicates… | Hash lookup (all dedup-eligible types) |

**Skipped ≠ failed.** Skipped rows stay visible with muted/check styling.

## Batch summary

On batch completion, a single calm toast recaps the outcome when anything beyond
plain success happened (`buildBatchSummaryToast`): e.g. **"8 uploaded · 2 already
present · 3 addresses added"**. An all-new batch shows no toast (each row already
reads "Uploaded"); failures make the toast a `warning`.

## Issue kind

- Normative: `duplicate_file` (photos, PDFs, documents, videos with byte match).
- Legacy alias: `duplicate_photo` — treat identically in row actions until fully removed from code.

## Row actions (`issues` + duplicate)

| Action | Effect |
| --- | --- |
| Open existing media | Navigate/focus existing `media_item_id` |
| Upload anyway | `forceDuplicateUpload` → re-queue |
| Dismiss / Reject | Skip without new bytes |

GPS/location actions MUST NOT appear on `duplicate_file` rows.

## Modal

- Opens automatically on `duplicateDetected$` (colleague / cross-uploader match).
- Copy stays file-neutral: “This file already exists.”
- Batch checkbox: apply decision to all jobs sharing the same `existingMediaId`.

## Same-user resume

- No modal.
- Silent skip after hash match when `registered_by_user_id === auth.uid()`.
