# Spec Outdated Audit (2026-04-04)

This audit lists all files under `docs/element-specs/**` and flags what is currently outdated against the structure contract in `docs/element-specs/README.md`.

## Outdated Rules

- `OUTDATED` (only for `ELEMENT_SPEC`) when at least one of these is true:
  - missing one or more required core sections (`What It Is`, `What It Looks Like`, `Where It Lives`, `Actions`, `Component Hierarchy`, `Data`, `State`, `File Map`, `Wiring`, `Acceptance Criteria`)
  - contains `deprecated` marker
- `REVIEW` when not outdated but contains legacy/archive references that should be confirmed before archive cleanup
- `INDEX` for governance/module-index/audit docs (core-section rule intentionally not applied)
- `OK` when none of the above applies

## Summary

- Total files: 101
- ELEMENT_SPEC files: 79
- OUTDATED: 29
- REVIEW: 2
- INDEX: 22
- OK: 48

## Full Table

| File                                                                           | Type         | Status   | Why outdated/review                      | Missing core sections  |
| ------------------------------------------------------------------------------ | ------------ | -------- | ---------------------------------------- | ---------------------- |
| docs/element-specs\account-page.md                                             | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\account-settings-section.md                                 | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\action-context-matrix.md                                    | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions                |
| docs/element-specs\active-filter-chips.md                                      | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\active-selection-view.md                                    | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\auth-map-background.md                                      | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\captured-date-editor.md                                     | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\card-variant-system.md                                      | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\chip.md                                                     | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions, Data          |
| docs/element-specs\custom-metadata.md                                          | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\custom-properties.md                                        | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\drag-divider.md                                             | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\dropdown-system.md                                          | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\filename-parser\filename-parser.md                          | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions                |
| docs/element-specs\filename-parser\README.md                                   | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\file-type-chips.md                                          | ELEMENT_SPEC | OUTDATED | missing core sections                    | State                  |
| docs/element-specs\filter\README.md                                            | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\filter-dropdown.md                                          | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\filter-panel.md                                             | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\folder-scan\folder-scan.md                                  | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions                |
| docs/element-specs\folder-scan\README.md                                       | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\gallery-view.md                                             | ELEMENT_SPEC | OUTDATED | missing core sections, deprecated marker | Data                   |
| docs/element-specs\geocoding\README.md                                         | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\gps-button.md                                               | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\grouping-dropdown.md                                        | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\group-tab-bar.md                                            | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\invite-only-registration.md                                 | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions, Data          |
| docs/element-specs\item-grid.md                                                | ELEMENT_SPEC | REVIEW   | legacy/archive references                | -                      |
| docs/element-specs\item-state-frame.md                                         | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\language-locale-settings.md                                 | ELEMENT_SPEC | OUTDATED | missing core sections                    | Data                   |
| docs/element-specs\location-path-parser\location-path-parser.md                | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions                |
| docs/element-specs\location-path-parser\README.md                              | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\location-resolver\README.md                                 | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\map-context-menu.md                                         | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions, Data          |
| docs/element-specs\map-secondary-click-system.md                               | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions, Data          |
| docs/element-specs\map-shell.md                                                | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\map-zone.md                                                 | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\media-delivery-orchestrator.md                              | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions                |
| docs/element-specs\media-detail\media-detail-actions.md                        | ELEMENT_SPEC | OUTDATED | missing core sections                    | Data, File Map, Wiring |
| docs/element-specs\media-detail\media-detail-inline-editing.md                 | ELEMENT_SPEC | OUTDATED | missing core sections                    | Data, File Map, Wiring |
| docs/element-specs\media-detail\media-detail-media-viewer.md                   | ELEMENT_SPEC | OUTDATED | missing core sections                    | Data, File Map         |
| docs/element-specs\media-detail\media-detail-view.md                           | ELEMENT_SPEC | OUTDATED | missing core sections                    | Data, Wiring           |
| docs/element-specs\media-detail\README.md                                      | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\media-download\adapters\edge-export-orchestrator.adapter.md | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions, Data          |
| docs/element-specs\media-download\adapters\signed-url-cache.adapter.md         | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions, Data          |
| docs/element-specs\media-download\adapters\tier-resolver.adapter.md            | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions, Data          |
| docs/element-specs\media-download\media-download-service.md                    | ELEMENT_SPEC | OUTDATED | missing core sections, deprecated marker | Actions, Data          |
| docs/element-specs\media-download\README.md                                    | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\media-item.md                                               | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions                |
| docs/element-specs\media-item-quiet-actions.md                                 | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\media-item-upload-overlay.md                                | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\media-location-update\README.md                             | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\media-marker\media-marker.md                                | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions                |
| docs/element-specs\media-marker\media-marker-context-menu.md                   | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions, Data          |
| docs/element-specs\media-marker\README.md                                      | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\media-marker-draft-flow.md                                  | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions, Data          |
| docs/element-specs\media-page.md                                               | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions, Data          |
| docs/element-specs\media-preview\README.md                                     | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\media-query\README.md                                       | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\placement-mode.md                                           | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\project-color-picker.md                                     | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions, Data          |
| docs/element-specs\project-details-view.md                                     | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions, Data          |
| docs/element-specs\project-item.md                                             | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions                |
| docs/element-specs\project-mixed-media-pre-spec.md                             | ELEMENT_SPEC | REVIEW   | legacy/archive references                | -                      |
| docs/element-specs\projects-dropdown.md                                        | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\projects-page.md                                            | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\property-registry.md                                        | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\qr-invite-flow.md                                           | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\radius-selection.md                                         | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\README.md                                                   | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\search-bar\README.md                                        | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\search-bar\search-bar.md                                    | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\search-bar\search-bar-data-and-service.md                   | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\search-bar\search-bar-query-behavior.md                     | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\search-bar\search-tuning-settings.md                        | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\segmented-switch.md                                         | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\settings-overlay.md                                         | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\settings-page.md                                            | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\settings-pane\README.md                                     | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\share-set\README.md                                         | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\shortcut-reference-settings.md                              | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\sidebar.md                                                  | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\sort-dropdown.md                                            | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\spec-outdated-audit-2026-04-04.md                           | AUDIT        | INDEX    | -                                        | -                      |
| docs/element-specs\theme-toggle.md                                             | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\thumbnail-grid.md                                           | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\toast\README.md                                             | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\toast-system.md                                             | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\upload-button-zone.md                                       | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\upload-manager\README.md                                    | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\upload-manager\upload-manager.md                            | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\upload-manager\upload-manager-pipeline.md                   | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\upload-panel.md                                             | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\user-location-marker.md                                     | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\user-profile\README.md                                      | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\workspace/workspace-actions-bar.md                          | ELEMENT_SPEC | OUTDATED | missing core sections                    | Actions, Data          |
| docs/element-specs\workspace/workspace-pane.md                                 | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\workspace-selection\README.md                               | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\workspace/workspace-toolbar.md                              | ELEMENT_SPEC | OK       | -                                        | -                      |
| docs/element-specs\workspace-view\README.md                                    | MODULE_INDEX | INDEX    | -                                        | -                      |
| docs/element-specs\workspace/workspace-view-system.md                          | ELEMENT_SPEC | OK       | -                                        | -                      |
