# Visual Ownership Audit

> Scan date: 2026-06-22
> Scope: `apps/web/src/app` — 146 component `.ts`, 134 component `.scss`.
> Lens: the **Ownership Triad** from `.github/skills/component-structure/SKILL.md`
> (Geometry Owner / State Owner / **Visual Owner**), the Visual Behavior Contract,
> the single-stacking-context rule, and the explicit z-index layer map.

## What "Visual Owner" means here

Per the component-structure gate, every visual behavior must name **exactly one**
Visual Owner — the element whose CSS produces the visible output (color, border,
shadow, opacity, animation). It must not own geometry of other elements, and each
component must declare a single `position: relative` stacking-context owner plus an
explicit z-index map for overlays.

A component's visual ownership is "well defined" when:

1. It references a Visual Behavior Contract / ownership matrix (`@see …#visual-behavior-contract` or `#ownership-matrix`), **and**
2. There is exactly one stacking-context owner (`position: relative`), **and**
3. Overlay layers have an explicit z-index map, **and**
4. Each visual state (`selected`, `loading`, `error`, hover) resolves to one owner element.

---

## Tier 0 — Reference implementations (the standard to copy)

These are fully defined. Use them as the template when fixing the others.

| Component | Why it's good |
|---|---|
| `shared/media-item/media-item.component.scss` | Inline `@see …media-item.md#visual-behavior-contract`; mode-exclusive `position: relative` (grid / row / detail-embed never co-exist); states resolve to `.media-item__slot--selected` / `--linked-hover`; z-index map (open=1, overlay=3, quiet-actions=4, chip=5, badge=6). |
| `features/projects/project-item.component.scss` | References `#ownership-matrix`, `#transition-choreography-table`; selected visual owner is `.project-item__frame--selected` only. |
| `shared/item-grid/item-state-frame.component.*` | Loading/Error/Empty mutually exclusive, single state-layer owner. |

---

## Tier 1 — Visual ownership genuinely undefined (fix first)

| # | Component | Visual-ownership problem | Severity |
|---|---|---|---|
| 1 | `shared/media/universal-media.component.scss` | **Visual owner leaks to consumers.** Border/ring/background/radius of `.universal-media__slot` are exposed as `--universal-media-slot-*` custom props that every consumer (upload-panel, media-item) overrides — so no single element actually owns the surface's appearance. Overlay layers (`__badge` z2, `__upload-overlay` z1) have **no documented z-index map**. `loading` / `error` are color-only overrides on a shared `.universal-media__layer` with no enforced state exclusivity. No spec / no contract. **Highest impact — it's a shared primitive, so the ambiguity propagates everywhere it's embedded.** | Blocker |
| 2 | `features/upload/upload-shell/upload-shell.component.scss` | 5× `position: relative` + 4× `z-index`, **no contract reference** → multiple candidate stacking-context owners, implicit layer order. | Blocker |
| 3 | `features/upload/upload-panel/upload-panel.component.scss` | 3× `position: relative` + 5× `z-index`, no consolidated layer map. | High |
| 4 | `features/upload/upload-panel/upload-panel-item.component.scss` | 8× `z-index` (highest in repo). Selected/hover visual owner *is* consolidated (`emphasis` mixins on `.upload-panel__file-main` — good), but the overlay/hit-target/thumbnail/menu z-order has **no single layer map comment**; reads as ad-hoc. | High |
| 5 | `features/auth/auth-map-layer/auth-map-layer.component.scss` | Explicit map(z0)/overlay(z1) layering with no documented layer-order map; two `inset:0` layers, ownership of the scrim vs map surface undeclared. | High |
| 6 | `features/colleagues/invites/invite-editor-panel/invite-editor-panel.component.scss` | 2× `position: relative`; theme-conditional QR-frame visuals (`:host-context(html[data-theme='dark'])` vs default) split the QR frame's visual ownership across selectors; no contract. | High |

---

## Tier 2 — Visual state present, ownership not declared (no contract reference)

These have rings/shadows/overlays/state classes but no `@see` contract in the SCSS.
Lower visual complexity than Tier 1, but the owner is still implicit.

| Component | Note |
|---|---|
| `shared/ui-primitives/group-header.component.scss` | Gold inset focus ring + `z-index:1`; a spec exists (`ui-primitives.group-header.md`) but the SCSS doesn't bind to it. |
| `shared/quick-info-chips/quick-info-chips.component.scss` | Spec exists (`workspace/quick-info-chips.md`); SCSS has no ownership link. |
| `features/map/gps-button/gps-button.component.scss` | `box-shadow` + `z-index:200` floating control, no contract; magic z-index. |
| `features/colleagues/chat/chat-area.component.scss` | Ad-hoc state visuals on a large feature surface, no contract. |
| `features/colleagues/invites/colleagues-invite-referrals-panel.component.scss` | Same. |
| `features/organization/sections/roles/organization-roles-section.component.scss` | State-class geometry mixing (width/height inside state selectors). |
| `features/organization/sections/branding/organization-branding-section.component.scss` | Same. |

> `shared/workspace-pane/shell/drag-divider/drag-divider.component.scss` is structurally
> fine (single `:host` stacking owner, states bound to `:host:hover/.dragging`) — it only
> lacks an `@see` link. Low priority.

---

## Tier 3 — Coverage gap (documentation, not code)

- **~58 of 146 components** reference the ownership triad / Visual Owner in their spec.
  The remaining ~88 have **no ownership matrix at all** in `docs/specs`.
- The undocumented concentration is in **feature surfaces**: `upload/*`, `colleagues/*`,
  `organization/sections/*`, `auth/*`. Shared primitives are mostly covered; feature
  pages are where visual ownership drifts.

---

## Recommended order of work

1. **`universal-media`** — define a Visual Behavior Contract: declare the slot as sole
   visual owner of surface (border/radius/bg), document the badge/upload-overlay z-index
   map, and make loading/error/empty mutually exclusive. This is a shared primitive, so it
   pays off everywhere.
2. **Upload family** (`upload-shell`, `upload-panel`, `upload-panel-item`) — write one
   z-index layer map and name the single stacking-context owner per component.
3. **Auth / colleagues / organization** feature surfaces — backfill ownership matrices in
   their specs, then add `@see` links in SCSS.
4. **Tier 2 quick wins** — add `@see` links binding existing specs to SCSS.
</content>
</invoke>
