# Media Renderer System - Implementation Blueprint

## Goal

Introduce one shared media rendering architecture with:

- a single `FileTypeRegistry`
- a shared `MediaOrchestratorService`
- a universal `UniversalMediaComponent`
- incremental migration of all existing surfaces

This blueprint follows the archived legacy contract in `docs/archive/element-specs-legacy/media-renderer-system.md` and is superseded in active runtime by `docs/element-specs/media-download/media-download-service.md` plus `docs/element-specs/item-grid.md`/`docs/element-specs/media-item.md`.

## Non-Goals

- No big-bang rewrite of all existing components in one PR.
- No visual redesign of unrelated controls.
- No direct schema migration unless tiered asset fields are approved.

## Current Status (2026-03-27)

| Phase | Status      | Notes                                                                                                                                                                                    |
| ----- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Done        | Shared contracts and tier model defined in `media-renderer.types.ts`.                                                                                                                    |
| 1     | Done        | `file-type-registry.ts` is live and consumed by upload feature paths.                                                                                                                    |
| 2     | Done        | `media-orchestrator.service.ts` exists with fallback logic and adaptive slot-based tier selection API.                                                                                   |
| 3     | Done        | `UniversalMediaComponent` complete; thumbnail-card, media-detail-media-viewer, upload-panel-item, and media-card consumers integrated.                                                   |
| 4     | Done        | Upload-panel-item surface fully migrated; slot measurement (inline/2.75rem) working; adaptive tier gating applied.                                                                       |
| 5     | Done        | Media-card surface fully migrated (4 variants: row/small/medium/large); adaptive tier selection (inline→mid2) applied; shared upload overlay now rendered via `UniversalMediaComponent`. |
| 6     | In progress | Final cleanup and hardening pending; primary surfaces are migrated, docs still need legacy `image-detail-*` duplicate removal, and high-tier fallback/prerender behavior remains open.   |

## Phase Plan

| Phase | Goal                           | Main Deliverables                                                                                 | Files (target)                                                                                     | Exit Criteria                                                                                                                                                           |
| ----- | ------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Stabilize contracts            | Freeze naming + tier enum + state model                                                           | `core/media/file-type-registry.ts`, `core/media/media-renderer.types.ts`                           | Shared types compile and are imported by at least one existing feature without behavior change                                                                          |
| 1     | Introduce registry             | Single source of truth for file type color/icon/aspect-ratio/mime aliases                         | `core/media/file-type-registry.ts`; adapters in upload helpers                                     | No duplicate switch maps remain in new code paths; old maps marked for migration                                                                                        |
| 2     | Build orchestrator facade      | Wrap `PhotoLoadService`, `MediaPreviewService`, upload overlay bridge, and adaptive tier selector | `core/media/media-orchestrator.service.ts`                                                         | Consumer can request render state by `{fileRef,tier}` and get deterministic fallback behavior; component-measured slot size can be used to select capped effective tier |
| 3     | Build universal component      | New shared renderer with stable DOM, context variants, layered states                             | `shared/media/universal-media.component.ts/.html/.scss`                                            | Component works for image, document fallback, and upload-progress overlay                                                                                               |
| 4     | Migrate upload and grid        | Replace local render logic in upload rows and thumbnail cards                                     | `features/upload/upload-panel-item.component.*`, `features/map/workspace-pane/thumbnail-card/*`    | Existing tests pass and visual parity is maintained for upload + workspace grid                                                                                         |
| 5     | Migrate media cards and detail | Replace media card and detail preview rendering path                                              | `features/media/media-card.component.*`, `features/map/workspace-pane/media-detail-photo-viewer/*` | Progressive loading path is fully driven by orchestrator; no direct per-component signing logic                                                                         |
| 6     | Cleanup and hardening          | Remove duplicate maps, dead paths, add regression tests, docs sync                                | related legacy helpers/specs/tests                                                                 | All target surfaces use universal component; lint + tests + build green                                                                                                 |

## Test Gates per Phase

- Unit tests for registry mapping and tier fallback decisions.
- Unit tests for slot-size driven adaptive tier selection (including requested-tier cap behavior).
- Component tests for universal renderer states (`placeholder`, `icon-only`, `loading`, `loaded`, `error`).
- Upload regression tests for in-progress overlays and replace/attach instant update behavior.
- Existing upload panel and workspace thumbnail tests stay green.

## Rollout Strategy

- Keep compatibility adapters during phases 1-5.
- Migrate one surface at a time behind a small feature flag if needed.
- Do not remove legacy code until replacement surface tests are passing.

## Risks and Mitigations

- Risk: subtle visual regressions across contexts.
  - Mitigation: context snapshots and explicit CSS variant contracts.
- Risk: upload and detail paths diverge in edge cases.
  - Mitigation: shared orchestrator state model and contract tests.
- Risk: tier request can over-fetch high-res assets.
  - Mitigation: strict fallback chain, requested-tier cap, and lazy high-tier prerender trigger.
