# Use cases

**Interaction scenarios, element by element:** what the user does, click by click, and what
the product must do in response — including the edge cases and the recovery paths. A use case
says *what should happen*; the [spec](../specs/README.md) it links to says *how the component
or service delivers it*. When the two disagree, that is a defect in one of them, not a matter
of taste.

Every file has a stable **`UC-NNN` id**, so a spec, an issue or a pull request can cite
`UC-018` instead of pasting a path.

## Index

| ID | Use case | Primary specs |
| --- | --- | --- |
| UC-001 | [Colleagues invites workspace](./UC-001-colleagues-invites-workspace.md) | `ui/colleagues/colleagues-invites-workspace.md` |
| UC-002 | [Custom properties in operators](./UC-002-custom-properties-in-operators.md) | `service/metadata/metadata-service.md`, the filter/sort/grouping dropdowns |
| UC-003 | [Folder-based bulk import](./folder-import.md) | `service/folder-scan/`, `service/filename-parser/`, `service/location-path-parser/` |
| UC-004 | [Image editing](./image-editing.md) | `ui/media-detail/media-detail-view.md`, `…-inline-editing.md` |
| UC-005 | [Map context menu](./map-context-menu.md) | `component/map/map-context-menu.md` |
| UC-006 | [Map secondary-click system](./map-secondary-click-system.md) | `system/map-secondary-click-system.md` |
| UC-007 | [Map shell](./map-shell.md) | `page/map-page.md`, `ui/workspace/workspace-pane.md` |
| UC-008 | [Media grouping — data sources](./UC-008-media-grouping-data.md) | `component/filters/grouping-dropdown.md`, `service/workspace-view/` |
| UC-009 | [Media loading](./media-loading.md) | `ui/media-detail/media-detail-media-viewer.md`, `ui/media-marker/media-marker.md` |
| UC-010 | [Media marker context menu](./media-marker-context-menu.md) | `ui/media-marker/media-marker-context-menu.md` |
| UC-011 | [Project mixed media](./UC-011-project-mixed-media.md) | `page/projects-page.md`, `component/project/project-details-view.md` |
| UC-012 | [Projects grouping / filter / sort](./projects-grouping-filter-sort.md) | `page/projects-page.md`, the filter/sort/grouping dropdowns |
| UC-013 | [Projects page](./UC-013-projects-page.md) | `page/projects-page.md`, `component/project/projects-dropdown.md` |
| UC-014 | [Projects page workspace flow](./projects-page-workspace.md) | `page/projects-page.md`, `component/project/project-details-view.md` |
| UC-015 | [Property registry](./UC-015-property-registry.md) | `service/metadata/metadata-service.md` |
| UC-016 | [QR invite flow](./qr-invite-flow.md) | `ui/settings-overlay/qr-invite-flow.md` |
| UC-017 | [Search bar](./search-bar.md) | `ui/search-bar/search-bar.md`, `service/search/search-bar-service.md` |
| UC-018 | [Upload manager](./upload-manager.md) | `service/media-upload-service/upload-manager.md` |
| UC-019 | [Upload panel](./UC-019-upload-panel.md) | `component/upload/upload-panel.md` |
| UC-020 | [Workspace export](./workspace-export.md) | `ui/workspace/workspace-actions-bar.md`, `component/workspace/active-selection-view.md` |
| UC-021 | [Workspace view](./workspace-view.md) | `ui/workspace/workspace-pane.md`, `service/workspace-view/workspace-view-system.md` |

Each file's own frontmatter carries the full, exact `specs:` list; the column above is the
short form for scanning.

## Writing one

Take the next free number — sequential, never reused — and name the file
`UC-NNN-slug.md`. Start with frontmatter:

```yaml
---
id: UC-022
specs:
  - docs/specs/<slice>/<path>.md
---
```

`specs:` lists **repo-root-relative** paths, so it can be checked without resolving relative
links. Frontmatter follows the shape already used by [`docs/study/`](../study/README.md); the
planned spec ↔ use-case linter (audit item B5) reads this, not the HTML-comment form
described secondhand in [the adoption audit](../audits/2026-09-08-grundriss-adoption.md) § B5.

A use case with no spec is an unkept promise, and a spec with no use case is a solution
looking for a problem — say so in review rather than leaving `specs:` empty.

## Filenames: seven renamed, fourteen pending

The `UC-NNN-` prefix is in place on the seven files that nothing outside this folder points
at. The other fourteen keep their slug filename **for now**, because renaming them would
break markdown links in `docs/specs/**` — a tree this change did not own — and turn
`node scripts/verify.mjs doc-links` red. Their ids are already live in frontmatter, so
citations do not have to wait for the filename.

To finish the rename, repoint these **38 references in 19 files**, then `git mv` each file to
the target name in the same commit:

| ID → target filename | References to repoint |
| --- | --- |
| UC-003 → `UC-003-folder-import.md` | `docs/glossary.md`:117, 122, 128, 224, 230 · `docs/architecture.md`:421 · `apps/web/src/app/core/filename-parser/filename-parser.service.ts`:5 · `apps/web/src/app/core/folder-scan/folder-scan.service.ts`:95 *(all code spans / comments — no gate impact, but all stale)* |
| UC-004 → `UC-004-image-editing.md` | `specs/ui/media-detail/media-detail-inline-editing.md`:4 · `media-detail-view.md`:5 · `media-detail-media-viewer.md`:7 |
| UC-005 → `UC-005-map-context-menu.md` | `specs/component/map/map-context-menu.md`:3 · `specs/ui/media-marker/media-marker-draft-flow.md`:88 *(code span)* |
| UC-006 → `UC-006-map-secondary-click-system.md` | `specs/system/map-secondary-click-system.md`:3, :127 *(:127 is a code span)* |
| UC-007 → `UC-007-map-shell.md` | `specs/page/map-page.md`:5 · `specs/ui/media-detail/media-detail-actions.md`:5 |
| UC-009 → `UC-009-media-loading.md` | `specs/ui/media-detail/media-detail-view.md`:4 · `media-detail-media-viewer.md`:6 · `media-detail-media-viewer.progressive-loading.supplement.md`:178 · `specs/ui/media-marker/media-marker.md`:70, :114 |
| UC-010 → `UC-010-media-marker-context-menu.md` | `specs/ui/media-marker/media-marker-context-menu.md`:3 |
| UC-012 → `UC-012-projects-grouping-filter-sort.md` | `specs/page/projects-page.md`:3, :359 |
| UC-014 → `UC-014-projects-page-workspace.md` | `specs/component/project/project-details-view.md`:3, :186 · `specs/page/projects-page.md`:3, :359 |
| UC-016 → `UC-016-qr-invite-flow.md` | `specs/ui/settings-overlay/qr-invite-flow.md`:123, :167 *(both code spans)* |
| UC-017 → `UC-017-search-bar.md` | `specs/ui/search-bar/search-bar.md`:302 · `search-bar-query-behavior.md`:5 |
| UC-018 → `UC-018-upload-manager.md` | `specs/ui/media-detail/media-detail-actions.md`:4 |
| UC-020 → `UC-020-workspace-export.md` | `specs/component/workspace/active-selection-view.md`:6 · `specs/ui/workspace/workspace-actions-bar.md`:6, :182 *(:182 is a code span)* |
| UC-021 → `UC-021-workspace-view.md` | `specs/component/workspace/active-selection-view.md`:4 |

Also inside this folder, and so easy to miss: UC-007 is linked from UC-021 (twice), UC-021 is
linked from UC-002, UC-004, UC-008, UC-013 and UC-015, and UC-005 is linked from UC-007.

Historical inventories under `docs/audits/` list the old paths as a snapshot of 2026-04-15.
Those are records of what was true then — leave them alone.

## Neighbours

| Folder | Answers | Read it when |
| --- | --- | --- |
| [`docs/specs/`](../specs/README.md) | what it **must** do | implementing or changing behaviour |
| `docs/use-cases/` (here) | what the **user** does, and what must happen | deciding whether a behaviour is right |
| [`docs/study/`](../study/README.md) | **why this** and not the alternatives, with evidence grades | re-opening a settled question |
| [`docs/adr/`](../adr/README.md) | the decision, and what was rejected | wondering why the repo is shaped this way |
