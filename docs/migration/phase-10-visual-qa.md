# Phase 10 — Visual QA & Polish

**Status:** **Wave P4** ([migration README](./README.md#next-wave-post-recovery-queue--2026-05-18)) — **In progress (doc smoke, 2026-05-18)** — automated gates + global **`styles`** row baseline: [`reports/phase-10-migration-smoke-gates-2026-05-18.md`](./reports/phase-10-migration-smoke-gates-2026-05-18.md). Manual tight smoke + screen matrix remain **open** (run **during / after** Phase **11**/**7** spec-token touches and **Phase 9** if helm swap lands in the same release train).

**Goal:** Every primary **screen** and **overlay** looks correct on **all three themes** (`default` / light, `[data-theme="dark"]`, `[data-theme="sandstone"]`). **No new** `::ng-deep` escapes. **No** visual regressions against spec intent (field-first, map-primary, calm confidence).

**Inputs:** Element specs under `docs/specs/`, `docs/design/state-visuals.md`, `docs/design/constitution.md`.

---

## Preconditions

- `npm run design-system:check` and `ng build` green on the branch under test.
- Phase 7 token work complete (otherwise false positives from legacy colors).

---

## 2026-05-18 post-wave: Batch 49 and docs

**Context:** Phase **7 Batch 49** removed **`--action-*`** names from the legacy bridge file **before** Batch **50** retired it; **`apps/web/src/styles/_legacy-design-tokens.scss`** is **absent** from the tree after Batch **50** (verify with **`rg 'legacy-design-tokens|_legacy-design-tokens' apps/web`** → **0**). **Parallel** **`docs/specs/**`** and **`docs/design/**`** sweeps landed the same window — treat visuals as **token-first** at callsites, not bridge reintroductions.

**Automated smoke log (same wave):** [`reports/phase-10-migration-smoke-gates-2026-05-18.md`](./reports/phase-10-migration-smoke-gates-2026-05-18.md).

**Manual screen matrix / tight smoke (agent gap log, 2026-05-18):** no interactive browser pass in this slice — documented honestly in [`reports/phase-10-manual-visual-matrix-gap-2026-05-18.md`](./reports/phase-10-manual-visual-matrix-gap-2026-05-18.md) (checkboxes below unchanged until a human run).

**Tight smoke (add to Phase 7–8 merges / pre-release if not already exercised above):**

- [ ] **Dropdowns / menus:** Open a **toolbar** and a **workspace** anchored menu on **375px** height; confirm **down-first** placement, viewport clamp, and **stacking** vs map/rails per [`dropdown-system.md`](../specs/component/filters/dropdown-system.md#open-time-stacking-owner-normative); menu row **hover/active** reads correctly on **dark** and **sandstone** without relying on removed **`--action-*`** bridge rows.
- [ ] **Settings overlay:** Rail width, outer padding, **Invite** + **Appearance** segmented rows, and hairline dividers match intent on all three themes after bridge cleanup + doc sync (no “flat” or zero-height separators).
- [ ] **Projects — card view:** Card chrome, **muted** secondary lines, and **hover / `focus-visible`** on cards and actions stay legible on **dark** and **sandstone**; no collapsed pill tracks where full-width toggles apply.
- [ ] **Workspace — media detail / metadata:** Metadata block typography and **captured-date** (or equivalent) editor: labels, borders, and section rhythm on **light / dark / sandstone**; no horizontal overflow at **375px** in the detail stack.

---

## High-risk migration spot-check

Use this list **during** Phase 7–8 merges and before release; it complements the full **Screen checklist** below. Targets: **map-shell Leaflet hoist**, **settings overlay rail / inlined overlay tokens**, **`hlmPillToggle` / `hlmToggleGroup`** (settings, projects, map style switch), and **three-theme** smoke.

**Map shell & Leaflet global hoist (`app-map-shell`, `_map-shell-leaflet-global.scss`)**

- [ ] Leaflet map, zoom, and attribution render; control chrome matches pre-hoist baseline (no double styles / missing icons).
- [ ] Marker states (default, selected, hover, cluster badge) stay legible on **light**, **dark**, and **sandstone**; no token regression on map canvas vs UI chrome.
- [ ] Radius / distance UI tied to the map (search radius, rings, or similar) keeps **hit targets**, labels, and focus rings aligned after layout/token changes.
- [ ] Workspace split / resize: map reflows without clipped overlays; z-order vs rails, settings, and dialogs matches spec intent.

**Settings overlay rail & inlined overlay tokens**

- [ ] Fixed rail width, outer padding, and close control alignment match spec after **`--overlay-rail-left-*`** (and related) bridge removal / SCSS inlining.
- [ ] Lead / section dividers read as intentional hairlines or borders (no zero-height or “disappeared” separators).
- [ ] Scrolled tab content: no accidental horizontal overflow at **375px**; field rows and invite/QR blocks stack as expected.

**`hlmPillToggle` / `hlmToggleGroup` (settings, projects, map style switch)**

- [ ] Settings (e.g. Appearance, segmented rows): **single** selection within each group; `focus-visible` ring not clipped by overflow.
- [ ] Projects view mode (table vs card or equivalent): selected segment and idle track match token intent on all themes.
- [ ] **Map style switch** (`_map-shell-style-switch` / pill group): every option reachable; selected vs idle contrast matches **Token theme checklist** below.
- [ ] Full-width pill groups: value column fills where **`--hlm-pill-toggle-width: 100%`** (or equivalent) is applied—no collapsed tracks.
- [ ] **A11y:** `aria-pressed` / `role="switch"` (or correct primitives) for boolean rows; no decorative-only toggles for real state.

**Upload panel** (`features/upload`; [design audit](./reports/upload-panel-design-audit-2026-05-17.md))

- [ ] **Three themes:** intake surface, dashed drop zone, lane `hlmPillToggle`, row cards, location-mode pill — borders and muted text on **dark** and **sandstone** (no muddy hover/focus).
- [ ] **i18n:** project dialog confirm/cancel are locale-driven (not hardcoded German); intake title/subtitle/actions use keyed copy for non-English locales.
- [ ] **Row hover:** thumbnail visibility vs duplicate shortcut — behavior matches reconciled spec/triage (see [upload-panel.feedback-triage.md](../specs/component/upload/upload-panel.feedback-triage.md)).
- [ ] **Embedded mode:** selection checkboxes on hover/focus; bulk footer icon row + destructive affordance for remove.
- [ ] **Row menu:** `more_vert` panel opens down-first with viewport clamp; no clipped menu at 375px height.

**Theme smoke (`default`, `[data-theme="dark"]`, `[data-theme="sandstone"]`)**

- [ ] Re-run the bullets above on each theme; **hard-refresh** between theme toggles in dev to avoid stale CSS variables.
- [ ] **Dark:** text on `muted` surfaces; map markers and pill tracks remain distinguishable from the map background.
- [ ] **Sandstone:** borders, muted fills, and focus rings stay crisp (not muddy); pill selected segment still reads clearly.

---

## Environment setup

- **Three themes:** exercise `ThemeService` (or equivalent) toggles; hard-refresh between runs to avoid stale CSS variable cache during development.
- **Viewports:** at minimum **375×812** (mobile nav), **1280×800** (desktop workspace + map), **1920×1080** (projects table).
- **Browsers:** Chromium + one **Firefox** or **Safari** spot-check for focus rings and overlay clipping.

---

## Stacking sanity

Cross-surface paint order is easy to regress during token or layout refactors. QA should **name the owning contract** (spec + host), not ad-hoc `z-index` tweaks on wrappers.

- **Menus / anchored shells:** Treat open-time elevation per [`dropdown-system.md`](../specs/component/filters/dropdown-system.md#open-time-stacking-owner-normative) — the **dropdown shell host** owns stacking for that anchored surface; do not “fix” overlap by stacking parents or duplicate token bindings.
- **Map canvas vs chrome:** Leaflet and related globals are hoisted under **`app-map-shell`**; confirm map tiles, controls, and in-map UI still sit in the **intended** order relative to rails, panels, and floating shells after hoist or token edits.
- **Upload intake vs menus:** With the upload flow open, open row/toolbar menus and anchored panels; nothing should disappear under the map, under the wrong rail, or behind a sibling that should read as **deeper** in the stack.
- **Modals / dialogs vs menus:** Where a dialog can follow a menu (or vice versa), verify the **foreground** surface receives focus and pointer hits; no half-visible menu “under” a modal unless the spec documents that choreography.
- **Parallel surfaces:** If upload overlay, workspace chrome, and map shell are visible together, spot-check **resize**, **narrow workspace**, and **mobile nav** — stacking should remain stable without introducing new stacking contexts on layout wrappers “for insurance.”
- **Spec-first debugging:** When ordering looks wrong, read the relevant spec sections (dropdown shell owner, map-shell hoist, dialog layer roles) before changing CSS; prefer **one owner** per surface class over scattered literals.

---

## Screen checklist

Mark each row **Pass / Fail** with ticket link on fail.

| Screen / flow | Light | Dark | Sandstone |
|-----------------|-------|------|-----------|
| Login | [ ] | [ ] | [ ] |
| Register | [ ] | [ ] | [ ] |
| Reset password | [ ] | [ ] | [ ] |
| Update password | [ ] | [ ] | [ ] |
| Map view (primary) | [ ] | [ ] | [ ] |
| Projects — table view | [ ] | [ ] | [ ] |
| Projects — card view | [ ] | [ ] | [ ] |
| Media — list layout | [ ] | [ ] | [ ] |
| Media — grid layout | [ ] | [ ] | [ ] |
| Media — toolbar (sort/filter/group/view toggles) | [ ] | [ ] | [ ] |
| Anchored toolbar menus — Filter / Sort / Grouping (375px + desktop) | [ ] | [ ] | [ ] |
| Toast / inline error surfaces (stacking + themes) | [ ] | [ ] | [ ] |
| Map shell — clustering, markers, style switch | [ ] | [ ] | [ ] |
| Settings overlay — General | [ ] | [ ] | [ ] |
| Settings overlay — Appearance | [ ] | [ ] | [ ] |
| Settings overlay — Notifications | [ ] | [ ] | [ ] |
| Settings overlay — Map | [ ] | [ ] | [ ] |
| Settings overlay — Search | [ ] | [ ] | [ ] |
| Settings overlay — Data | [ ] | [ ] | [ ] |
| Settings overlay — Account | [ ] | [ ] | [ ] |
| Settings overlay — Invite | [ ] | [ ] | [ ] |
| Upload panel — location mode + lane switch | [ ] | [ ] | [ ] |
| Workspace pane — media detail | [ ] | [ ] | [ ] |
| Workspace pane — groupings | [ ] | [ ] | [ ] |
| Workspace pane — collapsed / narrow | [ ] | [ ] | [ ] |
| Dialog — confirm | [ ] | [ ] | [ ] |
| Dialog — text input | [ ] | [ ] | [ ] |
| Dialog — project select | [ ] | [ ] | [ ] |
| Dialog — share link audience | [ ] | [ ] | [ ] |
| Photo lightbox | [ ] | [ ] | [ ] |
| Nav — desktop | [ ] | [ ] | [ ] |
| Nav — mobile | [ ] | [ ] | [ ] |

### Settings overlay — concrete checks (from 2026-05-14 audit)

- [ ] `settings-overlay__lead-divider`: visible full-height hairline or removed (no zero-height artifact).
- [ ] Fixed pane: outer padding / close-button alignment matches spec (not accidental `padding: 0`).
- [ ] **Account** section: same card chrome as other tabs (`rounded-lg border border-border bg-card p-6`) or documented waiver.
- [ ] **Themes (light / dark / sandstone):** rail idle/hover/active tint; pill `bg-muted` track visible; selected segment `bg-background` + shadow; `hlmSwitch` track/thumb; invite status chip, QR frame, link preview, spinner.
- [ ] **Widths:** segmented groups fill value column where SCSS sets `--hlm-pill-toggle-width: 100%`.
- [ ] **Breakpoints:** field rows stack on small viewports; invite role row stacks; QR 10rem on mobile acceptable.
- [ ] **A11y:** boolean rows expose correct `aria-pressed` / `role="switch"` semantics (not only decorative `hlmSwitch`).
- [ ] **Settings ranges:** search radius + cache retention `<input type="range" hlmInput>` — track/thumb, focus ring, and value column alignment on all three themes (no separate range directive; regressions are token/visual, not template wiring).

---

## Interactive state matrix (sample per component class)

For **buttons**, **toggles**, **inputs**, **dialogs**, **dropdowns**:

| State | What to verify |
|-------|------------------|
| Hover | No layout shift; token-based hover bg/fg |
| `focus-visible` | Ring uses `--ring`; not obscured by overflow |
| Disabled | Muted palette; no pointer events leakage |
| Active / pressed | Toggle group **single selection**; toolbar **pressed** affordance |
| Loading | Spinners / progress do not duplicate toast errors |

**Forms:** invalid / error styles on `hlmInput` + `hlmFormField` — messages readable on **sandstone** (warm background).

**Motion:** dialog open/close respects reduced-motion if product requires it; no jarring jumps on map resize.

---

## Token theme checklist

- [ ] **Default (light):** surfaces, borders, primary brand orange read as intentional.
- [ ] **`[data-theme="dark"]`:** text contrast on `muted` surfaces; map markers visible.
- [ ] **`[data-theme="sandstone"]`:** borders and `muted` blocks remain distinguishable; no “muddy” focus rings.

---

## Acceptance criteria

| Gate | Condition |
|------|-----------|
| Visual intent | All rows in **Screen checklist** **Pass** on all three themes (or documented waivers with spec updates) |
| Encapsulation | **No new** `::ng-deep` in `apps/web/src/app` |
| Design system | `npm run design-system:check` → **0** |
| Build | `cd apps/web && npx ng build` → **0** with **no new** bundle budget warnings vs `main` baseline |
| Regressions | Map clustering, workspace pane overlays, and upload panel hit targets match spec metrics |

---

## Output artifacts

- Short **QA report** (markdown in PR description is enough): themes × viewports × browser matrix + screenshots for any **Fail → Fix** cycle.
- Update **element specs** if acceptance criteria during QA expose a spec gap (same PR or immediate follow-up per project rules).

---

## Definition of done

- Acceptance table green.
- `docs/migration/README.md` migration banner updated to “Phases 6–10 complete” with date.
- Optional: archive migration detail docs under `docs/migration/archive/` if the team wants a slimmer index — **do not** delete decision logs.
