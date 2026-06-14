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

**Canonical tokens:** `--primary` (hover / attention), `--interaction-selected-ink` (persistent selected/on), `--muted-foreground` (idle ink). Mix recipe: `color-mix(in srgb, <ink> 10%, transparent)` for fills; outline borders may use `color-mix(in srgb, <ink> 42%, var(--border))`.

| State | Ink | Background | Border (outline hosts) |
| ----- | --- | ------------ | ---------------------- |
| **Idle** | `--muted-foreground` | transparent or `--background` | `--input` / `--border` |
| **Hover / focus-visible** | `--primary` | primary 10% mix | primary ~42% + border mix |
| **Pressed (`:active`)** | `--primary` | primary ~15% mix | — |
| **Selected / on** (`routerLinkActive`, `data-state=on`, `aria-pressed`) | `--interaction-selected-ink` | selected-ink 10% mix | selected ~42% + border mix (when bordered) |
| **Selected + hover** | `--primary` (wins) | primary 10% mix | same as hover |
| **Destructive quiet row** | `--destructive` | destructive 10% mix (hover) / 15% (`:active`) | — |

**Implementation owners:**

- `apps/web/src/app/shared/ui/button/button-variants.ts` — `outline`, `ghost`, `destructive`
- `apps/web/src/app/shared/ui/toggle-group/toggle-group-variants.ts` — lane items
- `apps/web/src/app/shared/ui/tabs/tabs-variants.ts` — tab triggers
- `apps/web/src/app/features/nav/nav.component.scss` — route links
- `apps/web/src/app/features/map/map-shell/_map-shell-upload.scss` — map/media upload trigger (`.map-upload-btn`)
- `apps/web/src/styles/_option-menu-item-states.scss` — menu rows (hover already primary; destructive branch unchanged)
- `apps/web/src/styles/_interaction-emphasis-quiet-row.scss` — shared SCSS mixins for feature list rows
- `apps/web/src/app/features/upload/upload-resolver-tray/upload-resolver-tray.component.scss` — resolver choice rows
- `apps/web/src/app/features/settings-overlay/settings-overlay.component.scss` — section rail + TOC
- `apps/web/src/app/shared/project-select-dialog/project-select-dialog.component.scss` — option rows
- `apps/web/src/app/features/upload/upload-panel/upload-panel-item.component.scss` — embedded multi-select rows
- `apps/web/src/app/shared/workspace-pane/toolbar/workspace-toolbar/projects-dropdown.component.scss` — picker options
- `apps/web/src/app/shared/dropdown-trigger/grouping-dropdown.component.scss` — multi-select rows
- `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-inline-section/media-detail-inline-section.component.scss` — `__option--selected`
- `apps/web/src/app/shared/workspace-pane/media-detail/captured-date-editor.component.scss` — calendar day `--selected`

**Filled CTAs (exception):** `hlmBtn` `variant="default"` stays solid fill. `variant="destructive"` uses destructive quiet emphasis (light wash + destructive ink) — same recipe as the **Destructive quiet row** row above.

**Documented exceptions:**

| Surface | Why |
| ------- | --- |
| File-type chips (`app-chip` `--filetype-*`) | Category semantics, not interaction emphasis |
| Switches (`data-[state=checked]:bg-primary`) | On/off control, not selection vs hover |
| Map upload progress ring (`.map-upload-btn--uploading`) | Batch progress uses `--primary` on the ring/spinner only |
| Media selection rings / tile FSM | Domain selection chrome — per media specs |

**Test oracle:** Idle row is muted; hovering any enabled row tints orange; current route / selected toggle segment is cool blue at rest and orange on hover.

---

## Loading and error (placeholder)

**Loading** and **error** shells that are **not** button-based belong in the owning **element spec** until a second control repeats the same pattern; then extend this file with a new subsection and link from `docs/design/README.md`.

---

## Changelog

- **2026-05-27** — **Interaction emphasis** contract for quiet controls (hover primary, selected `--interaction-selected-ink`).
- **2026-05-05** — Initial publication: **disabled** contract for native buttons and **Panel Trigger**; closes SPEC GAP referenced in `specs/panel-trigger.spec.md`.
