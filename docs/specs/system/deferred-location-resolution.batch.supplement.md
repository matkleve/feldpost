# Deferred Location Resolution — batch runs (supplement)

> **Parent:** [deferred-location-resolution.md](./deferred-location-resolution.md)
> **Sibling:** [files-page.bulk-resolution.supplement.md](../page/files-page.bulk-resolution.supplement.md) — the same operation, selected by folder instead of by filter

## What It Is

Resolving location for a **selected set** of already-uploaded items: filter (for example by upload
time), select the results, and trigger resolution for all of them.

## Rules

| # | Rule | Why |
| --- | --- | --- |
| **B1** | The action operates on an **explicit selection**, never on a live filter query. | The set the user confirmed must be the set that is written, even if an upload lands mid-run. |
| **B2** | The source is chosen per run: resolve from **folder path**, **file name**, or **EXIF** — never silently "whatever is there". | These disagree often; picking for the user hides which evidence won. |
| **B3** | Only items **without** a location are eligible by default; overwriting is a separate, explicitly chosen mode. | The common case must not rewrite work that was already correct. |
| **B4** | Items resolving to the same address form **one** tray question, not one per item. | The existing group merge already does this; a batch path must not bypass it. |
| **B5** | Chunked, resumable, and reports per-item outcome: resolved / needs a question / failed. | At thousands of items partial failure is normal; "it finished" is not an answer. |
| **B6** | Items that cannot be resolved go to Clarifications; they do not fail the run. | One bad path must not abort the other 999. |
| **B7** | `organization_id`-scoped by the same RLS as a single-item write. | A batch path must not be a privilege path. |
| **B8** | Shares one implementation with folder-subtree bulk resolution. | A folder is one way to pick items, a filter is another; two engines would drift. |

## What it does not do

- It does not invent precision: a folder naming only a city yields a city-precision location with no
  coordinates, as the area-only path does (D-10).
- It does not mutate `relative_path`, `original_filename` or `exif_raw`, which are immutable.
- It does not resolve items that already have a location unless overwrite mode was chosen.

## Implementation status, 2026-09-16

**B8 is honoured by construction:** there is one engine, `core/media-location-bulk/`, and it takes a
plain list of media ids. A folder subtree and a filter selection are two ways of producing that list,
not two engines — which was the rule most at risk of quietly being broken by building the folder case
first.

B1, B2, B3, B5 and the R5 one-geocode-per-address rule are implemented and tested. B7 (RLS scoping)
depends on the adapters, which are not wired yet. See the
[sibling supplement](../page/files-page.bulk-resolution.supplement.md) for the file-level breakdown.

## Acceptance Criteria

- [ ] 100 selected items resolving to one address ask **one** question (B4).
- [ ] Choosing "from EXIF" on items whose folder also has an address uses EXIF, and the report says so (B2).
- [ ] Items with an existing location are excluded from the eligible count by default (B3).
- [ ] A forced mid-run failure leaves earlier items written and names the failures (B5).
- [ ] Unresolvable items appear in Clarifications afterwards, and the run reports success (B6).
- [ ] The batch engine and the folder-subtree engine are the same code path (B8).
- [ ] A second organization's items are never included (B7, RLS test).
