# Projects View Toggle

## What It Is

A projects-page control that maps `ProjectsViewMode` (`list` | `cards`) onto the shared `SegmentedSwitchComponent` with icon-only options and i18n-backed aria labels.

## What It Looks Like

Two compact segments (list and cards icons) using the segmented switch visual system. Active segment follows `viewMode` input; sizing follows segmented-switch `fit`/`fill` rules inherited from the child component.

## Where It Lives

- **Code:** `apps/web/src/app/shared/view-toggle/`
- **Consumers:** Projects toolbar and related surfaces switching between table and card layouts.

## Actions

| #   | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1   | Select list segment | `viewModeChange` emits `'list'` | segmented switch output |
| 2   | Select cards segment | `viewModeChange` emits `'cards'` | segmented switch output |
| 3   | Parent sets `viewMode` | Active segment updates | input binding |

## Component Hierarchy

```text
app-projects-view-toggle
└── app-segmented-switch (options from computed `viewOptions`)
```

## Data

| Source | Contract | Operation |
| ------ | -------- | --------- |
| Parent | `viewMode: ProjectsViewMode` | Read |
| Component | `viewModeChange: Output<ProjectsViewMode>` | Emit on valid selection |
| I18nService | keys for titles/aria | Read via `t()` |

## State

| Name | Type | Purpose |
| ---- | ---- | ------- |
| `viewOptions` | computed `SegmentedSwitchOption[]` | Static structure with localized labels |

Selection state is delegated to `SegmentedSwitchComponent`; this wrapper does not add a second FSM.

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/view-toggle/projects-view-toggle.component.ts` | Options + handler |
| `apps/web/src/app/shared/view-toggle/projects-view-toggle.component.html` | Template |
| `apps/web/src/app/shared/view-toggle/projects-view-toggle.component.scss` | Wrapper spacing only |

## Wiring

- Import with `viewMode` two-way pattern (`viewMode` + `viewModeChange`).
- Ensure i18n keys used here exist in translation pipeline.

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ---------------------- | ----------- |
| Segments | `app-segmented-switch` | child host | segment buttons | delegated to segmented-switch spec | content | matches segmented-switch acceptance |

### Ownership Triad Declaration

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| -------- | -------------- | ----------- | ------------ | ------------- |
| Mode toggle | `app-segmented-switch` | child | child | ✅ (wrapper adds no geometry) |

## Acceptance Criteria

- [ ] Only `'list'` and `'cards'` values propagate to `viewModeChange`.
- [ ] Icon-only segments remain square per segmented-switch rules.
- [ ] Aria labels and titles resolve through `I18nService` with English fallbacks in code.
