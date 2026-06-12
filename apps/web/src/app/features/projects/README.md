# projects feature

**Projects** route composition and feature-local wiring for project listing and navigation flows tied to the projects page.

**Canonical spec:** [`docs/specs/page/projects-page.md`](../../../../../../docs/specs/page/projects-page.md)

**Related service facade:** [`docs/specs/service/projects/`](../../../../../../docs/specs/service/projects/README.md)

## Layout

```
features/projects/
  README.md
  page/       projects-page.*, projects-page.config.ts, projects-page.logic.ts
  views/      projects-grid-view, projects-table-view
  chrome/     projects-page-header, projects-toolbar
  cards/      project-card, project-color-picker, project-location-picker
  dialogs/    projects-confirm-dialog
  logic/      projects-*-fields|filter|sort|grouping|formatters.logic.ts
```

Restructure scripts (repository root):

- `node scripts/restructure-projects-feature.mjs --batch=logic|dialogs|cards|chrome|views|page`
- `node scripts/fix-projects-feature-parent-imports.mjs`
- `node scripts/validate-projects-feature-imports.mjs`
