# upload service module

Canonical service spec: [media-upload-service](../../../../../../docs/specs/service/media-upload-service/README.md).
The code module remains `core/upload` for facade import stability; treat `media-upload-service`
as the normative contract name.

## Root (public facade API)

| File | Role |
| --- | --- |
| `upload.service.ts` | File ingest facade (MIME, EXIF, persist) |
| `upload-manager.service.ts` | Pipeline orchestrator facade |
| `upload.types.ts` | Shared upload types |
| `upload-manager.types.ts` | Manager/job/pipeline types |
| `upload.helpers.ts` | Cross-cutting upload helpers |

External callsites should import from these root files only.

Root-level spec files (`upload.service.spec.ts`, `upload-manager.service.spec.ts`, `upload-folder-upload.integration.spec.ts`) test the public facades and the cross-pipeline folder-upload integration flow.

## Domain layout

```
core/upload/
├── upload.service.ts              # facade
├── upload-manager.service.ts      # facade
├── upload.types.ts
├── upload-manager.types.ts
├── upload.helpers.ts
├── upload.service.spec.ts         # facade unit tests
├── upload-manager.service.spec.ts
├── upload-folder-upload.integration.spec.ts
│
├── manager/                       # upload-manager-* orchestration internals
├── location/                      # upload-location-* resolution & placement
├── address-resolution/            # upload-address-* + tray resolution gates
├── pipelines/
│   ├── new/                       # upload-new-* pipeline
│   ├── attach/                    # upload-attach-* pipeline
│   └── replace/                   # upload-replace-* pipeline
├── support/                       # queue, batch, storage, persist, shared utils
└── adapters/                      # Supabase / project boundary adapters
```

## Domain index

| Folder | Spec anchor | Contents |
| --- | --- | --- |
| `manager/` | [upload-manager.md](../../../../../../docs/specs/service/media-upload-service/upload-manager.md) | Submit, queue drain, lifecycle, facade deps, pipeline host |
| `location/` | [upload-location-resolution.md](../../../../../../docs/specs/service/media-upload-service/upload-location-resolution.md) | Geocode, precedence, disambiguation, placement, tray flow |
| `address-resolution/` | [upload-address-resolution-pipeline.md](../../../../../../docs/specs/service/media-upload-service/upload-address-resolution-pipeline.md) | Address orchestrator, resolve util, tray gates |
| `pipelines/new/` | [upload-manager-pipeline.md](../../../../../../docs/specs/service/media-upload-service/upload-manager-pipeline.md) | New-upload route, pre-resolve, run phase, post-save |
| `pipelines/attach/` | upload-manager-pipeline (attach lane) | Attach record update, enrichment, finalize |
| `pipelines/replace/` | upload-manager-pipeline (replace lane) | Replace pipeline run/finish |
| `support/` | — | `UploadQueueService`, `UploadBatchService`, `UploadJobStateService`, `UploadStorageService`, `UploadConflictService`, `UploadEnrichmentService`, `UploadNotificationService`, `UploadPreResolveWaveService`; utils: content-hash, file-persist, thumbnail-persist, db-postwrite, dedup-skip, cancelled, cancelled-storage-cleanup, timeout, file-types, error-messages, batch-project-tray helpers |
| `adapters/` | `adapters/*.adapter.md` | Location lookup, project locations |

## Conventions

- Facades stay at module root; domain folders hold implementation detail.
- No barrel re-exports at legacy paths — update imports to the new location.
- Mirror spec domains when adding files; do not add new flat root files.
