# Files Page — bulk resolution (supplement)

> **Parent:** [files-page.md](./files-page.md)
> **Decision:** [STUDY-006 D-04 / Phase 4](../../study/006-upload-pipeline-correction-plan.md)
> **Related contracts:** [evidence model](../service/media-upload-service/upload-search-object.evidence-model.md) · [contradiction resolution](../service/media-upload-service/contradiction-resolution-model.md)

## What It Is

How "apply this address to everything in this folder" behaves. This is the operation the Files page
exists for, and the one that can do the most damage, so its rules are stated separately from the
page's layout.

## The governing idea

A bulk answer is **the same kind of thing as a tray answer**: a human assertion that outranks parsed
evidence. It is not a new way to write a location. It therefore reuses the evidence model rather
than bypassing it — the address is written as evidence with a human origin, and the existing
resolution path derives, corroborates and geocodes from there.

Concretely, a bulk apply MUST go through the same resolution services a tray answer goes through.
If that is not possible for a given field, the field is out of scope for bulk — not special-cased.

## Rules

| # | Rule | Why |
| --- | --- | --- |
| **R1** | A bulk apply targets an explicit, displayed set of media ids — never "the folder" as a live query. | The set the user confirmed must be the set that is written, even if an upload lands mid-operation. |
| **R2** | Only items whose location is **unresolved** are eligible by default. Overwriting resolved items requires a separate, explicitly chosen mode. | The common case must not silently rewrite work that was already correct. |
| **R3** | The applied address is written as evidence with a **human** origin, outranking parsed evidence for the same field. | Keeps one evidence model; no second write path. |
| **R4** | Derivation still runs after the answer (e.g. `city → state`), and a contradiction the answer creates is dropped, exactly as for a tray answer. | This is the D-12 rule; a bulk answer that left contradictions would re-open the same conflicts. |
| **R5** | Geocoding happens **once per distinct address**, not once per file. | 5 000 files in one folder are one address, not 5 000 lookups. |
| **R6** | The operation is chunked and resumable, and reports per-item outcome: applied / skipped / failed. | At 5 000 items a partial failure is normal; "it finished" is not an adequate answer. |
| **R7** | Nothing is written until the user confirms a summary stating the exact count and the exact address. | R1's set, made visible. |
| **R8** | Every write is `organization_id`-scoped by the same RLS as a single-item write. | A bulk path must not be a privilege path. |

## What bulk apply does NOT do

- It does not open trays. Items needing a question stay unresolved and remain in Clarifications.
- It does not invent precision. A folder-level answer that names only a city yields a city-precision
  location **without coordinates**, exactly as the area-only path does (D-10) — it does not borrow a
  house number from a sibling file.
- It does not mutate `relative_path`, which is immutable after insert.
- It does not delete or merge media.

## Failure and partial completion

| Situation | Behaviour |
| --- | --- |
| Geocode fails for the address | Nothing is applied; the user is told the address could not be placed. |
| Some items fail to write | Successful items stay written; the report names the failures and the set can be retried. |
| User navigates away mid-run | The run continues; leaving the page does not cancel a confirmed write. |
| The same folder is applied twice | Second run is a no-op for items already carrying that human-origin evidence. |

## Cost

One geocode per distinct address (R5), one chunked write pass over the confirmed set (R6). The tree's
counts are aggregates in SQL (parent spec), so a completed run refreshes badges with a re-query, not
a client-side recount.

## Implementation status, 2026-09-16

The engine is built in two halves under `core/media-location-bulk/`, both pure and both tested:

| Half | File | What it owns |
| --- | --- | --- |
| Plan | `bulk-resolution.planner.ts` | eligibility (R2), address derivation, grouping so one address is one geocode (R5), the confirmation summary (R7) |
| Run | `bulk-resolution.runner.ts` | one geocode per group, per-item application in yielding chunks (R6), the outcome report |

Every effect the runner needs is **injected**, so the rules above are tested rather than asserted —
including R5, which was re-checked by breaking it on purpose (geocoding per item instead of per
group) and confirming the test goes red.

Addresses are derived with `buildSearchObjectFromRelativePath`, the **same** function the upload
pipeline uses. That is what makes a folder answered in bulk identical to the same folder answered one
file at a time, rather than a second interpretation of the same path.

**Adapters, 2026-09-18** (`bulk-resolution.adapter.ts`). The only place bulk resolution touches
`GeocodingService` or `MediaLocationUpdateService`. It guarantees two things the engine cannot:

- **The whole geocode result passes through.** `updateFromAddressSuggestion` reads `city` /
  `street` / `streetNumber` / `zip` / `country`; anything narrower writes coordinates with no
  address. The runner is generic over the suggestion type for exactly this reason.
- **Nothing thrown escapes.** A geocoder outage or a rejected row becomes a reported outcome, since
  the engine's contract is that a failure never aborts the run.

On the EXIF path the adapter carries the **photo's own coordinates** forward: `ReverseGeocodeResult`
has no `lat`/`lng` because it names a point rather than locating one, and taking the geocoder's
position instead would move the item to the address rather than to where the camera stood.

**Dialog, 2026-09-20** (`apps/web/src/app/shared/bulk-resolution-dialog/`). The plan is now
renderable: exact count, one row per address with its file count, skipped items grouped by reason,
progress, and a report that states failures rather than rounding them away. Its first caller is the
deferred-location backlog in the Upload tab ([#232](https://github.com/matkleve/feldpost/issues/232));
the `/files` selection is the second, when that page exists.

Building it surfaced one thing the engine's tests could not: a plan with `eligibleCount: 0` is a
**normal outcome**, not an error. On this project's own database every unresolved item is a PDF with
`relative_path` NULL and no EXIF, so the planner correctly skips all of them as
`no_address_in_source`. A dialog that offered Apply there would write nothing and read as broken, so
`nothing-to-do` is its own stable state with no Apply button.

## Acceptance Criteria

- [x] Applying an address to a folder of 1 000 unresolved items issues **one** geocode request.
- [x] Resolved items in the same folder are untouched unless overwrite mode was explicitly chosen (R2).
- [ ] The written location carries human-origin evidence and survives a re-run of derivation (R3, R4).
- [x] A confirmation renders the plan, and cancel writes nothing (5.4 dialog).
- [ ] A city-only answer produces a city-precision location with no coordinates (D-10 parity).
- [x] A forced mid-run failure leaves successful items written and reports the failures (R6).
- [x] Confirmation states the exact item count and address before any write (R7) — the plan reports
      `eligibleCount`, `geocodeCount` and a label per group.
- [ ] A second organization's items are never included, asserted by an RLS test (R8).
- [x] Re-applying the same address to the same folder writes nothing the second time — such items are
      already resolved, so the planner skips them as `already_resolved`.
- [x] A source that carries no address is **skipped and reported**, never filled in from another
      source (B2).
