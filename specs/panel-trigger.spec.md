# Panel Trigger

## What It Is

A compact toolbar control that opens or closes an anchored panel (popover). It owns only trigger chrome (background, label slot, optional leading icon, trailing chevron orientation) and a single panel visibility contract (`closed` vs `open`). Parents own which panel opens, focus management, and panel content.

## What It Looks Like

**Implement this design from Figma (Dev Mode):**  
https://www.figma.com/design/eCgblR1PiQnIKoFBYhCWwA/Untitled?node-id=164-2177&m=dev

Per Figma component **PanelTrigger** (node `164:2177`): a compact horizontal control, **1rem** total height (`--fp-base-16`), **0.25rem** corner radius (`--fp-alias-r-4`, Figma `scale/base-4`), internal row gap **0.25rem** (`--fp-base-4`). Default/rest surface uses **`--fp-ref-neutral-variant-95`**. Hover (and pressed pointer while interactive) uses **`--fp-ref-primary-95`**. Label uses **label small** typescale (`--fp-sys-typescale-label-small-*`) and **`--fp-sys-color-on-surface`**. Trailing **expand_more** chevron is **12px** (`--fp-base-12`); when **`data-state="open"`**, the chevron rotates **180deg** (points up). Optional leading icon slot is **8px** (`--fp-base-8`) — content is projected; Figma uses a placeholder square. **text-action** layout: padding-left **`--fp-base-8`**, padding-right **`--fp-base-4`**. **icon-text-action** layout: horizontal padding **`--fp-alias-sp-4`** on both sides. No separate visible border in the reference; edge is read from fill vs parent surface.

## Where It Lives

- **Design reference (Dev Mode):** https://www.figma.com/design/eCgblR1PiQnIKoFBYhCWwA/Untitled?node-id=164-2177&m=dev — file `eCgblR1PiQnIKoFBYhCWwA`, node `164:2177`.
- **Code (planned):** `apps/web/src/app/shared/panel-trigger/panel-trigger.component.ts` (+ `.html`, `.scss`).
- **Use:** Workspace and projects toolbars — any surface that today uses `ui-button` + `ui-dropdown-trigger` for filter / grouping / sort / projects may adopt this component for visual parity with the Figma **PanelTrigger** set.

## Angular component

| | |
| --- | --- |
| **Selector** | `app-panel-trigger` |
| **Class** | `PanelTriggerComponent` |
| **Files** | `apps/web/src/app/shared/panel-trigger/panel-trigger.component.ts`, `.html`, `.scss` |

## Props / Inputs

| Input | Type | Default | Notes |
| --- | --- | --- | --- |
| `panelState` | `'closed' \| 'open'` (or `InputSignal<...>`) | `'closed'` | Single visual API; host **`[attr.data-state]`** mirrors this value exactly |
| `layout` | `'icon-text-action' \| 'text-action'` | `'icon-text-action'` | Matches Figma **Layout** |
| `disabled` | `boolean` | `false` | Accessibility / interaction gate; not a substitute for `panelState` |

**Outputs (recommended):**

| Output | Payload | Notes |
| --- | --- | --- |
| `toggleRequested` | `void` | Parent decides open/close; optional if parent uses native click on projected control |

## Purpose and responsibility

| Owns | Does not own |
| --- | --- |
| Trigger layout, padding, radius, background for default / hover / pressed / `open` pairing per Figma | Popover or dropdown body content |
| Chevron rotation reflecting `closed` vs `open` | Overlay positioning math (`getBoundingClientRect`), CDK overlay config |
| Optional leading icon projection + label projection | Which filter rules, groupings, or projects are listed |
| Emits **click** (or dedicated **toggleRequested**) for parent to flip panel | Document click-outside, Escape, scroll lock, focus trap (parent or shell component) |
| `disabled` presentation when host is disabled (native) | Toolbar “active dot” or feature-active semantics (parent derives) |

## Actions

| # | User action | System response |
| --- | --- | --- |
| 1 | Click trigger (enabled) | Parent toggles panel; trigger visual follows `panelState` |
| 2 | Hover / pointer down | Background matches Figma **hover** / **pressed** rows (`--fp-ref-primary-95` while interactive) |
| 3 | `panelState` becomes `open` | Chevron rotates to **open** orientation per Figma |
| 4 | `disabled` | No toggle; uses disabled visual token contract (see acceptance) |

## Component Hierarchy

```text
app-panel-trigger [data-state=closed|open]
├── [optional] ng-content (select: leading icon)
├── span / projected label region
└── span.chevron (expand_more)
```

## Data

| Field / input | Source | Notes |
| --- | --- | --- |
| Label text | Parent | MUST go through i18n (`t(key, fallback)`) at parent; trigger accepts string or projected content per implementation choice |
| `panelState` | Parent | Single source for chevron / `[attr.data-state]` |

## State

**Programmatic visual API (required):** one driver: panel is **`closed`** or **`open`**. Expose **`[attr.data-state]`** on the host with exactly those two values (maps to Figma property **State**: default → closed, active → open).

| State | `data-state` | Chevron | Default background (no hover) |
| --- | --- | --- | --- |
| Panel closed | `closed` | Down | `--fp-ref-neutral-variant-95` |
| Panel open | `open` | Up (rotate 180deg) | `--fp-ref-neutral-variant-95` |

**CSS-only interaction (not FSM states):** `:hover`, `:focus-visible`, `:active` match Figma **Interaction** axis — backgrounds use **`--fp-ref-primary-95`** where Figma shows hover/hover+open rows. **Disabled:** native `disabled` or `aria-disabled`; visuals follow **`docs/design/state-visuals.md`** § Disabled (no invented treatment).

### Transition map (choreography)

| From | To | Guard | Visual change | Timing |
| --- | --- | --- | --- | --- |
| `closed` | `open` | parent opens panel | Chevron **0deg → 180deg** | `transform` over `--fp-sys-motion-duration-short2` (`100ms`), easing `--motion-ease-standard` |
| `open` | `closed` | parent closes panel | Chevron **180deg → 0deg** | same |

Background cross-fades use **`--interactive-transition-standard`** (already composes duration + easing tokens) where background changes apply.

### Transition guard

Only **`closed` ↔ `open`** are valid `data-state` values; invalid values are a spec violation.

## Variants (Figma)

| Figma property | Values | Angular mapping |
| --- | --- | --- |
| **Layout** | `icon-text-action`, `text-action` | `@Input() layout: 'icon-text-action' \| 'text-action'` (default `icon-text-action`) |
| **State** | `default`, `active` | Maps to **`panelState` `'closed' \| 'open'`** and `[attr.data-state]` — not a separate `@Input()` named `state` |
| **Interaction** | `default`, `hover`, `active` | **No inputs** — use `:hover`, `:focus-visible`, `:active` only |

## Token references

| Concern | Token(s) |
| --- | --- |
| Default fill | `--fp-ref-neutral-variant-95` |
| Hover / pressed fill | `--fp-ref-primary-95` |
| Label color | `--fp-sys-color-on-surface` |
| Label typography | `--fp-sys-typescale-label-small-size`, `-line-height`, `-weight`, `-tracking` |
| Height | `--fp-base-16` |
| Gap (icon, label, chevron) | `--fp-base-4` |
| Radius | `--fp-alias-r-4` |
| Padding (icon layout) | `--fp-alias-sp-4` inline |
| Padding (text-only layout) | `padding-left: var(--fp-base-8)`, `padding-right: var(--fp-base-4)` |
| Chevron box | `--fp-base-12` |
| Leading icon box | `--fp-base-8` |
| Chevron rotation transition | `--fp-sys-motion-duration-short2`, `--motion-ease-standard` |
| Background transition | `--interactive-transition-standard` |

## Visual Behavior Contract

### Ownership matrix

| Behavior | Visual geometry owner | Stacking context owner | Interaction hit-area owner | Selector(s) | Layer (z-index/token) | Test oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Trigger footprint | `:host` | `:host` | `:host` button | `.panel-trigger` | stacking: none special; inherits toolbar context | Hit area matches compact toolbar control |
| Default / open fill | `:host` | `:host` | — | `[data-state=closed]`, `[data-state=open]` | — | Closed and open use **neutral-variant-95** at rest per Figma |
| Hover / pressed fill | `:host` | `:host` | — | `:host(:hover)`, `:host(:active)` (and focus ring partner below) | — | Rest → **primary-95** when hover rows match Figma |
| Chevron orientation | `.panel-trigger__chevron` | `:host` | — | `[data-state=open] .panel-trigger__chevron` | layer: content | Open ⇒ chevron rotated 180deg |
| Focus ring | `:host` | `:host` | `:host` | `:focus-visible` | `--interactive-focus-ring` / `--shadow-focus-ring` | Keyboard focus shows ring; no ring on pointer-only |

### Ownership triad

| Behavior | Geometry owner | State owner | Visual owner | Same element? |
| --- | --- | --- | --- | --- |
| Panel open chevron | `.panel-trigger__chevron` | `:host[data-state=open]` | `.panel-trigger__chevron` | ✅ |
| Rest background | `:host` | `:host[data-state]` | `:host` | ✅ |
| Hover background | `:host` | `:host:hover` (pseudo) | `:host` | ✅ |

**Stacking context:** `:host` is the single `position: relative` owner for internal stacking (chevron vs label).

## File Map

| Path | Role |
| --- | --- |
| `apps/web/src/app/shared/panel-trigger/panel-trigger.component.ts` | Inputs, outputs, `data-state` |
| `apps/web/src/app/shared/panel-trigger/panel-trigger.component.html` | Layout branches for `layout` |
| `apps/web/src/app/shared/panel-trigger/panel-trigger.component.scss` | `@layer components` / `@layer states`; token-only values |

## Wiring

- Parent sets **`[panelState]`** (`'closed' \| 'open'`) from its dropdown / popover controller.
- Parent listens to **click** or **`toggleRequested`** to open/close shell.
- **Chevron asset:** reuse the same Material Symbol / SVG approach as `ui-dropdown-trigger` or shared icon pipeline — no hardcoded raster from Figma MCP URLs in production.

## Acceptance Criteria

- [ ] Host exposes **`[attr.data-state]="'closed' \| 'open'"`** driven only by **`panelState`** (no separate boolean for open/closed).
- [ ] **`layout`** matches Figma **`icon-text-action`** and **`text-action`** padding rules using tokens in § Token references.
- [ ] At rest, closed and open matches use **`--fp-ref-neutral-variant-95`**; hover / pressed paths use **`--fp-ref-primary-95`** per Figma matrix.
- [ ] Chevron points **down** when `closed`, **up** when `open`, with transition using listed motion tokens only.
- [ ] SCSS uses **`@layer components`** and **`@layer states`**; no geometry changes in state layer beyond allowed transforms on chevron.
- [ ] No user-visible strings added inside the trigger without i18n registration (prefer parent-supplied label already translated).
- [ ] **Disabled:** match `docs/design/state-visuals.md` § **Compact toolbar triggers (Panel Trigger, `app-panel-trigger`)** (native `disabled` + host opacity; no hover fill).

## Canonical docs note

This file lives under **`specs/`** at repo root per task layout. For **`lint-specs`** and the component index, mirror or move to **`docs/specs/component/ui-primitives/ui-primitives.panel-trigger.md`** when you want repo-wide spec gates to enforce this contract.
