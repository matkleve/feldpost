# Media detail data (facade)

Thin orchestration for loading a media row, wiring metadata, signed URLs, and project membership for the workspace media detail view.

## Code

| File | Role |
| --- | --- |
| `apps/web/src/app/core/media-detail-data/media-detail-data.facade.ts` | `ImageDetailDataFacade` — load/query helpers |
| `apps/web/src/app/core/media-detail-data/media-detail-data.facade.spec.ts` | Vitest coverage |

Domain-specific helpers (`media-detail-view.utils`, project membership helper, types) remain under `apps/web/src/app/shared/workspace-pane/media-detail/` per UI boundary.

## Related

- UI contract: `docs/specs/ui/media-detail/media-detail-view.md`
- Workspace download usage map: `docs/specs/service/media-download-service/media-download-service.md`
