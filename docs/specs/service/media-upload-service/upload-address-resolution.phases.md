# Upload address resolution — phase map

> **Parent:** [upload-address-resolution-pipeline.md](./upload-address-resolution-pipeline.md)

| Phase | Code focus |
| --- | --- |
| 0 | Specs (this tree) |
| 1 | `location-path-parser` SO builder + `assets/geo` + Fuse |
| 2 | `upload-address-resolution.orchestrator` + `get_location_by_address_components` RPC |
| 3 | `geocode` `structured-forward` + `GeocodingService.searchStructuredForward` |
| 4 | `UploadLocationResolutionService.registerDisambiguationGroup` + `grouping_key` queryKey |
| 5 | `location_status = partial` migration + save path |

## Trigger matrix

| Condition | Action |
| --- | --- |
| `locationRequirementMode === optional` | Skip pipeline |
| Job has EXIF coords | `resolutionStatus: not_required` |
| After intake | `classifyBatch(batchId)` |
| Queue drain | `applyPreResolveFromCache(jobId)` |
