# pane-chrome (shared)

**Layout-only** pane row primitives: header, toolbar (3 slots), footer (2 slots). No domain actions — feature and workspace components project content into slots.

**Canonical specs:**
- [`docs/specs/component/workspace/pane-toolbar.md`](../../../../../../docs/specs/component/workspace/pane-toolbar.md)
- [`docs/specs/component/workspace/pane-footer.md`](../../../../../../docs/specs/component/workspace/pane-footer.md)
- Pane header: wired in [`workspace-pane`](../workspace-pane/) shell (no separate parent spec file)

## Layout

```
pane-chrome/
  README.md
  header/   app-pane-header   (workspace pane title / close / color)
  toolbar/  app-pane-toolbar  (left | center | right slots)
  footer/   app-pane-footer   (left | right slots + spacer)
```

**Domain compositions** (sort/filter/export, etc.) stay in `workspace-pane/`, `features/media/`, `features/projects/`, `features/upload/`.

Restructure scripts (repository root):

- `node scripts/restructure-pane-chrome.mjs --batch=footer|toolbar|header`
- `node scripts/fix-pane-chrome-parent-imports.mjs`
- `node scripts/validate-pane-chrome-imports.mjs`
