# Panel Trigger

## What It Is

A compact toolbar control that opens or closes an anchored panel (popover). It owns only trigger chrome (background, label slot, optional leading icon, trailing chevron orientation) and a single panel visibility contract (`closed` vs `open`). Parents own which panel opens, focus management, and panel content.

## What It Looks Like

**Figma (Dev Mode):** https://www.figma.com/design/eCgblR1PiQnIKoFBYhCWwA/Untitled?node-id=164-2177&m=dev

Per Figma component **PanelTrigger** (node `164:2177`): a compact horizontal control, **1rem** total height (`var(--spacing-4)`), **0.25rem** corner radius (`var(--radius-sm)`; Figma `scale/base-4`), internal row gap **0.25rem** (`var(--spacing-1)`). Default/rest surface matches **neutral-variant ladder stop 95** (`fp/ref/neutral-variant/95` in Figma). Hover (and pressed pointer while interactive) matches **primary ladder stop 95** (`fp/ref/primary/95`). **Canonical hex and Figma-path ↔ ladder mapping:** `docs/design/tokens.md` §3.1a (do not use removed `--fp-ref-*` CSS variables in implementation). Label uses **label small** typescale (`--fp-sys-typescale-label-small-*`) and **`var(--foreground)`** (Figma on-surface role) — typescale contract: §3.1e in the same file. Trailing **expand_more** chevron is **12px** (`var(--spacing-3)`); when **`data-state="open"`**, the chevron rotates **180deg** (points up). Optional leading icon slot is **8px** (`var(--spacing-2)`) — content is projected; Figma uses a placeholder square. **text-action** layout: padding-left **`var(--spacing-2)`**, padding-right **`var(--spacing-1)`**. **icon-text-action** layout: horizontal padding **`var(--spacing-1)`** on both sides (4px; Figma `scale/base-4`). No separate visible border in the reference; edge is read from fill vs parent surface.

**Token verification:** Figma scale `base-*` px values map to **`var(--spacing-*)`** / **`var(--radius-*)`** per `docs/migration/phase-7-token-migration.md` (**Batch 44:** **`--spacing-*`** / **`--container-radius-*`** / **`--radius-full`** on **`_typography-baseline.scss` `:root`**; **`--radius-sm|md|lg`** duplicated on **`styles.scss` `@theme inline`** — not **`_legacy-design-tokens.scss`**). Reference-palette parity names (`fp/ref/…`) and ladder stops are centralized in **`docs/design/tokens.md` §3.1a**. Figma **on-surface** label ink → **`var(--foreground)`** in implementation. Label small metrics: **`docs/design/tokens.md` §3.1e** (`--fp-sys-typescale-label-small-*`).

## Where It Lives

- **Design reference:** Figma file `eCgblR1PiQnIKoFBYhCWwA`, node `164:2177`.
- **Code:** `apps/web/src/app/shared/panel-trigger/panel-trigger.component.ts` (+ `.html`, `.scss`).
- **Use:** Workspace and projects toolbars — any surface that today uses **`hlmBtn`** + toolbar menu-trigger classes for filter / grouping / sort / projects may adopt this component for visual parity with the Figma **PanelTrigger** set.

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

**Outputs:**

| Output | Payload | Notes |
| --- | --- | --- |
| `toggleRequested` | `void` | Parent decides open/close; optional if parent uses native click on projected control |

## Purpose and responsibility

| Owns | Does not own |
| --- | --- |
| Trigger layout, padding, radius, background for default / hover / pressed / `open` pairing per Figma | Popover or dropdown body content |
| Chevron rotation reflecting `closed` vs `open` | Overlay positioning math (`getBoundingClientRect`), CDK overlay config |
| Optional leading icon projection + label projection | Which filter rules, groupings, or projects are listed |
| Emits `toggleRequested` for parent to flip panel | Document click-outside, Escape, scroll lock, focus trap (parent or shell component) |
| `disabled` presentation when host is disabled (native) | Toolbar "active dot" or feature-active semantics (parent derives) |

## Actions

| # | User action | System response |
| --- | --- | --- |
| 1 | Click trigger (enabled) | Parent toggles panel; trigger visual follows `panelState` |
| 2 | Hover / pointer down | Background matches Figma **hover** / **pressed** rows (primary ladder stop 95 — `docs/design/tokens.md` §3.1a) |
| 3 | `panelState` becomes `open` | Chevron rotates to **open** orientation per Figma |
| 4 | `disabled` | No toggle; uses disabled visual token contract (see acceptance) |

## Component Hierarchy

```text
app-panel-trigger [data-state=closed|open]
├── [optional] ng-content (select: leading icon)
├── span.panel-trigger__label
└── span.panel-trigger__chevron (expand_more)
```

## Data

| Field / input | Source | Notes |
| --- | --- | --- |
| Label text | Parent | MUST go through i18n (`t(key, fallback)`) at call site; trigger accepts projected content |
| `panelState` | Parent | Single source for chevron / `[attr.data-state]` |

## State

**Programmatic visual API (required):** one driver: panel is **`closed`** or **`open`**. Expose **`[attr.data-state]`** on the host with exactly those two values (maps to Figma property **State**: default → closed, active → open).

| State | `data-state` | Chevron | Default background (no hover) |
| --- | --- | --- | --- |
| Panel closed | `closed` | Down | Neutral-variant stop 95 — §3.1a |
| Panel open | `open` | Up (rotate 180deg) | Neutral-variant stop 95 — §3.1a |

**CSS-only interaction (not FSM states):** `:hover`, `:focus-visible`, `:active` match Figma **Interaction** axis — backgrounds use **primary stop 95** per §3.1a where Figma shows hover/hover+open rows (`docs/design/tokens.md`). **Disabled:** native `disabled` or `aria-disabled`; visuals follow `docs/design/state-visuals.md` § Disabled (no invented treatment).

### Transition map (choreography)

| From | To | Guard | Visual change | Timing |
| --- | --- | --- | --- | --- |
| `closed` | `open` | parent opens panel | Chevron **0deg → 180deg** | `transform` over **`var(--motion-duration-fast)`** (`100ms`), easing **`cubic-bezier(0.4, 0, 0.2, 1)`** (matches implementation) |
| `open` | `closed` | parent closes panel | Chevron **180deg → 0deg** | same |

Background / border / color cross-fades use a **literal multi-property list** (**`120ms ease-out`** per property — **Phase 7 Batch 41** removed **`--interactive-transition-standard`** from the bridge; see **`panel-trigger.component.scss`**).

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
| Default fill | Neutral-variant ladder stop 95 — `docs/design/tokens.md` §3.1a |
| Hover / pressed fill | Primary ladder stop 95 — §3.1a |
| Label color | `var(--foreground)` (tweakcn; former `--fp-sys-color-on-surface` bridge) |
| Label typography | `--fp-sys-typescale-label-small-size`, `-line-height`, `-weight`, `-tracking` — §3.1e |
| Height | `var(--spacing-4)` |
| Gap (icon, label, chevron) | `var(--spacing-1)` |
| Radius | `var(--radius-sm)` |
| Padding (icon layout) | `var(--spacing-1)` inline |
| Padding (text-only layout) | `padding-left: var(--spacing-2)`, `padding-right: var(--spacing-1)` |
| Chevron box | `var(--spacing-3)` |
| Leading icon box | `var(--spacing-2)` |
| Chevron rotation transition | **`var(--motion-duration-fast)`** + **`cubic-bezier(0.4, 0, 0.2, 1)`** |
| Background transition | **Literal** **`120ms ease-out`** on `border-color`, `background`, `color` (Batch 41 — no bridge shorthand) |

## Visual Behavior Contract

### Ownership matrix

| Behavior | Visual geometry owner | Stacking context owner | Interaction hit-area owner | Selector(s) | Layer (z-index/token) | Test oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Trigger footprint | `:host` | `:host` | `.panel-trigger` button | `.panel-trigger` | inherits toolbar context | Hit area matches compact toolbar control |
| Default / open fill | `:host` | `:host` | — | `[data-state=closed]`, `[data-state=open]` | — | Closed and open use **neutral-variant stop 95** at rest per Figma (§3.1a) |
| Hover / pressed fill | `:host` | `:host` | — | `:host(:hover)`, `:host(:active)` | — | Switches to **primary stop 95** on hover (§3.1a) |
| Chevron orientation | `.panel-trigger__chevron` | `:host` | — | `:host([data-state=open]) .panel-trigger__chevron` | layer: content | Open ⇒ chevron rotated 180deg |
| Focus ring | `.panel-trigger` | `:host` | `.panel-trigger` | `.panel-trigger:focus-visible` | `--interactive-focus-ring` | Keyboard focus shows ring; no ring on pointer-only |

### Ownership triad

| Behavior | Geometry owner | State owner | Visual owner | Same element? |
| --- | --- | --- | --- | --- |
| Panel open chevron | `.panel-trigger__chevron` | `:host[data-state=open]` | `.panel-trigger__chevron` | ✅ |
| Rest background | `:host` | `:host[data-state]` | `:host` | ✅ |
| Hover background | `:host` | `:host:hover` (pseudo) | `:host` | ✅ |

**Stacking context:** `:host` is the single `position: relative` owner.

## File Map

| Path | Role |
| --- | --- |
| `apps/web/src/app/shared/panel-trigger/panel-trigger.component.ts` | Inputs, outputs, `data-state` |
| `apps/web/src/app/shared/panel-trigger/panel-trigger.component.html` | Layout branches for `layout` |
| `apps/web/src/app/shared/panel-trigger/panel-trigger.component.scss` | `@layer fp-components` / `@layer fp-states`; token-only values |

## Wiring

- Parent sets **`[panelState]`** (`'closed' \| 'open'`) from its dropdown / popover controller.
- Parent listens to **`toggleRequested`** or native click to open/close shell.
- **Chevron asset:** reuse the Material Symbol / SVG approach as on **`hlmBtn`** toolbar menu triggers — no hardcoded raster URLs.

## Acceptance Criteria

- [ ] Host exposes **`[attr.data-state]="'closed' \| 'open'"`** driven only by `panelState` (no separate boolean for open/closed).
- [ ] `layout` matches Figma `icon-text-action` and `text-action` padding rules using tokens in § Token references.
- [ ] At rest, both states use **neutral-variant stop 95**; hover / pressed paths use **primary stop 95** — `docs/design/tokens.md` §3.1a.
- [ ] Chevron points **down** when `closed`, **up** when `open`, with transition using listed motion tokens only.
- [ ] SCSS uses `@layer fp-components` / `@layer fp-states`; no geometry changes in state layer beyond chevron `transform`.
- [ ] No user-visible strings inside the trigger without i18n registration (label is parent-supplied and pre-translated).
- [ ] **Disabled:** match `docs/design/state-visuals.md` § Compact toolbar triggers — native `disabled` + host `opacity: 0.66`; no hover fill.
