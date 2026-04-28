# Spec size backlog (≥400 lines)

**Status:** `npm run lint:specs` is **green** (0 errors, 0 warnings) as of the supplement sweep.

**Lint excludes (non–element-spec):** `system/security/**`, `GOVERNANCE-*.md`, `service/location-resolver/address-resolver.md`, `search-algorithm-addresses-and-places.md`, `system/user-lifecycle.md`, `spec-size-backlog.md`, `*.deep-dive.md`, `upload-manager-pipeline.data.md`, and **any** `*.supplement.md` (split-out bodies linked from parents). See `shouldIncludeSpecFile` in `scripts/lint-specs.mjs`.

## Done (parents slim; overflow in linked supplements)

| Parent | Supplement(s) |
| ------ | ---------------- |
| `service/workspace-view/workspace-view-system.md` | `workspace-view-system.deep-dive.md` |
| `service/media-upload-service/upload-manager-pipeline.md` | `upload-manager-pipeline.data.md` |
| `service/media-download-service/media-download-service.md` | `media-download-service.data-requirements.supplement.md` |
| `ui/media-marker/media-marker.md` | `media-marker.viewport-and-clustering.supplement.md` |
| `component/media-display.md` | `media-display.rendering-matrix.supplement.md` |
| `component/grouping-dropdown.md` | `grouping-dropdown.drag-and-state-machine.supplement.md` |
| `component/file-type-chips.md` | `file-type-chips.lookup-table.supplement.md` |
| `ui/search-bar/search-bar-data-and-service.md` | `search-bar-data-and-service.ranking-metrics.supplement.md` |
| `ui/workspace/workspace-actions-bar.md` | `workspace-actions-bar.sql-contracts.supplement.md` |
| `ui/media-detail/media-detail-media-viewer.md` | `media-detail-media-viewer.progressive-loading.supplement.md` |
| `component/dropdown-system.md` | `dropdown-system.class-library.supplement.md` |

Refresh: `npm run lint:specs`.
