---
id: STUDY-012
type: proposal
status: proposed
supersedes: none
corrected-by: none
---

# Shell grid layout — change plan (owner mock 2026-09-22)

**Measured:** 2026-09-22, branch `cursor/control-area-grid-spec-9af8` conversation + owner mock screenshot in chat.  
**How:** Read live layout code [`authenticated-app-layout.component.html`](../../apps/web/src/app/layout/authenticated-app-layout.component.html), [`nav.component.ts`](../../apps/web/src/app/features/nav/nav.component.ts), existing specs [`sidebar.md`](../specs/component/workspace/sidebar.md), [`workspace-pane.md`](../specs/ui/workspace/workspace-pane.md), [`settings-overlay.md`](../specs/ui/settings-overlay/settings-overlay.md). Owner corrections in chat on 2026-09-22.

**GitHub issue (task register):** [#257](https://github.com/matkleve/feldpost/issues/257)

**Related:** [#258 — Widget modularity platform](https://github.com/matkleve/feldpost/issues/258) (STUDY-013) — left rail may become installed widget list; coordinate before spec lock.

**Implementation sequence (owner 2026-09-22) `[D]`:** **Shell grid (#257) ships first.** Widget platform (#258) follows — do not block shell grid on widget install engine.

**Process note:** An agent prematurely wrote normative files under `docs/specs/ui/shell/` before owner approved a change plan. Those files were **reverted**. This study + the issue are the correct home until the owner signs off; **no spec edits until then** ([`docs/study/README.md`](./README.md) · [`agent-daily-workflow.md`](../agent-workflows/agent-daily-workflow.md)).

---

## Summary `[D]`

Replace today's authenticated shell with a **three-part center** between fixed control rails:

```text
| left rail | MAIN (map / route canvas) ⇄ SIDE (optional) | right rail |
```

- **MAIN** fills all space between rails when nothing is activated.
- **SIDE** (content panel column) **only appears when a rail action activates it** (Upload, Help, Settings, Profile, …). When it opens, **MAIN shrinks** — they **share** the center band; the side is not a permanent fourth column.
- **SIDE** can hold **multiple panels stacked vertically** (e.g. Upload above Help in the mock).
- Control rails: icon-only options, hover label overlay, 44×44 px min.

**Not** today's settings overlay; **not** a always-visible workspace pane column.

### Activation model (owner 2026-09-22) `[D]`

| State | Center layout |
| --- | --- |
| **Idle** | MAIN only — map/route uses full width between rails |
| **Activated** (e.g. Upload pressed) | MAIN **narrows**; SIDE **mounts** beside MAIN (toward right rail) |
| **Multiple activations** | SIDE splits **vertically** — stacked panels (each toggled by its rail icon) |

Example: Upload + Help open → MAIN shrunk + SIDE with Upload panel top, Help panel bottom.

**Open:** SIDE width fixed vs user-resizable; animation; minimum MAIN width before SIDE refuses to open.

---

## Reference mock `[A]`

Owner screenshot (2026-09-22 chat). Read left → right:

### Left rail (thin)

| Container | Icons |
| --- | --- |
| Top | Logo · **Map** (active) · folder · gallery · network |
| Bottom | Profile · Settings |

### Map (large)

| Float | Position |
| --- | --- |
| Search + Filter | **Top-left** |
| Compass | Top-right |
| Scale | Bottom-left |
| Zoom ± | Bottom-right |

### Side content area (conditional — shown in mock when active) `[D]`

Mock shows Upload + Help **while SIDE is open** — not a permanent column:

| Panel slot (vertical stack) | Content |
| --- | --- |
| **Upload** (top) | Drag-drop, upload tabs, progress rows |
| **Hilfe** (bottom) | Collapsible help links |

When Upload is pressed: **MAIN (map) shrinks**, SIDE **appears** and shares the center band. Additional rail actions can add/stack panels vertically inside SIDE.

### Right rail (thin, grouped with gap)

| Container | Icons |
| --- | --- |
| Top 1 | Notifications · Upload · Download · Shared |
| *(gap)* | Visible empty band |
| Top 2 | Undo · History · Redo |
| Bottom | Tips · Help |

---

## Owner decisions from conversation `[D]`

| Topic | Decision | Notes |
| --- | --- | --- |
| Hover labels | **All** control options on **left and right** | Not left-only |
| Hover timing | ~1 s desktop; **long hover** on tablet | |
| Hover geometry | Extends **horizontally**; **overlays** map/panels | Does **not** push layout; map stays interactive under overlay |
| Settings | **Content panel** in column | **Retire settings overlay** as primary UX |
| Profile | **Separate panel** from Settings | Not a section inside settings |
| Shared slot | **Shared media** | RLS scope TBD |
| Theme | **Bottom-right** on map | Remove nav theme row |
| Search | **Top-left** on map | Change from today's top-center spec |
| **Side content area** | **On-demand** — MAIN shrinks when open; vertical stack for multiple panels | Replaces always-on workspace pane + overlay model |

---

## Open questions (owner input still needed) `[D]`

| ID | Question | Options |
| --- | --- | --- |
| Q1 | Center split mechanics | Fixed SIDE width vs resizable divider vs token default; min MAIN width |
| Q2 | Selected media / workspace | Same SIDE stack? separate panel slot? |
| Q3 | Upload entry | Right rail toggles SIDE slot vs keep workspace upload tab |
| Q4 | Tablet / mobile | Same activate/shrink model? bottom sheet instead? |
| Q5 | Terminology | Control area / container / option vs Sidebar |
| Q6 | Which routes in left rail | All nav routes vs subset |
| Q7 | Logo | Interactive option vs header |
| Q8 | Inter-rail gap token | Fixed spacing vs `1fr` spacer |
| Q9 | Rollout | Feature flag vs route-scoped |
| Q10 | Notifications, undo/history, help/tips | Defer vs define scope |
| **Q11** | **Multiple SIDE panels** | Max stack depth? close one closes slot only? |
| **Q12** | **SIDE + route pages** | `/media` full MAIN only or can open SIDE alongside? |

---

## Current codebase `[A]`

| Concern | Today | Path |
| --- | --- | --- |
| Shell layout | Flex; nav spacer + main + workspace pane | `apps/web/src/app/layout/authenticated-app-layout.*` |
| Nav | Expand/collapse sidebar 3rem↔15rem; theme row; account→settings | `apps/web/src/app/features/nav/` |
| Settings | Fixed overlay sibling of layout | `settings-overlay` feature |
| Upload | `app-upload-shell` absolute top-right of main | `features/upload/` |
| Workspace | Resizable right pane; embedded upload tab | `shared/workspace-pane/` |
| Search position | Spec: top-**center** | `docs/specs/ui/search-bar/search-bar.md` |

---

## Proposed migration phases `[D]`

**Phase 0 — Planning (this issue)**  
Owner reviews change plan; answers open questions; **no spec or code**.

**Phase 1 — Spec lock**  
Write normative shell spec(s) only after issue acceptance criteria met. Update affected specs (`sidebar`, `workspace-pane`, `settings-overlay`, `search-bar`, `upload-shell`) in same pass.

**Phase 2 — Grid scaffold (flagged)**  
CSS grid parity; no visible change.

**Phase 3 — Control rails**  
Left/right containers; hover label overlay; 44px targets.

**Phase 4 — Side content area (on-demand)**  
Activation FSM: rail icon → SIDE slot opens, MAIN shrinks; support **vertical stack** of panels; Upload, Help, Settings, Profile; retire overlay + re-home upload shell.

**Phase 5 — Workspace / selection**  
Per Q2 — likely a SIDE slot when selection active.

**Phase 6 — Breakpoints + legacy removal**  
Tablet/mobile; remove flex/collapse paths.

Each phase: `npm run verify` + targeted Playwright snapshots.

---

## Risks `[B]`

| Risk | Mitigation |
| --- | --- |
| Height chain break on map | Fix weakest link only; screenshot gate |
| Settings overlay consumers | Inventory all `SettingsPaneService` entry points before migration |
| Dual upload paths | Grep gate in Phase 4 |
| Spec/code drift if specs written early | **Block spec PR until this issue plan accepted** |

---

## Relationship to existing docs `[A]`

| Doc | Relationship |
| --- | --- |
| [`layout.md`](../design/layout.md) § Desktop | Will need update at spec lock — currently describes 2-pane map+workspace |
| [`page-rail-grid.md`](../design/page-rail-grid.md) | Related but map route exempt today |
| [`sidebar.md`](../specs/component/workspace/sidebar.md) | Major revision or supersession |
| [`settings-overlay.md`](../specs/ui/settings-overlay/settings-overlay.md) | Deprecation path required |

---

## Acceptance for promoting to spec `[D]`

Owner explicitly confirms:

1. **Conditional SIDE + shrinking MAIN** matches intent (not permanent fourth track)  
2. Settings panel + Profile panel separation  
3. Hover overlay behaviour on all rails  
4. Answers to Q1–Q12 (or explicit deferrals)  
5. Workspace/selection strategy (Q2)

Then open a **separate** implementation-tracking issue per phase or one epic with checkboxes.
