# Spec size backlog (≥400 lines)

**Status (2026-09-08):** `npm run lint:specs` exits **1** — **201 errors, 32 warnings across 183 specs**, mostly `spec-max-lines` and missing required sections. The "green after the supplement sweep" line this replaces had been false long enough that nobody noticed; the check ran only on `docs/specs/**` PRs, so it was rarely seen failing.

It is wired into `npm run verify` as a **soft** check (reports, does not fail the run) until this backlog is worked off — see `scripts/verify.mjs` and [`docs/audits/2026-09-08-grundriss-adoption.md`](../audits/2026-09-08-grundriss-adoption.md) § A5. **Do not add to the debt:** a spec you touch must leave the linter no worse than you found it.

**Lint excludes (non–element-spec):** `system/security/**`, `GOVERNANCE-*.md`, `service/location-resolver/address-resolver.md`, `search-algorithm-addresses-and-places.md`, `system/user-lifecycle.md`, `spec-size-backlog.md`, `*.deep-dive.md`, `upload-manager-pipeline.data.md`, and **any** `*.supplement.md` (split-out bodies linked from parents). See `shouldIncludeSpecFile` in `scripts/lint-specs.mjs`.

## Done (parents slim; overflow in linked supplements)

| Parent | Supplement(s) |
| ------ | ---------------- |
| `service/workspace-view/workspace-view-system.md` | `workspace-view-system.deep-dive.md` |
| `service/media-upload-service/upload-manager-pipeline.md` | `upload-manager-pipeline.data.md` |
| `service/media-download-service/media-download-service.md` | `media-download-service.data-requirements.supplement.md` |
| `ui/media-marker/media-marker.md` | `media-marker.viewport-and-clustering.supplement.md` |
| `component/media/media-display.md` | `media-display.rendering-matrix.supplement.md` |
| `component/filters/grouping-dropdown.md` | `grouping-dropdown.drag-and-state-machine.supplement.md` |
| `component/media/file-type-chips.md` | `file-type-chips.lookup-table.supplement.md` |
| `ui/search-bar/search-bar-data-and-service.md` | `search-bar-data-and-service.ranking-metrics.supplement.md` |
| `ui/workspace/workspace-actions-bar.md` | `workspace-actions-bar.sql-contracts.supplement.md` |
| `ui/media-detail/media-detail-media-viewer.md` | `media-detail-media-viewer.progressive-loading.supplement.md` |
| `component/filters/dropdown-system.md` | `dropdown-system.class-library.supplement.md` |

Refresh: `npm run lint:specs`.
