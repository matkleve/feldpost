# Upload Panel — Status mapping and lane semantics

> **Parent:** [upload-panel.md](upload-panel.md)

## What It Is

The **phase state diagram** (queued through complete/error/missing_data/skipped) and the **lane-bucketing rule** (issue kind first, then phase family) that Upload Panel uses to route a job into the Uploading / Uploaded / Issues lane. Split from `upload-panel.md` for size; the row-level status text strings live in [lane & row actions § Status Text Contract](upload-panel.lane-and-row-actions.md#status-text-contract).

## What It Looks Like

Two Mermaid diagrams: a `stateDiagram-v2` of every upload-pipeline phase transition, and a flowchart deciding lane placement from issue kind and phase family.

## Where It Lives

- **Specs:** `docs/specs/component/upload/upload-panel.status-mapping.supplement.md`
- **Code:** `core/upload/upload-manager.service.ts`, `features/upload/upload-panel/upload-panel.component.ts` (`laneBuckets`)

## Actions

| # | Trigger | System response |
| --- | --- | --- |
| 1 | Job phase changes | State diagram below governs the legal next phase |
| 2 | `laneBuckets` recomputes | Lane semantics diagram below governs which lane the job lands in |

## Component Hierarchy

N/A — these diagrams describe `UploadJob` state, not a DOM subtree; see parent **Component Hierarchy** for the row host tree.

## Status Mapping (Mermaid)

```mermaid
stateDiagram-v2
  [*] --> queued
  queued --> validating
  validating --> parsing_exif
  parsing_exif --> converting_format: HEIC/HEIF
  parsing_exif --> hashing: photo/image path
  parsing_exif --> conflict_check: video/document path
  converting_format --> hashing
  hashing --> dedup_check
  dedup_check --> duplicate_issue: duplicate match
  duplicate_issue --> complete: use_existing
  duplicate_issue --> uploading: upload_anyway
  duplicate_issue --> skipped: reject
  dedup_check --> extracting_title: no coords
  dedup_check --> conflict_check: coords present
  extracting_title --> conflict_check: title address found
  extracting_title --> missing_data: no GPS + no address
  conflict_check --> awaiting_conflict_resolution: photoless conflict
  awaiting_conflict_resolution --> queued: user resolution
  conflict_check --> uploading: no conflict
  uploading --> saving_record
  saving_record --> resolving_address: coords path
  saving_record --> resolving_coordinates: title-address path
  saving_record --> error
  resolving_address --> complete
  resolving_coordinates --> complete
  missing_data --> queued: map/address placement provided
  missing_data --> queued: project binding provided (document_unresolved)
  queued --> error: timeout/failure
  error --> queued: retry
  complete --> [*]
  error --> [*]
  missing_data --> [*]
  skipped --> [*]
```

## Lane Semantics (Mermaid)

```mermaid
flowchart LR
  A[Job phase] --> B{Issue kind?}
  B -->|duplicate_photo| C[Issues lane]
  B -->|missing_gps| C
  B -->|document_unresolved| C
  B -->|conflict_review| C
  B -->|upload_error| C
  B -->|none| D{Phase family}
  D -->|queued parsing uploading enrichment| E[Uploading lane]
  D -->|complete attached replaced| F[Uploaded lane]
  D -->|skipped reject| C
```
