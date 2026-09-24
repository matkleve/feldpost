---
id: STUDY-024
type: proposal
status: proposed
supersedes: none
corrected-by: none
---

# Addable apps — how the repo can hold them

**Written:** 2026-09-24. **Measured on:** `cursor/fix-schema-spec-drift-cb0a`, by reading specs, `docs/glossary.md`, routes, and issue #258. No database was queried. **Not a contract.** Do not add tables or Angular modules from this file.

The owner’s word **widget** means an addable app (Map, Media, and later surfaces such as vehicles or a storage app). That definition is now in `docs/glossary.md`. Projects-dashboard cards are not widgets. `[D]` for the definition (owner, this session). `[A]` for the glossary sentence once this branch lands.

## What already matches

Each current app is already a folder, a page spec, and a lazy route `[A]`:

| App | Route | Spec | Code |
| --- | --- | --- | --- |
| Map | `/`, `/map` | `docs/specs/page/map-page.md` | layout hosts `MapShellComponent`; outlet is a placeholder |
| Media | `/media` | `docs/specs/page/media-page.md` | `features/media/` |
| Projects | `/projects` | `docs/specs/page/projects-page.md`, `projects-dashboard.md` | `features/projects/` |
| Colleagues | `/colleagues` | `docs/specs/page/colleagues-page.md` | `features/colleagues/` |
| Organization | `/organization` | `docs/specs/page/organization-page.md` | `features/organization/` |

The nav is a fixed array in `apps/web/src/app/features/nav/nav.component.ts` `[A]`. There is no install registry `[A]`.

Shared database contract, already enforced `[A]` `docs/specs/system/authorization-model.md` and `supabase/AGENTS.md`:

- One organization per user, `profiles.organization_id`.
- RLS is the boundary. The client does not grant access.
- A new table that holds org data ships with RLS in the same migration (`docs/security-boundaries.md` §2.2).

An addable app may depend on that contract. It must not keep a second organization id and must not bypass RLS from the client. `[A]` for the rule; `[D]` that this remains the rule for future apps.

## Patterns that fit this repo

Use these. They do not invent a table.

1. **One app = one feature folder + one page spec + one lazy route.** This is how Media and Organization already work. A vehicles app would be `features/vehicles/`, `docs/specs/page/vehicles-page.md`, and a route added only when that spec exists. `[A]` that the pattern exists. `[D]` that new apps must follow it.

2. **The nav array is the install list until a spec says otherwise.** STUDY-015 §15.6 already says keep the rail list a static array `[D]` in that study. Replacing `navItems` with “read a manifest, filter by installed ids” is a code change with no schema change, if the installed ids are a constant in the repo. Per-organization install that survives a reload needs a stored row. No spec names that table. Issue #258 option A (`organization_widgets`) is an unlocked option, not a spec. Do not create it from this study.

3. **Schema stays shared.** Map and Media already read `media_items` and `locations` under RLS. Hiding Map in the nav does not drop those tables, because Media and upload still need them. `[C]` An app that is the only writer of a table can still share the database; uninstall then becomes a product question (below), not a reason to give the app its own schema.

4. **New tables only when the app has data the current tables cannot hold.** Vehicles are not in the repo `[A]` (no `vehicle` match under `docs/`). A vehicles app needs a spec before a table. When that spec exists, the migration must include `organization_id` and RLS. That is the existing security rule, not a new modularity framework.

5. **Do not use per-app migration bundles or a Postgres schema per app** (issue #258 options B and C) unless the owner picks them. They fight the single migration history in `supabase/AGENTS.md`. `[D]`

6. **Dashboard cards stay inside Projects.** They are placeholders with no queries `[A]` `project-dashboard-view.component.ts`. They are not apps.

## What this study does not decide

- Whether Map is always installed (issue #258 Q1).
- Who may install, and whether uninstall deletes rows (Q3, Q4). Constitution §1 applies if the UI says data is gone. No spec says what uninstall deletes.
- Whether Colleagues and Organization must install together (issue #258, unchecked).
- Issue #258 cites STUDY-013 as a widget plan. The repo’s STUDY-013 is the study-system audit `[A]` `docs/study/README.md`. Those issue ids were not edited.

## Questions for the owner

1. Is Map always present, or can an organization omit it?
2. Is install stored per organization, per user, or only as a build-time list?
3. When an app is removed, is its data deleted, kept, or is removal not allowed?
4. Should issue #258’s study ids be corrected in the issue body so they stop pointing at the wrong files?

## Update 2026-09-24 — owner answers

The questions above stay. These answers supersede them. They are `[D]`. They are not a migration.

1. **Map is a widget.** `[D]` The owner is not sure it must always be installed, and wants it modeled as a feature anyway so the shell stays modular. Do not special-case Map as a different kind of module from Media. The layout still always mounts `MapShellComponent` `[A]` `authenticated-app-layout.component.html`. That mount is code, not the model.

2. **Install is per user.** `[D]` The organization can preinstall a widget or allow it. Issue #258 option A (`organization_widgets` only) does not match this answer. A future spec has to say both the user row and the organization allow/preinstall. This study still does not name those tables.

3. **Address and GPS belong to the subject, not to Map.** `[D]` Today the subject is a media item: `locations` plus `media_item_location_links` `[A]` `docs/specs/service/media-locations/media-locations-service.md`. A later subject (the owner’s example is a vehicle) would link to locations the same way. It would not get its own copy of coordinates. Uninstalling Map does not delete those rows. Constitution §1 still applies when the product says a subject itself is deleted.

4. **Issue #258 must not cite STUDY-013 as the widget plan.** `[D]` The repo’s STUDY-013 is the study-system audit `[A]`. The widget reasoning is this file, STUDY-024. `gh issue edit 258` returned `Resource not accessible by integration` on 2026-09-24 `[A]`. The issue body is unchanged. Agents must use this file, not the issue’s STUDY-013 link.
