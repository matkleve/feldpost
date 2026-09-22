# Control-area grid — open questions and options

> **Parent:** [control-area-grid-layout.md](./control-area-grid-layout.md)  
> **Purpose:** Capture unresolved product and engineering decisions. **Do not implement** assumptions listed here.

Legend: 🔴 blocks scaffold · 🟡 blocks a container · 🟢 can defer

---

## OQ-01 · Terminology 🟡

**Question:** Adopt *Control area*, *Control container*, *Control option* as canonical glossary terms?

| Option | Pros | Cons |
| --- | --- | --- |
| **A — Adopt as proposed** | Clear hierarchy; avoids overloading “Sidebar” | Requires glossary + spec sweep |
| **B — Keep Sidebar + Action rail** | Less rename churn | “Sidebar” today includes labels, theme, expand — mismatches icon-only containers |
| **C — Shell chrome / Shell cluster / Shell control** | Neutral | Another vocabulary layer |

**Your call:**

---

## OQ-02 · Left area width and collapse 🔴

**Question:** Is the left control area always icon-only (≈44–56px track), or does expand/collapse (today `3rem` ↔ `15rem`) survive?

| Option | Behavior |
| --- | --- |
| **A — Icon-only fixed track** | Matches 44px option baseline; labels via tooltip / aria only |
| **B — Retain expand/collapse** | Containers widen; options may gain labels when expanded |
| **C — Hybrid** | Icon-only containers; settings/profile opens overlay (no width change) |

**Related code:** [`sidebar.collapse.supplement.md`](../../component/workspace/sidebar.collapse.supplement.md), settings overlay `left` calc duplication.

**Decision (2026-09-22):** **D — Icon-only fixed rail + delayed hover label expansion (all sides)**

- Applies to **every control option** on **left and right** control areas (not left-only).
- Control area tracks stay **fixed width** (icon-only baseline; no pinned expand/collapse control).
- After **~1 s hover** (desktop) or **long hover** (tablet), the **option** extends horizontally to reveal its label (per-option — not whole-rail expand).
- Expanded label **overlays** map / content panels; it does **not** push layout. Content underneath keeps normal interaction except the expanded label pill’s own hit target.
- Collapse when pointer leaves the option (timing TBD in STUDY-008).
- **Deprecates** today’s `3rem` ↔ `15rem` sidebar collapse ([`sidebar.collapse.supplement.md`](../../component/workspace/sidebar.collapse.supplement.md)) on desktop/tablet.

**Follow-ups:** exact delay token; collapse delay; keyboard/focus label reveal.

---

## OQ-03 · Shell grid implementation 🔴

See parent § Baseline grid model. **Your call: A / B / C?**

Additional sub-questions if **A**:

- Left/right track width: fixed `3rem`, `clamp(2.75rem, …, 4rem)`, or asymmetric (wider right)?
- Should control areas scroll independently if option count grows?

---

## OQ-04 · Logo slot 🟡

| Option | Behavior |
| --- | --- |
| **A — Control option** | Same 44px hit box as Map; click → home or brand menu |
| **B — Non-interactive header** | Sits above top container; not in option grid |
| **C — Removed from rail** | Logo only in settings / marketing surfaces |

**Your call:**

---

## OQ-05 · “Other pages” membership 🟡

**Today’s nav routes:** Map, Media, Projects, Colleagues, Organization ([`nav.component.ts`](../../../../apps/web/src/app/features/nav/nav.component.ts)).

| Option | Set |
| --- | --- |
| **A — All current routes** | Five icons + Map in top container |
| **B — Primary three** | Map, Media, Projects in rail; Colleagues + Organization elsewhere |
| **C — Configurable** | Org admin sees Organization; field users see subset |
| **D — Overflow menu** | Fixed N icons + “more” container |

**Your call:**

---

## OQ-06 · Workspace pane vs grid 🔴

The screenshot shows Upload + Help **panels** beside the map. Today **Workspace Pane** hosts selection grid, detail, and embedded upload tab ([`workspace-pane.md`](../workspace/workspace-pane.md)).

| Option | Model |
| --- | --- |
| **A — Canvas split (status quo evolved)** | Grid center = map/pages; pane remains resizable **inside** canvas; control options **toggle** pane/tab |
| **B — Pane becomes canvas content** | Upload/help render as center panels; control options only open/close |
| **C — Dedicated fourth grid track** | `[left | canvas | workspace | right]` — widest desktop layout |
| **D — Panel docked to right control area** | Upload/help panels attach to inner edge of right control column |
| **E — Reference mock (owner screenshot)** | `[left rail \| map \| content panel column \| right rail]` — large panels beside map ([reference mock](./control-area-grid-layout.reference-mock.supplement.md)) |

**Decision (2026-09-22):** **E — Reference mock layout** — see [reference mock supplement](./control-area-grid-layout.reference-mock.supplement.md). Upload, Help, Settings, Profile, etc. open as **content panels** in the column between map and right rail. **Deprecates** resizable workspace pane + settings overlay as primary surfaces (migration in STUDY-007).

**Follow-ups:** fate of workspace selected-items / detail (same column? separate route?).

---

## OQ-07 · Settings vs Profile split 🟡

Today one **account row** opens settings overlay.

| Option | Behavior |
| --- | --- |
| **A — Two options** | Settings → overlay; Profile → overlay section or `/settings/account` |
| **B — Profile only** | Settings nested inside profile panel |
| **C — Settings only** | Profile avatar inside settings overlay (status quo, two icons redundant) |

**Decision (2026-09-22, updated):** **Two separate options — two separate content surfaces**

| Option | Opens |
| --- | --- |
| **Settings** (gear, left bottom) | **Settings content panel** in the map-adjacent panel column — same class of surface as Upload / Help in the reference mock. **Not** the current fixed settings overlay ([`settings-overlay.md`](../settings-overlay/settings-overlay.md) → migrate to page/panel). |
| **Profile** (avatar, left bottom) | **Profile content panel** — fully separate from Settings (not a section inside settings). Own panel chrome and route/state. |

---

## OQ-08 · Notifications 🟢 (net-new)

| Option | Scope |
| --- | --- |
| **A — Defer slot** | Reserve icon; disabled until product defines events |
| **B — Toast history panel** | Lists recent toasts / system messages |
| **C — Real-time feed** | Colleagues mentions, upload errors, org invites |
| **D — Drop from v1** | Remove from baseline slot list |

**Needs:** STUDY-010.

**Your call:**

---

## OQ-09 · Upload entry points 🔴

**Today:** `app-upload-shell` (top-right of main column) **and** workspace Upload tab ([`upload-shell.md`](../../component/upload/upload-shell.md)).

| Option | Behavior |
| --- | --- |
| **A — Right control option only** | Opens panel docked per OQ-06; remove workspace upload tab |
| **B — Control option + workspace tab** | Two entry points (status quo, new chrome) |
| **C — Workspace tab only** | Remove global upload shell; upload icon toggles pane tab |
| **D — Control option opens tray only** | Panel stays in workspace |

**Your call:**

---

## OQ-10 · Download 🟡

| Option | Behavior |
| --- | --- |
| **A — Global download queue** | Icon opens panel of active/completed exports |
| **B — Selection-scoped** | Disabled until workspace selection exists; opens export dialog |
| **C — Context menu only** | Remove from control baseline |

**Your call:**

---

## OQ-11 · Shared items 🟢

**Question:** What are “shared items”?

| Option | Meaning |
| --- | --- |
| **A — Share links** | Restorable share URLs ([`share-link-restore.md`](../../service/share-set/share-link-restore.md)) |
| **B — Shared with me media** | RLS-scoped incoming shares |
| **C — Colleagues / org shared projects** | Cross-user project visibility |
| **D — Rename slot** | e.g. “Shared links” / “Team” — specify label |

**Needs:** STUDY-010.

**Decision (2026-09-22):** **Shared media** — right top container 1 opens a **shared media** surface (media shared with the user / org scope — exact RLS scope in STUDY-010). Slot label: **Shared media** (not generic “shared items”).

---

## OQ-12 · Container alignment within control area 🟡

| Option | Visual |
| --- | --- |
| **A — Inner-aligned (toward canvas)** | Containers hug map edge |
| **B — Outer-aligned (toward viewport)** | Containers hug screen edge |
| **C — Centered in track** | Floating stacks centered in column |
| **D — Mixed** | Top containers inner-aligned, bottom outer-aligned |

**Your call:**

---

## OQ-13 · Undo / Change history / Redo 🟢

**Today:** [`MediaDeleteUndoService`](../../../../apps/web/src/app/core/media-delete/media-delete-undo.service.ts) — toast-scoped delete undo only.

| Option | Model |
| --- | --- |
| **A — Defer trio** | Icons disabled / hidden until global command stack exists |
| **B — History panel only** | Audit log viewer (read-only) |
| **C — Full undo stack** | Cross-feature undo/redo with persistence |
| **D — Map edit scoped** | Undo placement / radius selection only |

**Needs:** STUDY-009.

**Your call:**

---

## OQ-14 · Tips vs Help 🟢

Screenshot shows collapsible **Hilfe** list. Not shipped as global shell panel in current code.

| Option | Distinction |
| --- | --- |
| **A — Tips = contextual hints; Help = doc index** | Two panels |
| **B — Single Help panel** | Merge tips into help |
| **C — External docs** | Help opens docs site; Tips = in-app coach marks |
| **D — Defer both** | Bottom container placeholder only |

**Needs:** STUDY-011.

**Your call:**

---

## OQ-15 · Theme cycle (missing from baseline) 🟡

Today: theme row in nav with cycle dots.

| Option | Placement |
| --- | --- |
| **A — Bottom container with settings** | Fourth option in bottom left |
| **B — Inside settings overlay only** | Remove from shell |
| **C — Profile menu** | Submenu of profile option |
| **D — Right bottom with tips/help** | Utility cluster |
| **E — Route canvas (map zone)** | Theme float on map / big content area (owner decision) |

**Decision (2026-09-22):** **E — Route canvas (map zone), bottom-right corner** — theme cycle float near zoom controls (see [reference mock](./control-area-grid-layout.reference-mock.supplement.md)). Remove nav theme row.

---

## OQ-16 · Tablet vs mobile 🔴

**Baseline:** “At least desktop and tablet.”

| Breakpoint band | Option A | Option B | Option C |
| --- | --- | --- | --- |
| **Desktop ≥1024px** | Full opposing control areas | Same | Same |
| **Tablet 768–1023px** | Same as desktop | Icon-only both sides; narrower tracks | Left only; right becomes FAB stack |
| **Mobile <768px** | Keep today’s bottom nav | Single bottom control bar merging L+R | Hamburger + minimal FABs |

**Your call per row:**

---

## OQ-17 · Inter-container gap (right side) 🟡

**Question:** Gap between Top container 1 and Top container 2 — how is it expressed?

| Option | Spec |
| --- | --- |
| **A — Fixed token** | e.g. `var(--spacing-8)` empty flex region |
| **B — `1fr` spacer** | Pushes bottom container to viewport bottom |
| **C — Visual separator** | Hairline or labeled “dead zone” |
| **D — Align to map chrome** | Gap aligns with map overlay safe zone |

**Your call:**

---

## OQ-18 · Search bar and map floats 🟡

Search bar, filter, GPS, basemap switch today float **inside map zone**.

| Option | Behavior |
| --- | --- |
| **A — Unchanged** | Floats remain; control areas are additive columns |
| **B — Search moves to center top** | Part of canvas grid, not map overlay |
| **C — Search in left container** | Icon opens search overlay |
| **D — Search on map, top-left** | Map zone float; top-left anchor (owner decision) |

**Decision (2026-09-22):** **D — Search on map, top-left aligned** — search bar remains a **map zone float** (route canvas), anchored **top-left** of the map (not top-center). Filter stays with search row per current pattern. **Requires** update to [`search-bar.md`](../search-bar/search-bar.md) positioning contract.

---

## OQ-19 · Visual treatment 🟢

| Option | Containers |
| --- | --- |
| **A — Frosted `.ui-container`** | Matches current sidebar/upload chrome |
| **B — Flat transparent** | Icons only; no panel background |
| **C — Mixed** | Frosted top containers; flat bottom |

**Your call:**

---

## OQ-20 · Feature flag and coexistence 🔴

| Option | Rollout |
| --- | --- |
| **A — `shellGridLayout` flag** | Per-user or env toggle during migration |
| **B — Route-scoped** | Map route first |
| **C — Big bang** | No flag (higher risk) |

**Your call:**

---

## Decision log

| ID | Decision | Date | Notes |
| --- | --- | --- | --- |
| OQ-02 | D — Hover label expansion on **all** L+R options; overlay; tablet long-hover | 2026-09-22 | Deprecates sidebar collapse |
| OQ-06 | E — Reference mock: map + content panel column + rails | 2026-09-22 | Replaces workspace pane + settings overlay model |
| OQ-07 | Settings panel + Profile panel (fully separate) | 2026-09-22 | Left bottom; not settings overlay |
| OQ-11 | Shared media | 2026-09-22 | Right top container 1; RLS scope in STUDY-010 |
| OQ-15 | E — Theme bottom-right on map | 2026-09-22 | Remove nav theme row |
| OQ-18 | D — Search on map, top-left | 2026-09-22 | Update search-bar.md positioning |
| OQ-01 | | | |
| OQ-03 | | | |
| OQ-04 | | | |
| OQ-05 | | | |
| OQ-06 | | | |
| OQ-08 | | | |
| OQ-09 | | | |
| OQ-10 | | | |
| OQ-12 | | | |
| OQ-13 | | | |
| OQ-14 | | | |
| OQ-16 | | | |
| OQ-17 | | | |
| OQ-19 | | | |
| OQ-20 | | | |
