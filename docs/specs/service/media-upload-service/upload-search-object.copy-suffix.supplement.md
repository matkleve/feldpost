# Upload search object — Windows copy-suffix stripping

> **Parent:** [upload-search-object.md](./upload-search-object.md) · [upload-search-object.evidence-model.md](./upload-search-object.evidence-model.md)

Company archives routinely contain **Windows Explorer copy folders** of the same place:

```
Wasagasse 4
Wasagasse 4 (1)
Wasagasse 4 (2)
```

and, after someone retypes the name, a **second chain that restarts the counter**:

```
Mariahilfer Strasse 4
Mariahilfer Strasse 4 (1)
Mariahilfer Strasse 4 (2)
```

Measured 2026-09-16 (`firma_at_archive` harness): without stripping, `(1)` / `(2)` are absorbed into
the flat `street` (`Wasagasse (1)`), so each copy gets a **different `groupingKey`** and becomes a
separate geocode / tray group. That is wrong for the product: the human already decided these are
the same building.

## Contract (MUST)

| # | Rule |
| --- | --- |
| **C1** | Before tokenization of a path segment (folder or filename stem), strip a trailing Windows copy suffix matching `\s*\(\d+\)$` (optional space, `(`, digits, `)`). |
| **C2** | Stripping applies to the **segment string**, not only to a later street fragment — so `Wasagasse 4 (1)` becomes `Wasagasse 4` before house/street split. |
| **C3** | After C1–C2, `Wasagasse 4`, `Wasagasse 4 (1)`, and `Wasagasse 4 (2)` under the same locality **MUST** share one `groupingKey` (same `street` + `houseNumber` + area fields). |
| **C4** | The stripped `(N)` **MUST NOT** appear in flat `street`, `houseNumber`, `groupingKey`, or layer-package `parsed.street`. |
| **C5** | Evidence may record that a copy suffix was present (optional `sources` note); it **MUST NOT** change address fields. |

## Out of scope (this supplement)

| Topic | Why |
| --- | --- |
| Spelling variants (`Straße` vs `Strasse`) | Handled by [street-fold supplement](./upload-search-object.street-fold.supplement.md). A typo that is not an orthographic variant (`Wasagase`) stays its own group — same supplement, § Rejected. |
| Camera counters inside the name (`IMG_1274`, `_0012` mid-token) | Already gated elsewhere ([filename postcode gate](./upload-search-object.md#area-evidence)); do not confuse with a trailing `(N)`. |
| Chunk-stem heuristics in [STUDY-008](../../../study/008-classification-chunking-strategy.md) § 4 | Those stems only order classification chunks. **This** contract is about Search Object fields and `groupingKey`. Both MUST agree on trailing `(N)`, but SO is the authority for address identity. |

## Acceptance

| ID | Input segment (under `Wien/1010/…`) | Flat `street` | `houseNumber` | Same `groupingKey` as bare? |
| --- | --- | --- | --- | --- |
| CS-01 | `Wasagasse 4` | `Wasagasse` | `4` | — (canonical) |
| CS-02 | `Wasagasse 4 (1)` | `Wasagasse` | `4` | **Yes** vs CS-01 |
| CS-03 | `Wasagasse 4 (12)` | `Wasagasse` | `4` | **Yes** vs CS-01 |
| CS-04 | `Wasagasse 4A (2)` | `Wasagasse` | `4A` | **Yes** vs bare `Wasagasse 4A` |
| CS-05 | `Stephansplatz (1)` | `Stephansplatz` (or landmark handling unchanged aside from suffix) | — | **Yes** vs bare `Stephansplatz` |

Red-first: CS-02 fails on current `main` (`street === "Wasagasse (1)"`).

## Code touchpoints (implementation follow-up)

- Segment preprocess before `tokenizeSegment` / unit expansion in
  `apps/web/src/app/core/location-path-parser/path-token-classifier.ts` (or the shared path normalize
  used by `buildSearchObjectFromRelativePath`).
- Regression: `firma_at_archive` scale comparison — increment-chain folders collapse to one group
  per spelling; typo twins remain separate until a spelling-merge contract exists.

## Status

**Implemented 2026-09-16** — `stripWindowsCopySuffix` in `path-token-classifier.ts`, applied at the
start of `applySegment` in `upload-search-object.builder.ts` (before AT unit parse / tokenize).
Acceptance CS-01…CS-05 in `upload-search-object.builder.spec.ts`.
