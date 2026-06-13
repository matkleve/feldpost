# Address Resolution Model

> **Status:** Active — parent contract for upload location placement.  
> **Implementation roadmap:** Cursor plan `tray_bundle_and_pipeline` (do not duplicate normative bodies here vs child specs).

## Purpose

Defines the **8-step** upload address resolution flow, hierarchical completeness for stored locations, explicit non-goals, Branch C tray semantics (5a–5c), and the **tray enqueue contract**.

Child specs hold detail; this document is the index and cross-cutting rules.

## Related specs

| Topic | Spec |
| --- | --- |
| **Contradiction model** | [contradiction-resolution-model.md](./contradiction-resolution-model.md) — CSP philosophy, taxonomy (C1–C5, A1–A2, V1–V2), propagation lifecycle, open gaps |
| Search Object | [upload-search-object.md](./upload-search-object.md) |
| Layer packages | [upload-search-object.layer-map.md](./upload-search-object.layer-map.md) |
| Pipeline steps | [upload-address-resolution-pipeline.md](./upload-address-resolution-pipeline.md) |
| Job routing | [upload-manager-pipeline.location-routing.supplement.md](./upload-manager-pipeline.location-routing.supplement.md) |
| Config | [upload-location-config.md](./upload-location-config.md) |
| Tray bundles | [upload-resolver-tray-orchestrator.md](./upload-resolver-tray-orchestrator.md) |
| Tray FSM | [upload-resolver-tray.stepper-fsm.supplement.md](../../component/upload/upload-resolver-tray.stepper-fsm.supplement.md) |
| Token normalizer | [../token-normalizer/token-normalizer.md](../token-normalizer/token-normalizer.md) |
| Local geo (AT) | [upload-address-resolution.local-geo.md](./upload-address-resolution.local-geo.md) |

## Hierarchical completeness

Every `locations` row must be complete **upward**:

`door` / `staircase` / `houseNumber` → `street` → (`city` OR `municipality`) → `state` → `country` (nullable at each tier).

Gaps are allowed only at **higher** tiers, never below without the parent tier.

## Explicit non-goals

- **Project location is not an address fallback.** `project_locations` centroid is **only** Branch B Photon bias — media never inherit project address automatically.
- **Nominatim removal** — deferred until Photon-only path is validated (last migration step).

## Eight-step flow

| Step | Action | Tray |
| --- | --- | --- |
| 1 | Parse folder/filename → **layer packages**; resolve conflicts → flat SO; `grouping_key` | `layer_package` when competing path interpretations — **before** Step 5 |
| 2 | EXIF lat/lon/date locally → `exifCoords`; not sent to Photon | — |
| 3 | Content hash → tag duplicate; **job continues** | — |
| 4 | EXIF reverse `lang=en`; superset vs SO or EXIF-only | — |
| 5 | Photon when `street`; branches A/B/C; drop hits **> `contextDistanceMaxMeters`** from job anchor (org Search Tuning km cap) | See Branch C + enqueue contract |
| 6 | No street or tier-only SO → admin centroid; `locationPinEligible=false` | — |
| 7 | Placement + EXIF within `exifAssistRadiusMeters` (default **80 m**) → EXIF refines | — |
| 8 | `placementResolvedBy` → upload bytes | — |

## Contradiction resolution

The tray is a **contradiction resolver**, not an address picker. See [contradiction-resolution-model.md](./contradiction-resolution-model.md) for the full CSP philosophy, taxonomy of contradiction classes (C1–C5, A1–A2, V1–V2), propagation lifecycle, and resolution scope rules.

Key principle: when a user resolves a conflict at a given admin tier (e.g. city), the decision propagates to **all** jobs sharing that constraint violation — scoped by `(batchId, field, conflicting-value-set)`, not by `groupingKey`. This prevents asking the same question once per street under a shared postcode.

## Tray enqueue contract (hard)

| Tray kind | When enqueued |
| --- | --- |
| `layer_package` | End of `classifyBatch` when `detectPackageConflicts` — **before** Photon |
| Geocode / city / house | **After** `classifySearchHits` in `runGeocodeForGroup` |
| `source` | After text geocode + `finalizePlacementForJob` ([location-routing supplement](./upload-manager-pipeline.location-routing.supplement.md)) |

`classifyBatch` MUST NOT set `needsGeocode` while package conflicts are unresolved (`needsLayerResolution`).

## Cross-batch same-address dedup (open)

Disambiguation dedup (`groupingKey` → tray group) is currently scoped **per `batchId`** (`upload-address-resolution.orchestrator.ts` keeps one `batchCaches` map per batch; `upload-location-disambiguation-registration.service.ts` matches groups via `g.batchId === input.batchId && g.queryKey === input.queryKey`).

**Symptom:** If a second batch (e.g. a folder added shortly after the first, "nachschieben") contains jobs with the **same `groupingKey`** as a still-unresolved group in an earlier batch, the second batch's `classifyBatch` finds no `locations` row yet, runs its **own** Photon call and registers its **own** tray for the same physical address — the user can be asked the same address question twice, sometimes with different candidate text/order ("falscher Text wird gefragt").

**Required (not yet implemented):**

- Before registering a Branch B/C tray (`needsTray` / `ambiguous` / `city_step`) or a `layer_package` tray, `classifyBatch` / `runGeocodeForGroup` MUST check **other active batches** for an existing group with the same `groupingKey` (or `layerConflictQueryKey`).
- If found and **resolved** → reuse the resolved candidate/placement directly (no second Photon call, no tray).
- If found and **still open** (`needsLayerResolution` / `needsTray` / `ambiguous`) → merge the new `jobIds` into that existing group instead of opening a second tray; the existing tray's `candidates`/`discriminatingField`/title text apply to both batches.
- Implementation note: requires a session-scoped index `groupingKey → groupState` in addition to (or instead of) the per-`batchId` `batchCaches` map.

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

- [x] Branch C never opens tray from `classifyBatch` without Photon — `classifyBatch` only sets `needsGeocode`/`needsLayerResolution`/`partial`/`resolved`; tray registration happens only in `runGeocodeForGroup` (`upload-location-geocode-group.service.ts`).
- [x] Wolzeile-style folder: numbered city (or discriminating field) options after Photon — `pickDiscriminatingField` + `trayStep: '1a'` in `patchAmbiguousGeocodeOutcome` (`upload-location-geocode-outcome.util.ts`).
- [x] Project tray Step 2 removed; centroid bias only on Branch B — `classifyBatch` passes `projectCentroid` only when `local === 'branch_b'` (`upload-address-resolution.orchestrator.ts`).
- [x] `notifyScanIdle` after pre-resolve wave, not immediately after `classifyBatch` — `classifyBatch` is followed by `preResolveWave.resetWave(...)`; `notifyScanIdle` fires only via `notifyFirstTrayReady`/`completeJob` (`upload-pre-resolve-wave.service.ts`). See corrected wording in [upload-location-resolution.md](./upload-location-resolution.md).
- [x] Bundle caps: 5 s max window, 5 dialogue units max; 1A+1B = one unit — `PRESENTATION_BUNDLE_WINDOW_MS=5000`, `PRESENTATION_BUNDLE_MAX_DIALOGUE_UNITS=5`, shared `dialogueUnitId` via `dialogueUnitIdForGroup` (`upload-location-tray-producer.adapter.ts`).
- [ ] Same `groupingKey` across concurrent batches reuses one disambiguation group/result instead of opening a second tray (see "Cross-batch same-address dedup" above).
- [ ] **G1** Folder-to-folder sibling conflict detected when child SO inherits conflicting ancestry ([contradiction-resolution-model.md](./contradiction-resolution-model.md#open-gaps-implementation-required))
- [ ] **G2** Admin-level resolution fans out by `(batchId, field, conflicting-value-set)`, not just `group.jobIds` ([contradiction-resolution-model.md](./contradiction-resolution-model.md#resolution-scope-rules))
- [ ] **G3** Post-resolution validation gate: Photon probe before Step 5; V1 tray on 0 hits ([contradiction-resolution-model.md](./contradiction-resolution-model.md#post-resolution-validation-gate-gap-g3))
- [ ] **G4** Skip → `deferred` status persists through upload and is actionable in Media Detail ([contradiction-resolution-model.md](./contradiction-resolution-model.md#deferred-resolution-contract-gap-g4))
