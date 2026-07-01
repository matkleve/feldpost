# Page rail composition

Composable left-rail building blocks for `app-page-grid` gutter column 1.

**Related:** [page-rail-grid.md](../../design/page-rail-grid.md), [rail-select-list.md](rail-select-list.md), `app-page-rail-title`, `app-rail-search-field`.

## Components

| Selector | Role |
| --- | --- |
| `app-page-rail` | Shell: title, nav, search, toolbar, scroll body, footer slots |
| `app-rail-nav-button` | Primary nav row (dashboard, invites) |
| `app-rail-section` | Collapsible section with header actions (used everywhere: channels/DMs, projects Starred + time buckets, organization) |
| `app-rail-group-heading` | Uppercase recency bucket label (inside a section) |
| `app-rail-select-list` | Canonical selection list (`size: normal \| large`) — see [rail-select-list.md](rail-select-list.md) |
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

## Interaction emphasis

All rail row hosts (`app-rail-nav-button`, `app-rail-select-list` row wrap, `app-rail-section` header) follow [`state-visuals.md`](../../../design/state-visuals.md) § Interaction emphasis and [`interaction-emphasis-ink-contract.md`](../../system/interaction-emphasis-ink-contract.md). Icon, label, and chevron slots **inherit host ink** on hover — no child `var(--primary)` when host uses `emphasis.hover()`.

## Usage

- **Projects:** shell + nav + search + toolbar + `app-rail-section` (Starred, all-projects) with grouped `app-rail-select-list` + footer.
- **Messaging:** shell + nav + search + `app-rail-section` (channels/DMs) + group headings.
- **Organization:** shell + title + single `app-rail-section` wrapping an `app-rail-select-list` (icon leading + `secondaryLabel` subtitle).

## Acceptance Criteria

- [ ] All three page rails use `app-page-rail` shell.
- [ ] Grouped rows are wrapped in collapsible `app-rail-section`; every list row uses `app-rail-select-list` (`size="normal"` unless a rail opts into `large`).
- [ ] No duplicate rail padding/gap/scroll SCSS in feature sidebars.
- [x] Rail row hover: gold ink on host and all child slots (icon, label, chevron) — see ink inheritance contract.
