# UI Primitives — Panel Trigger (`app-panel-trigger`)

> **Normative source:** [`specs/panel-trigger.spec.md`](/specs/panel-trigger.spec.md) at repository root.  
> This file is the **`docs/specs/component/`** mirror required for `lint-specs` and the component index. All normative contract text lives in the source file above; sections below are stubs that satisfy the linter and link back.

## What It Is

A compact toolbar control that opens or closes an anchored panel (popover). Owns trigger chrome (background, optional leading icon slot, label projection, trailing chevron orientation) and a single panel visibility contract (`closed` vs `open`). Parents own which panel opens, focus management, and panel content.

## What It Looks Like

Figma (Dev Mode): https://www.figma.com/design/eCgblR1PiQnIKoFBYhCWwA/Untitled?node-id=164-2177&m=dev  
File key: `eCgblR1PiQnIKoFBYhCWwA`, node `164:2177`.

Compact horizontal pill: 16px height, 4px radius, warm neutral fill at rest, warm primary fill on hover/pressed. Trailing chevron (`expand_more`) rotates 180° when open. Optional leading 8px icon slot (projected). See normative source for full token map.

## Where It Lives

- **Figma:** https://www.figma.com/design/eCgblR1PiQnIKoFBYhCWwA/Untitled?node-id=164-2177&m=dev
- **Code:** `apps/web/src/app/shared/panel-trigger/` (`.ts` / `.html` / `.scss`)
- **Normative spec:** `specs/panel-trigger.spec.md`

## Angular Component

| | |
| --- | --- |
| **Selector** | `app-panel-trigger` |
| **Class** | `PanelTriggerComponent` |

## API Summary

| Input | Type | Default |
| --- | --- | --- |
| `panelState` | `'closed' \| 'open'` | `'closed'` |
| `layout` | `'icon-text-action' \| 'text-action'` | `'icon-text-action'` |
| `disabled` | `boolean` | `false` |

| Output | Payload |
| --- | --- |
| `toggleRequested` | `void` |

## Actions

| # | User action | System response |
| --- | --- | --- |
| 1 | Click trigger (enabled) | Parent toggles panel; trigger visual follows `panelState` |
| 2 | Hover / pointer down | Background switches to **primary ladder stop 95** — `docs/design/tokens.md` §3.1a |
| 3 | `panelState` becomes `open` | Chevron rotates 180deg |
| 4 | `disabled` | No toggle; opacity 0.66; no hover fill |

See [`specs/panel-trigger.spec.md §Actions`](/specs/panel-trigger.spec.md#actions) for normative detail.

## Component Hierarchy

```text
app-panel-trigger [data-state=closed|open] [data-layout=...]
└── button.panel-trigger
    ├── span.panel-trigger__icon [optional, icon-text-action only]
    │   └── <ng-content select="[slot=icon]">
    ├── span.panel-trigger__label
    │   └── <ng-content>
    └── span.panel-trigger__chevron.material-icons
```

## Figma Variant → Angular Mapping

| Figma property | Values | Angular mapping |
| --- | --- | --- |
| **Layout** | `icon-text-action`, `text-action` | `@Input() layout` |
| **State** | `default`, `active` | `panelState` `'closed' \| 'open'` → `[attr.data-state]` |
| **Interaction** | `default`, `hover`, `active` | CSS `:hover`, `:active`, `:focus-visible` — no inputs |

## Token Map (Figma parity → implementation)

Reference-palette fills: **neutral-variant stop 95** (rest), **primary stop 95** (hover / pressed) — canonical hex and mapping in **`docs/design/tokens.md` §3.1a** (do not use removed `--fp-ref-*` CSS variables).

| Concern | CSS token |
| --- | --- |
| Default fill | Neutral-variant stop 95 — §3.1a |
| Hover / pressed fill | Primary stop 95 — §3.1a |
| Label color | `var(--foreground)` |
| Height | `var(--spacing-4)` |
| Gap | `var(--spacing-1)` |
| Radius | `var(--radius-sm)` |
| Padding (icon layout) | `var(--spacing-1)` inline |
| Padding (text layout) | `var(--spacing-2)` left, `var(--spacing-1)` right |
| Chevron box | `var(--spacing-3)` |
| Leading icon box | `var(--spacing-2)` |

## Disabled Visuals

Follows `docs/design/state-visuals.md` § **Compact toolbar triggers**: native `disabled` on `<button type="button">`, `opacity: 0.66`, hover fill suppressed.

## Acceptance Criteria

- [ ] Host exposes `[attr.data-state]="'closed' | 'open'"` driven only by `panelState`.
- [ ] `layout` matches Figma `icon-text-action` and `text-action` padding rules using tokens.
- [ ] At rest, closed and open use **neutral-variant stop 95**; hover / pressed use **primary stop 95** — `docs/design/tokens.md` §3.1a.
- [ ] Chevron points down when `closed`, up when `open`, with transition using listed motion tokens only.
- [ ] SCSS uses `@layer components` and `@layer states`; no geometry changes in state layer beyond chevron transform.
- [ ] No user-visible strings inside the trigger without i18n registration (label is parent-supplied).
- [ ] Disabled: matches `docs/design/state-visuals.md` § Compact toolbar triggers — native `disabled`, host opacity, no hover fill.
