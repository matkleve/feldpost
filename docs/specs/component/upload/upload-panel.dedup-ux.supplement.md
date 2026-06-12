# Upload Panel — Dedup UX (supplement)

> **Parent:** [upload-panel.md](./upload-panel.md)  
> **Service:** [upload-manager-pipeline.dedup-scope.supplement.md](../../service/media-upload-service/upload-manager-pipeline.dedup-scope.supplement.md)

## Status taxonomy

| State | Lane | Status label (en) | User meaning |
| --- | --- | --- | --- |
| Same-user resume skip | `issues` (skipped row) | Already uploaded | Your prior upload finished; bytes not sent again |
| Colleague duplicate | `issues` | File already in workspace | Someone in your org uploaded this file; choose next step |
| Upload in progress | `uploading` | Checking duplicates… | Hash lookup (all dedup-eligible types) |

**Skipped ≠ failed.** Skipped rows stay visible with muted/check styling.

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
