---
id: STUDY-013
type: proposal
status: proposed
supersedes: none
corrected-by: none
---

# Widget modularity platform — change plan (owner proposal 2026-09-22)

**Measured:** 2026-09-22, owner design conversation.  
**How:** Read current nav [`nav.component.ts`](../../apps/web/src/app/features/nav/nav.component.ts), routes [`authenticated-app.routes.ts`](../../apps/web/src/app/layout/authenticated-app.routes.ts), org/colleagues features, [`docs/backlog/sharing-first-and-pane-simplification-plan.md`](../backlog/sharing-first-and-pane-simplification-plan.md) § dashboard widgets (historical).

**GitHub issue (task register):** [#258](https://github.com/matkleve/feldpost/issues/258)

**Related:** [#257](https://github.com/matkleve/feldpost/issues/257) shell grid (STUDY-012) — left rail may become widget list; coordinate before spec lock on either.

**Process:** Planning only. **No normative specs** until issue #258 planning acceptance criteria are met.

---

## Summary `[D]`

Move Feldpost from **fixed route nav** (Map, Media, Projects, Colleagues, Organization) toward a **widget platform**:

| Layer | Today (rough) | Target (owner intent) |
| --- | --- | --- |
| **UI shell** | Static left nav links | **Installed widget list** + **+** affordance |
| **Main content** | Route-per-feature pages | **Widget surfaces** + **widget catalog** (search, cards, detail) |
| **Code** | Feature folders wired in routes | **Installable widget modules** with declared dependencies |
| **Database** | Monolithic org-scoped schema | **Widget-scoped capabilities** (migrations/RLS per widget — TBD) |

---

## Owner proposal (conversation) `[D]`

### Left sidebar = widget list

- Items are **installed widgets**, not hard-coded pages.
- **Bottom slot:** **+** (or similar) — opens widget catalog / installer in main content.

### Main content — widget catalog (when + clicked)

- **Search** across available widgets.
- **Rectangular cards** for each widget (marketplace / picker grid).
- **Detail / explanation page** per widget:
  - What it does when installed
  - **Dependencies** on other widgets
  - **Bundled widgets** — e.g. **Organization + Colleagues** install **together** (owner example)

### Feedback loop

- Users can **request** new widgets or **give feedback** on existing widgets (channel TBD).

---

## Example bundle (owner logic) `[D]`

| Widget | Notes |
| --- | --- |
| **Organization** | Admin/org structure |
| **Colleagues** | DMs, channels, invites |
| **Bundle: Org + Colleagues** | Single install action; mutual dependency |

Other current routes as candidate widgets (not decided): Media, Projects, Upload, Settings, Profile, Shared media, Help, … **Map = platform core** — see [STUDY-015](./015-map-as-platform-core.md).

---

## Owner decisions (2026-09-22, conversation) `[D]`

| ID | Decision |
| --- | --- |
| **Q5** | **Bundle-only** — Org + Colleagues install together only ([STUDY-014](./014-org-colleagues-widget-bundle.md)) |
| **Q1** | **Map always present** (platform core, not catalog widget) — confirm via [STUDY-015](./015-map-as-platform-core.md) |
| **Q11** | **DB as modular as widgets** — needs substantial work ([STUDY-016](./016-database-modularization-for-widgets.md)) |
| **Q20** | **Implementation order:** shell grid ([#257](https://github.com/matkleve/feldpost/issues/257) / STUDY-012) **first**, then widget platform ([#258](https://github.com/matkleve/feldpost/issues/258)) |

**Q20 clarified:** Not “which design is more important” — **build sequence**. Ship four-track shell, content panels, hover rails before widget catalog/install engine.

---

## Current codebase inventory `[A]`

| Area | Location | Widget candidate? |
| --- | --- | --- |
| Nav routes | `features/nav/nav.component.ts` | Becomes installed-widget list |
| Map | `features/map/` | **Platform core** — not installable ([STUDY-015](./015-map-as-platform-core.md)) |
| Media | `features/media/` | Widget |
| Projects | `features/projects/` | Widget |
| Colleagues | `features/colleagues/` | Bundled with Organization |
| Organization | `features/organization/` | Bundled with Colleagues |
| Settings overlay | `features/settings-overlay/` | May become widget or shell panel ([#257](https://github.com/matkleve/feldpost/issues/257)) |
| RLS / migrations | `supabase/migrations/` | Per-widget enablement — **undefined** |

No shipped **widget registry**, **install state**, or **dependency resolver** exists today `[A]`.

---

## Open questions (for issue #258) `[D]`

See issue for full Q1–Q20 table. Highlights:

- Is **Map** always installed (platform core) or optional?
- **Per-org vs per-user** widget installs?
- **Database:** separate schemas, feature flags on tables, or migration bundles per widget?
- **Uninstall** semantics (data retention — constitution: delete means delete)?
- **Feedback/request:** GitHub, in-app form, Supabase table, email?
- Relationship to **shell grid** left rail ([#257](https://github.com/matkleve/feldpost/issues/257))

---

## Studies recommended before spec lock `[D]`

| ID | Title | Type | Blocks |
| --- | --- | --- | --- |
| **STUDY-013** | This document — platform scope + layers | proposal | Issue #258 |
| **STUDY-014** | [Org + Colleagues bundle-only model](./014-org-colleagues-widget-bundle.md) | investigation | Q5 — **filed** |
| **STUDY-015** | [Map as platform core](./015-map-as-platform-core.md) | investigation | Q1 — **filed** |
| **STUDY-016** | [Database modularization for widgets](./016-database-modularization-for-widgets.md) | investigation | Q11 — **filed** |
| **STUDY-017** | Widget catalog UI + left-rail list FSM | investigation | After #257 shell |
| **STUDY-018** | Feedback/request pipeline for widgets | proposal | Q15–Q16 |

**Reserved:** STUDY-010 — another workstream; do not use.

---

## Proposed phases (implementation — after planning) `[D]`

| Phase | Work |
| --- | --- |
| **0** | Issue #258 + STUDY-014–016; owner Q&A |
| **1** | Widget manifest format (code); registry spec |
| **2** | Install state store (DB + service); dependency resolver |
| **3** | Catalog UI (+, search, cards, detail pages) |
| **4** | Left rail = installed list; migrate one widget (pilot) |
| **5** | Org+Colleagues bundle; migrate remaining nav routes |
| **6** | Feedback/request surface |
| **7** | Retire static nav; RLS audit per widget |

Each phase: separate issue; Sensitive class for DB/RLS phases.

---

## Risks `[B]`

| Risk | Note |
| --- | --- |
| **Constitution** | Widget uninstall must not silently orphan user data |
| **RLS** | Partial widget install could expose tables without policies |
| **Shell coupling** | Conflicts with STUDY-012 if both change left rail without coordination |
| **Scope creep** | Full app-store vs internal module flags — bound in Q-table |

---

## Acceptance for promoting to spec `[D]`

Owner confirms on #258:

1. Widget vs core platform boundary  
2. Org+Colleagues bundle rules  
3. Install scope (org/user)  
4. DB modularization direction  
5. Feedback channel  
6. Coordination plan with #257  

Then normative specs under `docs/specs/system/widget-platform/` (path TBD) — **not before**.
