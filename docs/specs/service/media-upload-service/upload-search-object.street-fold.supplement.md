# Upload search object — street spelling fold for grouping

> **Parent:** [upload-search-object.md](./upload-search-object.md) · [upload-search-object.evidence-model.md](./upload-search-object.evidence-model.md) · [copy-suffix](./upload-search-object.copy-suffix.supplement.md)

After Windows `(N)` stripping, company archives still split one place across **spellings of the
same street name**:

```
Mariahilfer Straße 4 / Mariahilfer Straße 4 (1) / …
Mariahilfer Strasse 4 / Mariahilfer Strasse 4 (1) / …   ← same street, ß written as ss
```

`ß`/`ss` and `str.`/`straße` are two ways of writing one name, so they MUST share one
`groupingKey` and the batch geocodes and asks once. This is **not** Fuse fuzzy matching: it is a
**deterministic orthographic fold** on the street component of the key.

What it is **not** is a typo corrector. A dropped or doubled letter changes the name, and the key
has no evidence to decide whether that new name is a mistake or a different street.

## Contract (MUST)

| # | Rule |
| --- | --- |
| **S1** | When building `groupingKey`, the street part **MUST** pass through `normalizeStreetForGroupingKey` (not only trim/lower/NFKD). |
| **S2** | The fold **MUST** be exactly `foldStreetSpelling`: case, diacritics, `ß` → `ss`, whitespace, and `str`/`str.` → `strasse`. |
| **S3** | The fold **MUST NOT** apply edit-distance or letter-run rules. Two names that differ by a letter are two keys. |
| **S4** | Flat `street` on the Search Object **MAY** keep the path spelling (display / evidence). Only the **key** is folded — geocode still runs once per group. |
| **S5** | Layer-package **compare** (`normalizeStreetLevelValue`) folds the `street` field only. `houseNumber`, `staircase` and `door` are identifiers and are compared as written — `11` and `1` are two addresses and MUST still raise a package conflict. |

## Rejected: letter-run collapse

Collapsing consecutive duplicate letters (`wasagasse` → `wasagase`) was implemented in
[PR #209](https://github.com/matkleve/feldpost/pull/209) and reverted. It merges addresses that
are not the same address:

| Measured | Result |
| --- | --- |
| 5 020 distinct Vienna street names (OSM/Overpass, 2026-09-16) | collision clusters rise from 8 (`foldStreetSpelling`) to 13 |
| New collisions include | `Bischofgasse` + `Bischoffgasse` (both 1120 Wien), `1. Haidequerstraße` + `11. Haidequerstraße` (both 1110 Wien) |
| Effect on the key | two real buildings share one `groupingKey`, so one geocode result is written to media at the other address — silently, with no tray |
| Effect on layer compare | `Annenstraße 11` (folder) vs `Annenstraße 1` (filename) stopped conflicting: `11` collapses to `1`, so a genuine disagreement was answered instead of asked |

The rule is not recoverable by tuning: a fold is symmetric, so it cannot express "this spelling is
the mistake". Merging archive typos needs evidence the key does not have — a street gazetteer for
the locality, or clustering within the batch. That is a separate decision, not this supplement.

## Out of scope

| Topic | Why |
| --- | --- |
| Arbitrary typos (`Wasagasse` vs `Wasagase`, `Stephansplatz` vs `Stehansplatz`) | Not an orthographic variant of one name. Needs a street gazetteer or batch clustering — see Rejected above. |
| Cross-locality merges | Same folded street in different PLZ/city stays distinct (area fields still in the key). |

## Acceptance

| ID | Paths (under `Wien/1010/` unless noted) | Same `groupingKey`? |
| --- | --- | --- |
| SF-01 | `Mariahilfer Straße 4/…` vs `Mariahilfer Strasse 4/…` | **Yes** |
| SF-02 | `Wilhelminenstr 141/…` vs `Wilhelminenstraße 141/…` | **Yes** |
| SF-03 | `Mariahilfer Straße 4 (1)/…` vs `Mariahilfer Strasse 4 (2)/…` | **Yes** (copy-suffix strip + fold) |
| SF-04 | Flat `street` on `Mariahilfer Straße 4` path | Still `Mariahilfer Straße` (S4) |
| SF-05 | `Wasagasse 4/…` vs `Wasagase 4/…` | **No** (S3) |
| SF-06 | `Wien/Bischofgasse 12/…` vs `Wien/Bischoffgasse 12/…` | **No** (S3) |
| SF-07 | `Wasagasse 4/…` vs `Neubaugasse 4/…` | **No** |

Layer compare (S5): `Graz/Annenstraße 11/Annenstraße 1 Detail.jpg` MUST report a package conflict.

## Status

**Implemented 2026-09-16, corrected 2026-09-16** — `normalizeStreetForGroupingKey` in
`location-path-parser.util.ts` is `foldStreetSpelling` with a null guard; used by `buildGroupingKey`
and, for the `street` field only, by `normalizeStreetLevelValue`. Acceptance SF-01…SF-07 in
`upload-search-object.builder.spec.ts`; S5 in `upload-search-object.layer-map.spec.ts`.

**Follow-up 2026-09-20.** The fold left two older tests red on `main`, in
`upload-search-object.builder.spec.ts` and `upload-search-object.unit-parsing.integration.spec.ts`.
Neither is about street spelling — both used "`groupingKey` contains `neustiftgasse`" as shorthand
for *the street landed in the key*, which S3 made false. They now assert the **folded** form in the
key **and** the path spelling on flat `street`, so each one pins S3 and S4 together instead of
assuming which form lands where. The code was not changed: S3 says the key folds, so the key was
right and the assertions were stale.
