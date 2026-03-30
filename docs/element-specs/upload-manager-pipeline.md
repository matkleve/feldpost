# Upload Manager Pipeline

## What It Is

Child spec for the operational pipeline owned by `UploadManagerService`: folder submission with address-hint extraction, photo-only deduplication, replace/attach event flow, location-conflict handling, and EXIF-vs-text-address reconciliation (15m tolerance).

The pipeline coordinates three utility services (`FolderScanService`, `FilenameParserService`, `LocationPathParserService`) to establish address precedence: file > folder > country level. Details on orchestration, state, and conflict handling are preserved in Actions and acceptance criteria.

## What It Looks Like

This is mostly invisible infrastructure. Users experience it through stable phase labels, batch progress, skipped-duplicate states, replace/attach refresh behavior, and explicit conflict-resolution pauses instead of silent failures.

## Where It Lives

- **Parent spec**: `docs/element-specs/upload-manager.md`
- **Child/related specs**: `docs/element-specs/folder-scan.md`, `docs/element-specs/filename-parser.md`, `docs/element-specs/location-path-parser.md`
- **Primary implementation**: `core/upload/upload-manager.service.ts` plus pipeline services in `core/upload/` and shared utility services in `core/`
- **Consumed by**: upload panel, image detail replace/attach flows, map shell, thumbnail views, folder import entry points

## Actions

| #   | Trigger                                                          | System Response                                                                                        | Notes                                                                                                     |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 1   | User selects many files                                          | Creates one batch and one job per file                                                                 | Standard multi-file flow                                                                                  |
| 2   | User selects a folder                                            | Scans recursively, creates scanning batch, then queues jobs                                            | Chromium/File System Access only                                                                          |
| 2a  | Folder name contains `Project: [projectname]`                    | Resolves project by case-insensitive name; creates project if missing, assigns jobs to project context | Project context extraction is deterministic and case-insensitive                                          |
| 3   | Folder name contains parseable address                           | Stores batch-level folder address hint and applies it to jobs without own address                      | Default only, never forced override                                                                       |
| 4   | Individual file name contains parseable address                  | File-level address overrides inherited folder hint                                                     | Most-specific textual source wins                                                                         |
| 4a  | Parsed file/folder address is low-confidence                     | Keeps parsed fragment as note only; does not qualify as resolved address                               | Prevents nonsense title strings from bypassing issues routing                                             |
| 4b  | Street+house resolves to multiple cities                         | Runs disambiguation algorithm and computes ranked candidate probabilities                              | Auto-assign only above threshold                                                                          |
| 5   | EXIF GPS and text-derived address both available                 | Geocodes text address and compares distance to EXIF GPS using 15m tolerance                            | Keeps both coordinate sources                                                                             |
| 6   | Distance between text-derived and EXIF coordinates > 15m         | Marks location source mismatch for detail UI and audit fields                                          | Upload still continues                                                                                    |
| 7   | Job media type is photo/image                                    | Computes content hash and checks server for duplicate content                                          | Hash dedupe does not run for videos or documents                                                          |
| 8   | Job media type is video                                          | Skips dedupe check and continues normal upload path                                                    | Video uploads are never hash-blocked                                                                      |
| 8a  | Job media type is document with GPS or parseable address         | Skips dedupe check and continues normal upload path                                                    | Applies to `DOC`, `DOCX`, `ODT`, `ODG`, `TXT`, `XLS`, `XLSX`, `ODS`, `CSV`, `PPT`, `PPTX`, `ODP`, `PDF`   |
| 8a1 | Job media type is document with low-confidence text address only | Treats job as unresolved location and routes to Issues                                                 | Low-confidence text address is not equivalent to parseable address                                        |
| 8b  | Job media type is document without GPS and without address       | Moves to issues as `document_unresolved`                                                               | Status text: `Choose location or project`                                                                 |
| 8c  | User resolves `document_unresolved` via project binding          | Continues upload as project-bound document and moves to Uploaded lane                                  | Resolution is explicit user action; project context alone does not auto-bypass issues                     |
| 8d  | User resolves `document_unresolved` via map/address              | Persists location and continues upload to Uploaded lane                                                | Uses same `resolve_media_location` contract                                                               |
| 8e  | Issue row action menu is opened                                  | Exposes only issue-kind-specific options plus one destructive final item                               | no cross-kind action leakage                                                                              |
| 8f  | User changes GPS/address on persisted uploaded media             | Updates location fields for existing media only                                                        | MUST NOT create a new upload job or re-enter upload queue                                                 |
| 8g  | User resolves issue item (GPS/address/project)                   | Job moves lane classification but selected lane stays unchanged                                        | UI never auto-switches tabs/lane on single-item resolution                                                |
| 9   | Duplicate hash found (photo/image)                               | Moves job to issues lane and opens duplicate-resolution modal                                          | Not auto-skipped                                                                                          |
| 10  | User clicks secondary GPS button in duplicate issue row          | Opens/focuses already placed existing media item                                                       | Uses existing media reference                                                                             |
| 11  | User resolves duplicate modal                                    | Chooses `use_existing`, `upload_anyway`, or `reject`                                                   | Optional "apply to all in batch"                                                                          |
| 11a | Duplicate issue is resolved as `upload_anyway`                   | Resumes upload path with force-upload semantics                                                        | Only duplicate review supports force-upload                                                               |
| 11b | GPS issue remains unresolved                                     | Stays in issues lane for placement or later correction                                                 | Never exposes `upload anyway`                                                                             |
| 11c | Parser leaves residual address fragments                         | Persists `addressNotes[]` on job/media metadata                                                        | Nothing parsed is lost                                                                                    |
| 12  | Upload targets photoless row conflict                            | Pauses in `awaiting_conflict_resolution` and emits popup event                                         | Releases concurrency slot                                                                                 |
| 13  | User resolves conflict                                           | Resumes with `attach_replace`, `attach_keep`, or `create_new`                                          | Re-queues at front                                                                                        |
| 14  | User replaces existing photo                                     | Emits replace-specific events so map/detail/grid refresh instantly                                     | Existing image row retained                                                                               |
| 15  | User attaches photo to photoless row                             | Emits attach-specific events so no-photo surfaces update                                               | Existing row gains media                                                                                  |
| 16  | Job reaches uploaded lane with persisted media                   | Exposes follow-up item actions                                                                         | `Zu Projekt hinzufügen`, `Priorisieren`, `In /media anzeigen`, `Herunterladen`, optional `Projekt öffnen` |

## Component Hierarchy

```
Upload Manager Pipeline
  ├── Submission Entry Points
  │   ├── submit(files) ← standard multi-file entry
  │   ├── submitFolder(dirHandle) ← folder import entry
  │   ├── replaceFile(imageId, file) ← replace existing photo
  │   └── attachFile(imageId, file) ← attach to photoless row
  ├── Processing Stages
  │   ├── Validation / EXIF
  │   ├── Hashing / Dedup
  │   ├── Upload / DB write
  │   └── Enrichment / Conflict resolution
  ├── Persistence Contracts
  │   ├── `dedup_hashes`
  │   ├── duplicate-resolution decision state
  │   └── `images` conflict lookup
  └── Output Events
      ├── batch progress / batch complete
      ├── upload skipped / upload failed
      ├── image uploaded / replaced / attached
      └── location conflict / missing data
```

## Data

### Data Flow (Mermaid)

```mermaid
flowchart TD
  A[Submission via UploadPanel or ImageDetail] --> B[UploadManagerService]
  B --> C[UploadQueueService slot assignment max 3]
  C --> D[Resolve textual location context]
  D --> E{File title address?}
  E -->|Yes| F[Use file-level title address]
  E -->|No| G{Folder-level address hint?}
  G -->|Yes| H[Inherit folder address]
  G -->|No| I[No textual address]
  H --> H1[Run address disambiguation when city ambiguous]
  F --> J[Upload*PipelineService run by job.mode]
  H1 --> J
  I --> J
  J --> K[Validation and parsing_exif]
  K --> L{EXIF plus text-derived coords both present?}
  L -->|Yes| M[Distance compare with 15m tolerance]
  M --> N[Persist mismatch status plus both sources]
  L -->|No| N
  N --> O{Media type photo/image?}
  O -->|Yes| P[hashing and dedup_check]
  O -->|video| U[uploading then saving_record]
  O -->|document| O2{Has GPS or high-confidence parseable address?}
  O2 -->|Yes| U
  O2 -->|No| ZA[missing_data + issueKind=document_unresolved]
  P --> Q{Dedup match?}
  Q -->|Yes| R[set duplicate_issue and emit duplicateDetected$]
  R --> S[Open duplicate-resolution modal]
  S --> T{Decision}
  T -->|use_existing| U1[emit duplicateResolved use_existing]
  T -->|upload_anyway| U2[continue as new upload]
  T -->|reject| U3[set skipped_rejected and emit uploadSkipped$]
  U2 --> U
  Q -->|No| V{Conflict candidate?}
  V -->|Yes| W[set awaiting_conflict_resolution plus emit locationConflict$]
  W --> X[User conflictResolution]
  X --> J
  V -->|No| U
  U --> V2{Needs enrichment?}
  V2 -->|coords| Y[resolving_address]
  V2 -->|title/folder address| Z[resolving_coordinates]
  V2 -->|manual placement required| ZA2[missing_data + issueKind=missing_gps]
  ZA2 --> ZB[placeJob sets queued]
  ZA --> ZB
  ZA --> ZC[assignJobToProject sets queued]
  ZB --> J
  ZC --> J
  Y --> AA[complete]
  Z --> AA
  U --> AA
  AA --> AB[Emit image and batch events]
```

| Field / Artifact       | Source                                | Type                                                                                                         | Notes                                                                                                                                             |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Folder batch status    | `UploadBatchService`                  | `UploadBatch`                                                                                                | Starts as `scanning`, then transitions to `uploading`                                                                                             |
| Folder address hint    | Folder name parser                    | `string \| null`                                                                                             | Batch default address for jobs without file-level hint                                                                                            |
| File title address     | Filename parser                       | `string \| null`                                                                                             | Overrides folder address hint                                                                                                                     |
| Title geocode          | `GeocodingService.forward()`          | `ExifCoords \| null`                                                                                         | Used for source reconciliation                                                                                                                    |
| EXIF/title distance    | Haversine compare                     | `number \| null`                                                                                             | Mismatch if `distanceMeters > 15`                                                                                                                 |
| Location sources       | Upload persistence (`images/media`)   | structured fields                                                                                            | Keeps EXIF and text-derived coordinates separately                                                                                                |
| Address disambiguation | `LocationPathParserService` ranking   | `{ algorithm, probability, candidates }`                                                                     | Used for ambiguous city assignment                                                                                                                |
| Address notes          | Parser residual fragments             | `string[]`                                                                                                   | Preserved on job + media metadata                                                                                                                 |
| Content hash           | `core/content-hash.util.ts`           | `string`                                                                                                     | SHA-256 from file head + EXIF-derived metadata                                                                                                    |
| Dedup lookup result    | `check_dedup_hashes` RPC              | `{ content_hash, image_id }[]`                                                                               | Used for single and batch duplicate checks                                                                                                        |
| Dedupe scope           | Media type gate                       | `'image'`                                                                                                    | Videos and documents (`DOC`, `DOCX`, `ODT`, `ODG`, `TXT`, `XLS`, `XLSX`, `ODS`, `CSV`, `PPT`, `PPTX`, `ODP`, `PDF`) are excluded from hash dedupe |
| Duplicate decision     | Duplicate-resolution modal            | `'use_existing' \| 'upload_anyway' \| 'reject'`                                                              | Can be batch-applied                                                                                                                              |
| Duplicate apply mode   | Modal checkbox                        | `boolean`                                                                                                    | Apply chosen decision to all matching jobs in batch                                                                                               |
| Issue kind             | Upload lane presenter                 | `'duplicate_photo' \| 'missing_gps' \| 'document_unresolved' \| 'conflict_review' \| 'upload_error' \| null` | Drives lane placement and row actions                                                                                                             |
| Uploaded actions       | Upload row presenter                  | `UploadItemAction[]`                                                                                         | Available only after saved media exists                                                                                                           |
| Conflict candidate     | `images` table lookup                 | `ConflictCandidate`                                                                                          | Photoless row near upload coords/address                                                                                                          |
| Replace event          | `UploadManagerService.imageReplaced$` | `ImageReplacedEvent`                                                                                         | Drives map/detail/card refresh                                                                                                                    |
| Attach event           | `UploadManagerService.imageAttached$` | `ImageAttachedEvent`                                                                                         | Upgrades photoless surfaces to media surfaces                                                                                                     |

### Issue Kind Option Contract

| Issue kind                         | Allowed non-destructive actions                             | Required destructive action |
| ---------------------------------- | ----------------------------------------------------------- | --------------------------- |
| `duplicate_photo`                  | `open_existing_media`, `upload_anyway`                      | `dismiss`                   |
| `missing_gps`                      | `place_on_map`, `retry`                                     | `dismiss`                   |
| `document_unresolved`              | `place_on_map`, `change_location_address`, `add_to_project` | `dismiss`                   |
| `conflict_review` / `upload_error` | `retry`                                                     | `dismiss`                   |

### Filename Address Confidence Contract

| Input                                          | Confidence result  | Pipeline behavior                                                       |
| ---------------------------------------------- | ------------------ | ----------------------------------------------------------------------- |
| Filename/folder address parse                  | `high`             | Treated as parseable title/folder address and can continue normal route |
| Filename/folder address parse                  | `low` / `nonsense` | Stored in `addressNotes[]` only; does not satisfy location requirement  |
| Document with only low-confidence text address | unresolved         | Routed to `missing_data` with `issueKind=document_unresolved`           |

### Persisted Media Location Edit Contract

| Trigger                                           | Required behavior                                                | Forbidden behavior                                    |
| ------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| User chooses `Add/Change GPS` on uploaded row     | Update persisted media coordinates/address fields                | Creating a new upload job                             |
| User chooses `Add/Change address` on uploaded row | Resolve and persist updated address/coords on same media record  | Requeueing file into upload phases                    |
| Address/GPS correction completes                  | Keep row identity in uploaded lane and refresh map/card position | Re-running `uploading -> saving_record` for same file |

### Status Label Contract

| Pipeline state                         | Required statusLabel fallback |
| -------------------------------------- | ----------------------------- |
| `queued`                               | `Queued`                      |
| `validating`                           | `Validating…`                 |
| `parsing_exif`                         | `Reading EXIF…`               |
| `extracting_title`                     | `Checking filename…`          |
| `hashing`                              | `Computing hash…`             |
| `dedup_check`                          | `Checking duplicates…`        |
| `awaiting_conflict_resolution`         | `Waiting for decision…`       |
| `uploading`                            | `Uploading…`                  |
| `saving_record`                        | `Saving…`                     |
| `resolving_address`                    | `Resolving address…`          |
| `resolving_coordinates`                | `Resolving location…`         |
| `missing_data` + `missing_gps`         | `Choose location`             |
| `missing_data` + `document_unresolved` | `Choose location or project`  |
| `skipped` + `duplicate_photo`          | `Already uploaded`            |
| `error`                                | `Upload failed`               |
| `complete`                             | `Uploaded`                    |

## State

| Name                         | Type                                                                                                              | Default       | Controls                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| `batch.status`               | `'scanning' \| 'uploading' \| 'complete' \| 'cancelled'`                                                          | `'uploading'` | Batch lifecycle during folder submissions                                    |
| `batch.folderAddressHint`    | `string \| null`                                                                                                  | `null`        | Default textual address for folder jobs                                      |
| `job.titleAddressSource`     | `'file' \| 'folder' \| null`                                                                                      | `null`        | Provenance of the active textual address                                     |
| `job.titleAddressCoords`     | `ExifCoords \| undefined`                                                                                         | `undefined`   | Geocoded coordinates from textual address                                    |
| `job.addressDisambiguation`  | `{ algorithm:string; probability:number; candidates:{city:string; probability:number}[] } \| undefined`           | `undefined`   | Ambiguous city ranking result                                                |
| `job.addressNotes`           | `string[]`                                                                                                        | `[]`          | Unmapped parsed fragments preserved                                          |
| `job.locationMismatch`       | `{ distanceMeters:number } \| undefined`                                                                          | `undefined`   | EXIF vs text-derived mismatch payload                                        |
| `job.contentHash`            | `string \| undefined`                                                                                             | `undefined`   | Dedup identity for resume-safe uploads                                       |
| `job.duplicateState`         | `'none' \| 'duplicate_issue' \| 'resolved'`                                                                       | `'none'`      | Duplicate detection + modal lifecycle                                        |
| `job.duplicateDecision`      | `'use_existing' \| 'upload_anyway' \| 'reject' \| undefined`                                                      | `undefined`   | Final duplicate decision per job                                             |
| `job.duplicateTargetImageId` | `string \| undefined`                                                                                             | `undefined`   | Existing image selected via duplicate flow                                   |
| `job.existingImageId`        | `string \| undefined`                                                                                             | `undefined`   | Existing image match selected via `use_existing` decision                    |
| `job.issueKind`              | `'duplicate_photo' \| 'missing_gps' \| 'document_unresolved' \| 'conflict_review' \| 'upload_error' \| undefined` | `undefined`   | UI-level issue semantics separate duplicate, GPS, and document-location gaps |
| `job.availableActions`       | `UploadItemAction[]`                                                                                              | `[]`          | Uploaded and issue row actions derived after state settle                    |
| `job.conflictCandidate`      | `ConflictCandidate \| undefined`                                                                                  | `undefined`   | Existing photoless row candidate                                             |
| `job.conflictResolution`     | `ConflictResolution \| undefined`                                                                                 | `undefined`   | User choice after conflict popup                                             |
| `job.mode`                   | `'new' \| 'replace' \| 'attach'`                                                                                  | `'new'`       | Routes pipeline and output events                                            |

## File Map

| File                                                      | Purpose                                          |
| --------------------------------------------------------- | ------------------------------------------------ |
| **Specs**                                                 |                                                  |
| `docs/element-specs/upload-manager.md`                    | Parent contract                                  |
| `docs/element-specs/upload-manager-pipeline.md`           | Child spec for deep operational behavior         |
| `docs/element-specs/location-path-parser.md`              | Address extraction from path hierarchy           |
| `docs/element-specs/folder-scan.md`                       | Folder scanning and per-file aggregation         |
| `docs/element-specs/filename-parser.md`                   | Per-file metadata extraction (address, date)     |
| `docs/implementation-blueprints/upload-manager.md`        | Blueprint for implementation-level rollout notes |
| **Services**                                              |                                                  |
| `core/upload/upload-manager.service.ts`                   | Batch submission, queue draining, event fan-out  |
| `core/upload/upload-new-pipeline.service.ts`              | New-upload path                                  |
| `core/upload/folder-scan.service.ts`                      | Folder scan + folder-address-hint extraction     |
| `core/filename-parser.service.ts`                         | File-level metadata (address, date) extraction   |
| `core/location-path-parser.service.ts`                    | Address component parsing and validation         |
| `core/geocoding.service.ts`                               | Forward geocoding for text-derived coordinates   |
| `core/upload/upload-replace-pipeline.service.ts`          | Replace path                                     |
| `core/upload/upload-attach-pipeline.service.ts`           | Attach path                                      |
| `core/upload/upload-queue.service.ts`                     | Concurrency and running-slot management          |
| `core/upload/upload-job-state.service.ts`                 | Job phase state and phase-change events          |
| **Utilities & Constants**                                 |                                                  |
| `core/location-path-parser/city-registry.const.ts`        | City whitelist lookup table                      |
| `core/location-path-parser/postal-code-patterns.const.ts` | Country-specific postal code regexes             |
| `core/location-path-parser/street-keywords.const.ts`      | Street type keywords (Gasse, Str., etc.)         |
| `core/filename-parser/date-patterns.const.ts`             | ISO, timestamp, German date format regexes       |
| `core/filename-parser/metadata-keywords.const.ts`         | DRAFT, THUMB, TEMP metadata keyword set          |
| `core/location-path-parser.util.ts`                       | Shared validation utilities                      |
| `core/filename-parser.util.ts`                            | Filename normalization utilities                 |
| `features/upload/upload-duplicate-resolution-modal/*`     | Duplicate decision modal with batch-apply option |
| `core/content-hash.util.ts`                               | Content hash generation                          |

## Wiring

### Injected Services

- `UploadJobStateService` — owns job state, phase transitions, and failure events
- `UploadBatchService` — owns batch progress and completion state
- `UploadQueueService` — enforces concurrency and running-slot tracking
- `FolderScanService` — recursively scans directories; uses `FilenameParserService` + `LocationPathParserService` per file
- `FilenameParserService` — extracts address and date from all filenames (standalone or via FolderScanService)
- `LocationPathParserService` — parses and validates address components from path hierarchies
- `UploadNewPipelineService` — executes normal upload path
- `UploadReplacePipelineService` — executes replace path
- `UploadAttachPipelineService` — executes attach path
- `GeocodingService` — forward-geocodes text-derived addresses to coordinates
- `SupabaseService` — used for RPC/storage cleanup through service abstraction

### Inputs / Outputs

- **Inputs**: `File[]`, `FileSystemDirectoryHandle`, `imageId`, conflict-resolution choice
- **Outputs**: `batchId`, `jobId`, and event streams on `UploadManagerService`

### Subscriptions

- Manager-owned consumers subscribe to `imageUploaded$`, `imageReplaced$`, `imageAttached$`, `uploadSkipped$`, `locationConflict$`, `jobPhaseChanged$`, `batchProgress$`, and `batchComplete$`.
- Folder scan progress updates batch totals during `submitFolder()`.

### Supabase Calls

- `rpc('check_dedup_hashes', { hashes })` — duplicate detection
- Storage remove on cancellation/cleanup via `SupabaseService`
- Conflict lookup and save/update behavior are delegated through upload pipeline services

### Wiring Flow (Mermaid)

```mermaid
sequenceDiagram
  actor User
  participant UI as UploadPanel or ImageDetail
  participant Manager as UploadManagerService
  participant FSS as FolderScanService
  participant FPS as FilenameParserService
  participant LPP as LocationPathParserService
  participant Queue as UploadQueueService
  participant Pipeline as Upload*PipelineService
  participant GCS as GeocodingService
  participant DB as Supabase

  User->>UI: select files or folder
  alt Folder import
    UI->>Manager: submitFolder(dirHandle)
    Manager->>FSS: scanFolder(dirHandle)
    FSS->>LPP: extractFolderAddressHint(folderName)
    LPP-->>FSS: AddressExtractionResult
    loop For each discovered file
      FSS->>FPS: parseFilename(name, path)
      FPS->>LPP: parseFilename(hint)
      LPP-->>FPS: AddressExtractionResult with validation
      FPS-->>FSS: FilenameParseResult
    end
    FSS-->>Manager: UploadJob[] with merged address hints
  else Standard multi-file upload
    UI->>Manager: submit(files)
  end

  Manager->>Queue: reserve slot
  Queue-->>Manager: slot granted
  Manager->>Pipeline: run(jobId)
  Pipeline->>GCS: forward(textAddressContext)
  GCS-->>Pipeline: ExifCoords
  Pipeline->>DB: dedup check / conflict lookup / save
  DB-->>Pipeline: match or save result

  alt Duplicate hash detected
    Pipeline-->>Manager: duplicateDetected$ + modal event
    UI->>Manager: resolveConflict(decision, applyToBatch?)
    Manager->>Pipeline: resume with decision
  else Conflict candidate found
    Pipeline-->>Manager: awaiting_conflict_resolution + locationConflict$
    UI->>Manager: resolveConflict(...)
    Manager->>Pipeline: resume queued job
  else Success
    Pipeline-->>Manager: phase and domain events
  end
```

## Acceptance Criteria

- [x] Standard multi-file upload creates one batch and one job per file.
- [x] Folder upload uses scanning state before queueing discovered files.
- [ ] Folder `Project: [projectname]` context is parsed and applied case-insensitively (create if missing, else assign existing).
- [ ] Folder uploads inherit a folder-level textual address for files that do not provide their own title address.
- [ ] File-level title addresses override inherited folder-level addresses.
- [ ] Ambiguous street+house matches run disambiguation ranking and auto-assign only when probability >= configured threshold.
- [ ] EXIF GPS is never discarded when title/folder addresses exist.
- [ ] Text-derived coordinates and EXIF coordinates are compared with a 15m tolerance.
- [ ] Mismatches beyond 15m are persisted as structured location mismatch state and surfaced to detail UI.
- [x] Hash deduplication runs only for photo/image media types.
- [x] Videos bypass hash dedupe and stay on normal upload path.
- [x] Documents with GPS or parseable textual address bypass hash dedupe and stay on normal upload path.
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
- [ ] Parser residual fragments are preserved in `addressNotes[]` and carried into media detail evidence.
- [x] Dedup behavior is resume-safe when a folder is re-selected after interruption.
- [x] Replace flow emits `imageReplaced$` so image surfaces refresh immediately.
- [x] Attach flow emits `imageAttached$` so photoless surfaces upgrade immediately.
- [x] Conflict handling pauses the job and emits `locationConflict$` instead of silently choosing a row.
- [x] Jobs in `awaiting_conflict_resolution` do not permanently consume a concurrency slot.
- [x] Resolved conflicts resume the same job rather than creating a new job identity.
- [x] Dedup and conflict behavior remain part of the upload contract even if implementation details move to blueprint/services.
