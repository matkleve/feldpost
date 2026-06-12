# UI Primitives — Tab list and tab

**Spec sync (2026-05-19, Phase 1 Wave P5):** Legacy `tab.scss` + `[uiTabList]` / `[uiTab]` directives replaced by `BrnTabs` + `hlmTabs*` shim in `apps/web/src/app/shared/ui/tabs/`. See Phase 11 history.

## What It Is

Tab strip chrome: list container (`[brnTabsList][hlmTabsList]`) and tab triggers (`[brnTabsTrigger][hlmTabsTrigger]`). CVA in `tabs-variants.ts` drives visual treatment via tweakcn semantic tokens. The spartan shim is local pending the published `@spartan-ng/ui-tabs-helm` Tailwind v4 release.

## What It Looks Like

Muted-rail list (`bg-muted rounded-md p-1`) or line underline row. Active trigger uses **interaction-selected-ink** (blue) at rest; hover uses **primary** (orange). Focus ring via `focus-visible:ring-ring`. See [`state-visuals.md`](../../../design/state-visuals.md) § Interaction emphasis.

## Where It Lives

- **Shim:** `apps/web/src/app/shared/ui/tabs/` — `tabs-variants.ts`, `hlm-tabs.directive.ts`, `hlm-tabs-list.directive.ts`, `hlm-tabs-trigger.directive.ts`, `hlm-tabs-content.directive.ts`, `index.ts`
- **Composition:** `apps/web/src/app/shared/workspace-pane/chrome/group-tab-bar.component.ts`

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Click tab | `brnTabsChange` → parent switches active tab |
| 2 | Keyboard navigation | Per tablist ARIA pattern (`BrnTabs` / feature-owned) |

## Component Hierarchy

```text
[brnTabsList][hlmTabsList]
└── button[brnTabsTrigger][hlmTabsTrigger] × N
[brnTabsContent][hlmTabsContent] × N (panel per trigger)
```

## FSM

Tab state is managed by `BrnTabs`; active trigger receives `data-state="active"`. No local FSM enum required — parent sets `[brnTabs]="activeTabId"` and binds `(brnTabsChange)`.

## Visual Behavior Contract

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| -------- | -------------- | ----------- | ------------ | ------------- |
| Active tab | `button[brnTabsTrigger]` | `data-[state=active]` (BrnTabs) | selected-ink text/underline (`line`) or selected-ink fill mix (`default`) | ✅ |
| Tab hover | `button[brnTabsTrigger]` | `:hover` | `hover:text-primary` | ✅ |
| Focus ring | `button[brnTabsTrigger]` | `:focus-visible` | `focus-visible:ring-ring` | ✅ |

## Acceptance Criteria

- [ ] Tab list renders with `bg-muted` rail (`default`) or line underline (`line`); active trigger uses `--interaction-selected-ink`; hover uses `--primary`.
- [ ] `app-group-tab-bar` stays the composition owner for workspace tabs.
- [ ] `BrnTabs` manages active state; no boolean `@Input()` for visual state.
- [ ] Focus ring visible on all three themes (light / dark / sandstone).
