---
id: STUDY-015
type: investigation
status: proposed
supersedes: none
corrected-by: none
---

# Map as immutable platform core (not a catalog widget)

**Measured:** 2026-09-22, owner direction on [#258](https://github.com/matkleve/feldpost/issues/258): *“Map is always there (I think, do a study on that).”*  
**Related:** [STUDY-012](./012-shell-grid-layout-change-plan.md) shell grid — map track is first-class.

---

## Question

Should **Map** be **platform core** (always present, not installable/uninstallable) or a **catalog widget**?

---

## Owner hypothesis `[D]`

Map is **always there** — default shell experience, not optional.

---

## Evidence for core status `[A]` `[B]`

| Claim | Grade | Source |
| --- | --- | --- |
| Product is map-primary | `[B]` | [`docs/design/constitution.md`](../design/constitution.md) — field-first, map-primary |
| Default authenticated route is map | `[A]` | Nav Map → `/` [`nav.component.ts`](../../apps/web/src/app/features/nav/nav.component.ts) |
| Map shell hosts workspace pane, upload bridge | `[A]` | [`authenticated-app-layout.component.html`](../../apps/web/src/app/layout/authenticated-app-layout.component.html) |
| Geo-temporal media thesis | `[B]` | [`docs/glossary.md`](../glossary.md) — viewport, markers, radius selection |
| Shell grid mock centers map track | `[D]` | STUDY-012 reference layout |

---

## Evidence against optional map `[C]`

| Scenario | Note |
| --- | --- |
| Media-only office workflow | Could use `/media` without map — exists today `[A]` |
| Future “list-first” org | Would need alternate shell — not in current product direction `[C]` |
| Widget catalog without map | Theoretically possible but contradicts brand `[C]` |

---

## Recommendation `[D]` (pending owner sign-off)

Treat **Map as platform core**:

| Property | Value |
| --- | --- |
| In widget catalog | **No** — not listed as installable |
| Left rail | **Always** present (or always first slot) — may be **shell chrome**, not widget list entry `[D]` |
| Shell grid | Dedicated **map track** always mounted ([#257](https://github.com/matkleve/feldpost/issues/257)) |
| Uninstall | **Forbidden** |
| Dependencies | Other widgets may **depend on map** (e.g. media markers) `[C]` |

### Rail placement tension with widget list `[D]`

If left rail becomes **installed widgets only** ([#258](https://github.com/matkleve/feldpost/issues/258)):

| Option | Model |
| --- | --- |
| **M1 — Map outside widget list** | Top of left rail: fixed Map icon (core) + widget list below + `+` |
| **M2 — Map inside list but pinned** | Appears as widget but `core: true`, no uninstall |
| **M3 — Map is not an icon** | Map fills center always; rail has widgets only |

**Recommend M1** for clarity: core ≠ widget. Coordinate with STUDY-012 left-rail containers.

---

## Upload / search / theme `[B]`

Map-adjacent floats (search top-left, theme bottom-right per #257) stay on **map track**, not widget manifests — even if Upload becomes a widget panel.

---

## Open sub-questions

| ID | Question |
| --- | --- |
| M4 | Is `/media` a full-page widget that **hides** map track, or split view? |
| M5 | Non-map routes (Projects, Colleagues) — replace map track or overlay it? |
| M6 | SIDE activation shrinks MAIN — map stays mounted but narrower ([STUDY-012](./012-shell-grid-layout-change-plan.md)) |

---

## Acceptance (study → spec)

- [ ] Owner confirms Map = core (not catalog widget)
- [ ] M1/M2/M3 chosen for left rail
- [ ] M4/M5 answered for route vs shell grid

**Blocks:** Widget platform core boundary; STUDY-012 left-rail top container (logo + map vs logo + widgets).
