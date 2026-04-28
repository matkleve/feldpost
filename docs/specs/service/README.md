# Service Specs

Folder index for service-module contracts.

Folder-specific rules:

- Each service module folder mirrors one code module under apps/web/src/app/core.
- Service specs own facade boundaries, adapter responsibilities, and service-level acceptance criteria.
- Service specs may link to ui/system consumers but must not own route composition or component visual contracts.

Global governance references:

- ../README.md
- ../GOVERNANCE-MATRIX.md

## Module index (`core/` mirror)

Symmetry tracker: [service-spec-symmetry-matrix](../../backlog/service-spec-symmetry-matrix.md).

| Module | Canonical facade spec |
| --- | --- |
| auth | [auth/auth-service.md](auth/auth-service.md) |
| filter | [filter/filter-service.md](filter/filter-service.md) |
| filename-parser | [filename-parser/filename-parser.md](filename-parser/filename-parser.md) |
| folder-scan | [folder-scan/folder-scan.md](folder-scan/folder-scan.md) |
| geocoding | [geocoding/geocoding-service.md](geocoding/geocoding-service.md) |
| i18n | [i18n/i18n-service.md](i18n/i18n-service.md) |
| invites | [invites/invite-service.md](invites/invite-service.md) |
| location-path-parser | [location-path-parser/location-path-parser.md](location-path-parser/location-path-parser.md) |
| location-resolver | [location-resolver/address-resolver.md](location-resolver/address-resolver.md) |
| map (marker HTML) | [map/marker-factory.md](map/marker-factory.md) |
| media (types/registry) | [media/media-types-and-file-registry.md](media/media-types-and-file-registry.md) |
| media-download | [media-download-service/media-download-service.md](media-download-service/media-download-service.md) |
| media-location-update | [media-location-update/media-location-update-service.md](media-location-update/media-location-update-service.md) |
| media-preview | [media-preview/media-preview-service.md](media-preview/media-preview-service.md) |
| media-query | [media-query/media-query-service.md](media-query/media-query-service.md) |
| media-upload | [media-upload-service/README.md](media-upload-service/README.md) |
| media-detail-data | [media-detail-data/README.md](media-detail-data/README.md) |
| metadata | [metadata/metadata-service.md](metadata/metadata-service.md) |
| projects | [projects/projects-service.md](projects/projects-service.md) |
| search | [search/search-bar-service.md](search/search-bar-service.md) |
| settings-pane | [settings-pane/settings-pane-service.md](settings-pane/settings-pane-service.md) |
| share-set | [share-set/share-set-service.md](share-set/share-set-service.md) |
| supabase | [supabase/supabase-service.md](supabase/supabase-service.md) |
| toast | [toast/toast-system.md](toast/toast-system.md) |
| user-profile | [user-profile/user-profile-service.md](user-profile/user-profile-service.md) |
| workspace-selection | [workspace-selection/workspace-selection-service.md](workspace-selection/workspace-selection-service.md) |
| workspace-view | [workspace-view/workspace-view-system.md](workspace-view/workspace-view-system.md) |

