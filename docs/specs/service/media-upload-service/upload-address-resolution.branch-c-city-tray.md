# Branch C — city tray before source conflict

> **Parent:** [address-resolution-model.md](./address-resolution-model.md)  
> **Phase:** 2 (after layer packages)

## Purpose

When Photon returns a **single** auto hit for Branch C, wrong-city assignment must not skip straight to `disambiguationKind: source` (text vs EXIF km apart).

## Decision table

| ID | Condition | `trayRequired` |
| --- | --- | --- |
| CITY-01 | `geocodeBranch === 'branch_c'` AND `classifySearchHits` → `auto` AND `!searchObject.houseNumber` AND `searchObject.city` is null AND `autoCandidate.city` is non-null AND normalized `autoCandidate.city` ≠ normalized reverse-geocode city of EXIF (when EXIF present) | **true** → `ambiguous`, `trayStep: 1a`, `discriminatingField: city` |
| CITY-02 | Same as CITY-01 but no EXIF metadata | **false** (auto assign) |
| CITY-03 | Multiple Photon hits (`ambiguous`) | existing city_step path |

Implementation MUST reference row IDs in code comments (`@see` this file).

## Acceptance

- [ ] Neustiftgasse folder + Wien EXIF: user sees city/disambiguation before source tray when CITY-01 applies.
