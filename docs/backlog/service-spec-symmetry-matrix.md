# Service spec symmetry — plan and index

**Authority:** Normative contracts live in `docs/specs/service/<module>/` and must satisfy `node scripts/lint-specs.mjs` (element-spec skeleton) unless explicitly excluded in `scripts/lint-specs.mjs`.

**Goal (2026-04-28):** Every `apps/web/src/app/core/<module>/` that represents a real boundary (auth, external APIs, DB RPCs, cross-route state) has a **facade spec** beside its folder `README.md`. Skeleton README-only folders gain a canonical `*-service.md` (or module-named contract) and README links to it.

## Execution order (completed in same doc pass)

1. Expand **existing README-only** folders: geocoding, media-query, media-preview, filter, share-set, workspace-selection; add **media-location-update-service.md** next to the richer README.
2. Add **new** `docs/specs/service/` trees for modules that had **no** spec folder: supabase, auth, invites, projects, search, settings-pane, user-profile, i18n, map, media.
3. Update **`docs/specs/service/README.md`** with a module index linking each folder.
4. Gate: `node scripts/lint-specs.mjs`.

## Module index (code → spec)

| `core/` module | Spec folder | Canonical contract |
| --- | --- | --- |
| geocoding | `docs/specs/service/geocoding/` | [geocoding-service.md](../specs/service/geocoding/geocoding-service.md) |
| supabase | `docs/specs/service/supabase/` | [supabase-service.md](../specs/service/supabase/supabase-service.md) |
| auth | `docs/specs/service/auth/` | [auth-service.md](../specs/service/auth/auth-service.md) |
| invites | `docs/specs/service/invites/` | [invite-service.md](../specs/service/invites/invite-service.md) |
| projects | `docs/specs/service/projects/` | [projects-service.md](../specs/service/projects/projects-service.md) |
| search | `docs/specs/service/search/` | [search-bar-service.md](../specs/service/search/search-bar-service.md) |
| settings-pane | `docs/specs/service/settings-pane/` | [settings-pane-service.md](../specs/service/settings-pane/settings-pane-service.md) |
| user-profile | `docs/specs/service/user-profile/` | [user-profile-service.md](../specs/service/user-profile/user-profile-service.md) |
| i18n | `docs/specs/service/i18n/` | [i18n-service.md](../specs/service/i18n/i18n-service.md) |
| map | `docs/specs/service/map/` | [marker-factory.md](../specs/service/map/marker-factory.md) |
| media | `docs/specs/service/media/` | [media-types-and-file-registry.md](../specs/service/media/media-types-and-file-registry.md) |
| media-query | `docs/specs/service/media-query/` | [media-query-service.md](../specs/service/media-query/media-query-service.md) |
| media-preview | `docs/specs/service/media-preview/` | [media-preview-service.md](../specs/service/media-preview/media-preview-service.md) |
| filter | `docs/specs/service/filter/` | [filter-service.md](../specs/service/filter/filter-service.md) |
| share-set | `docs/specs/service/share-set/` | [share-set-service.md](../specs/service/share-set/share-set-service.md) |
| workspace-selection | `docs/specs/service/workspace-selection/` | [workspace-selection-service.md](../specs/service/workspace-selection/workspace-selection-service.md) |
| media-location-update | `docs/specs/service/media-location-update/` | [media-location-update-service.md](../specs/service/media-location-update/media-location-update-service.md) |

**Upload** remains under **`docs/specs/service/media-upload-service/`** (name differs from `core/upload/` by convention).

## Follow-ups (not this pass)

- Adapter-level specs under `geocoding/adapters/` when adapter files ship beyond `.gitkeep`.
- Split **search-bar-service** spec if line count grows (ranking / DB resolver slices).
- **`docs/implementation-blueprints/`** was intentionally removed; all links now target **`docs/specs/`** (see `docs/audits/README.md`).
