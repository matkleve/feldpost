# Media detail — metadata layout (archive / redesign backlog)

**Status:** Backlog — **legacy `uiRowShell` shims removed from templates (2026-05-16).** Remaining items are semantics / composition / a11y only.  
**Do not delete this note until the redesign is either implemented or explicitly cancelled.**

## Why this exists

Phase 6 **removed** **`[uiRowShell]`** / **`[uiRowShellSizeSm]`** from `media-detail-inline-section` and `metadata-property-row` (2026-05-16); **`UiRowShell*`** directives were deleted from `ui-primitives.directive.ts`. Row layout is owned by **`detail-row`** + `media-detail-view.component.part2.scss` / `metadata-property-row.component.scss`. **This file preserves product/IA/a11y follow-ups** for a later pass.

## Current structure (as of 2026-05-16)

**Section container:** `div.detail-section` in `media-detail-inline-section.component.html`.

**Section title:** `hlmMenuLabel` + `detailViewLabel()` — visually works as a **group heading** above rows; **semantically** it reuses menu-label chrome outside a menu. Revisit: real heading level (`h3` + global typography), or a dedicated “section label” pattern tied to tokens.

**Row stack:** Vertical list of **`detail-row`** / **`meta-row`** rows. Each row typically: optional leading **`hlmBtn`** (ghost + icon), field icon, label, **value** (text, button, inline editor, chip/tag editor), optional trailing **`hlmBtn`**.

## Redesign ideas (post–Phase 6)

1. **Hierarchy:** Treat as **DetailSection → SectionHeading → RowStack → MetadataRow** (heading is not part of the row).
2. **Semantics / a11y:** Row stack as `role="list"` + `role="listitem"` or `ul`/`li` if DOM stays valid with nested controls; wire **`aria-labelledby`** from stack to section heading where useful.
3. **Composition (optional):** `app-detail-section` + `app-detail-metadata-row` with **`ng-content`** slots (`leadingActions`, `icon`, `label`, `value`, `trailingActions`) — requires **component registry + element spec** per repo governance before implementation.
4. **Tokens:** After Phase 7, re-check contrast/spacing for section label vs rows on light/dark/sandstone.

## Related migration docs

- `docs/migration/phase-6-template-cleanup.md` — §5 `ui-row-shell` → component-local row classes.
- `docs/migration/phase-10-visual-qa.md` — settings / overlay matrix may overlap theme checks for detail pane.

## Files to touch when implementing

- `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-inline-section/*`
- `apps/web/src/app/shared/workspace-pane/media-detail/metadata-property-row.*`
- `apps/web/src/app/shared/ui-primitives/ui-primitives.directive.ts` (`UiRowShell*` removed 2026-05-16)
- Specs under `docs/specs/component/` for media detail / workspace pane as applicable
