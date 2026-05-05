# UI Primitives — Badges and chips

## What It Is

Small inline metadata: **status badges** (read-only emphasis), **toolbar/filter chips** (`.ui-chip`), and **semantic** `app-chip` ([chip entry](./ui-primitives.chip.md) → [chip.md](../filters/chip.md)).

## What It Looks Like

Pills using tokens: status badges with semantic colors; chips with action/passive/selected and optional count variant; `app-chip` per chip spec.

## Where It Lives

- **Styles:** `apps/web/src/styles/primitives/badge.scss`, `chip.scss`
- **Semantic chip:** `apps/web/src/app/shared/components/chip/`
- **Integration:** `ui-primitives.directive.ts` (`uiStatusBadge*`, `uiChip*`)

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Render status badge | Host shows emphasis + size |
| 2 | Activate chip (when interactive) | Parent handles click; hover/focus per chip chrome |

## Component Hierarchy

```text
span or button host (badge / chip)
└── optional icon + label (projected)
```

## When to use which

| Need | Use |
| ---- | ----- |
| Table/metadata status | `.ui-status-badge*` |
| Toolbar/filter pill | `.ui-chip*` |
| Dismissible / file-type / rich | `app-chip` — [ui-primitives.chip.md](./ui-primitives.chip.md) |

## Visual Behavior Contract

| Surface | Geometry Owner | Interaction |
| ------- | ---------------- | ----------- |
| Status badge | host | none unless product adds control |
| UI chip (action) | host | per template |

## File Map

| File | Purpose |
| ---- | ------- |
| `badge.scss` | Status chrome |
| `chip.scss` | Filter/toolbar chip chrome |

## Acceptance Criteria

- [ ] Status badges default non-interactive unless a feature spec says otherwise.
- [ ] New UI picks row from **When to use which**; glossary terms stay canonical.
