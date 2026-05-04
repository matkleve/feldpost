# UI Primitives — Tab list and tab

## What It Is

Tab strip chrome: list container (`ui-tab-list`) and tab buttons (`ui-tab`), including upload-lane emphasis variants in SCSS.

## What It Looks Like

Inset tab list with blur/subtle elevation; tab pills with active shadow; optional uploading/uploaded/issues/attention decorations.

## Where It Lives

- **Styles:** `apps/web/src/styles/primitives/tab.scss`
- **Composition:** e.g. `apps/web/src/app/shared/workspace-pane/chrome/group-tab-bar.component.ts`

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Click tab | Parent switches active tab |
| 2 | Keyboard navigation | Per tablist ARIA pattern (feature-owned) |

## Component Hierarchy

```text
[uiTabList]
└── button[uiTab] × N
```

## FSM

Upload lane decorations (`--uploading`, `--issues`, `--attention`, …) SHOULD map to explicit inputs when migrating off directives; default none.

## Visual Behavior Contract

| Behavior | Geometry Owner | State |
| -------- | ---------------- | ----- |
| Tab button | host `button` | decoration + active class |

## Acceptance Criteria

- [ ] Upload-aware tabs retain motion/tokens from `tab.scss`.
- [ ] `app-group-tab-bar` stays the composition owner for workspace tabs.
