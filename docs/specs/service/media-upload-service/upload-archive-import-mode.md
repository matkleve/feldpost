# Upload — Archive Import Mode

**Status:** Element Spec — **not implemented** (contract only)
**Parent:** [upload-manager-pipeline.md](./upload-manager-pipeline.md)
**Detail:** [upload-archive-import-mode.fsm.supplement.md](./upload-archive-import-mode.fsm.supplement.md)
**Decision:** [STUDY-006 D-04 / Phase 4](../../../study/006-upload-pipeline-correction-plan.md) · **Findings:** [F-08](../../../study/005-upload-pipeline-trace-findings.md#f-08), [F-06](../../../study/005-upload-pipeline-trace-findings.md#f-06)

---

## What It Is

A second upload flow for importing an existing archive: resolve what can be resolved without
asking, put everything else in Clarifications, and let the operator work it afterwards a folder at a time.

## What It Looks Like

The operator picks *Import archive* instead of a normal upload, chooses a folder, and the panel
starts uploading within a second. No questions appear at any point. Two figures run side by side:
files imported, counting to a finite total, and items awaiting resolution, a backlog. When the first
finishes the import is done; the second is then worked in the Clarifications lane, a folder at a time. If a
file fails to upload, a third line says so — a failure never hides inside the imported count.

## Where It Lives

The mode is chosen in the upload panel at submit time and recorded on the batch. The import itself
runs through the same manager, queue and pipeline as an interactive upload — this is a mode of that
pipeline, not a parallel one. Resolution afterwards happens in the Clarifications lane and on
[`/files`](../../page/files-page.md).

## Why it is a flow and not a flag

At 100 000 files the interactive batch does not fail slowly, it fails arithmetically: **~45 000 tray
questions** ([F-08](../../../study/005-upload-pipeline-trace-findings.md#f-08)). No interaction
design answers 45 000 questions. A migration is not a batch with more files in it — the user's
intent is different ("get this in, I will sort it out"), so the flow is different. D-04 weighed
making the existing flow fast enough and capping the batch, and chose this.

## The three modes, and how they differ

This is the distinction most likely to be got wrong later, so it is stated first:

| Mode | Classification | Trays | Unresolved goes to |
| --- | --- | --- | --- |
| **Interactive** (`required`) | yes | yes — asked during import | tray, then Clarifications if unanswered |
| **No location** (`optional`) | **skipped entirely** | none | nowhere; item simply has no location |
| **Archive import** | **yes** | **none** | **Clarifications**, as `address_deferred` |

Archive import is *not* `optional` with a bigger batch. `optional` means "I do not want locations".
Archive import means "resolve what you can, ask me nothing, park the rest" — so classification must
run, because everything it resolves silently is a question the operator never has to answer.

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Chooses *Import archive* and a folder | Batch is created with `importMode: 'archive'`; classification starts chunked | submit |
| 2 | Waits | Uploading begins after the first chunk; no tray ever opens | drain |
| 3 | Watches progress | Files imported, items awaiting resolution, and failures when there are any | batch record |
| 4 | Import finishes | Batch reports complete even with items unresolved | terminal |
| 5 | Opens Clarifications or `/files` afterwards | Unresolved items are grouped by folder for bulk answering | bulk resolve |
| 6 | Re-submits the same tree | Already-stored files are skipped by content hash | dedup |

## Component Hierarchy

```
UploadPanel
├── ModeChoice [interactive | archive]
└── [ArchiveImportProgress]           when importMode === 'archive'
    ├── FilesImported                 finite, ends
    └── ItemsAwaitingResolution       backlog, shrinks in Clarifications

(no tray surface is mounted for an archive batch)
```

## Rules

| # | Rule | Why |
| --- | --- | --- |
| **A1** | The mode is chosen at submit and is fixed for the batch. It cannot be switched mid-import. | A half-interactive import is a state nobody can reason about. |
| **A2** | Classification runs, chunked and yielding, exactly as Phase 3.3 built it. | Every silent resolution is a question not asked. |
| **A3** | **No tray is ever registered or presented during an archive import.** | The defining property; asking once is asking 45 000 times. |
| **A4** | A group that would have opened a tray resolves to Clarifications instead, as `issueKind: 'address_deferred'`. | Reuses the lane and the issue kind that already exist. |
| **A5** | Uploading starts after the first chunk and never waits on resolution. | The bytes are the part that must not be lost. |
| **A6** | An item with no resolvable location is still uploaded, with its raw evidence intact. | Same guarantee as [deferred-location-resolution](../../system/deferred-location-resolution.md). |
| **A7** | Resolution afterwards is the folder-level bulk operation, not a per-item tray. | [files-page bulk resolution](../../page/files-page.bulk-resolution.supplement.md). |
| **A8** | The import is resumable: re-submitting the same tree skips what is already stored, by content hash. | An import that cannot be resumed cannot be trusted at this size. |

## What "done" means

**An archive import is complete when every file has been uploaded or has terminally failed.** It is
**not** conditional on any location being resolved. `[D]`

That is a decision, and the plan called for it explicitly. The reasoning: the import's job is to get
the data in safely, and an import of 100 000 files will routinely leave tens of thousands of items
unresolved by design — a definition of "done" that waits on those would never report done, and would
train the operator to ignore it. Resolution is a **separate, ongoing workstream** with its own
progress, worked in the Clarifications lane.

The UI therefore shows **independent progress figures**, never one blended number: *files imported*
(finite, ends) and *items awaiting resolution* (a backlog that shrinks as work is done).
Alternatives considered: "done when everything resolves" (never fires) and one combined bar (hides
whether the bytes are safe, which is the question the operator actually has during an import).

*Files imported* counts files whose bytes are stored — `complete`, `skipped`, and `missing_data`
(in, location deferred). A failed upload is **not** imported and MUST NOT be counted as one; when
any file fails, a third figure names the failure count. Counting failures as imports would restore
the blended number in the one place it matters most (`docs/CONSTITUTION.md` § no silent failure).

## Ownership

| Behaviour | Owner | Note |
| --- | --- | --- |
| Mode selection and batch flag | submit path (`upload-manager-submit.util.ts`) | Fixed at submit (A1) |
| Mode choice UI (Import archive button) | `upload-panel` intake (`upload-panel__intake-btn--archive`) | Same folder picker; passes `importMode: 'archive'` |
| Chunked classify + drain | `enqueueAndClassifyInChunks` | Already built (Phase 3.3) |
| Suppressing tray registration | the tray-flow service, gated on the batch mode | Must suppress **registration**, not only presentation — see the FSM supplement |
| Routing unresolved to Clarifications | the pre-resolve / routing path | Writes `missing_data` + `address_deferred` |
| Bulk resolution afterwards | the shared resolve engine | One engine for folder and filter selections |
| Import progress | the batch record | Separate figures, never blended; a failure is never an import |

## Visual Behavior Contract

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Import archive intake | `.upload-panel__intake-btn--archive` | intake area (panel shell) | same button | `.upload-panel__intake-btn--archive` | intake (panel local) | `upload-panel.creation-dom.spec.ts` renders label; input-handlers pass `importMode: 'archive'` |
| Import progress figures | `.upload-panel__archive-progress` | intake area (panel shell) | none (status only) | `.upload-panel__archive-progress`, `.upload-panel__archive-progress-line`, `[data-state='failed']` | intake (panel local) | helper unit tests; figures never blend imported + awaiting, and `error` never counts as imported |

## Data

| Source | Field | Note |
| --- | --- | --- |
| `UploadBatch` | `importMode: 'interactive' \| 'archive'` | new; fixed at submit |
| `UploadJob` | `issueKind: 'address_deferred'` | already exists |
| `media_items` | `relative_path`, `exif_raw`, … | already written, already read |

## File Map

| File | Purpose |
| --- | --- |
| `core/upload/manager/upload-manager-submit.util.ts` | accept and record the mode |
| `core/upload/location/upload-location-tray-flow.service.ts` | suppress registration in archive mode |
| `core/upload/pipelines/new/…` | route unresolved to Clarifications instead of a tray |
| `features/upload/upload-panel/…` | mode choice, and the progress figures |

## Acceptance Criteria

- [ ] An archive import of the curated corpus registers **zero** disambiguation groups (A3).
- [ ] Every file that the interactive run resolves silently is also resolved here (A2) — the two runs
      differ only in what happens to the *unresolved* remainder.
- [ ] Every unresolved item lands in Clarifications as `address_deferred`, and none is lost (A4, A6).
- [ ] Uploading begins after the first chunk, before classification of the tree finishes (A5).
- [ ] The batch reports complete once uploads finish, with items still unresolved (§ What "done" means).
- [ ] Re-submitting the same tree uploads nothing twice (A8).
- [ ] Bulk-resolving a folder afterwards clears those items from Clarifications (A7).
- [ ] The FSM supplement's transitions hold: no job reaches `awaiting_disambiguation` in this mode.
