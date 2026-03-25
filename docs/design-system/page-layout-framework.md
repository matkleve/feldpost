# Feldpost – Page Design System Audit & Framework

**Date:** 2026-03-25  
**Status:** Framework Definition for Multi-Page Development

---

## 1. Files & Docs Inventory

| Category                 | File/Folder                                                            | Purpose                                                             | Status         | Priority |
| ------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------- | -------- |
| **Layout Specs**         | `docs/design-system/layout-width-breakpoint-scale.md`                  | Canonical widths, breakpoints, clamp tokens                         | ✅ Reference   | HIGH     |
|                          | `docs/design/layout.md`                                                | Layout system overview, primitives, breakpoints                     | ✅ Reference   | HIGH     |
|                          | `docs/design/constitution.md`                                          | Design non-negotiables (field-first, map-primary)                   | ✅ Reference   | MEDIUM   |
| **Container Components** | `apps/web/src/app/shared/containers/page-container.component.ts`       | Full-page wrapper (standard padding + flex layout)                  | ✅ Implemented | HIGH     |
|                          | `apps/web/src/app/shared/containers/max-width-container.component.ts`  | Responsive centering wrapper (clamp 280–640px)                      | ✅ Implemented | HIGH     |
|                          | `apps/web/src/app/shared/containers/centered-layout.component.ts`      | Flexbox centering for empty/error states                            | ✅ Implemented | MEDIUM   |
|                          | `apps/web/src/app/shared/containers/stack.component.ts`                | VStack/HStack flex utilities with design tokens                     | ✅ Implemented | MEDIUM   |
|                          | `apps/web/src/app/shared/containers/index.ts`                          | Central export for all container components                         | ✅ Implemented | HIGH     |
| **Primitive Styles**     | `apps/web/src/styles/primitives/container.scss`                        | `.ui-container`, `.ui-item`, `.ui-spacer`                           | ✅ Reference   | HIGH     |
|                          | `apps/web/src/styles/layout/clamp.scss`                                | `.content-clamp`, `.content-clamp--text/default/list`               | ✅ Reference   | HIGH     |
|                          | `apps/web/src/styles/tokens.scss`                                      | Design tokens: colors, spacing, radii, clamp widths                 | ✅ Reference   | HIGH     |
| **Page Implementation**  | `apps/web/src/app/features/projects/projects-page.component.ts`        | Template: main > section.content-clamp > header + toolbar + content | ✅ Reference   | HIGH     |
|                          | `apps/web/src/app/features/projects/projects-page.component.html`      | Structure: header, toolbar, loading/error/empty/content sections    | ✅ Reference   | HIGH     |
|                          | `apps/web/src/app/features/projects/projects-page.component.scss`      | SCSS: `:host`, `.projects-page`, `.projects-rail`, `.projects-*`    | ✅ Reference   | HIGH     |
|                          | `apps/web/src/app/features/projects/projects-page-header.component.ts` | Page header with title, count, actions                              | ✅ Reference   | MEDIUM   |
|                          | `apps/web/src/app/features/projects/projects-toolbar.component.ts`     | Toolbar: grouping, filter, sort, view-mode toggle                   | ✅ Reference   | MEDIUM   |
|                          | `apps/web/src/app/features/photos/media.component.ts`                  | NEW: Media page (refactored from photos), same layout pattern       | ✅ Implemented | HIGH     |
|                          | `apps/web/src/app/features/photos/media-page-header.component.ts`      | Media page header with breadcrumb + count                           | ✅ Implemented | MEDIUM   |
| **Element Specs**        | `docs/element-specs/projects-page.md`                                  | Spec contract for projects page                                     | ✅ Reference   | HIGH     |
|                          | `docs/element-specs/media-page.md`                                     | Spec contract for media page                                        | ✅ Reference   | HIGH     |
| **UI Standards**         | `docs/design-system/`                                                  | Design system folder (structure, components, usage)                 | 🔶 Partial     | MEDIUM   |
| **Shared Components**    | `apps/web/src/app/shared/ui-primitives/`                               | Button, text, icon components                                       | ✅ Reference   | MEDIUM   |
|                          | `apps/web/src/app/shared/dropdown-trigger/`                            | Dropdown, segmented, grouping/filter/sort                           | ✅ Reference   | MEDIUM   |

---

## 2. Page Layout Pattern (Reference: Projects Page)

### HTML Structure Template

```html
<main class="page-page" data-i18n-skip>
  <!-- Content Rail: responsive max-width constraint + centering -->
  <section class="page-rail content-clamp content-clamp--list">
    <!-- Header Section: title, count, primary action -->
    <app-page-header
      [title]="t('page.title', 'Title')"
      [itemCount]="items().length"
      [loading]="loading()"
      (primaryAction)="onPrimaryAction()"
    />

    <!-- [Optional] Toolbar Section: grouping, sorting, filtering, view-mode -->
    <app-page-toolbar
      [groupingOptions]="groupingOptions()"
      [filterOptions]="filterOptions()"
      [sortOptions]="sortOptions()"
      [viewMode]="viewMode()"
      (groupingChanged)="activeGrouping.set($event)"
      (filterChanged)="activeFilter.set($event)"
      (sortChanged)="activeSorts.set($event)"
      (viewModeChanged)="viewMode.set($event)"
    />

    <!-- Content Section: loading/error/empty/data states -->
    <section class="page-content">
      @if (loading()) {
      <div class="page-loading"><!-- skeleton or spinner --></div>
      } @else if (loadError()) {
      <div class="page-error"><!-- error message + retry button --></div>
      } @else if (items().length === 0) {
      <div class="page-empty"><!-- empty state message --></div>
      } @else {
      <!-- Grid or List View -->
      <ul class="page-grid">
        @for (item of items(); track item.id) {
        <li class="page-grid__item"><!-- item card/row --></li>
        }
      </ul>
      }
    </section>
  </section>
</main>
```

### SCSS Structure Template

```scss
:host {
  display: block;
  min-height: 100%;
}

.page-page {
  min-height: 100%;
  padding: var(--spacing-4); // Standard page padding
}

.page-rail {
  width: 100%;
  margin-inline: auto;
  display: grid;
  gap: var(--spacing-4); // Section spacing
}

// Loading state
.page-loading {
  border: 1px solid var(--color-border);
  border-radius: var(--container-radius-panel);
  background: var(--color-bg-surface);
  padding: var(--spacing-4);
  display: grid;
  gap: var(--spacing-2);
  // Skeleton or pulse animation
}

// Error state
.page-error {
  border: 1px solid
    color-mix(in srgb, var(--color-warning) 45%, var(--color-border));
  border-radius: var(--container-radius-panel);
  background: color-mix(
    in srgb,
    var(--color-bg-surface) 88%,
    var(--color-warning)
  );
  padding: var(--spacing-4);
  display: grid;
  gap: var(--spacing-2);
  text-align: center;
}

// Empty state
.page-empty {
  border: 1px solid var(--color-border);
  border-radius: var(--container-radius-panel);
  background: var(--color-bg-surface);
  padding: var(--spacing-4);
  display: grid;
  gap: var(--spacing-2);
  text-align: center;
  color: var(--color-text-muted);
}

// Content grid/list
.page-content {
  display: grid;
  gap: var(--spacing-3);
}

.page-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(128px, 1fr)
  ); // Adjust for list/card
  gap: var(--spacing-3);
  list-style: none;
  margin: 0;
  padding: 0;
}

.page-grid__item {
  // Card or row styling
}
```

---

## 3. Design Tokens & Primitives Required

### Spacing (Already Defined)

- `--spacing-1` through `--spacing-8` — Use consistently for all gaps, padding
- `--spacing-4` — Standard page padding (`:host` → `.page-page`)

### Colors (Already Defined)

- `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`
- `--color-bg-base`, `--color-bg-surface`, `--color-bg-secondary`
- `--color-border`, `--color-brand`, `--color-warning`

### Radii (Already Defined)

- `--container-radius-panel` — For panels, cards, containers (~8px)
- `--container-radius-control` — For buttons, inputs (~4px)

### Clamp Widths (Already Defined)

- `--content-clamp-text` 38rem (~608px) — Narrow text/form content
- `--content-clamp-default` 45rem (~720px) — General pages
- `--content-clamp-list` 52rem (~832px) — List/table pages (Projects, Media)

### Layout Primitives

- `.content-clamp` + `.content-clamp--list` — Constrain + center content
- `.ui-container` — Standard panel shell (Sidebar, Upload Panel, etc.)
- `.ui-item` — Standard row in lists/dropdowns
- `.ui-spacer` — Flex spacer for bottom-aligned content

---

## 4. Shared Components to Reuse

### Container Components

```typescript
import {
  PageContainerComponent,
  VStackComponent,
  HStackComponent,
} from "../../shared/containers";
```

### Page-Specific Components (Create Per Page)

- `PageHeaderComponent` — Title, count, primary action
- `PageToolbarComponent` (optional) — Grouping, filter, sort, view-mode
- `PageGridComponent` or `PageTableComponent` — Content display

### Reusable Primitives

- `GroupHeaderComponent` — Section header in grouped lists
- `SegmentedSwitchComponent` — View-mode toggle (list/cards)
- `DropdownShellComponent` — Grouping/filter/sort dropdowns
- `UiButtonDirective`, `UiButtonSecondaryDirective` — Actions

---

##5. Implementation Rules for New Pages

### ✅ DO:

1. **Start with HTML structure** from Section 2 template
2. **Use container components** (PageContainer, VStack, HStack) for layout
3. **Use design tokens** for all spacing, colors, radii (never hardcode)
4. **Apply `.content-clamp` or `.content-clamp--list`** to root section for max-width
5. **Implement all four states**: loading, error, empty, content
6. **Reuse shared primitives** (.ui-container, .ui-item, etc.)
7. **Create dedicated components** for header, toolbar, grid
8. **Use i18n keys** for all user-visible text (media.page._, common._)
9. **Add to element spec** (docs/element-specs/) BEFORE implementation

### ❌ DON'T:

1. **Hardcode widths, padding, radii** — use design tokens
2. **Create custom container logic** when PageContainer exists
3. **Mix old/new layout patterns** on same page
4. **Duplicate toolbar/header code** — extract to component
5. **Forget empty/error states** — all pages must have these
6. **Skip i18n registration** in translation-workbench.csv

---

## 6. Pages Implemented & Pending

| Page              | Route       | Status         | Layout               | Header                      | Toolbar                  | Notes                         |
| ----------------- | ----------- | -------------- | -------------------- | --------------------------- | ------------------------ | ----------------------------- |
| Projects          | `/projects` | ✅ Shipped     | main > content-clamp | ProjectsPageHeaderComponent | ProjectsToolbarComponent | Reference implementation      |
| Media             | `/media`    | ✅ Implemented | main > content-clamp | MediaPageHeaderComponent    | (Optional)               | Uses projects-page pattern    |
| Map               | `/map`      | ✅ Shipped     | Custom (spatial)     | —                           | —                        | Map-first layout              |
| Account           | `/account`  | ✅ Shipped     | Custom               | —                           | —                        | Uses content-clamp--text      |
| (Future) Import   | `/import`   | 🔶 Spec        | ?                    | ?                           | ?                        | Design in progress            |
| (Future) Settings | `/settings` | 🔶 Spec        | ?                    | ?                           | ?                        | Overlay-based (not full page) |

---

## 7. Next Steps

### Phase 4: Consolidate & Document

- [ ] Create shared `PageHeaderComponent` base (projects + media)
- [ ] Extract `PageToolbarComponent` pattern for reuse
- [ ] Document container component library API
- [ ] Create Mermaid diagrams for page architecture

### Phase 5: Future Pages

- [ ] Import page — list uploads, bulk actions, deduplication
- [ ] Settings page — user preferences, org settings, integrations
- [ ] Archive browser — all deleted/archived resources
