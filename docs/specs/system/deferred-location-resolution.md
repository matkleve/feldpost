# Deferred Location Resolution

> **Related specs:** [upload-manager-pipeline](../service/media-upload-service/upload-manager-pipeline.md) · [upload-address-resolution.phases](../service/media-upload-service/upload-address-resolution.phases.md) · [action-context-matrix](./action-context-matrix.md) · [media-detail-actions](../ui/media-detail/media-detail-actions.md) · [files-page](../page/files-page.md)
> **Finding:** [F-05](../../study/005-upload-pipeline-trace-findings.md#f-05) · **Studies:** [STUDY-007](../../study/007-exif-coordinates-as-address-evidence.md)

## What It Is

The contract for uploading media **without resolving a location**, keeping every scrap of evidence
that arrived with it, and resolving that location later — for one item or for a selected batch.

## What It Looks Like

Three surfaces, one behaviour. The upload panel's location switch, off, runs the batch straight
through with no questions. In media detail, an item with no location shows *Add as location* in the
action slot of its **Original folder** and **Original file name** rows. In a selection context
(filter by upload time, select the results), a batch action resolves the selection from folder path,
file name or EXIF and reports the outcome per item.

## The promise the toggle already makes

The upload panel's location switch, when off, reads **"Uploads without a location."**
(`upload-panel-helpers.ts:86`). That sentence is the contract. Today it is not kept:
`classifyBatch` is awaited unconditionally in all three submit paths
(`upload-manager-submit.util.ts:67`, `:142`, `:195`), and the trays it opens gate the jobs before
hashing — 13 of 15 files parked in `awaiting_disambiguation` for an upload the user said had no
location ([F-05](../../study/005-upload-pipeline-trace-findings.md#f-05)).

**Normative:** `locationRequirementMode: 'optional'` MUST skip the address pipeline entirely —
classification, layer packages, area conflicts, geocoding and every tray. Not "resolve without
blocking". Not "ask fewer questions". Skip.

## Evidence is retained, always

Skipping resolution MUST NOT discard what arrived. Every raw source is already written at insert and
is immutable afterwards — this part exists and is not being changed, only relied on:

| Column | Holds | Status |
| --- | --- | --- |
| `relative_path` | the folder path the file arrived with | written (`upload-file-persist.util.ts:205`), immutable |
| `original_filename` | the file name as uploaded | written |
| `exif_latitude` / `exif_longitude` | GPS point, when present | written |
| `exif_raw` | the full EXIF payload as JSON | written |
| `captured_at` | capture timestamp, when present | written |

Immutability is enforced by `prevent_media_items_raw_source_overwrite`. Resolution never rewrites raw
evidence; it writes a *location* alongside it, and the evidence stays as the audit trail.

**Read model, done 2026-09-15.** `relative_path` and `exif_raw` are selected on the single-row detail
read; `relative_path` alone in the list reads. `exif_raw` is deliberately **not** in list selects — a
jsonb blob per row across a large workspace is the cost Phase 3 removed. Shared prerequisite with
[files-page](../page/files-page.md). The detail resolution badge reads original pixel size from this
detail-only payload (`ExifImageWidth` / `ExifImageHeight`). Grid tiles must not show that badge,
because list rows do not carry `exif_raw`. Contract:
[media-detail-media-viewer.md § Resolution badge](../ui/media-detail/media-detail-media-viewer.md#resolution-badge).

**What that surfaced.** *Original folder* was derived by splitting `original_filename`, a **leaf
name** — for a directory upload it is `IMG_001.jpg` with no folder at all, so the row showed a folder
only when a name happened to contain a slash. It now reads `relative_path`, filename kept as fallback
for older rows (`resolveOriginalFilePathParts`).

## Where It Lives

- Upload skip: `upload-manager-submit.util.ts`, gated on `locationRequirementMode`
- Single-item action: media detail inline section row slots
- Batch action: registered in [action-context-matrix](./action-context-matrix.md) for the media/workspace selection contexts
- Shared engine: the existing location resolution services

## Actions

Batch resolution — the "filter by upload time, select, resolve" case — has its own rules and lives in
[deferred-location-resolution.batch.supplement.md](./deferred-location-resolution.batch.supplement.md).

### Single item

The media detail inline section already renders **Original folder** and **Original file name** as
read-only rows, each with four empty action slots (`detail-row-action--l1/l2/r1/r2`,
`media-detail-inline-section.component.html:68-104`). Those slots are where this lands.

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Opens detail for an item with no location | Original-folder and original-file-name rows show an **Add as location** action | row action becomes visible |
| 2 | Clicks **Add as location** on the folder row | The folder path is fed to the normal resolution pipeline as if it had just been uploaded | runs classify + resolve for one item |
| 3 | Resolution succeeds unambiguously | Location is written; rows return to read-only | item gains a location |
| 4 | Resolution is ambiguous | The normal tray opens, for this item only | one question |
| 5 | Item has EXIF coordinates | A third action offers **Use photo GPS** | **already exists** — `exifToLocationRequested` / `hasExifCoordinates` |
| 6 | Item already has a location | No add action is offered; the rows stay read-only | avoids silent overwrite |

The action reuses the existing resolution services. It MUST NOT introduce a second way to write a
location — same evidence model, same derivation, same trays.

**Implemented 2026-09-20.** The row action runs the **bulk** engine on a selection of one
(`BulkResolutionService.plan([media], { source })` then `.run(plan)`), rather than a single-item
service of its own. That is how the rule above is kept by construction instead of by two
implementations agreeing: the address is derived by the pipeline's own
`buildSearchObjectFromRelativePath`, so one item answered here and the same folder answered in bulk
produce the same write.

Row 4 (ambiguous → the normal tray) is **not** built. The bulk engine geocodes and writes; it has no
tray path. An item whose source yields no usable address is reported
(`no_address_in_source` → `workspace.imageDetail.toast.pathLocationNoAddress`), not queued as a
question. Opening a single-item tray from here is separate work, and is the one part of this table
still outstanding.

Visibility, states and the transition map: [media-detail-inline-section
spec](../ui/media-detail/media-detail-inline-section.md#path--location-fsm). Eligibility uses
`isBulkEligibleStatus` — the same predicate bulk resolution uses — so a row offered in the detail
view is a row a bulk run would also act on.

## Component Hierarchy

```
MediaDetailInlineSection
├── DetailRow "Original folder"        [+ AddAsLocationAction when unlocated]
├── DetailRow "Original file name"     [+ AddAsLocationAction when unlocated]
└── DetailRow "Photo GPS"              [+ UsePhotoGpsAction, exists today]

SelectionActionBar (media / workspace contexts)
└── [ResolveLocationAction]            when selection contains unlocated items
    └── ResolveLocationDialog          source choice, eligible count, outcome report
```

## Data

| Source | Field / method | Note |
| --- | --- | --- |
| `media_items` | `relative_path`, `exif_raw` | stored; **must be added to the read model** |
| `media_items` | `location_status` | drives eligibility (B3) and action visibility (row 6) |
| resolution services | existing classify / resolve entry points | reused, not duplicated |

## State

| State | Type | Default | Effect |
| --- | --- | --- | --- |
| `locationRequirementMode` | `'required' \| 'optional'` | `'required'` | `optional` skips the whole pipeline |
| `resolutionSource` | `'folder' \| 'filename' \| 'exif'` | none | chosen per batch run (B2) |
| `overwriteExisting` | `boolean` | `false` | B3's separate mode |

## File Map

| File | Purpose |
| --- | --- |
| `core/upload/manager/upload-manager-submit.util.ts` | honour `optional` by skipping classify |
| `core/workspace-view/workspace-view.service.ts` | select `relative_path`, `exif_raw` |
| `shared/workspace-pane/media-detail/media-detail-inline-section/` | row actions |
| `core/media-location-bulk/bulk-resolution.service.ts` | one engine for single and batch runs — `plan()` / `run()` |
| `shared/workspace-pane/media-detail/media-detail-path-location-add.state.ts` | the row FSM and its visibility rule |
| `docs/specs/system/action-context-matrix.md` | register the batch action |

## Acceptance Criteria

- [x] With the toggle off, a folder asks **zero** questions — harness run C, 0 parked (was 13/15).
- [x] Those rows still carry `relative_path`, `original_filename`, `exif_raw` and EXIF coordinates —
      the skip bypasses classification, not persistence.
- [x] The `upload-address-resolution.phases.md` § Trigger matrix divergence is gone — the matrix
      already said "Skip pipeline" and the code moved to meet it.
- [x] The read model exposes `relative_path` (detail + list) and `exif_raw` (detail only).
- [x] *Original folder* shows the folder the file arrived with, and shows none when there was none.
- [ ] Detail view of an unlocated item offers **Add as location** on the folder and file-name rows.
- [ ] Using it on an unambiguous folder path writes a location without opening a tray.
- [ ] An item that already has a location offers no add action.
- [ ] A batch run over 100 selected items resolving to one address asks **one** question (B4).
- [ ] A batch run reports per-item outcomes and leaves unresolvable items in Clarifications (B5, B6).
- [ ] Batch and folder-subtree resolution call the same engine (one implementation, two selections).
- [ ] A second organization's items are never included (B7, RLS test).

## Interaction emphasis

**Add as location** and the batch resolve action are the actionable controls here. The batch action's
confirm is the high-attention control (**brand gold**); the per-row add action is a secondary row
affordance and stays passive until hover, per
[state-visuals § Interaction emphasis](../../design/state-visuals.md).
