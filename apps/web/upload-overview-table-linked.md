| File | Issues | Length | Split | Combine | Other possible improvements | Priority |`n|---|---|---:|---|---|---|---|`n| [src/app/core/upload.service.ts](src/app/core/upload.service.ts) | 1E/5W | 456 | yes | yes (retire or merge into core/upload/upload.service.ts) | remove unused projectId parameter | P0 |
| [src/app/features/upload/upload-panel-dialog-handlers.service.ts](src/app/features/upload/upload-panel-dialog-handlers.service.ts) | 1E/2W | 213 | yes | yes (retire in favor of dialog-actions service) | remove unused DuplicateResolutionChoice | P0 |
| [src/app/core/upload/upload-manager.service.ts](src/app/core/upload/upload-manager.service.ts) | 0E/1W | 656 | yes | no | - | P1 |
| [src/app/core/upload/upload.service.spec.ts](src/app/core/upload/upload.service.spec.ts) | 0E/22W | 511 | yes | no | - | P1 |
| [src/app/features/upload/upload-panel.component.scss](src/app/features/upload/upload-panel.component.scss) | none | 482 | yes | no | - | P1 |
| [src/app/core/upload/upload-manager.service.spec.ts](src/app/core/upload/upload-manager.service.spec.ts) | 0E/3W | 416 | yes | no | known baseline: 10 failing tests in focused suite | P1 |
| [src/app/features/upload/upload-panel.component.html](src/app/features/upload/upload-panel.component.html) | 0E/1W | 328 | yes | no | extract dialog blocks to subcomponents | P1 |
| [src/app/features/upload/upload-panel-item.component.ts](src/app/features/upload/upload-panel-item.component.ts) | 0E/6W | 321 | yes | no | extract menu/overlay logic to service or helpers | P1 |
| [src/app/features/upload/upload-panel-dialog-actions.service.ts](src/app/features/upload/upload-panel-dialog-actions.service.ts) | 0E/2W | 290 | yes | no | - | P2 |
| [src/app/core/upload/upload.service.ts](src/app/core/upload/upload.service.ts) | 0E/3W | 223 | yes | maybe (after legacy service retirement) | - | P2 |
| [src/app/core/upload/upload-manager.types.ts](src/app/core/upload/upload-manager.types.ts) | none | 212 | yes | no | - | P2 |
| [src/app/features/upload/upload-panel-item.component.scss](src/app/features/upload/upload-panel-item.component.scss) | none | 212 | yes | no | - | P2 |
| [src/app/core/upload/upload-new-run-upload-phase.util.ts](src/app/core/upload/upload-new-run-upload-phase.util.ts) | 0E/1W | 211 | yes | no | - | P2 |
| [src/app/core/upload/upload-new-prepare-route.util.ts](src/app/core/upload/upload-new-prepare-route.util.ts) | 0E/1W | 206 | yes | no | - | P2 |
| [src/app/core/upload/upload-attach-pipeline.service.ts](src/app/core/upload/upload-attach-pipeline.service.ts) | 0E/3W | 204 | yes | no | - | P2 |
| [src/app/core/upload/upload-replace-pipeline.service.ts](src/app/core/upload/upload-replace-pipeline.service.ts) | 0E/2W | 201 | yes | no | - | P2 |
| [src/app/core/upload/upload.service.util.ts](src/app/core/upload/upload.service.util.ts) | 0E/1W | 191 | yes | no | - | P2 |
| [src/app/features/upload/upload-panel-item-helpers.ts](src/app/features/upload/upload-panel-item-helpers.ts) | 0E/4W | 159 | yes | no | - | P2 |
| [src/app/features/upload/upload-panel-item.component.html](src/app/features/upload/upload-panel-item.component.html) | 0E/2W | 156 | no | no | fix a11y click/key/focus warnings | P2 |
| [src/app/core/upload/upload-job-state.service.ts](src/app/core/upload/upload-job-state.service.ts) | 0E/1W | 150 | yes | no | - | P2 |
| [src/app/core/upload/upload-batch.service.ts](src/app/core/upload/upload-batch.service.ts) | 0E/3W | 125 | no | no | - | P2 |
| [src/app/features/upload/upload-panel-helpers.ts](src/app/features/upload/upload-panel-helpers.ts) | 0E/1W | 114 | yes | no | - | P2 |
| [src/app/core/upload/upload-attach-record-update-runner.util.ts](src/app/core/upload/upload-attach-record-update-runner.util.ts) | 0E/1W | 90 | yes | no | - | P2 |
| [src/app/core/upload/upload-file-types.ts](src/app/core/upload/upload-file-types.ts) | 0E/1W | 41 | no | no | - | P2 |
| [src/app/features/upload/upload-panel.component.ts](src/app/features/upload/upload-panel.component.ts) | none | 182 | no | no | - | P3 |
| [src/app/features/upload/upload-panel-job-file-actions.service.ts](src/app/features/upload/upload-panel-job-file-actions.service.ts) | none | 151 | no | no | - | P3 |
| [src/app/features/upload/upload-panel.placement.spec.ts](src/app/features/upload/upload-panel.placement.spec.ts) | none | 139 | no | no | - | P3 |
| [src/app/features/upload/upload-panel.drag-lanes.spec.ts](src/app/features/upload/upload-panel.drag-lanes.spec.ts) | none | 125 | no | no | - | P3 |
| [src/app/features/upload/upload-panel.creation-dom.spec.ts](src/app/features/upload/upload-panel.creation-dom.spec.ts) | none | 116 | no | no | - | P3 |
| [src/app/features/upload/upload-panel-job-actions.service.ts](src/app/features/upload/upload-panel-job-actions.service.ts) | none | 116 | no | no | - | P3 |
| [src/app/core/upload/upload-new-pipeline.service.ts](src/app/core/upload/upload-new-pipeline.service.ts) | none | 110 | no | no | - | P3 |
| [src/app/core/upload/upload-new-post-save.util.ts](src/app/core/upload/upload-new-post-save.util.ts) | none | 110 | no | no | - | P3 |
| [src/app/features/upload/upload-panel-menu-action-router.service.ts](src/app/features/upload/upload-panel-menu-action-router.service.ts) | none | 103 | no | no | - | P3 |
| [src/app/features/upload/upload-panel.test-utils.spec.ts](src/app/features/upload/upload-panel.test-utils.spec.ts) | none | 91 | no | no | - | P3 |
| [src/app/core/upload/upload-attach-record-update.util.ts](src/app/core/upload/upload-attach-record-update.util.ts) | none | 90 | no | no | - | P3 |
| [src/app/features/upload/upload-panel-setup.service.ts](src/app/features/upload/upload-panel-setup.service.ts) | none | 90 | no | no | - | P3 |
| [src/app/features/upload/upload-panel-input-handlers.ts](src/app/features/upload/upload-panel-input-handlers.ts) | none | 88 | no | no | - | P3 |
| [src/app/core/upload/upload-attach-post-update.util.ts](src/app/core/upload/upload-attach-post-update.util.ts) | none | 83 | no | no | - | P3 |
| [src/app/features/upload/upload-panel-dialog-signals.service.ts](src/app/features/upload/upload-panel-dialog-signals.service.ts) | none | 82 | no | no | - | P3 |
| [src/app/features/upload/upload-panel-view-model.service.ts](src/app/features/upload/upload-panel-view-model.service.ts) | none | 81 | no | no | - | P3 |
| [src/app/features/upload/upload-panel-lifecycle.service.ts](src/app/features/upload/upload-panel-lifecycle.service.ts) | none | 74 | no | no | - | P3 |
| [src/app/features/upload/upload-phase.helpers.ts](src/app/features/upload/upload-phase.helpers.ts) | none | 71 | no | no | - | P3 |
| [src/app/features/upload/upload-panel.status.spec.ts](src/app/features/upload/upload-panel.status.spec.ts) | none | 70 | no | no | - | P3 |
| [src/app/core/upload/upload-storage.service.ts](src/app/core/upload/upload-storage.service.ts) | none | 69 | no | no | - | P3 |
| [src/app/core/upload/upload-attach-finalize.util.ts](src/app/core/upload/upload-attach-finalize.util.ts) | none | 68 | no | no | - | P3 |
| [src/app/features/upload/upload-panel-bulk-actions.service.ts](src/app/features/upload/upload-panel-bulk-actions.service.ts) | none | 67 | no | no | - | P3 |
| [src/app/features/map/workspace-pane/media-detail-upload.helper.spec.ts](src/app/features/map/workspace-pane/media-detail-upload.helper.spec.ts) | none | 64 | no | no | - | P3 |
| [src/app/features/upload/upload-panel.constants.ts](src/app/features/upload/upload-panel.constants.ts) | none | 59 | no | no | - | P3 |
| [src/app/core/upload/upload-enrichment.service.ts](src/app/core/upload/upload-enrichment.service.ts) | none | 57 | no | no | - | P3 |
| [src/app/features/upload/upload-panel-row-interactions.service.ts](src/app/features/upload/upload-panel-row-interactions.service.ts) | none | 54 | no | no | - | P3 |
| [src/app/core/upload/upload-conflict.service.ts](src/app/core/upload/upload-conflict.service.ts) | none | 53 | no | no | - | P3 |
| [src/app/features/upload/upload-panel-registration.service.ts](src/app/features/upload/upload-panel-registration.service.ts) | none | 53 | no | no | - | P3 |
| [src/app/features/upload/upload-panel-row-handlers.ts](src/app/features/upload/upload-panel-row-handlers.ts) | none | 53 | no | no | - | P3 |
| [src/app/features/map/workspace-pane/media-detail-upload.helper.ts](src/app/features/map/workspace-pane/media-detail-upload.helper.ts) | none | 51 | no | no | - | P3 |
| [src/app/features/upload/upload-panel.intake.spec.ts](src/app/features/upload/upload-panel.intake.spec.ts) | none | 49 | no | no | - | P3 |
| [src/app/features/upload/upload-panel-state.service.ts](src/app/features/upload/upload-panel-state.service.ts) | none | 49 | no | no | - | P3 |
| [src/app/core/upload/upload-enrichment.service.spec.ts](src/app/core/upload/upload-enrichment.service.spec.ts) | none | 47 | no | no | - | P3 |
| [src/app/core/upload/upload-db-postwrite.util.ts](src/app/core/upload/upload-db-postwrite.util.ts) | none | 44 | no | no | - | P3 |
| [src/app/core/upload/upload-attach-enrichment.util.ts](src/app/core/upload/upload-attach-enrichment.util.ts) | none | 41 | no | no | - | P3 |
| [src/app/core/upload/upload-address-resolve.util.ts](src/app/core/upload/upload-address-resolve.util.ts) | none | 39 | no | no | - | P3 |
| [src/app/core/upload/upload.types.ts](src/app/core/upload/upload.types.ts) | none | 38 | no | no | - | P3 |
| [src/app/core/upload/upload-attach-update-data.util.ts](src/app/core/upload/upload-attach-update-data.util.ts) | none | 37 | no | no | - | P3 |
| [src/app/core/upload/upload-queue.service.ts](src/app/core/upload/upload-queue.service.ts) | none | 35 | no | no | - | P3 |
| [src/app/core/upload/upload-cancelled-storage-cleanup.util.ts](src/app/core/upload/upload-cancelled-storage-cleanup.util.ts) | none | 34 | no | no | - | P3 |
| [src/app/features/upload/upload-panel-signals.service.ts](src/app/features/upload/upload-panel-signals.service.ts) | none | 30 | no | no | - | P3 |
| [src/app/core/upload/upload-notification.service.ts](src/app/core/upload/upload-notification.service.ts) | none | 28 | no | no | - | P3 |
| [src/app/core/upload/upload-dedup-skip.util.ts](src/app/core/upload/upload-dedup-skip.util.ts) | none | 26 | no | no | - | P3 |
| [src/app/core/upload/upload-attach-existing-row.util.ts](src/app/core/upload/upload-attach-existing-row.util.ts) | none | 22 | no | no | - | P3 |
| [src/app/core/upload/upload-replace-update-data.util.ts](src/app/core/upload/upload-replace-update-data.util.ts) | none | 21 | no | no | - | P3 |
| [src/app/features/upload/upload-panel-lane-handlers.ts](src/app/features/upload/upload-panel-lane-handlers.ts) | none | 20 | no | no | - | P3 |
| [src/app/core/upload/upload-timeout.util.ts](src/app/core/upload/upload-timeout.util.ts) | none | 19 | no | no | - | P3 |
| [src/app/features/upload/upload-panel-utils.ts](src/app/features/upload/upload-panel-utils.ts) | none | 18 | no | no | - | P3 |
| [src/app/core/upload/upload-attach-hash.util.ts](src/app/core/upload/upload-attach-hash.util.ts) | none | 17 | no | no | - | P3 |
| [src/app/features/upload/upload-panel.types.ts](src/app/features/upload/upload-panel.types.ts) | none | 15 | no | no | - | P3 |
| [src/app/core/upload/upload-manager-queue.util.ts](src/app/core/upload/upload-manager-queue.util.ts) | none | 10 | no | no | - | P3 |
| [src/app/core/upload/upload-cancelled.util.ts](src/app/core/upload/upload-cancelled.util.ts) | none | 4 | no | no | - | P3 |

