# Studies (`docs/study/`)

Reasoning documents — analyses, investigations, comparisons, proposals — where every claim carries an **evidence grade** (`[A]`–`[D]`) and every file carries a **status** saying whether it still holds.

Read [`STUDY-FORMAT.md`](./STUDY-FORMAT.md) before writing or citing one. Two things from it matter most when reading:

- **Trust order:** owner correction → spec → live code → study. A study never outranks the code it describes.
- **`[D]` is a decision, not a fact.** Implementing a `[D]` as though it were an `[A]` is the failure this folder exists to prevent.

Studies are never deleted and never rewritten into agreement. Corrections arrive as a new study; the old one gets `corrected-by` and a `superseded` status.

## Index

| id | Study | Type | Status | Subject |
| --- | --- | --- | --- | --- |
| STUDY-001 | [Area-selection geometry with variable location precision](./001-area-selection-geometry.md) | analysis | `proposed` | What "the photo's area is inside the circle" should mean geometrically; proposes equal-area discs instead of bbox-corner containment. |
| STUDY-002 | [UX for coarse-precision media on the map](./002-coarse-precision-map-ux.md) | analysis | `proposed` | What the user sees when a photo's location is known only to city precision; retrieval, disclosure, and what must replace `locationPinEligible`. |
| STUDY-003 | [Data and contract layer of the upload precision branch](./003-upload-precision-data-contract-review.md) | review | `partially-remediated` | Static review of the `address_precision` migration, RPCs, and spec drift. No database was reachable; nothing was executed. |

## Related folders

| Folder | Holds |
| --- | --- |
| [`docs/specs/`](../specs/README.md) | The contract. Normative. |
| [`docs/audits/`](../audits/README.md) | Point-in-time findings. Not normative, and dated. |
| [`docs/ai-diary/`](../ai-diary/README.md) | What happened, day by day. |
| [`docs/backlog/`](../backlog/README.md) | Deferred engineering work and plans. |

Open tasks belong in **GitHub Issues**, not here — see [`docs/backlog/README.md`](../backlog/README.md) § Where open work lives.
