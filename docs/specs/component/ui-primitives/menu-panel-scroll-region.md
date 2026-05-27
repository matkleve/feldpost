# Menu panel scroll region

## What It Is

Scroll host for projected `[dropdown-items]` with a typed `scrollMode` contract.

## What It Looks Like

`div.standard-dropdown__items` with mode-specific overflow and optional max-height cap.

## Where It Lives

- `apps/web/src/app/shared/menu-panel/menu-panel-scroll-region.component.ts`
- `apps/web/src/app/shared/menu-panel/menu-panel-scroll-mode.ts`

## Actions

| Trigger | Response |
| --- | --- |
| Scroll list | `itemsScroll` emits (filter dismisses flyout) |

## Component Hierarchy

```text
app-menu-panel-scroll-region
└── ng-content[dropdown-items]
```

## Props

| Input | Values | Effect |
| --- | --- | --- |
| `scrollMode` | `host` \| `delegate` \| `split` \| `none` | Maps to `standard-dropdown__items--*` modifiers |
| `itemsClass` | string | Extra classes (non-scroll only) |

## Acceptance Criteria

- [x] `host` scrolls on `.standard-dropdown__items`
- [x] `delegate` hides outer scroll (inner list scrolls)
- [x] `split` pins outer host; feature inner band scrolls
- [x] `none` applies filter rules band max-height
