# Workspace Pane Round-2 Analysis — 2026-05-19

Scope: `apps/web/src/app/shared/workspace-pane/` — all 16 remaining components
(Post round-1 refactor: 22 → 15 per prior report; actual count is **16** — `metadata-property-row` was always present and not counted in the prior summary).

---

## Immediate fix: header padding

### Root cause

`ImageDetailHeaderComponent` (`app-image-detail-header`) uses:

```ts
styleUrl: '../media-detail-view.component.scss',
```

Angular's Emulated view encapsulation scopes every rule in that file — including `:host` rules — to the **component that imports it**. So when `app-image-detail-header` imports `media-detail-view.component.scss`, the following rule is compiled as `[_nghost-xxx-cHeader] { ... }` and applied directly to the `app-image-detail-header` host element:

```scss
// from media-detail-view.component.scss lines 3–21
:host {
  display: flex;
  flex: 1 1 auto;       // ← THE BUG: makes host grow to fill parent flex column
  flex-direction: column;
  overflow: hidden;
  background: var(--card);
  …
}
```

`app-image-detail-header` is a direct flex child of `.detail-main-column` (`display: flex; flex-direction: column`). The `flex: 1 1 auto` on its host causes it to **consume all remaining vertical space** in `.detail-main-column`. DevTools shows 37 px of rendered content inside `.detail-header`, but the host element stretches to fill the column.

**Secondary effect:** The host also inherits `overflow: hidden` and `background: var(--card)` — neither intended for a header.

### Fix (1-line description)

Create `media-detail-header.component.scss` with `:host { display: block; flex-shrink: 0; }` and add it to `styleUrls` in `ImageDetailHeaderComponent` **after** the parent import (later rule wins).

Same issue exists on `app-image-detail-inline-section` (inherits the same `:host` rule plus the part2.scss `:host` custom-property block). It is a grid child rather than flex child so the visual effect is less obvious, but the geometry ownership is still wrong.

---

## Naming inconsistencies

### Component selectors / class names still using "image"

| File | Current selector | Current class | Should be |
| --- | --- | --- | --- |
| `media-detail-header/media-detail-header.component.ts` | `app-image-detail-header` | `ImageDetailHeaderComponent` | `app-media-detail-header` / `MediaDetailHeaderComponent` |
| `media-detail-inline-section/media-detail-inline-section.component.ts` | `app-image-detail-inline-section` | `ImageDetailInlineSectionComponent` | `app-media-detail-inline-section` / `MediaDetailInlineSectionComponent` |

### Callers

Both selectors are **only used** in `media-detail-view.component.html` (template) and `media-detail-view.component.ts` (imports). No references outside `workspace-pane/`. Rename is a single-file change for each component — low risk.

### CSS class names

`.detail-image-wrap`, `.detail-image-container`, `.detail-image`, `.detail-image-edit-btn`, `.detail-image-placeholder` — all in `media-detail-view.component.scss` and duplicated in `media-detail-media-viewer.component.scss`. Rename to `.detail-media-*` is lower priority; clean up during SCSS deduplication (see Candidate 1 below).

### i18n key prefix

`workspace.imageDetail.*` keys appear throughout `media-detail-header`, `media-detail-inline-section`, and `media-detail-view` templates and TS files. A key rename to `workspace.mediaDetail.*` requires updating `docs/i18n/translation-workbench.csv`, running `import-i18n-csv-to-sql.mjs`, and committing the updated seed. **Treat as a separate, low-priority task** — key strings are internal identifiers and do not affect visible UI.

---

## Further simplification candidates

### 1. `:host` style bleed from shared SCSS — HIGH LEVERAGE

**Problem:** Three components share `media-detail-view.component.scss` via `styleUrl`/`styleUrls`:

| Component | Imports |
| --- | --- |
| `app-media-detail-view` | `media-detail-view.component.scss` + part2 (own SCSS) |
| `app-image-detail-header` | `media-detail-view.component.scss` only |
| `app-image-detail-inline-section` | both `.scss` and `.part2.scss` |

Every rule in these files is compiled **three times** in the final CSS output — once per component scope attribute. The `:host` rule from the parent SCSS incorrectly applies to each child's host. The `part2.scss` `:host { --mdv-* }` custom-property block similarly leaks to inline-section's host.

**Correct architecture:**
- `media-detail-view.component.scss` owns only `:host`, `.detail-main-column`, `.detail-scroll`, `.detail-content`, `.detail-section`, `.detail-error`, and loading/placeholder skeletons.
- `media-detail-header.component.scss` owns all `.detail-header`, `.detail-title`, `.detail-kind-chip`, `.detail-context-menu` rules (currently scattered across the parent file).
- `media-detail-inline-section.component.scss` owns all `.detail-row`, `.detail-row-action`, `.detail-tags`, `.detail-correction-*` rules.
- `media-detail-media-viewer.component.scss` already has its own file but duplicates (see Candidate 2).

**Effort:** Medium. No behavior changes; SCSS moves + verify with `ng build`.

### 2. SCSS duplication between parent and media-viewer — MEDIUM LEVERAGE

**Problem:** `media-detail-media-viewer.component.scss` (313 lines) re-declares the following classes that also exist in `media-detail-view.component.scss`:

| Duplicated block | Lines in viewer SCSS | Notes |
| --- | --- | --- |
| `.detail-image-wrap` | 9–37 | Viewer version dropped `background`, `border-radius`, `cursor`, `border`, `padding`, `transition` |
| `.detail-image` | 110–135 | Same rules; viewer drops `--thumb`/`--preview` modifiers |
| `.detail-image-container` | 137–146 | Identical |
| `.detail-image-edit-btn` + modifier | 148–200 | Identical logic |
| `.detail-image-placeholder` + `__icon` | 71–108 | Subtle differences in width calc |
| `.detail-upload-prompt` + children | 210–283 | Minor calc differences |
| `.visually-hidden` | 285–295 | Identical |
| `@keyframes detail-spin` | 297–301 | Identical |
| `@keyframes detail-placeholder-pulse` | 303–312 | Identical |

After Candidate 1 is done (parent SCSS split), the viewer should be the **sole owner** of all `.detail-image-*` and `.detail-upload-prompt` classes. The parent SCSS copies can be deleted.

**Effort:** Low once Candidate 1 is in progress. No behavior change.

### 3. Duplicate dialog logic (footer ↔ grid) — HIGH LEVERAGE

**Problem:** Both `WorkspacePaneFooterComponent` and `WorkspaceSelectedItemsGridComponent` independently implement:

| Logic block | In footer | In grid |
| --- | --- | --- |
| `createShareLinkWithAudience` | ✅ | ✅ (near-identical 50-line method) |
| `openShareAudienceDialog` | ✅ | ✅ |
| `confirmProjectDialog` | ✅ | ✅ |
| `confirmAddressDialog` | ✅ | ✅ |
| Address loop over selected + geocoding | ✅ | ✅ |
| `resolveSelectedMediaItemIds` | ✅ | ✅ |
| Project options loading + dialog wiring | ✅ | ✅ |
| Delete media + undo | ✅ | ✅ |

The footer adds progress tracking for ZIP; the grid adds zoom/copy-GPS/copy-address. But the shared operations (~400 lines duplicated) should live in a service or a shared action coordinator, not inline in two parallel components.

**Effort:** High. Requires extracting a `WorkspaceBulkActionService` or similar and updating both callers. But the current duplication means bugs or behavior drift must be fixed in two places.

### 4. `WorkspaceSelectedItemsGridComponent` self-marked OUTDATED

Line 1 of `workspace-selected-items-grid.component.ts`:

```ts
/** IS OUTDATED, USE ITEM GRID, MOVE TO ARCHIVE WHEN NO WHERE IN USE ANYMORE */
```

This 1,150-line component is still in production and wired into `workspace-pane.component.html`. The comment implies the component's own rendering logic (`RenderItem`, context menu, hover/selection) should migrate to the shared `ItemGridComponent` pattern. No tracking issue found.

**Effort:** Large. This is a standalone migration task and should be given its own GitHub issue with an explicit migration plan referencing `ItemGridComponent`.

### 5. Pure wrapper `div.detail-section` in media-detail-view template

In `media-detail-view.component.html` line 114:

```html
<div class="detail-section">
  <app-metadata-section … />
</div>
```

`.detail-section` adds `padding: 0 var(--spacing-1)` and `gap: var(--spacing-1)` (from part2.scss). `app-metadata-section` could own a `:host { padding: ... }` rule instead, removing this wrapper div.

Note: `app-image-detail-inline-section` already renders its own `div.detail-section` wrappers internally, so the pattern is inconsistent.

**Effort:** Trivial (1 div + 1 CSS property move).

### 6. "Copy coordinates" label on wrong left-rail buttons — ACCESSIBILITY BUG

In `media-detail-inline-section.component.html`, every `.detail-row-action--left` button has:

```html
[attr.aria-label]="t('workspace.imageDetail.action.copyCoordinates', 'Copy coordinates')"
(click)="copyCoordinatesRequested.emit()"
```

This appears identically on the **Type row**, **Captured row**, **Projects row**, **Uploaded row**, and all four address-field rows. Screen readers will announce "Copy coordinates" for actions that are unrelated to coordinates. This appears to be copy-paste from the location section.

**Effort:** Low. Each row needs the correct `aria-label` and potentially a different action; the left-rail button should be contextual (copy field value, reset, etc.) or removed where it has no unique purpose.

### 7. `metadata-property-row` re-declares `.detail-row-action`

`metadata-property-row.component.scss` defines `.detail-row-action` (with `--icon-btn-size`, position, opacity) in its own file. An almost-identical `.detail-row-action` block exists in `media-detail-view.component.part2.scss` (used by inline-section). After Candidate 1 splits the parent SCSS cleanly, this class should have exactly one owner.

---

## Component ownership map (post-refactor)

| Component | Owns | Overlap risk |
| --- | --- | --- |
| `app-workspace-pane-shell` | Width-controlled column shell; mobile fixed-sheet animation | Low |
| `app-drag-divider` | 2px resize strip; 44px keyboard-accessible hit target | Low |
| `app-workspace-pane` | Tab routing (selected-items / upload / detail); pane region layout | Low |
| `app-pane-header` | Title text + inline title edit; close button; color swatch | Low |
| `app-workspace-toolbar` | Filter/group/sort dropdowns; thumbnail size toggle | Low |
| `app-projects-dropdown` | Project checklist content inside toolbar dropdown | Low |
| `app-workspace-selected-items-grid` | Thumbnail grid, grouping collapse, context menu, **7 dialog flows** | **HIGH** — dialog logic duplicated with footer; self-marked OUTDATED |
| `app-workspace-pane-footer` | Selection summary bar, action buttons, **5 dialog flows** | **HIGH** — dialog logic duplicated with grid |
| `app-media-detail-view` | Load/save coordinator; header-scroll-content 3-region layout | **MEDIUM** — shared SCSS causes `:host` to bleed into two child components |
| `app-image-detail-header` | Back button; title edit inline; type chip; overflow context menu | **HIGH** — borrows parent `:host { flex: 1 1 auto }` via styleUrl, causing layout bug |
| `app-media-detail-media-viewer` | Image viewer (thumb→full) + upload prompt; ResizeObserver slot measurement | **MEDIUM** — ~200 SCSS lines duplicated from parent file |
| `app-image-detail-inline-section` | Detail field rows (type, date, project, address); correction history | **HIGH** — borrows parent `:host` unintentionally; all left-rail aria labels wrong |
| `app-captured-date-editor` | Calendar day/month grid + time inputs; popover positioned by parent row | Low |
| `app-address-search` | Geocode text input + result list; suggestion emit | Low |
| `app-metadata-section` | Metadata key-value list; add-row form; autocomplete suggestion overlay | Low |
| `app-metadata-property-row` | Single metadata row: label + value + inline edit input | Low — `.detail-row-action` class redefined vs. part2.scss |

---

## Recommended next actions

1. **Fix header padding (blocker UX bug)** — Create `media-detail-header.component.scss` with `:host { display: block; flex-shrink: 0; }` and reference it from `ImageDetailHeaderComponent.styleUrls`. Same for `ImageDetailInlineSectionComponent`.

2. **Rename `app-image-detail-header` → `app-media-detail-header`** — Selector + class in the `.ts` file; template reference in `media-detail-view.component.html`; import alias in `media-detail-view.component.ts`. Single-file callers, safe rename.

3. **Rename `app-image-detail-inline-section` → `app-media-detail-inline-section`** — Same scope as above.

4. **Split `media-detail-view.component.scss`** — Move header rules to `media-detail-header.component.scss`, move row/tag rules to `media-detail-inline-section.component.scss`. Remove shared `styleUrl` pattern from child components; each owns only its own SCSS.

5. **Clean up `media-detail-media-viewer.component.scss` duplicates** — After #4, delete from the parent file all `.detail-image-*`, `.detail-upload-prompt`, `.visually-hidden`, and keyframe blocks that are now owned solely by the viewer's SCSS.

6. **Fix accessibility bug: wrong `aria-label` on left-rail row actions** — Each left-rail button in `media-detail-inline-section.component.html` must have a context-appropriate label (or be removed from rows where it has no unique purpose).

7. **Remove wrapper `div.detail-section`** around `app-metadata-section` in `media-detail-view.component.html`; give `app-metadata-section`'s host the padding directly.

8. **Create GitHub issue for `WorkspaceSelectedItemsGridComponent` OUTDATED migration** — The `/** IS OUTDATED */` comment needs a concrete migration plan to `ItemGridComponent` with a dedicated issue.

9. **Extract shared dialog logic** to `WorkspaceBulkActionService` (or similar) and deduplicate `createShareLinkWithAudience`, `confirmProjectDialog`, `confirmAddressDialog`, and `resolveSelectedMediaItemIds` from both footer and grid.

10. **Document z-index layer map** — Mobile detail (`500`), footer dialogs (`500–501`), shell (`100`), drag-divider (`1`), popovers (`300`) — no single pane-level map exists.

---

## Current DOM depth (post round-1 refactor)

| Path | Depth from `section.workspace-pane-shell` |
| --- | ---: |
| Selected-items: shell → thumbnail `img` | **~12–13** (toolbar removal saved 1–2 levels) |
| Detail: shell → media-viewer image | **~11–12** (no change from toolbar removal) |
| Detail: shell → calendar day button | **~13–14** |

The round-1 refactor's main depth wins were on the toolbar path (−3 layers). The detail path depth is unchanged because the `media-detail-view` internal structure was not touched.

---

*Report only — no code changes.*
