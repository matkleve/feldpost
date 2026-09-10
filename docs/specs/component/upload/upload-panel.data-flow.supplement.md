# Upload Panel — Data flow and wiring

> **Parent:** [upload-panel.md](upload-panel.md)

## What It Is

The reactive **data-flow diagram** (job intake through lane presentation) and the **wiring sequence** (open, submit, placement, zoom) for Upload Panel. Split from `upload-panel.md` for size; normative behavior is in the parent, this document is the diagram detail.

## What It Looks Like

Two Mermaid diagrams: a flowchart tracing signal/stream propagation from submit to row outputs, and a sequence diagram tracing the open → drop → submit → placement/zoom round trip across `UploadButtonZone`, `UploadPanelComponent`, `UploadManagerService`, and `MapShellComponent`.

## Where It Lives

- **Specs:** `docs/specs/component/upload/upload-panel.data-flow.supplement.md`
- **Code:** `features/upload/upload-panel/`, `core/upload/upload-manager.service.ts`, `features/map/map-shell/component/map-shell.component.ts`

## Actions

| # | Trigger | System response |
| --- | --- | --- |
| 1 | User adds files (drop/pick/folder/capture) | `UploadManagerService.submit()`/`submitFolder()` drives `jobs()`; panel buckets into lanes |
| 2 | User opens panel and interacts | Wiring sequence below governs visibility, submit, placement and zoom round trips |

## Component Hierarchy

N/A — diagrams describe data/control flow across the components in the parent **Component Hierarchy**, not a DOM subtree of their own.

## Data Flow (Mermaid)

```mermaid
flowchart TD
  U[User adds files] --> P[UploadPanelComponent]
  P --> M[UploadManagerService submit/submitFolder]
  M --> J[(jobs signal)]
  M --> DD[duplicateDetected stream]
  J --> B[Lane buckets by lane semantics plus issue kind]
  B --> C[Lane counts]
  B --> L[Lane list rows]
  L --> I[UploadPanelItemComponent]
  I -->|missing_data| R[placementRequested output]
  I -->|uploaded row| Z[zoomToLocationRequested output]
  I -->|uploaded actions| ZA[navigate, prioritize, add-to-project, download]
  I -->|duplicate issue GPS action| Z2[openExistingPlacedMedia output]
  DD --> DM[DuplicateResolutionModal]
  DM -->|use_existing/upload_anyway/reject| M
  I -->|dismiss| M
```

## Wiring

### Wiring Flow (Mermaid)

```mermaid
sequenceDiagram
  actor User
  participant Zone as UploadButtonZone
  participant Panel as UploadPanelComponent
  participant Manager as UploadManagerService
  participant Map as MapShellComponent

  User->>Zone: Click Upload Button
  Zone->>Panel: visible = true
  User->>Panel: Drop files
  Panel->>Manager: submit(files)
  Manager-->>Panel: jobs() updates
  Panel-->>User: lane counts + selected lane list
  alt missing_data item
    User->>Panel: Click map-marker action
    Panel-->>Map: placementRequested(jobId)
    Map->>Panel: placeFile(jobId, coords)
    Panel->>Manager: placeJob(jobId, coords)
  else uploaded item with coords
    User->>Panel: Click row
    Panel-->>Map: zoomToLocationRequested({mediaId,lat,lng})
  end
  Manager-->>Map: imageUploaded event
```

- Receives visibility from `MapShellComponent` and uses parent-controlled open/close behavior.
- Injects `UploadManagerService` to submit files and read reactive job/batch state.
- Uses one canonical intake pipeline for picker, drop, folder, and capture file sources.
- Keeps lane filters stable and deterministic as jobs move through phases.
- Emits placement and zoom intents to `MapShellComponent` through dedicated outputs.
- Keeps lane selection stable, including empty lanes.
- Surfaces RLS permission denies as user-facing feedback while relying on backend enforcement.
