# Upload search object — street spelling fold for grouping

> **Parent:** [upload-search-object.md](./upload-search-object.md) · [upload-search-object.evidence-model.md](./upload-search-object.evidence-model.md) · [copy-suffix](./upload-search-object.copy-suffix.supplement.md)

After Windows `(N)` stripping, company archives still split one place across **spelling twins**:

```
Wasagasse 4 / Wasagasse 4 (1) / …
Wasagase 4  / Wasagase 4 (1)  / …   ← same street, one letter dropped / doubled
```

These must share one `groupingKey` so the batch geocodes and asks once. This is **not** Fuse
fuzzy matching: it is a **deterministic orthographic fold** on the street component of the key
(same class of rule as `str`/`str.` ≡ `straße` in the evidence model).

## Contract (MUST)

| # | Rule |
| --- | --- |
| **S1** | When building `groupingKey`, the street part **MUST** pass through `normalizeStreetForGroupingKey` (not only trim/lower/NFKD). |
| **S2** | The fold **MUST** include existing abbreviation folding (`str`/`str.` → `strasse`, via `foldStreetSpelling`). |
| **S3** | The fold **MUST** collapse consecutive duplicate letters (`Wasagasse` → `wasagase`, so it matches `Wasagase`). |
| **S4** | Flat `street` on the Search Object **MAY** keep the path spelling (display / evidence). Only the **key** is folded — geocode still runs once per group. |
| **S5** | Layer-package street **compare** (`normalizeStreetLevelValue`) **MUST** use the same fold so packages do not conflict solely on doubled letters. |

## Out of scope

| Topic | Why |
| --- | --- |
| Arbitrary edit-distance-1 typos (`Stephansplatz` vs `Stehansplatz`) | Not a regular orthographic pattern; needs batch clustering or a street gazetteer — separate decision. |
| Cross-locality merges | Same folded street in different PLZ/city stays distinct (area fields still in the key). |

## Acceptance

| ID | Paths (under `Wien/1010/`) | Same `groupingKey`? |
| --- | --- | --- |
| SF-01 | `Wasagasse 4/…` vs `Wasagase 4/…` | **Yes** |
| SF-02 | `Wasagasse 4 (1)/…` vs `Wasagase 4 (2)/…` | **Yes** (after copy-suffix strip + fold) |
| SF-03 | `Wasagasse 4/…` vs `Neubaugasse 4/…` | **No** |
| SF-04 | Flat `street` on `Wasagasse 4` path | Still `Wasagasse` (S4) |

## Status

Implementation follows this supplement; red-first SF-01.
