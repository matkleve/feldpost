# State visuals (canonical)

**Who this is for:** anyone implementing interactive states (hover, focus, disabled, loading, error) on shared controls.  
**What this is:** the **cross-component** contract for how common semantic states *look*; component specs still own geometry and wiring detail.

**Related (read first):**

- `docs/design/constitution.md` — touch targets, contrast, keyboard baseline.
- `docs/design/components/action-interaction-kernel.md` — calm chrome, accent for guidance, border policy.
- `docs/design/motion.md` — durations; prefer motion tokens over literals.
- `docs/design/tokens.md` — token names and Figma bridge.

---

## Disabled (canonical)

**Rule:** Do not invent one-off disabled grays per component. Reuse the patterns below unless a **dedicated element spec** documents an exception with a test oracle.

### Native `disabled` on `<button>` (default shell)

Use for **`app-panel-trigger`** and other **native button** hosts when the control is truly inert.

| Concern | Treatment |
| ------- | ----------- |
| **Pointer** | `cursor: not-allowed` |
| **Overall legibility** | `opacity: 0.66` on the **host** (matches `.ui-button:disabled` in `apps/web/src/styles/primitives/button.scss`) |
| **Hover / active chrome** | **None** — `:disabled` must not apply hover or pressed fills |
| **Focus** | Native disabled buttons are not focusable; **no** `:focus-visible` ring |
| **Chevron / icon / label** | Same opacity applies to all children (single host treatment) |

**Implementation note:** Prefer **native `disabled`** on a real `<button type="button">` for correct semantics. If **`aria-disabled="true"`** is required while keeping the node focusable for custom focus management, pair it with **`pointer-events: none`** (or an equivalent guard) and **the same visual recipe** as above — document the exception in the component spec.

### Compact toolbar triggers (Panel Trigger, `app-panel-trigger`)

Figma reference: **PanelTrigger** (see `specs/panel-trigger.spec.md` for node id and token map).

| Concern | Treatment |
| ------- | ----------- |
| **Rest fill when disabled** | Keep **neutral** rest fill matching **neutral-variant ladder stop 95** (same as closed/open *rest* in the panel-trigger spec — `docs/design/tokens.md` §3.1a) so the trigger does not read as “hovered” when inert |
| **Hover fill** | **Suppressed** — disabled host must not switch to **primary stop 95** (§3.1a) |
| **Chevron** | Does **not** rotate for “open” when disabled; parent must keep `panelState` `'closed'` or still pass `'open'` only if product explicitly allows (discouraged); visually **muted** via host `opacity` |

### `aria-disabled` without native `disabled`

Rare. Must be justified in the component spec (e.g. loading handoff). Visuals **match** the table above; interaction guard is spec-owned.

---

## Focus-visible (shared reminder)

- Keyboard focus on **enabled** triggers: use **`--interactive-focus-ring`** (defined in **`apps/web/src/styles/_typography-baseline.scss`** `:root` + dark selectors — **Phase 7 Batch 47** moved it off **`_legacy-design-tokens.scss`**); do not rely on browser default only where product chrome is custom-shaped.
- **Disabled** triggers: no focus ring (non-focusable or `aria-disabled` with documented focus policy).

---

## Interaction emphasis (hover / selected)

**Rule:** Quiet interactive controls use a **three-tier attention budget** unless a **dedicated element spec** documents an exception with a test oracle. **`--brand-gold` is the high-attention tier** — pointer focus **and** any row/item **selected because it needs user attention now** (multi-select, in-panel choice, linked-hover). **Not** for passive “mode is on” context (toggle segment, toolbar `data-active`, sort preset).

**Canonical tokens:** `--brand-gold` (high-attention tier), `--interaction-selected-ink` (secondary; cool blue — **not** `var(--primary)` when sandstone sets primary to gold), `--interaction-nav-ink` (tertiary; royal violet via `--app-violet-accent`), `--muted-foreground` (idle ink), `--menu-item-hover` (= gold 8%), `--action-hover` (= gold 12%). **Prefer the mixin/token — see Mandatory implementation contract below.**

### Brand gold scope (blocker)

Gold means **this needs attention** — not merely “something is selected.”

| Use gold (`emphasis.hover` / `emphasis.engaged`) | Use secondary blue (`emphasis.selected`) | Use tertiary violet (`emphasis.nav`) |
| ------------------------------------------------ | ---------------------------------------- | ------------------------------------ |
| `:hover`, `:focus-visible`, `:active` on any quiet control | Toggle `data-state=on` (toolbar lanes, upload size — not map basemap) | Nav active route |
| Filter picker row `data-selected` while choosing | Toolbar trigger `data-active` (filter/sort applied) | Settings section rail active |
| Grouping / upload-panel **multi-select** row selected | Active sort row (preset, not flyout pick) | **Map style switch** segment on at rest |
| In-panel engaged row in an **open** flyout | Calendar day selected (date context) | — |
| Linked-hover (grid ↔ map cross-surface) | — | — |
| Single or **multiple** list rows where selection is the current task | — | — |

**Sandstone theme:** `--primary` may be gold for filled CTAs; `--interaction-selected-ink` **must** remain cool blue in `html[data-theme="sandstone"]`. Accidentally aliasing secondary ink to sandstone `--primary` makes passive context (toggle on) look like high-attention gold — **spec violation** (see [`tokens.md`](tokens.md) § Interaction emphasis).

### Attention tiers (normative)

| Tier | Meaning | Ink | Mixin | Examples |
| ---- | ------- | --- | ----- | -------- |
| **High attention** | Pointer focus **or** selection that needs user focus now | `--brand-gold` | `emphasis.hover()`, `emphasis.engaged()` | Row hover; filter picker `data-selected`; grouping multi-select; upload-panel multi-select; linked-hover |
| **Secondary** | Context is set, not the focal task | `--interaction-selected-ink` | `emphasis.selected()`, `emphasis.selected-bordered()` | Toolbar `data-active`, active sort row, toggle `data-state=on`, calendar selected day |
| **Tertiary** | Where you are in the product or map view | `--interaction-nav-ink` | `emphasis.nav()`, `emphasis.nav-bordered()` | Main nav active route, settings overlay section rail, **map style switch on** |

**Pointer always wins:** any tier + `:hover` / `:focus-visible` → **brand gold** (`emphasis.hover()`). Never deepen secondary/tertiary to stronger blue/violet on hover.

| State | Ink | Background | Border (outline hosts) |
| ----- | --- | ------------ | ---------------------- |
| **Idle** | `--muted-foreground` | transparent or `--background` | `--input` / `--border` |
| **Hover / focus-visible** (any tier) | `--brand-gold` | gold ~10% mix (`emphasis.hover`) | gold ~42% + border mix (outline hosts) |
| **Pressed (`:active`)** | `--brand-gold` | gold ~15% mix | — |
| **Secondary at rest** | `--interaction-selected-ink` | selected-ink ~10% mix | selected ~42% + border mix (when bordered) |
| **Tertiary at rest** | `--interaction-nav-ink` | nav-ink ~10% mix | nav ~42% + border mix (when bordered) |
| **Engaged / attention-selected row** (open panel or multi-select task) | `--brand-gold` | gold ~10% mix | — |
| **Destructive quiet row** | `--destructive` | destructive 10% mix (hover) / 15% (`:active`) | — |

### Ink inheritance (blocker)

On any quiet host using the mixins above, **icon, label, and chevron slots must inherit host ink** (`color: inherit`). Never set child slots to `var(--primary)` while the host uses `emphasis.hover()` (gold). Full scope matrix: [`docs/specs/system/interaction-emphasis-ink-contract.md`](../specs/system/interaction-emphasis-ink-contract.md).

### Mandatory implementation contract (blocker)

**Never** write `color-mix(in srgb, var(--primary) X%, transparent)` or `color-mix(in srgb, var(--interaction-selected-ink) X%, transparent)` inline in component SCSS for hover/selected states. Use the shared abstractions below.

| Need | Use | Never inline |
| ---- | --- | ------------ |
| List-row hover background (8%) | `var(--menu-item-hover)` | `color-mix(in srgb, var(--primary) 8%, transparent)` |
| Action/control hover (12%) | `var(--action-hover)` | `color-mix(in srgb, var(--primary) 12%, transparent)` |
| Full hover treatment (bg + ink) | `@include emphasis.hover(X%)` from `_interaction-emphasis-quiet-row.scss` | raw `background:` + `color:` pair |
| Persistent selected state (secondary) | `@include emphasis.selected(X%)` | `color-mix(in srgb, var(--interaction-selected-ink) X%, transparent)` |
| Product nav at rest (tertiary) | `@include emphasis.nav(X%)` | `color-mix(in srgb, var(--interaction-nav-ink) X%, transparent)` |
| In-panel / attention-selected row | `@include emphasis.engaged(X%)` | same as hover |
| Selected row + pointer over it | `@include emphasis.hover(X%)` | same as hover — gold ink + wash |
| Selected + border indicator (secondary) | `@include emphasis.selected-bordered(X%, Y%)` | `background + border-color` pair with selected-ink |
| Nav + border indicator (tertiary) | `@include emphasis.nav-bordered(X%, Y%)` | `background + border-color` pair with nav-ink |

**Import path** (adjust `../` levels to reach `src/styles/`):
```scss
@use '<relative-path>/styles/interaction-emphasis-quiet-row' as emphasis;
```

**Guard:** `npm run design-system:check` runs `scripts/guard-interaction-emphasis.mjs` which fails CI if a component SCSS file uses inline `color-mix` for hover/selected when the mixin/token should be used instead.

**Implementation owners:**

- `apps/web/src/app/shared/ui/button/button-variants.ts` — `outline`, `ghost`, `destructive`
- `apps/web/src/app/shared/ui/toggle-group/toggle-group-variants.ts` — lane items (**hover always gold**)
- `apps/web/src/app/shared/ui/tabs/tabs-variants.ts` — tab triggers
- `apps/web/src/app/features/nav/nav.component.scss` — route links
- `apps/web/src/app/features/map/map-shell/_map-shell-upload.scss` — map/media upload trigger (`.map-upload-btn`)
- `apps/web/src/styles/_option-menu-item-states.scss` — menu rows (`emphasis.hover` + child `color: inherit`)
- `apps/web/src/app/features/map/map-shell/scss/_map-shell-style-switch.scss` — map basemap switch (tertiary violet pierce over toggle CVA)
- `apps/web/src/app/features/map/search-bar/search-bar.component.scss` — map search clear (ghost + linked bar-hover ink)
- `apps/web/src/app/shared/menu-panel/menu-panel-search-row.component.scss` — dropdown search clear (geometry only)
- `apps/web/src/app/shared/rail-select-list/rail-select-list.component.scss` — page-rail select rows (`emphasis.hover` / `selected`)
- `apps/web/src/app/shared/rail-section/rail-section.component.scss` — collapsible rail headers
- `apps/web/src/styles/_interaction-emphasis-quiet-row.scss` — **canonical mixin source** for feature list rows
- `apps/web/src/app/features/upload/upload-resolver-tray/upload-resolver-tray.component.scss` — resolver choice rows
- `apps/web/src/app/features/settings-overlay/settings-overlay.component.scss` — section rail + TOC
- `apps/web/src/app/shared/project-select-dialog/project-select-dialog.component.scss` — option rows
- `apps/web/src/app/features/upload/upload-panel/upload-panel-item.component.scss` — embedded multi-select rows
- `apps/web/src/app/shared/workspace-pane/toolbar/workspace-toolbar/projects-dropdown.component.scss` — picker options
- `apps/web/src/app/shared/dropdown-trigger/grouping/grouping-dropdown.component.scss` — multi-select rows
- `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-inline-section/media-detail-inline-section.component.scss` — `__option--selected`
- `apps/web/src/styles/_map-shell-leaflet-global.scss` — photo marker hover / linked-hover outline
- `apps/web/src/app/shared/workspace-pane/media-detail/captured-date-editor.component.scss` — calendar day `--selected`
- `apps/web/src/app/shared/media-item/media-item.component.scss` — tile slot hover / linked-hover

**Filled CTAs (exception):** `hlmBtn` `variant="default"` stays solid fill. `variant="destructive"` uses destructive quiet emphasis (light wash + destructive ink) — same recipe as the **Destructive quiet row** row above.

**Documented exceptions:**

| Surface | Why |
| ------- | --- |
| File-type chips (`app-chip` `--filetype-*`) | Category semantics, not interaction emphasis |
| Switches (`data-[state=checked]:bg-primary`) | On/off control, not selection vs hover |
| Map upload progress ring (`.map-upload-btn--uploading`) | Batch progress uses `--primary` on the ring/spinner only |
| Media selection rings / tile FSM | Domain selection chrome — per media specs |

**Test oracle:** Idle row is muted. **High attention** (hover, multi-select row selected, flyout picker `data-selected`, linked-hover) → **brand gold** on host + all child slots. **Secondary** at rest (sort preset on, filter toolbar active, non-map toggles on) → cool blue. **Tertiary** at rest (nav route, settings section, **map basemap segment on**) → royal violet. Pointer over any tier → gold. **Reject:** gold on resting map basemap segment; blue on map basemap segment on at rest.

---

## Loading and error (placeholder)

**Loading** and **error** shells that are **not** button-based belong in the owning **element spec** until a second control repeats the same pattern; then extend this file with a new subsection and link from `docs/design/README.md`.

---

## Changelog

- **2026-06-22 (c)** — **Map style switch** re-tiered to **tertiary violet** (map view placement); generic toggles remain secondary blue.
- **2026-06-22 (b)** — **High-attention tier:** gold = pointer focus **and** selection that needs attention (multi-select, flyout pick, linked-hover); not passive mode context. Supersedes narrow “pointer only” wording from (a).
- **2026-06-22 (a)** — Brand gold scope blocker; sandstone `--interaction-selected-ink` decoupling. Tokens table in [`tokens.md`](tokens.md).
- **2026-06-17 (c)** — **Three-tier attention budget:** primary gold (hover + in-panel engaged rows), secondary blue (context set), tertiary violet (product nav). Tokens `--interaction-nav-ink`, mixins `emphasis.nav()` / `nav-bordered()`.
- **2026-06-16** — Added **Mandatory implementation contract** table: inline `color-mix` for hover/selected is now a CI-blocked pattern; all existing usages migrated to `emphasis.*` mixins or `--menu-item-hover`/`--action-hover` tokens. Guard added to `scripts/guard-interaction-emphasis.mjs` and wired into `design-system:check`.
- **2026-06-17** — **Ink inheritance** rule + hover ink = `--brand-gold` (aligned with `_interaction-emphasis-quiet-row.scss`); cross-component scope in [`interaction-emphasis-ink-contract.md`](../specs/system/interaction-emphasis-ink-contract.md).
- **2026-05-27** — **Interaction emphasis** contract for quiet controls (hover gold, selected `--interaction-selected-ink`).
- **2026-05-05** — Initial publication: **disabled** contract for native buttons and **Panel Trigger**; closes SPEC GAP referenced in `specs/panel-trigger.spec.md`.
