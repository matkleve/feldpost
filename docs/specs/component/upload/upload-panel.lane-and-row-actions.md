# Upload Panel — Lane and row actions

> **Parent:** [upload-panel.md](upload-panel.md)

## What It Is

Normative contracts for Upload Panel **lane rows**: per-lane actions, status text, media item menus, dropdown visibility, action registry, wiring sequence, and destructive 3-dot menu rules. Split from `upload-panel.md` for spec size; implementation must satisfy this document together with the parent.

## What It Looks Like

Row surfaces use white/surface backgrounds with status tints; 3-dot menus follow primary/secondary/destructive section order with exactly one destructive group last. Full panel chrome is described in the parent **What It Looks Like**.

## Where It Lives

- **Specs:** `docs/specs/component/upload/upload-panel.lane-and-row-actions.md`
- **Code:** `features/upload/` (`UploadPanelComponent`, `UploadPanelItemComponent`)

## Actions

| # | Trigger | System response |
| --- | --- | --- |
| 1 | User opens row menu | Menu options filtered per lane/issue per tables below |
| 2 | User picks destructive action | Operation matches row state (`cancelJob` / unbind+delete / `dismissJob`) |

## Component Hierarchy

Row host: `UploadPanelItemComponent` inside `UploadPanelComponent` lane list (see parent **Component Hierarchy** for full tree).

## Data

Lane and menu contracts apply to `UploadJob` rows bucketed by `UploadLane` and issue kind; see parent **Data** for full field sources.

```mermaid
flowchart LR
  J[UploadJob] --> L{Lane + issue kind}
  L --> M[Menu contract row]
  M --> R[Registry-filtered actions]
```

## Lane Item Features

| Lane                                       | Availability                                                 | Item Actions                                                                                                                                                                        | Notes                                                                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `uploading`                                | queued, parsing, validating, uploading, saving, enrichment   | `View file details`, `Cancel upload`                                                                                                                                                | Queue lane is user-facing label; internal lane id remains `uploading`                                                                                                          |
| `uploaded`                                 | persisted uploads and attachments with successful completion | `Change location > Add/Change GPS`, `Change location > Add/Change address`, `Open in /media`, `Assign project`, optional `Open project`, optional `Prioritize`, optional `Download` | `Assign project` opens shared project-selector primitive with multi-select and deselect support; `Open project` opens direct on single binding or submenu on multiple bindings |
| `issues: duplicate_photo`                  | dedupe review                                                | `Open existing media`, `Upload anyway`, `Dismiss`                                                                                                                                   | `Upload anyway` only for duplicate-photo rows                                                                                                                                  |
| `issues: missing_gps`                      | GPS/manual placement needed                                  | `Add GPS`, `Add/Change address`, `Retry`, `Dismiss`                                                                                                                                 | `Retry` re-queues only when retry preconditions are met                                                                                                                        |
| `issues: document_unresolved`              | document without GPS/address                                 | `Add GPS`, `Add/Change address`, `Assign project`, `Dismiss`                                                                                                                        | `Assign project` resolves geospatially missing documents as project-bound artifacts                                                                                            |
| `issues: address_ambiguous`                | ambiguous address prompt                                     | `Select suggested candidate`, `Enter location manually`, `Cancel`                                                                                                                   | Upload-internal prompt only; no map/workspace exposure                                                                                                                         |
| `issues: conflict_review` / `upload_error` | conflict or hard error                                       | `Retry`, `Dismiss`                                                                                                                                                                  | No force-upload actions in these issue kinds                                                                                                                                   |

Row state rendering requirements:

- Each lane item uses a white/surface background (`var(--color-bg-surface)`), with status tints for error/warning states.
- During active upload and retry transitions, the thumbnail area shows an overlaid spinning loading indicator.
- Rows with preview-capable media always render deterministic thumbnail previews; hover MUST NOT collapse to empty placeholders.
- Row status text must update live as phase/statusLabel changes (including retry re-queue and upload progression).
- `document_unresolved` issue rows show status text `Choose location or project` (or localized equivalent) until resolved.

### Status Text Contract

| Phase / Issue Kind                            | Required status text (English fallback)      | Lane        | Notes                                      |
| --------------------------------------------- | -------------------------------------------- | ----------- | ------------------------------------------ |
| `queued`                                      | `Queued`                                     | `uploading` | Initial queued and post-resolution requeue |
| `validating`                                  | `Validating…`                                | `uploading` | File checks                                |
| `parsing_exif` / `extracting_title`           | `Reading metadata…` / `Checking filename…`   | `uploading` | Metadata context build                     |
| `hashing` / `dedup_check`                     | `Computing hash…` / `Checking duplicates…`   | `uploading` | Photo-only dedupe path                     |
| `uploading` / `saving_record`                 | `Uploading…` / `Saving…`                     | `uploading` | Persist path                               |
| `resolving_address` / `resolving_coordinates` | `Resolving address…` / `Resolving location…` | `uploading` | Enrichment path                            |
| `awaiting_conflict_resolution`                | `Waiting for decision…`                      | `issues`    | Conflict review hold                       |
| `missing_data` + `missing_gps`                | `Choose location`                            | `issues`    | Requires GPS/address placement             |
| `missing_data` + `document_unresolved`        | `Choose location or project`                 | `issues`    | Resolvable by location or project binding  |
| `skipped` + `duplicate_photo`                 | `Already uploaded`                           | `issues`    | Duplicate review entry                     |
| `error`                                       | `Upload failed`                              | `issues`    | Retry path allowed when supported          |
| `complete`                                    | `Uploaded`                                   | `uploaded`  | Terminal success                           |

### Media Item Menu Contract

| Lane / Issue Kind                            | Non-destructive actions                                                                                                                                                                               | Destructive section (last group)                                                                                                      | Destructive styling       |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `uploading`                                  | `View file details`                                                                                                                                                                                   | `Cancel upload`                                                                                                                       | danger text + danger icon |
| `uploaded` (with or without project binding) | `Change location > Add/Change GPS`, `Change location > Add/Change address`, `Open in /media`, `Assign project` (shared selector), optional `Open project`, optional `Prioritize`, optional `Download` | If project-bound: `Remove from project` (single) OR `Remove from projects` (multi). Always include `Delete media` for uploaded media. | danger text + danger icon |
| `issues: duplicate_photo`                    | `Open existing media`, `Upload anyway`                                                                                                                                                                | `Dismiss`                                                                                                                             | danger text + danger icon |
| `issues: missing_gps`                        | `Add GPS`, `Add/Change address`, `Retry`                                                                                                                                                              | `Dismiss`                                                                                                                             | danger text + danger icon |
| `issues: document_unresolved`                | `Add GPS`, `Add/Change address`, `Assign project`                                                                                                                                                     | `Dismiss`                                                                                                                             | danger text + danger icon |
| `issues: address_ambiguous`                  | `Select suggested candidate`, `Enter location manually`                                                                                                                                               | `Cancel`                                                                                                                              | danger text + danger icon |
| `issues: conflict_review` or `upload_error`  | `Retry`                                                                                                                                                                                               | `Dismiss`                                                                                                                             | danger text + danger icon |

The `primary` / `secondary` / `destructive` section order in this contract is the canonical basis for shared action menus on map and workspace surfaces. Keep that ordering stable when a registry is reused outside the upload panel.

### Dropdown Visibility Rationale

| Condition                                        | Why this option appears                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| Lane = `uploading`                               | Item is still transient; only detail/cancel actions are valid                 |
| Lane = `uploaded` and media persisted            | Location/project/download actions require saved media identity                |
| Uploaded row with one bound project              | `Open project` navigates directly to that project                             |
| Uploaded row with multiple bound projects        | `Open project` opens subdropdown to choose target project                     |
| Uploaded row with one or more project bindings   | Destructive section includes project-unbind action (`Remove from project(s)`) |
| Uploaded row with persisted media                | Destructive section includes `Delete media`                                   |
| Issue kind = `duplicate_photo`                   | Duplicate needs resolution choices (`open existing`, `upload anyway`)         |
| Issue kind = `missing_gps`                       | Missing location needs placement/correction actions                           |
| Issue kind = `document_unresolved`               | Document lacks resolvable location; allow GPS, address, or project resolution |
| Issue kind = `conflict_review` or `upload_error` | Safe recovery path is retry/dismiss only                                      |
| Destructive section always last                  | Keeps action hierarchy predictable and prevents accidental destructive clicks |

### Action Label Contract

| Action family  | Label when value missing | Label when value already exists                                            |
| -------------- | ------------------------ | -------------------------------------------------------------------------- |
| GPS action     | `Add GPS`                | `Change GPS`                                                               |
| Address action | `Add address`            | `Change address`                                                           |
| Project action | `Assign project`         | `Assign project` (opens shared selector with current bindings preselected) |
| Open project   | Hidden                   | `Open project` (direct for one binding, subdropdown for multiple bindings) |

### Row Action Registry Shape (Contract)

All row actions MUST be declared in a registry and filtered by lane/state/capabilities. The UI may not hardcode action visibility in scattered conditional blocks.

| id                        | label contract                                 | section       | lane gate                                    | state/issue gate                                 | capability gates                     | run contract                             |
| ------------------------- | ---------------------------------------------- | ------------- | -------------------------------------------- | ------------------------------------------------ | ------------------------------------ | ---------------------------------------- |
| `view_file_details`       | `View file details`                            | `primary`     | `uploading`                                  | all non-terminal upload phases                   | none                                 | info/details drawer                      |
| `cancel_upload`           | `Cancel upload`                                | `destructive` | `uploading`                                  | active or queued                                 | none                                 | cancel pipeline job                      |
| `change_location_map`     | `Add GPS` / `Change GPS`                       | `edit`        | `uploaded`                                   | persisted                                        | `mediaId`                            | map-pick and persist location            |
| `change_location_address` | `Add address` / `Change address`               | `edit`        | `uploaded`                                   | persisted                                        | `mediaId`                            | open address finder and persist          |
| `open_in_media`           | `Open in /media`                               | `primary`     | `uploaded`                                   | persisted                                        | `mediaId`                            | navigate to media focus                  |
| `assign_to_project`       | `Assign project`                               | `primary`     | `uploaded`, `issues` (`document_unresolved`) | for uploaded and unresolved-document resolution  | shared project selector available    | open shared project selector primitive   |
| `open_project`            | `Open project`                                 | `primary`     | `uploaded`                                   | persisted                                        | one or more bound projects           | direct navigation or project subdropdown |
| `toggle_priority`         | `Prioritize`                                   | `primary`     | `uploaded`                                   | persisted                                        | priority workflow capability enabled | toggle priority state                    |
| `download`                | `Download`                                     | `primary`     | `uploaded`                                   | persisted                                        | `mediaId` and `storagePath`          | force attachment download                |
| `remove_from_project`     | `Remove from project` / `Remove from projects` | `destructive` | `uploaded`                                   | persisted                                        | one or more bound projects           | open remove-membership flow              |
| `delete_media`            | `Delete media`                                 | `destructive` | `uploaded`                                   | persisted                                        | `mediaId`                            | delete persisted media                   |
| `open_existing_media`     | `Open existing media`                          | `primary`     | `issues`                                     | `duplicate_photo`                                | `existingMediaId`                    | navigate to existing media               |
| `upload_anyway`           | `Upload anyway`                                | `primary`     | `issues`                                     | `duplicate_photo`                                | none                                 | force duplicate upload flow              |
| `add_gps_issue`           | `Add GPS`                                      | `edit`        | `issues`                                     | `missing_gps`, `document_unresolved`             | map-pick capability                  | placement workflow                       |
| `change_address_issue`    | `Add address` / `Change address`               | `edit`        | `issues`                                     | `missing_gps`, `document_unresolved`             | none                                 | address finder workflow                  |
| `candidate_select`        | `Select suggested candidate`                   | `primary`     | `issues`                                     | `address_ambiguous`                              | none                                 | apply chosen address candidate           |
| `manual_location_entry`   | `Enter location manually`                      | `secondary`   | `issues`                                     | `address_ambiguous`                              | address editor available             | open manual location entry               |
| `cancel_location_prompt`  | `Cancel`                                       | `destructive` | `issues`                                     | `address_ambiguous`                              | none                                 | close ambiguous-address prompt           |
| `retry`                   | `Retry`                                        | `primary`     | `issues`                                     | `missing_gps`, `conflict_review`, `upload_error` | retry preconditions met              | retry job                                |
| `dismiss`                 | `Dismiss`                                      | `destructive` | `issues`                                     | all issue kinds                                  | none                                 | dismiss row                              |

### Media Item Action Wiring (Mermaid)

```mermaid
sequenceDiagram
  actor User
  participant Item as UploadPanelItemComponent
  participant Panel as UploadPanelComponent
  participant Manager as UploadManagerService
  participant Map as MapShellComponent

  User->>Item: Open 3-dot menu and click action
  Item->>Panel: menuActionSelected(job, action)

  alt action = Retry
    Panel->>Manager: retryJob(job.id)
    Manager-->>Panel: phase=queued/uploading + statusLabel updates
    Panel-->>Item: row state updates (spinner visible)
  else action = Place on map
    Panel->>Map: locationMapPickRequested(mediaId)
    User->>Map: Click map location
    Map-->>Panel: imageUploaded(id, lat, lng)
    Panel-->>Item: statusLabel + lane updates
  else action = Dismiss
    Panel->>Manager: dismissJob(job.id)
    Manager-->>Panel: job removed from lane list
  end
```

## Destructive Menu Convention

The row 3-dot menu always ends with one destructive section (divider + one or more destructive entries).

| Row State                        | Destructive entries                                                           | Required operation                                    |
| -------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| Active upload (`uploading` lane) | `Cancel upload`                                                               | `cancelJob(jobId)`                                    |
| Uploaded (`uploaded` lane)       | `Remove from project` or `Remove from projects` (when bound) + `Delete media` | unbind from one/many projects; delete persisted media |
| Issue or failed (`issues` lane)  | `Dismiss`                                                                     | `dismissJob(jobId)`                                   |

Notes:

- Compact mode and embedded mode share the same destructive naming convention.
- `Upload anyway` is a non-destructive duplicate-resolution action and MUST NOT replace the destructive section.
- Every destructive menu entry uses danger styling for label and icon.

## Acceptance Criteria

- [ ] Row menus match **Media Item Menu Contract** for each lane/issue kind.
- [ ] Status text follows **Status Text Contract** for every phase transition.
- [ ] Action registry drives visibility; no scattered ad-hoc menu conditionals.
- [ ] Destructive section is last in every row menu with danger styling.
