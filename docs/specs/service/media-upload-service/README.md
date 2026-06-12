# Upload Manager Specs

Module index for upload-manager contracts (ingestion, queue, placement). For **signed delivery** of existing media (thumbnails, full-res, export/ZIP), see **[media-download-service](../media-download-service/media-download-service.md)** and its `adapters/` docs.

## Files

- [upload-manager.md](upload-manager.md) — manager facade and UX-facing behavior
- [upload-manager-pipeline.md](upload-manager-pipeline.md) — pipeline stages and events
- [upload-manager-pipeline.data.md](upload-manager-pipeline.data.md) — data matrices (child of pipeline)
- upload-location-config.md

## Deprecated / archive only

**`photo-load-service`** and any normative **PhotoLoad** API contract exist only under **`docs/archive/`** (legacy element specs). Do not treat them as active contracts; use **MediaDownloadService** per `docs/specs/service/media-download-service/`.
