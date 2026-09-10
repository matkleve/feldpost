# Upload Manager Pipeline

> **Split contracts:** [Data contracts](./upload-manager-pipeline.data.md) · [Location routing](./upload-manager-pipeline.location-routing.supplement.md) · [Dedup scope](./upload-manager-pipeline.dedup-scope.supplement.md) · [Wiring](./upload-manager-pipeline.wiring.supplement.md)

## What It Is

Child spec for the operational pipeline owned by `UploadManagerService`: folder submission with address-hint extraction, photo-only deduplication, replace/attach event flow, location-conflict handling, and EXIF-vs-text-address reconciliation (15m tolerance).

The pipeline coordinates three utility services (`FolderScanService`, `FilenameParserService`, `LocationPathParserService`) to establish address precedence: file > folder > country level. The upload-internal `address_ambiguous` prompt is emitted only when the user needs to resolve conflicting parsed location candidates. Details on orchestration, state, and conflict handling are preserved in Actions and acceptance criteria.

## What It Looks Like

This is mostly invisible infrastructure. Users experience it through stable phase labels, batch progress, skipped-duplicate states, replace/attach refresh behavior, and explicit conflict-resolution pauses instead of silent failures.

## Where It Lives

- **Parent spec**: `docs/specs/service/media-upload-service/upload-manager.md`
- **Child/related specs**: `docs/specs/service/folder-scan/folder-scan.md`, `docs/specs/service/filename-parser/filename-parser.md`, `docs/specs/service/location-path-parser/location-path-parser.md`, `docs/specs/service/media-upload-service/upload-location-config.md`
- **Primary implementation**: `core/upload/upload-manager.service.ts` plus pipeline services in `core/upload/` and shared utility services in `core/`
- **Consumed by**: upload panel, media detail replace/attach flows, map shell, thumbnail views, folder import entry points

## Actions

| #   | Trigger                                                          | System Response                                                                                                 | Notes                                                                                                   |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | User selects many files                                          | Creates one batch and one job per file                                                                          | Standard multi-file flow                                                                                |
| 2   | User selects a folder                                            | Scans recursively, creates scanning batch, then queues jobs                                                     | Chromium/File System Access only                                                                        |
| 2a  | Folder name contains `Project: [projectname]`                    | Resolves project by case-insensitive name; creates project if missing, assigns jobs to project context          | Project context extraction is deterministic and case-insensitive                                        |
| 3   | Folder name contains parseable address                           | Stores batch-level folder address hint and applies it to jobs without own address                               | Default only, never forced override                                                                     |
| 3a  | Folder has nested address hierarchy (`Wien/Hauptstrasse 5/…`)    | Builds per-file folder candidate by traversing `directorySegments` leaf→root                                    | Nearest matching folder segment wins; root hint used only as fallback                                   |
| 4   | Individual file name contains parseable address                  | File-level address overrides inherited folder hint                                                              | Most-specific textual source wins                                                                       |
| 4a  | Parsed file/folder address is low-confidence                     | Keeps parsed fragment as note only; does not qualify as resolved address                                        | Prevents nonsense title strings from bypassing issues routing                                           |
| 4b  | Street+house resolves to multiple cities                         | Runs disambiguation algorithm and computes ranked candidate probabilities                                       | Auto-assign only above threshold                                                                        |
| 5   | EXIF GPS and text-derived address both available                 | Geocodes text address and compares distance to EXIF GPS using 15m tolerance                                     | Keeps both coordinate sources                                                                           |
| 6   | Distance between text-derived and EXIF coordinates > 15m         | Marks location source mismatch for detail UI and audit fields                                                   | Upload still continues                                                                                  |
| 7   | Job media type is photo, document, or video                        | Computes content hash (`photo_v1` or `binary_v1`) and checks org dedup index                                      | See [dedup-scope supplement](./upload-manager-pipeline.dedup-scope.supplement.md) |
| 7a  | Same user re-selects folder after partial upload                 | Skips files whose hash already exists for the org with valid storage                                            | Silent resume — no duplicate modal                                                                        |
| 7b  | Different org member uploads same fingerprint                    | Treats as org duplicate                                                                                         | Duplicate issue + modal (`use_existing` / `upload_anyway` / `reject`)                                     |
| 8   | Job media type is video                                          | Skips dedupe check and continues normal upload path                                                             | Video uploads are never hash-blocked                                                                    |
| 8a  | Job media type is document with GPS or parseable address         | Skips dedupe check and continues normal upload path                                                             | Applies to `DOC`, `DOCX`, `ODT`, `ODG`, `TXT`, `XLS`, `XLSX`, `ODS`, `CSV`, `PPT`, `PPTX`, `ODP`, `PDF` |
| 8a2 | Document upload persists successfully                            | Enqueues first-page thumbnail generation job (provider-backed) and stores preview path when generation succeeds | Applies to `PDF`, `DOC`, `DOCX`, `PPT`, `PPTX`, `ODT`, `ODP`                                            |
| 8a3 | Document preview generation fails or unsupported                 | Keeps upload successful and falls back to icon-based document rendering                                         | Preview generation is non-blocking for upload completion                                                |
| 8a1 | Job media type is document with low-confidence text address only | Treats job as unresolved location and routes to Issues                                                          | Low-confidence text address is not equivalent to parseable address                                      |
| 8b  | Job media type is document without GPS and without address       | Moves to issues as `document_unresolved`                                                                        | Status text: `Choose location or project`                                                               |
| 8c  | User resolves `document_unresolved` via project binding          | Continues upload as project-bound document and moves to Uploaded lane                                           | Resolution is explicit user action; project context alone does not auto-bypass issues                   |
| 8d  | User resolves `document_unresolved` via map/address              | Persists location and continues upload to Uploaded lane                                                         | Uses same `resolve_media_location` contract                                                             |
| 8e  | Issue row action menu is opened                                  | Exposes only issue-kind-specific options plus one destructive final item                                        | no cross-kind action leakage                                                                            |
| 8f  | User changes GPS/address on persisted uploaded media             | Updates location fields for existing media only                                                                 | MUST NOT create a new upload job or re-enter upload queue                                               |
| 8g  | User resolves issue item (GPS/address/project)                   | Job moves lane classification but selected lane stays unchanged                                                 | UI never auto-switches tabs/lane on single-item resolution                                              |
| 8h  | User resolves ambiguous address prompt                           | Shows `candidate_select`, `manual_location_entry`, or `cancel_location_prompt` only                             | Upload-internal `address_ambiguous` flow; no map/workspace exposure                                     |
| 9   | Duplicate hash found (colleague / other uploader)                  | Moves job to issues (`duplicate_file`) and opens duplicate-resolution modal                                     | Same-user match auto-skips (Action 7a)                                                                  |
| 10  | User clicks secondary GPS button in duplicate issue row          | Opens/focuses already placed existing media item                                                                | Uses existing media reference                                                                           |
| 11  | User resolves duplicate modal                                    | Chooses `use_existing`, `upload_anyway`, or `reject`                                                            | Optional "apply to all in batch"                                                                        |
| 11a | Duplicate issue is resolved as `upload_anyway`                   | Resumes upload path with force-upload semantics                                                                 | Only duplicate review supports force-upload                                                             |
| 11b | GPS issue remains unresolved                                     | Stays in issues lane for placement or later correction                                                          | Never exposes `upload anyway`                                                                           |
| 11c | Parser leaves residual address fragments                         | Persists `addressNotes[]` on job/media metadata                                                                 | Nothing parsed is lost                                                                                  |
| 12  | Upload targets photoless row conflict                            | Pauses in `awaiting_conflict_resolution` and emits popup event                                                  | Releases concurrency slot                                                                               |
| 13  | User resolves conflict                                           | Resumes with `attach_replace`, `attach_keep`, or `create_new`                                                   | Re-queues at front                                                                                      |
| 14  | User replaces existing photo                                     | Emits replace-specific events so map/detail/grid refresh instantly                                              | Existing media row retained                                                                             |
| 15  | User attaches photo to photoless row                             | Emits attach-specific events so no-photo surfaces update                                                        | Existing row gains media                                                                                |
| 16  | Job reaches uploaded lane with persisted media                   | Exposes follow-up item actions                                                                                  | `Assign project`, `Prioritize`, `Open in /media`, `Download`, optional `Open project`                   |

## Component Hierarchy

```
Upload Manager Pipeline
  ├── Submission Entry Points
  │   ├── submit(files) ← standard multi-file entry
  │   ├── submitFolder(dirHandle) ← folder import entry
  │   ├── replaceFile(mediaId, file) ← replace existing photo
  │   └── attachFile(mediaId, file) ← attach to photoless row
  ├── Processing Stages
  │   ├── Validation / EXIF
  │   ├── Hashing / Dedup
  │   ├── Upload / DB write
  │   └── Enrichment / Conflict resolution
  ├── Persistence Contracts
  │   ├── `dedup_hashes`
  │   ├── duplicate-resolution decision state
  │   └── `media_items` conflict lookup
  └── Output Events
      ├── batch progress / batch complete
      ├── upload skipped / upload failed
      ├── media uploaded / replaced / attached
      └── location conflict / missing data
```

## Data

Full field matrices, location-resolution algorithm, duplicate/issue contracts, and status-label mapping live in **[upload-manager-pipeline.data.md](./upload-manager-pipeline.data.md)**.

## State

Job and batch state fields: [upload-manager-pipeline.data.md § Job / Batch State Fields](./upload-manager-pipeline.data.md#job--batch-state-fields).

## File Map

| File                                                                 | Purpose                                          |
| -------------------------------------------------------------------- | ------------------------------------------------ |
| **Specs**                                                            |                                                  |
| `docs/specs/service/media-upload-service/upload-manager.md`          | Parent contract                                  |
| `docs/specs/service/media-upload-service/upload-manager-pipeline.md` | Child spec for deep operational behavior         |
| `docs/specs/service/media-upload-service/upload-manager-pipeline.data.md` | Data matrices / location algorithm (lint: supplement only) |
| `docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md` | Location routing FSM, persistence matrix, webkit fallback |
| `docs/specs/service/media-upload-service/upload-manager-pipeline.dedup-scope.supplement.md` | Content-hash dedup scope (org vs user), resume vs colleague behavior |
| `docs/specs/service/location-path-parser/location-path-parser.md`    | Address extraction from path hierarchy           |
| `docs/specs/service/folder-scan/folder-scan.md`                      | Folder scanning and per-file aggregation         |
| `docs/specs/service/filename-parser/filename-parser.md`              | Per-file metadata extraction (address, date)     |
| `docs/specs/service/media-upload-service/upload-manager.md`                   | Upload manager facade contract |
| **Services**                                                         |                                                  |
| `core/upload/upload-manager.service.ts`                              | Batch submission, queue draining, event fan-out  |
| `core/upload/pipelines/new/upload-new-pipeline.service.ts`           | New-upload path                                  |
| `core/folder-scan/folder-scan.service.ts`                            | Folder scan + folder-address-hint extraction     |
| `core/filename-parser/filename-parser.service.ts`                    | File-level metadata (address, date) extraction   |
| `core/location-path-parser/location-path-parser.service.ts`          | Address component parsing and validation         |
| `core/geocoding/geocoding.service.ts`                                | Forward geocoding for text-derived coordinates   |
| `core/upload/pipelines/replace/upload-replace-pipeline.service.ts`   | Replace path                                     |
| `core/upload/pipelines/attach/upload-attach-pipeline.service.ts`     | Attach path                                      |
| `core/upload/support/upload-queue.service.ts`                        | Concurrency and running-slot management          |
| `core/upload/support/upload-job-state.service.ts`                    | Job phase state and phase-change events          |
| `core/upload/support/upload-conflict.service.ts`                     | Conflict-candidate lookup for photoless row matching prior to resolution |
| `core/upload/support/upload-enrichment.service.ts`                   | Forward/reverse geocode enrichment orchestration and unresolvable fallback |
| `core/upload/support/upload-storage.service.ts`                      | Storage upload/delete helper used by upload pipelines |
| **Utilities & Constants**                                            |                                                  |
| `core/location-path-parser/city-registry.const.ts`                   | City whitelist lookup table                      |
| `core/location-path-parser/postal-code-patterns.const.ts`            | Country-specific postal code regexes             |
| `core/location-path-parser/street-keywords.const.ts`                 | Street type keywords (Gasse, Str., etc.)         |
| `core/location-path-parser/location-path-parser.util.ts`             | Shared validation utilities                      |
| `features/upload/upload-duplicate-resolution-modal/*`                | Duplicate decision modal with batch-apply option |
| `core/upload/support/content-hash.util.ts`                           | Content hash generation                          |

## Pipeline Service Coverage Addendum (C-01)

Partial-contract coverage for `UploadConflictService`, `UploadEnrichmentService`, and `UploadStorageService` pending dedicated mirrored service specs: [upload-manager-pipeline.data.md § Pipeline Service Coverage Addendum (C-01)](./upload-manager-pipeline.data.md#pipeline-service-coverage-addendum-c-01).

## Wiring

Injected services, input/output contract, event subscriptions, Supabase calls, and the submit → dedup/conflict → completion sequence diagram: [upload-manager-pipeline.wiring.supplement.md](./upload-manager-pipeline.wiring.supplement.md).

## Acceptance Criteria

- [x] Standard multi-file upload creates one batch and one job per file.
- [x] Folder upload uses scanning state before queueing discovered files.
- [x] Folder `Project: [projectname]` context is parsed and applied case-insensitively (create if missing, else assign existing).
- [x] Folder uploads inherit a folder-level textual address for files that do not provide their own title address.
- [x] File-level title addresses override inherited folder-level addresses.
- [ ] Ambiguous street+house matches run disambiguation ranking and auto-assign only when probability >= configured threshold.
- [x] EXIF GPS is never discarded when title/folder addresses exist.
- [ ] Text-derived coordinates and EXIF coordinates are compared with a 15m tolerance.
- [x] Mismatches beyond 15m are persisted as structured location mismatch state and surfaced to detail UI.
- [x] Hash deduplication runs for photo, document, and video (`photo_v1` / `binary_v1`).
- [x] Org-scoped dedup lookup via `check_dedup_hashes` ([dedup-scope supplement](./upload-manager-pipeline.dedup-scope.supplement.md)).
- [x] Documents without GPS and without parseable textual address enter issues as `document_unresolved` with status `Choose location or project`, even when submitted with project context.
- [x] `document_unresolved` items can be resolved either by assigning a project or by setting GPS/address, then continue to Uploaded lane.
- [ ] Resolving one item from Issues does not auto-switch the selected lane/tab.
- [x] Issue actions are gated strictly by issue kind according to the issue-kind option contract.
- [x] `missing_data` for `document_unresolved` can be resolved by `assignJobToProject` in addition to location placement.
- [x] `statusLabel` fallback text matches the status-label contract for every pipeline state transition.
- [ ] Duplicate-photo matches are surfaced as issues instead of being auto-skipped.
- [ ] Duplicate issue row exposes a secondary GPS action that opens the existing placed media.
- [ ] Duplicate-resolution modal supports `use_existing`, `upload_anyway`, and `reject` decisions.
- [ ] Duplicate-resolution modal supports "apply to all matching items in this batch".
- [ ] Choosing `use_existing` links the current project context to the existing media item when needed.
- [ ] Choosing `upload_anyway` creates a new media item even with matching hash.
- [ ] Choosing `reject` marks the item as skipped/rejected and keeps audit trace.
- [x] Parser residual fragments are preserved in `addressNotes[]` and carried into media detail evidence.
- [x] Dedup behavior is resume-safe when a folder is re-selected after interruption (same user).
- [x] Dedup lookup is scoped to `organization_id` ([dedup-scope supplement](./upload-manager-pipeline.dedup-scope.supplement.md)).
- [x] Cross-user org duplicate matches surface as `duplicate_file` issues; same-user resume auto-skips.
- [x] Replace flow emits `imageReplaced$` so media surfaces refresh immediately.
- [x] Attach flow emits `imageAttached$` so photoless surfaces upgrade immediately.
- [x] Conflict handling pauses the job and emits `locationConflict$` instead of silently choosing a row.
- [x] Jobs in `awaiting_conflict_resolution` do not permanently consume a concurrency slot.
- [x] Resolved conflicts resume the same job rather than creating a new job identity.
- [x] Dedup and conflict behavior remain part of the upload contract even if implementation details move to service specs.

