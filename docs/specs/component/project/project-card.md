# Project Card

> **Parent spec:** [`docs/specs/page/projects-page.md`](../../page/projects-page.md)
> **Chip contract:** [`docs/specs/component/filters/chip.md`](../filters/chip.md)
> **Related planned component (Item Grid variant):** [`docs/specs/component/project/project-item.md`](./project-item.md) *(distinct component, not this one)*

## What It Is

`ProjectCardComponent` is the card-layout presentation component for a single project entry on the `/projects` page. It owns visual display only — data fetching, pagination, routing logic, and project mutations are all delegated outside this component.

## What It Looks Like

A tinted, elevated card with a 2×2 thumbnail mosaic (or contextual placeholder), project name, a chip row for status/location/media count, and an optional relative-activity line. A three-dot context menu provides archive/restore/delete/color actions. The card accent color is driven by the project's `colorKey`.

## Where It Lives

- **Selector:** `app-project-card`
- **Code:** `apps/web/src/app/features/projects/project-card.component.ts`
- **Consumer:** `apps/web/src/app/features/projects/projects-grid-view.component.ts`
- **Appears in:** `viewMode === 'grid'` and `viewMode === 'board'` on the Projects page

## Responsibility

### Owned by `ProjectCardComponent`

- Visual display of a single project record
- Empty-state handling for the card content area (initials placeholder)
- User interaction surface: card click → navigate; context menu trigger → menu overlay
- Context menu actions: color picker, archive, restore, delete (emitted to parent)

### NOT owned by `ProjectCardComponent`

- Data fetching, pagination, filtering
- Routing logic (card emits events; parent navigates)
- Project mutations (parent executes)
- Grid layout, column count, view-mode switching

## Inputs / Outputs

### Input

```ts
readonly project = input.required<ProjectSummary>();
```

**Single required input only.** The card derives every visual from `project()`. No variant, formatter, or color-resolver inputs.

`ProjectSummary` interface (minimum contract):

```ts
interface ProjectSummary {
  id: string;
  name: string;
  colorKey: ProjectColorKey;
  status: 'active' | 'archived' | 'draft';
  mediaCount: number;
  location?: { label: string; lat: number; lng: number } | null;
  thumbnailUrls?: string[];
  lastActivityAt?: string | null;
}
```

### Outputs

| Output | Payload | When |
|--------|---------|------|
| `colorSelected` | `{ projectId: string; colorKey: ProjectColorKey }` | User selects a color from the context menu color panel |
| `dangerAction` | `{ projectId: string; action: 'archive' \| 'restore' \| 'delete' }` | User confirms a destructive action in the context menu |

## Visual Zones

| Zone | Content | Empty state |
|------|---------|-------------|
| Thumbnail | 2×2 photo mosaic when `thumbnailUrls.length >= 1`; map tile stub with pin icon when `location` exists and no thumbnails; initials placeholder otherwise | Initials placeholder — never a blank gray box |
| Name | `project().name` (2-line clamp) | — |
| Chip row | Status chip + location chip (if `location` present) + media count chip | Status chip always present |
| Activity line | `lastActivityAt` formatted as relative time | Omitted entirely — do not render "No activity" |
| Context menu | Three-dot trigger → archive/restore/delete/color actions | Hidden when no actions available |

## Chip Language

All chips are composed from `ChipComponent` (`app-chip`). No inline badge HTML.

| Data | Chip variant | Icon (Material) | Label |
|------|-------------|-----------------|-------|
| `status: 'active'` | `success` | `lens` | t(`projects.status.active`, `active`) |
| `status: 'archived'` | `warning` | `archive` | t(`projects.status.archived`, `archived`) |
| `status: 'draft'` | `neutral` | `edit` | t(`projects.status.draft`, `draft`) |
| `location` present | `success` | `place` | `location.label` |
| `location` null/undefined | omit | — | — |
| `mediaCount` | `neutral` | `photo` | `project().mediaCount` |

**Rule:** Never render a "No location" text string. Either the location chip is present or it is absent.

## View Mode Context

This card appears in:
- `grid` mode: full card in a 4-col/2-col/1-col responsive grid
- `board` mode: compact card variant in status-grouped columns (draft/active/archived)

The card does not receive the current view mode. Layout differences between grid and board are applied from the parent container via CSS host context.

## Internalized Logic

The card resolves these without external inputs:

| Concern | How resolved |
|---------|-------------|
| Project accent color | Imports `colorTokenFor(key)` directly from `projects-formatters.logic.ts` |
| Relative date | Injects `I18nService`; uses `formatRelativeDate` helper; result in a `computed()` signal |
| Context menu height/position | Internal signals; no parent involvement |

## State Machine

FSM required: the card has programmatic state (menu open/closed, menu panel active, loading/error not exposed at this layer but menu availability depends on project status).

### State Enum

```ts
type ProjectCardMenuPanel = 'actions' | 'colors';
```

Menu open/closed is a boolean signal (`menuOpen`). The `ProjectCardMenuPanel` switches the menu overlay content.

### Transition Map

| From | To | Trigger |
|------|----|---------|
| menu closed | menu open (actions) | `onMenuTriggerClick` |
| actions panel | colors panel | user selects `change_color` action |
| colors panel | menu closed | user selects a color |
| menu open (any) | menu closed | `closeRequested` from overlay shell |

## Accessibility

- Card host: `role="article"` and `[attr.aria-label]="project().name"`
- Menu trigger button: `aria-expanded`, `aria-haspopup="menu"`, i18n label
- Chip row: `role="list"`, each chip `role="listitem"`
- Thumbnail mosaic images: `alt=""` (decorative)
- Initials placeholder: `aria-hidden="true"`

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |
|---|---|---|---|---|---|---|
| Card surface | `.project-card` | `:host` | `.project-card` | `.project-card` | layer/content (0) | Card bounds contain all zones; no overflow |
| Thumbnail mosaic | `.project-card__thumbnail` | `.project-card` | none | `.project-card__thumbnail` | layer/content | Mosaic fills zone; initials visible when no URLs |
| Context menu overlay | `app-dropdown-shell` | `body` (portal) | `.project-card__menu-trigger` | `.project-card__menu-trigger` | layer/overlay | Menu appears anchored to trigger |
| Status chip | `app-chip` | `.project-card__chips` | none | `.project-card__chips` | layer/content | Status chip always rendered |
| Selected/hover emphasis | `.project-card` | `:host` | `.project-card` | `.project-card:hover`, `.project-card:focus-within` | layer/hover | Tinted background, elevated shadow |

### Ownership Triad Declaration

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
|---|---|---|---|---|
| Card surface tint | `.project-card` | `.project-card` | `.project-card` | ✅ |
| Thumbnail zone | `.project-card__thumbnail` | `.project-card__thumbnail` | `.project-card__thumbnail` | ✅ |
| Hover emphasis | `.project-card` | `.project-card:hover` | `.project-card:hover` | ✅ |
| Context menu | `app-dropdown-shell` | `menuOpen` signal | `app-dropdown-shell` | ✅ |

### Layer Order

| Layer name | Element | z-index |
|---|---|---|
| content | card surface, chips | 0 |
| overlay | `app-dropdown-shell` context menu | via portal (browser stack) |

No undeclared z-index values in component SCSS.

## Empty States

| Condition | Thumbnail zone | Chip row | Activity line |
|-----------|----------------|----------|---------------|
| `thumbnailUrls.length >= 1` | 2×2 mosaic | all applicable chips | if `lastActivityAt` |
| `location` exists, no thumbnails | map tile stub | all chips | if `lastActivityAt` |
| no thumbnails, no location | initials placeholder | all chips | if `lastActivityAt` |

## File Map

| File | Purpose |
|------|---------|
| `apps/web/src/app/features/projects/project-card.component.ts` | Card orchestration, menu state, outputs |
| `apps/web/src/app/features/projects/project-card.component.html` | Visual zone template |
| `apps/web/src/app/features/projects/project-card.component.scss` | Card geometry, thumbnail zone, state visuals |

## Wiring

### Injected Services

- `I18nService` — all user-facing strings via `t(key, fallback)`

### Imported Helpers

- `colorTokenFor(key: ProjectColorKey): string` from `projects-formatters.logic.ts`
- `formatRelativeDate(value, t): string` from `projects-formatters.logic.ts`

### Call-site Pattern

```html
<app-project-card
  [project]="summary"
  (colorSelected)="onColorSelected($event.projectId, $event.colorKey)"
  (dangerAction)="onDangerAction($event.projectId, $event.action)"
/>
```

Parent is responsible for mapping `ProjectListItem` → `ProjectSummary` via `toProjectSummary()` before binding.

## Acceptance Criteria

- [ ] Card accepts exactly one required input: `project: ProjectSummary`. No other inputs.
- [ ] `role="article"` and `[attr.aria-label]="project().name"` present on host element.
- [ ] Thumbnail zone shows 2×2 mosaic when `thumbnailUrls.length >= 1`.
- [ ] Thumbnail zone shows map-stub div (pin icon, tinted bg) when `location` exists and no thumbnails.
- [ ] Thumbnail zone shows initials placeholder when no thumbnails and no location — never a blank gray box.
- [ ] Status chip always rendered; uses `ChipComponent` with correct variant per chip-language table.
- [ ] Location chip present if and only if `location` is non-null; chip label = `location.label`.
- [ ] Media count chip always rendered with `'neutral'` variant.
- [ ] Activity line rendered only when `lastActivityAt` is non-null; "No activity" string never appears in template.
- [ ] No inline badge HTML — all chips via `app-chip`.
- [ ] Color token applied via `[style.--project-item-color]` using `colorTokenFor(project().colorKey)`.
- [ ] Relative-date formatting result is a `computed()` signal; `Date.now()` not called in template.
- [ ] No RxJS imports in the component file.
- [ ] No direct Supabase calls in the component file.
- [ ] `ng build` clean after changes.
