# Address Resolution Model

> **Status:** Active — parent contract for upload location placement.  
> **Implementation roadmap:** Cursor plan `tray_bundle_and_pipeline` (do not duplicate normative bodies here vs child specs).

## Purpose

Defines the **8-step** upload address resolution flow, hierarchical completeness for stored locations, explicit non-goals, Branch C tray semantics (5a–5c), and the **tray enqueue contract**.

Child specs hold detail; this document is the index and cross-cutting rules.

## Related specs

| Topic | Spec |
| --- | --- |
| Search Object | [upload-search-object.md](./upload-search-object.md) |
| Pipeline steps | [upload-address-resolution-pipeline.md](./upload-address-resolution-pipeline.md) |
| Job routing | [upload-manager-pipeline.location-routing.supplement.md](./upload-manager-pipeline.location-routing.supplement.md) |
| Config | [upload-location-config.md](./upload-location-config.md) |
| Tray bundles | [upload-resolver-tray-orchestrator.md](./upload-resolver-tray-orchestrator.md) |
| Tray FSM | [upload-resolver-tray.stepper-fsm.supplement.md](../../component/upload/upload-resolver-tray.stepper-fsm.supplement.md) |
| Token normalizer | [../token-normalizer/token-normalizer.md](../token-normalizer/token-normalizer.md) |
| Local geo (AT) | [upload-address-resolution.local-geo.md](./upload-address-resolution.local-geo.md) |

## Hierarchical completeness

Every `locations` row must be complete **upward**:

`doorNumber` / `stair` / `houseNumber` → `street` → (`city` OR `municipality`) → `state` → `country`.

Gaps are allowed only at **higher** tiers, never below without the parent tier.

## Explicit non-goals

- **Project location is not an address fallback.** `project_locations` centroid is **only** Branch B Photon bias — media never inherit project address automatically.
- **Nominatim removal** — deferred until Photon-only path is validated (last migration step).

## Eight-step flow

| Step | Action | Tray |
| --- | --- | --- |
| 1 | Parse folder/filename → SO; Token Normalizer (canonical); `grouping_key`; filename wins | — |
| 2 | EXIF lat/lon/date locally → `exifCoords`; not sent to Photon | — |
| 3 | Content hash → tag duplicate; **job continues** | — |
| 4 | EXIF reverse `lang=en`; superset vs SO or EXIF-only | — |
| 5 | Photon when `street`; branches A/B/C; drop hits **> `contextDistanceMaxMeters`** from job anchor (org Search Tuning km cap) | See Branch C + enqueue contract |
| 6 | No street or tier-only SO → admin centroid; `locationPinEligible=false` | — |
| 7 | Placement + EXIF within `exifAssistRadiusMeters` (default **80 m**) → EXIF refines | — |
| 8 | `placementResolvedBy` → upload bytes | — |

## Tray enqueue contract (hard)

> `enqueueItem` may only be called **after** `classifySearchHits` in `runGeocodeForGroup`.  
> `classifyBatch` and `evaluateLocalResolution` set only `needsGeocode` or `metadata_only` — **never** `needsTray`.

## Branch C — street only (`country=AT`)

Photon input: `street` + `country=AT` (no city in SO).

| Photon hits | Tray | Placement |
| --- | --- | --- |
| 1 | None (auto-pick) | Street centroid; **5c** if `houseNumber` missing |
| N | **5b** numbered discriminating field; **5c** if house missing | After choices |
| 0 | 1A **text** fallback only | User / tier |

### 5a — Discriminating field (N hits only)

First field in this ranking that **differs** between candidates drives the question:

1. `city`  
2. `municipality`  
3. `district`  
4. `state`  
5. `postcode`

Implemented via `pickDiscriminatingField` / `pickCollapseStage` in `upload-location-resolution.helpers.ts`.

### 5b / 5c

- **5b (1A):** numbered options — **not** a default city text field.  
- **5c (1B):** only if `houseNumber` missing; second Photon `street` + locality; same `dialogueUnitId` as 5b when both run.

## Distance radii (two systems)

| Radius | Config | Unit | Role |
| --- | --- | --- | --- |
| Internet / geocode realism | `resolver.contextDistanceMaxMeters` | km in UI, m in DB | Org Search Tuning — anchor distance; search bar + **upload Step 5** far-hit rejection |
| EXIF fine-tune | `exifAssistRadiusMeters` | m | Upload config — pick/nudge among close geocode candidates |
| Text vs EXIF | `sourceAgreementRadiusMeters` | m | Upload config — source-conflict tray |

Normative detail: [search-tuning.distance-radii-contract.md](../search/search-tuning.distance-radii-contract.md).

## Settings

- **Upload location config (`exifAssistRadiusMeters`, `sourceAgreementRadiusMeters`)**: meter radii for EXIF fine-tune and text-vs-EXIF tray — not the org km slider ([upload-location-config.md](./upload-location-config.md)).
- **Org Search Tuning (`contextDistanceMaxMeters`)**: km cap for unrealistic Internet/upload geocode distance from anchor ([distance radii contract](../search/search-tuning.distance-radii-contract.md)).

## Open points

- DB columns `state` / `municipality` on `locations` (schema).
- Runtime hash vs `duplicate_of` column naming at persistence layer.
- Full Token Normalizer lookup seed (MVP uses local geo adapter).

## Acceptance criteria

- [ ] Branch C never opens tray from `classifyBatch` without Photon.
- [ ] Wolzeile-style folder: numbered city (or discriminating field) options after Photon.
- [ ] Project tray Step 2 removed; centroid bias only on Branch B.
- [ ] `notifyScanIdle` after pre-resolve wave, not immediately after `classifyBatch`.
- [ ] Bundle caps: 5 s max window, 5 dialogue units max; 1A+1B = one unit.
