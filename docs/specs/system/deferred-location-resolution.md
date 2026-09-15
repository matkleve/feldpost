# Deferred Location Resolution

> **Related specs:** [upload-manager-pipeline](../service/media-upload-service/upload-manager-pipeline.md) · [upload-address-resolution.phases](../service/media-upload-service/upload-address-resolution.phases.md) · [action-context-matrix](./action-context-matrix.md) · [media-detail-actions](../ui/media-detail/media-detail-actions.md) · [files-page](../page/files-page.md)
> **Finding:** [F-05](../../study/005-upload-pipeline-trace-findings.md#f-05) · **Studies:** [STUDY-007](../../study/007-exif-coordinates-as-address-evidence.md)

## What It Is

The contract for uploading media **without resolving a location**, keeping every scrap of evidence
that arrived with it, and resolving that location later — for one item or for a selected batch.

## What It Looks Like

Three surfaces, one behaviour. In the upload panel, the location switch off means the batch runs
straight through with no questions. In media detail, an item with no location shows its **Original
folder** and **Original file name** rows with an *Add as location* affordance in the row's action
slot. In a selection context (for example, filter by upload time and select the results), a batch
action offers to resolve the selection from folder path, file name, or EXIF, and reports what
happened to each item.

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

Immutability is enforced by `prevent_media_items_raw_source_overwrite`
(`20260412123000_media_items_raw_columns_immutability.sql`). Resolution therefore never rewrites raw
evidence; it writes a *location* alongside it, and the evidence stays as the audit trail.

**Gap to close:** the read model does not select `relative_path` or `exif_raw`, so the UI cannot show
what the database already stores. Exposing them is a prerequisite here, as it is for
[files-page](../page/files-page.md).

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
| 5 | Item has EXIF coordinates | A third action offers **Use photo GPS** | see STUDY-007 |
| 6 | Item already has a location | No add action is offered; the rows stay read-only | avoids silent overwrite |

The action reuses the existing resolution services. It MUST NOT introduce a second way to write a
location — same evidence model, same derivation, same trays.

## Component Hierarchy

```
MediaDetailInlineSection
├── DetailRow "Original folder"        [read-only value]
│   └── [AddAsLocationAction]          when item has no location
├── DetailRow "Original file name"     [read-only value]
│   └── [AddAsLocationAction]          when item has no location
└── DetailRow "Photo GPS"              [when exif coordinates present]
    └── [UsePhotoGpsAction]            when item has no location

SelectionActionBar (media / workspace contexts)
└── [ResolveLocationAction]            when selection contains unlocated items
    └── ResolveLocationDialog
        ├── source choice (folder | filename | exif)
        ├── eligible-count summary
        └── per-item outcome report
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
| `core/media-location/deferred-resolution.service.ts` | one engine for single and batch runs |
| `docs/specs/system/action-context-matrix.md` | register the batch action |

## Acceptance Criteria

- [ ] With the toggle off, a 15-file folder uploads **15 rows and asks zero questions**, and no job enters `awaiting_disambiguation`.
- [ ] Those rows still carry `relative_path`, `original_filename`, `exif_raw` and EXIF coordinates where present.
- [ ] The spec/code divergence in `upload-address-resolution.phases.md` § Trigger matrix is gone — the matrix and the code agree.
- [ ] Detail view of an unlocated item offers **Add as location** on the folder and file-name rows.
- [ ] Using it on an unambiguous folder path writes a location without opening a tray.
- [ ] An item that already has a location offers no add action.
- [ ] A batch run over 100 selected items resolving to one address asks **one** question (B4).
- [ ] A batch run reports per-item outcomes and leaves unresolvable items in Issues (B5, B6).
- [ ] Batch and folder-subtree resolution call the same engine (one implementation, two selections).
- [ ] A second organization's items are never included (B7, RLS test).

## Interaction emphasis

**Add as location** and the batch resolve action are the actionable controls here. The batch action's
confirm is the high-attention control (**brand gold**); the per-row add action is a secondary row
affordance and stays passive until hover, per
[state-visuals § Interaction emphasis](../../design/state-visuals.md).
