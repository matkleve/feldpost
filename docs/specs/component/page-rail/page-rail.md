# Page rail composition

Composable left-rail building blocks for `app-page-grid` gutter column 1.

**Related:** [page-rail-grid.md](../../design/page-rail-grid.md), `app-page-rail-title`, `app-rail-search-field`, `app-rail-select-list`.

## Components

| Selector | Role |
| --- | --- |
| `app-page-rail` | Shell: title, nav, search, toolbar, scroll body, footer slots |
| `app-rail-nav-button` | Primary nav row (dashboard, invites) |
| `app-rail-section` | Collapsible section with header actions |
| `app-rail-group-heading` | Uppercase recency bucket label |
| `app-rail-detail-nav-item` | Icon + title + subtitle + chevron row (organization) |
| `app-rail-status` | Centered empty/loading line |

## `app-page-rail` slots

| Attribute | Content |
| --- | --- |
| `pageRailTitle` | `app-page-rail-title` |
| `pageRailNav` | `app-rail-nav-button` (repeatable) |
| `pageRailSearch` | `app-rail-search-field` |
| `pageRailToolbar` | Feature toolbar (e.g. filter/sort) |
| `pageRailBody` | Sections, lists, custom rows |
| `pageRailFooter` | Sticky footer actions |

## Visual Behavior Contract

| Behavior | Geometry | Stacking | Hit-area | Selector | Layer | Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Rail shell column | `.page-rail` | `.page-rail` | — | `.page-rail` | 0 | fills left gutter height |
| Scroll body | `.page-rail__scroll` | `.page-rail` | — | `.page-rail__scroll` | 0 | overflow-y auto |
| Section collapse | `.rail-section__heading` | `.rail-section__header` | `.rail-section__heading` | `.rail-section__caret--collapsed` | 0 | aria-expanded |
| Section header actions | `.rail-section__actions` | `.rail-section__header` | `button` | `.rail-section__actions` | 0 | visible on header hover |

## Usage

- **Projects:** shell + nav + search + toolbar + grouped `app-rail-select-list` + footer.
- **Messaging:** shell + nav + search + `app-rail-section` (channels/DMs) + group headings.
- **Organization:** shell + title + `app-rail-detail-nav-item` list (no group headings).

## Acceptance Criteria

- [ ] All three page rails use `app-page-rail` shell.
- [ ] Collapsible sections use `app-rail-section`; list rows use `app-rail-select-list` or `app-rail-detail-nav-item`.
- [ ] No duplicate rail padding/gap/scroll SCSS in feature sidebars.
