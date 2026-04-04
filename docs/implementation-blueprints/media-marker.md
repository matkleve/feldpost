# Media Marker — Implementation Blueprint
> **Spec**: [element-specs/media-marker.md](../element-specs/media-marker/media-marker.md)
> **Status**: Core marker rendering is implemented. This blueprint should only keep follow-up work and rollout notes that do not belong in the spec.

## Why This Blueprint Still Exists

The spec already owns the marker contract. This blueprint is only useful for follow-up areas where the implementation is incomplete, risky, or likely to change shape.

## Current Implemented Base

| File                                              | What it provides                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `core/map/marker-factory.ts`                      | DivIcon HTML generation and marker geometry constants                               |
| `features/map/map-shell/map-shell-helpers.ts`     | Marker helper types, viewport request shaping, icon building, cluster merge helpers |
| `features/map/map-shell/map-shell.component.ts`   | Marker lifecycle, viewport querying, click handling, refresh behavior               |
| `features/map/map-shell/map-shell.component.scss` | Marker CSS classes and visual states                                                |
| `core/photo-load.service.ts`                      | Signed thumbnail loading and placeholder/loading state support                      |

## Remaining Follow-Up Areas

### 1. Selection parity and cluster behavior

Keep track of gaps between the marker contract and the final intended workspace-selection behavior, especially multi-select parity and cluster-open flows.

### 2. Context and correction interactions

Context-menu and correction-mode behavior should remain follow-up implementation areas unless they are fully stabilized in code and promoted into the spec as part of the normal contract.

### 3. Animation and reconciliation polish

Marker split/merge/reposition animation details are sensitive to performance and should stay as rollout notes here until they are stable enough to be treated as durable contract.

## Guardrails For Future Changes

- Do not use this file as a dump of current private methods or type signatures.
- Keep the spec authoritative for user-visible marker behavior.
- Only keep implementation notes here when they help rollout, performance tuning, or unresolved interaction design.
