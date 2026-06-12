# Context Action Bar

> **Consumers:** [media-detail-actions.md](../ui/media-detail/media-detail-actions.md), [workspace-pane-footer.md](./workspace/workspace-pane-footer.md)

## What It Is

Shared action rendering for context-driven toolbars. Accepts resolved actions from `ActionEngineService` and renders either a **footer** row (compact `icon-sm` buttons) or a **section** grid (labeled `hlmMenuItem` rows).

## Variants

| Variant | Layout | Use |
| --- | --- | --- |
| `footer` | Horizontal icon buttons, destructive separated | Media detail sticky footer, workspace selection footer |
| `section` | Two-column labeled action grid | Scrollable actions section |

## Inputs / Outputs

| Input | Type | Notes |
| --- | --- | --- |
| `actions` | `ResolvedAction[]` | Pre-resolved from action engine |
| `variant` | `'footer' \| 'section'` | Default `section` |
| `pending` | `boolean` | Disables footer buttons when true |

| Output | Payload |
| --- | --- |
| `actionSelected` | Action id |

## Where It Lives

- **Code:** `apps/web/src/app/shared/context-action-bar/`

## Acceptance Criteria

- [x] Footer variant uses `hlmBtn` `size="icon-sm"` with `aria-label` from action label
- [x] Section variant matches detail-actions two-column grid
- [x] Destructive actions separated visually in both variants
