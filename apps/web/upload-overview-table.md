| File | Length | Issues | Split | Combine | Other possible improvements | Priority |`n|---|---:|---|---|---|---|---|`n| src/app/core/upload/upload-manager.service.ts | 656 | none | yes | no | largest upload orchestrator; split by phase adapter | P1 |
| src/app/core/upload/upload.service.spec.ts | 511 | none | yes | no | - | P1 |
| src/app/features/upload/upload-panel.component.scss | 482 | none | yes | no | - | P1 |
| src/app/core/upload.service.ts | 456 | none | yes | yes (with src/app/core/upload/upload.service.ts or retire) | lint error: unused parameter projectId | P1 |
| src/app/core/upload/upload-manager.service.spec.ts | 416 | none | yes | no | 10 known baseline test fails in focused suite | P1 |
| src/app/features/upload/upload-panel.component.html | 328 | none | yes | no | extract dialog sections into sub-components | P1 |
| src/app/features/upload/upload-panel-item.component.ts | 321 | none | yes | no | extract menu position + renderer mapping blocks | P1 |
| src/app/features/upload/upload-panel-dialog-actions.service.ts | 290 | none | yes | no | - | P2 |
| src/app/core/upload/upload.service.ts | 223 | none | yes | maybe (consolidate legacy upload.service.ts) | - | P2 |
| src/app/features/upload/upload-panel-dialog-handlers.service.ts | 213 | none | yes | yes (replace/retire in favor of dialog-actions service) | currently has lint error (unused type) | P2 |
| src/app/core/upload/upload-manager.types.ts | 212 | none | yes | no | - | P2 |
| src/app/features/upload/upload-panel-item.component.scss | 212 | none | yes | no | - | P2 |
| src/app/core/upload/upload-new-run-upload-phase.util.ts | 211 | none | yes | no | - | P2 |
| src/app/core/upload/upload-new-prepare-route.util.ts | 206 | none | yes | no | - | P2 |
| src/app/core/upload/upload-attach-pipeline.service.ts | 204 | none | yes | no | - | P2 |
| src/app/core/upload/upload-replace-pipeline.service.ts | 201 | none | yes | no | - | P2 |
| src/app/core/upload/upload.service.util.ts | 191 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel.component.ts | 182 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-item-helpers.ts | 159 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-item.component.html | 156 | none | no | no | a11y warning on click/key/focus parity | P3 |
| src/app/features/upload/upload-panel-job-file-actions.service.ts | 151 | none | no | no | - | P3 |
| src/app/core/upload/upload-job-state.service.ts | 150 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel.placement.spec.ts | 139 | none | no | no | - | P3 |
| src/app/core/upload/upload-batch.service.ts | 125 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel.drag-lanes.spec.ts | 125 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel.creation-dom.spec.ts | 116 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-job-actions.service.ts | 116 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-helpers.ts | 114 | none | no | no | - | P3 |
| src/app/core/upload/upload-new-pipeline.service.ts | 110 | none | no | no | - | P3 |
| src/app/core/upload/upload-new-post-save.util.ts | 110 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-menu-action-router.service.ts | 103 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel.test-utils.spec.ts | 91 | none | no | no | - | P3 |
| src/app/core/upload/upload-attach-record-update.util.ts | 90 | none | no | no | - | P3 |
| src/app/core/upload/upload-attach-record-update-runner.util.ts | 90 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-setup.service.ts | 90 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-input-handlers.ts | 88 | none | no | no | - | P3 |
| src/app/core/upload/upload-attach-post-update.util.ts | 83 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-dialog-signals.service.ts | 82 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-view-model.service.ts | 81 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-lifecycle.service.ts | 74 | none | no | no | - | P3 |
| src/app/features/upload/upload-phase.helpers.ts | 71 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel.status.spec.ts | 70 | none | no | no | - | P3 |
| src/app/core/upload/upload-storage.service.ts | 69 | none | no | no | - | P3 |
| src/app/core/upload/upload-attach-finalize.util.ts | 68 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-bulk-actions.service.ts | 67 | none | no | no | - | P3 |
| src/app/features/map/workspace-pane/media-detail-upload.helper.spec.ts | 64 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel.constants.ts | 59 | none | no | no | - | P3 |
| src/app/core/upload/upload-enrichment.service.ts | 57 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-row-interactions.service.ts | 54 | none | no | no | - | P3 |
| src/app/core/upload/upload-conflict.service.ts | 53 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-registration.service.ts | 53 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-row-handlers.ts | 53 | none | no | no | - | P3 |
| src/app/features/map/workspace-pane/media-detail-upload.helper.ts | 51 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel.intake.spec.ts | 49 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-state.service.ts | 49 | none | no | no | - | P3 |
| src/app/core/upload/upload-enrichment.service.spec.ts | 47 | none | no | no | - | P3 |
| src/app/core/upload/upload-db-postwrite.util.ts | 44 | none | no | no | - | P3 |
| src/app/core/upload/upload-attach-enrichment.util.ts | 41 | none | no | no | - | P3 |
| src/app/core/upload/upload-file-types.ts | 41 | none | no | no | - | P3 |
| src/app/core/upload/upload-address-resolve.util.ts | 39 | none | no | no | - | P3 |
| src/app/core/upload/upload.types.ts | 38 | none | no | no | - | P3 |
| src/app/core/upload/upload-attach-update-data.util.ts | 37 | none | no | no | - | P3 |
| src/app/core/upload/upload-queue.service.ts | 35 | none | no | no | - | P3 |
| src/app/core/upload/upload-cancelled-storage-cleanup.util.ts | 34 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-signals.service.ts | 30 | none | no | no | - | P3 |
| src/app/core/upload/upload-notification.service.ts | 28 | none | no | no | - | P3 |
| src/app/core/upload/upload-dedup-skip.util.ts | 26 | none | no | no | - | P3 |
| src/app/core/upload/upload-attach-existing-row.util.ts | 22 | none | no | no | - | P3 |
| src/app/core/upload/upload-replace-update-data.util.ts | 21 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-lane-handlers.ts | 20 | none | no | no | - | P3 |
| src/app/core/upload/upload-timeout.util.ts | 19 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel-utils.ts | 18 | none | no | no | - | P3 |
| src/app/core/upload/upload-attach-hash.util.ts | 17 | none | no | no | - | P3 |
| src/app/features/upload/upload-panel.types.ts | 15 | none | no | no | - | P3 |
| src/app/core/upload/upload-manager-queue.util.ts | 10 | none | no | no | - | P3 |
| src/app/core/upload/upload-cancelled.util.ts | 4 | none | no | no | - | P3 |

