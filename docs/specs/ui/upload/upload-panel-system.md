# Upload panel system (UI)

> **Normative IO and pipeline:** [media-upload-service](../../service/media-upload-service/README.md) — [upload-manager](../../service/media-upload-service/upload-manager.md) and pipeline children. Queue semantics, phases, deduplication, storage, and manager event contracts stay exclusively under `docs/specs/service/media-upload-service/`.
>
> **Component contracts:** [upload-panel](../../component/upload/upload-panel.md) (and split children), [upload-button-zone](../../component/upload/upload-button-zone.md).

## What It Is

The upload panel system is the `features/upload` surface: compact and embedded panel chrome, lane presentation, row/item UI, dialog orchestration for upload-adjacent choices (project, address, duplicates), and view-model helpers that adapt manager-owned job signals into template-ready state.

## What It Looks Like

Users see a fixed-width panel (overlay or workspace-embedded) with intake, a Queue / Uploaded / Issues lane switch, and a scrollable row list with status, menus, and issue affordances. Modals/overlays cover duplicate resolution, address finder, and project selection. Visual layout, tokens, and row contracts live in the [upload-panel](../../component/upload/upload-panel.md) family; this system spec only names boundaries and wiring.

## Where It Lives

| Layer | Path / entry |
| --- | --- |
| Feature UI | `apps/web/src/app/features/upload/` |
| Canonical IO | `apps/web/src/app/core/upload/` — `UploadManagerService` and pipelines per [upload-manager.md](../../service/media-upload-service/upload-manager.md) |
| Signed download of persisted blobs | `core/media-download` — [media-download-service](../../service/media-download-service/media-download-service.md) |

## Actions

| # | Actor / trigger | Owner | System response |
| --- | --- | --- | --- |
| 1 | User submits files or folder | `features/upload` → `core/upload` | `UploadManagerService.submit` / `submitFolder`; panel shows scanning and row progress from manager signals |
| 2 | User switches lane tab | `features/upload` | Updates `selectedLane` / effective lane only; does not mutate job `phase` |
| 3 | User resolves duplicate / placement / project from dialogs | `features/upload` (UI) + `core/upload` or documented follow-up services | Dialogs collect input; resume and persistence go through manager APIs or e.g. `MediaLocationUpdateService` for persisted media edits per pipeline spec |
| 4 | Host receives placement or zoom requests | `features/upload` | Emits outputs to map shell; does not bypass manager for new ingestion |

## Component Hierarchy

```
Upload panel system (features/upload)
├── UploadPanelComponent — shell, template wiring, host I/O
├── UploadPanelItemComponent — row UI and menus
├── UploadPanelStateService — lane buckets, counts, scanning labels from jobs()
├── UploadPanelViewModelService — lane switch options, sorted rows, selection helpers
├── UploadPanelLifecycleService — manager observable bridge, issue attention pulse
├── UploadPanelDialogHandlersService — dialog open/close/search; outcomes via core APIs
├── upload-phase.helpers — getLaneForJob, issue-kind presentation mapping
├── Row / bulk / menu action services — route commands to UploadManagerService (or media download)
└── Consumer: UploadManagerService (core/upload) — single queue and pipeline authority
```

## Data

All job, batch, phase, and event payloads are defined and owned by [upload-manager.md](../../service/media-upload-service/upload-manager.md) (`jobs`, `batches`, streams). The panel reads those signals only; it does not maintain a second source of truth for pipeline state.

## State

### Responsibility split

| Kind | Owner | Spec |
| --- | --- | --- |
| `UploadPhase`, `issueKind`, concurrency, batch scanning | `core/upload` | [upload-manager.md](../../service/media-upload-service/upload-manager.md) |
| Lane list mapping (`uploading` / `uploaded` / `issues`) | `features/upload` | `upload-phase.helpers` — must stay aligned with manager phases |
| Shell mode, `selectedLane`, embedded row selection, dialog open flags | `features/upload` | This document; visual FSM tables in [upload-panel.layout-and-states.md](../../component/upload/upload-panel.layout-and-states.md) |

### Panel UI transition choreography (summary)

Normative job phase transitions remain in [upload-manager-pipeline.md](../../service/media-upload-service/upload-manager-pipeline.md). The table below is **UI-only**: when the panel may change presentation or emit to host without duplicating pipeline rules.

| UI transition | From (UI state) | To (UI state) | Notes |
| --- | --- | --- | --- |
| Open panel | closed | open | Host `uploadPanelOpen`; jobs unchanged |
| Select lane | lane A | lane B | Filter only; `@see` upload-panel feedback triage for lane stability after resolution |
| Issue attention pulse | idle | pulsing | `jobPhaseChanged$` → error / `missing_data` from non-issue phase; `@see` UploadPanelLifecycleService |
| Placement request | row action | host handling | Emits `placementRequested`; manager owns `missing_data` job |
| Dialog apply / cancel | dialog open | dialog closed | Clears transient search; commits call manager or location update facade |

## File Map

| File / area | Role |
| --- | --- |
| `upload-panel.component.*` | Template orchestration; host inputs/outputs |
| `upload-panel-state.service.ts` | Panel signals derived from `jobs()` / `activeBatch()` |
| `upload-panel-view-model.service.ts` | Computed presentation for template |
| `upload-panel-lifecycle.service.ts` | Subscriptions to manager streams; host callbacks |
| `upload-panel-dialog-handlers.service.ts` | Dialog UX; delegates outcomes to core |
| `upload-panel-*-actions.service.ts` | Menu/bulk/file commands into manager or download |

## Wiring

Inject `UploadManagerService` for intake and job mutations. Subscribe to `imageUploaded$`, `jobPhaseChanged$`, `batchProgress$`, etc., only to drive panel or host UI; event semantics are listed under **Event Consumers** in [upload-manager.md](../../service/media-upload-service/upload-manager.md). `features/upload` must not import `core` modules that themselves import `features/*` (no upward leakage); today `core/upload` has no dependency on `features/upload`.

## Acceptance Criteria

- [x] All file/folder ingestion goes through `UploadManagerService` (no parallel upload queues in `features/upload`).
- [x] Panel lane derivation uses `getLaneForJob` / helpers aligned with manager `phase` and `issueKind`.
- [x] Dialog resolutions that continue or complete uploads call documented manager or core follow-up APIs (not ad-hoc storage).
- [x] This UI parent spec links to `media-upload-service` for normative IO without duplicating pipeline body text.
- [x] `docs/specs/GOVERNANCE-MODULE-REGISTRY.json` lists `features/upload` with this file as `spec_path` and a non-exception `module_type`.
- [ ] Lane selection stays user-stable after issue resolution where product spec requires it (see [upload-panel.feedback-triage.md](../../component/upload/upload-panel.feedback-triage.md)); remove any auto-switch paths that contradict that contract.

## Governance

This module is a **UI-bound** feature: canonical UI parent is this file under `docs/specs/ui/upload/`; granular UI behavior remains under `docs/specs/component/upload/`. Service behavior authority stays under `docs/specs/service/media-upload-service/`.
