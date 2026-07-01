# Rail Select List

## What It Is

`app-rail-select-list` — the one canonical scrollable quiet-row selection list for page rails (projects, colleagues channels/DMs/members, organization sections, invite links). It absorbs the former `rail-detail-nav-item` via a `leading` icon plus a `secondaryLabel` subtitle.

## What It Looks Like

A vertical list of rows. Each row: optional `leading` (dot / avatar / icon), a `label` with optional muted `secondaryLabel` second line, an optional unread `badge` pill, and hover-revealed row `actions`. Hover paints gold ink (`emphasis.hover()`); the selected row uses `emphasis.selected()` + `aria-selected`.

The site-wide default density is **`normal`**, calibrated to the upload-resolver choice row so every rail list matches the main nav and upload-tray density.

| `size` | Row min-height | Label font | Use |
| --- | --- | --- | --- |
| `normal` (default) | `2rem` | `--font-size-xs` | Everywhere |
| `large` | `2.5rem` | `--font-size-sm` | Opt-in, one step up |

## Where It Lives

- **File**: `apps/web/src/app/shared/rail-select-list/`
- **Parent**: [page-rail.md](page-rail.md); emphasis mixins from [`state-visuals.md`](../../../design/state-visuals.md) § Interaction emphasis.
- **Used in**: `projects-sidebar`, `member-list`, `organization-sidebar`, `channel-detail-panel`, `colleagues-invite-reusable-links-panel`.

## Actions

Inputs: `items`, `selectedId`, `size` (`normal` \| `large`), `grow` (flex-grow to fill height), `loading`, `listAriaLabel`, `loadingMessage`, `emptyMessage`.

Outputs: `itemSelected(id)` on row click; `actionTriggered({ itemId, actionId })` on a row action (button or two-step `confirm`).

## Component Hierarchy

- `.rail-select-list` (role=`listbox`, scroll owner)
  - `.rail-select-list__row-wrap` (`--active` selected, `--with-actions`)
    - `.rail-select-list__row` (role=`option`) → `leading` (`__dot`/`__avatar`/`__icon`) + `__labels` (`__label` + `__secondary`) + `__badge`
    - `.rail-select-list__row-action` (button) or `app-inline-confirm-action`

Row density is owned solely by `:host(--normal)` / `:host(--large)`; feature sidebars must not redefine row padding/gap/height.

## Acceptance Criteria

- [ ] `size` defaults to `normal`; `normal` row min-height is `2rem` with `--font-size-xs` labels.
- [ ] `grow` only changes flex-grow; row geometry is identical between grow states.
- [ ] Rows render `leading` dot/avatar/icon, optional `secondaryLabel`, `badge`, and `actions`.
- [ ] Hover = gold ink on row and all child slots; selected = `emphasis.selected()` + `aria-selected="true"`.
- [ ] No feature sidebar redefines row padding/gap/height — density comes only from `size`.
