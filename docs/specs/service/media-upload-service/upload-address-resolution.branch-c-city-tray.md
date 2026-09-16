# `street_only` — city tray before source conflict

> **Parent:** [address-resolution-model.md](./address-resolution-model.md)  
> **Phase:** 2 (after layer packages)
> **Note (2026-09-13):** this file's name predates the `street_locality`/`street_project_bias`/`street_only`/`area_only` rename (was `branch_a`/`branch_b`/`branch_c`/`metadata_only`) — kept as-is so links from dated audit records under `docs/audits/` do not break; the content below uses current terminology.

## Purpose

When Photon returns a **single** auto hit for `street_only`, wrong-city assignment must not skip straight to `disambiguationKind: source` (text vs EXIF km apart).

## Decision table

| ID | Condition | `trayRequired` |
| --- | --- | --- |
| CITY-01 | `geocodeBranch === 'street_only'` AND `classifySearchHits` → `auto` AND `!searchObject.houseNumber` AND `searchObject.city` is null AND `autoCandidate.city` is non-null AND normalized `autoCandidate.city` ≠ normalized reverse-geocode city of EXIF (when EXIF present) | **true** → `ambiguous`, `trayStep: 1a`, `discriminatingField: city` |
| CITY-02 | Same as CITY-01 but no EXIF metadata | **false** (auto assign) |
| CITY-03 | Multiple Photon hits (`ambiguous`) | existing city_step path |

Implementation MUST reference row IDs in code comments (`@see` this file).

## Acceptance

- [x] Neustiftgasse folder + Wien EXIF: user sees city/disambiguation before source tray when CITY-01 applies — `shouldForceStreetOnlyCityTray` compares normalized EXIF reverse-geocode city vs `autoCandidate.city`; `buildStreetOnlyCity01Candidates` injects both cities; vitest `upload-location-resolution.helpers.spec.ts` § `shouldForceStreetOnlyCityTray (CITY-01)`.
