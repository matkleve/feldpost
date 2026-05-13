# Phase 10 — Visual QA & Polish

**Status:** Planned (**after** Phase 8 global SCSS elimination; run **during / after** Phase 9 if helm swap lands in the same release train)

**Goal:** Every primary **screen** and **overlay** looks correct on **all three themes** (`default` / light, `[data-theme="dark"]`, `[data-theme="sandstone"]`). **No new** `::ng-deep` escapes. **No** visual regressions against spec intent (field-first, map-primary, calm confidence).

**Inputs:** Element specs under `docs/specs/`, `docs/design/state-visuals.md`, `docs/design/constitution.md`.

---

## Preconditions

- `npm run design-system:check` and `ng build` green on the branch under test.
- Phase 7 token work complete (otherwise false positives from legacy colors).

---

## Environment setup

- **Three themes:** exercise `ThemeService` (or equivalent) toggles; hard-refresh between runs to avoid stale CSS variable cache during development.
- **Viewports:** at minimum **375×812** (mobile nav), **1280×800** (desktop workspace + map), **1920×1080** (projects table).
- **Browsers:** Chromium + one **Firefox** or **Safari** spot-check for focus rings and overlay clipping.

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
- `docs/MIGRATION_PLAN.md` migration banner updated to “Phases 6–10 complete” with date.
- Optional: archive migration detail docs under `docs/migration/archive/` if the team wants a slimmer index — **do not** delete decision logs.
