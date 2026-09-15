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

- It does not open trays. Items needing a question stay unresolved and remain in Issues.
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

## Acceptance Criteria

- [ ] Applying an address to a folder of 1 000 unresolved items issues **one** geocode request.
- [ ] Resolved items in the same folder are untouched unless overwrite mode was explicitly chosen (R2).
- [ ] The written location carries human-origin evidence and survives a re-run of derivation (R3, R4).
- [ ] A city-only answer produces a city-precision location with no coordinates (D-10 parity).
- [ ] A forced mid-run failure leaves successful items written and reports the failures (R6).
- [ ] Confirmation states the exact item count and address before any write (R7).
- [ ] A second organization's items are never included, asserted by an RLS test (R8).
- [ ] Re-applying the same address to the same folder writes nothing the second time.
