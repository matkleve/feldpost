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

Other current routes as candidate widgets (not decided): Map, Media, Projects, Upload, Settings, Profile, Shared media, Help, …

---

## Current codebase inventory `[A]`

| Area | Location | Widget candidate? |
| --- | --- | --- |
| Nav routes | `features/nav/nav.component.ts` | Becomes installed-widget list |
| Map | `features/map/` | Core vs optional widget — **open** |
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
| **STUDY-014** | Widget dependency graph & bundle model (Org+Colleagues) | investigation | Install UX, DB |
| **STUDY-015** | DB/RLS modularization patterns for widgets | investigation | Migrations, security |
| **STUDY-016** | Widget catalog UI + left-rail list FSM | investigation | Shell + [#257](https://github.com/matkleve/feldpost/issues/257) |
| **STUDY-017** | Feedback/request pipeline for widgets | proposal | Product ops |

**Reserved:** STUDY-010 — another workstream; do not use.

---

## Proposed phases (implementation — after planning) `[D]`

| Phase | Work |
| --- | --- |
| **0** | Issue #258 + studies 014–017; owner Q&A |
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
