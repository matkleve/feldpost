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
| **Rest fill when disabled** | Keep **neutral** rest fill **`--fp-ref-neutral-variant-95`** (same token as closed/open *rest* in the panel-trigger spec) so the trigger does not read as “hovered” when inert |
| **Hover fill** | **Suppressed** — disabled host must not switch to **`--fp-ref-primary-95`** |
| **Chevron** | Does **not** rotate for “open” when disabled; parent must keep `panelState` `'closed'` or still pass `'open'` only if product explicitly allows (discouraged); visually **muted** via host `opacity` |

### `aria-disabled` without native `disabled`

Rare. Must be justified in the component spec (e.g. loading handoff). Visuals **match** the table above; interaction guard is spec-owned.

---

## Focus-visible (shared reminder)

- Keyboard focus on **enabled** triggers: use **`--interactive-focus-ring`** / **`--shadow-focus-ring`** (see `tokens.scss`); do not rely on browser default only where product chrome is custom-shaped.
- **Disabled** triggers: no focus ring (non-focusable or `aria-disabled` with documented focus policy).

---

## Loading and error (placeholder)

**Loading** and **error** shells that are **not** button-based belong in the owning **element spec** until a second control repeats the same pattern; then extend this file with a new subsection and link from `docs/design/README.md`.

---

## Changelog

- **2026-05-05** — Initial publication: **disabled** contract for native buttons and **Panel Trigger**; closes SPEC GAP referenced in `specs/panel-trigger.spec.md`.
