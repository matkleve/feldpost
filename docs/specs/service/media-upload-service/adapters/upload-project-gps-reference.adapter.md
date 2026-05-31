# UploadProjectGpsReferenceAdapter

> **Parent:** [upload-manager-pipeline.location-routing.supplement.md](../upload-manager-pipeline.location-routing.supplement.md)  
> **Phase:** Context-distance tray (Phase 3) — **no implementation** until this contract is approved.

## Purpose

Supply **project GPS reference points** for upload `context_distance` disambiguation. Replaces the forbidden `MediaClusterService` / `get_media_clusters` shortcut.

## Data source

- Project media rows whose linked locations satisfy [`locationsWithGps`](../../media-locations/media-locations.zoomable-map-contract.supplement.md) (`legacyMediaHasGps`).
- Read-only; RLS applies via Supabase client.

## Facade API (planned)

| Method | Returns | Notes |
| --- | --- | --- |
| `listReferencePoints(projectId: string)` | `UploadProjectGpsReferencePoint[]` | Lat/lng + optional label |
| `pickNearestAnchor(projectId, coords)` | `UploadProjectGpsReferencePoint \| null` | For tray copy / distance |

```typescript
export interface UploadProjectGpsReferencePoint {
  mediaId: string;
  lat: number;
  lng: number;
  label?: string | null;
}
```

## Consumers

| Consumer | When |
| --- | --- |
| `UploadLocationResolutionService.registerContextDistanceGroup` | After geocode when `haversine(jobAnchor, nearestProjectRef) > org.resolver.contextDistanceMaxMeters` |
| Tray `disambiguationKind: context_distance` | Per [upload-resolver-tray.question-copy.md](../../../component/upload/upload-resolver-tray.question-copy.md) |

## Acceptance criteria

- [ ] Adapter spec approved (this file).
- [ ] Implementation under `apps/web/src/app/core/upload/adapters/upload-project-gps-reference.adapter.ts`.
- [ ] No import of `MediaClusterService` from upload pipeline.
- [ ] Vitest uses fixture points, not live DB.
