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

**Rule:** Quiet interactive controls (nav links, `hlmBtn` `outline`/`ghost`, toggle items, menu rows) use this recipe unless a **dedicated element spec** documents an exception with a test oracle.

**Canonical tokens:** `--brand-gold` (hover / invitation ink — **including selected+hover**), `--interaction-selected-ink` (persistent selected/on at rest; equals `--primary` in default theme), `--muted-foreground` (idle ink), `--menu-item-hover` (= gold 8%), `--action-hover` (= gold 12%). **Prefer the mixin/token — see Mandatory implementation contract below.**

| State | Ink | Background | Border (outline hosts) |
| ----- | --- | ------------ | ---------------------- |
| **Idle** | `--muted-foreground` | transparent or `--background` | `--input` / `--border` |
| **Hover / focus-visible** | `--brand-gold` | gold ~10% mix (`emphasis.hover`) | gold ~42% + border mix (outline hosts) |
| **Pressed (`:active`)** | `--brand-gold` | gold ~15% mix | — |
| **Selected / on** (`routerLinkActive`, `data-state=on`, `aria-pressed`) — **at rest** | `--interaction-selected-ink` | selected-ink 10% mix | selected ~42% + border mix (when bordered) |
| **Selected + hover / focus-visible** | **`--brand-gold`** (same as hover) | gold ~10% mix (`emphasis.hover`) | gold ~42% + border mix |
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
| Persistent selected state | `@include emphasis.selected(X%)` | `color-mix(in srgb, var(--interaction-selected-ink) X%, transparent)` |
| Selected row + pointer over it | `@include emphasis.hover(X%)` | same as hover — gold ink + wash |
| Selected + border indicator | `@include emphasis.selected-bordered(X%, Y%)` | `background + border-color` pair with selected-ink |

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
- `apps/web/src/app/features/map/map-filter-toolbar/map-filter-toolbar.component.scss` — frosted map filter triggers
- `apps/web/src/app/shared/rail-detail-nav-item/rail-detail-nav-item.component.scss` — page-rail detail rows
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

**Test oracle:** Idle row is muted; hovering any enabled control tints **gold** on **host and all child slots** — **including when already selected**; current route / selected segment is cool blue **at rest only** (not while hovered).

---

## Loading and error (placeholder)

**Loading** and **error** shells that are **not** button-based belong in the owning **element spec** until a second control repeats the same pattern; then extend this file with a new subsection and link from `docs/design/README.md`.

---

## Changelog

- **2026-06-17 (b)** — **Selected+hover = gold:** pointer over selected quiet controls uses `emphasis.hover`, not primary deepening.
- **2026-06-16** — Added **Mandatory implementation contract** table: inline `color-mix` for hover/selected is now a CI-blocked pattern; all existing usages migrated to `emphasis.*` mixins or `--menu-item-hover`/`--action-hover` tokens. Guard added to `scripts/guard-interaction-emphasis.mjs` and wired into `design-system:check`.
- **2026-06-17** — **Ink inheritance** rule + hover ink = `--brand-gold` (aligned with `_interaction-emphasis-quiet-row.scss`); cross-component scope in [`interaction-emphasis-ink-contract.md`](../specs/system/interaction-emphasis-ink-contract.md).
- **2026-05-27** — **Interaction emphasis** contract for quiet controls (hover gold, selected `--interaction-selected-ink`).
- **2026-05-05** — Initial publication: **disabled** contract for native buttons and **Panel Trigger**; closes SPEC GAP referenced in `specs/panel-trigger.spec.md`.
