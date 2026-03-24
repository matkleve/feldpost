# Feldpost Angular File Structure

This document is binding for all new files and refactors in the Angular frontend.

## Folder Responsibilities

| folder                               | responsibility                                                                                                                         | depends on                                                     | must NOT depend on                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/app/core/`                      | Singleton services, guards, app-wide adapters, platform integration (auth, supabase, i18n, upload pipelines, workspace state services) | Angular framework APIs, external SDKs, utility libs            | `src/app/features/` UI components, feature-local state           |
| `src/app/core/auth/`                 | Auth service, guards, auth policies                                                                                                    | `core/supabase`, router                                        | Any `features/` folder                                           |
| `src/app/core/supabase/`             | Supabase client boundary and low-level backend gateway                                                                                 | `@supabase/supabase-js`, environment config                    | Any `features/` folder                                           |
| `src/app/core/i18n/`                 | Translation loading and translation service orchestration                                                                              | Supabase/i18n storage, core auth (read-only)                   | Any `features/` folder                                           |
| `src/app/shared/`                    | Reusable UI building blocks without business ownership                                                                                 | Angular core/common, `core/` services where needed (i18n only) | Feature-specific domain logic                                    |
| `src/app/shared/ui-primitives/`      | Directives and primitive controls (buttons, inputs, badges, micro-components)                                                          | Angular, design tokens, optional `core/i18n`                   | Any feature-local model/state                                    |
| `src/app/shared/pane-toolbar/`       | Shared toolbar shell/layout                                                                                                            | `shared/ui-primitives`                                         | Feature orchestration logic                                      |
| `src/app/shared/pane-footer/`        | Shared footer shell/layout                                                                                                             | `shared/ui-primitives`                                         | Feature orchestration logic                                      |
| `src/app/shared/view-toggle/`        | Shared view toggle components/patterns                                                                                                 | `shared/ui-primitives`, optional i18n                          | Feature-specific state services                                  |
| `src/app/shared/dropdown-trigger/`   | Shared dropdown trigger/shell/dropdown components                                                                                      | `shared/ui-primitives`, optional core services                 | Feature-local components                                         |
| `src/app/features/`                  | Feature slices and route-level UI composition                                                                                          | `core/`, `shared/`                                             | Other sibling feature folders                                    |
| `src/app/features/map/`              | Map feature shell and map-specific UI composition                                                                                      | `core/`, `shared/`                                             | `features/projects`, `features/settings-overlay`, other siblings |
| `src/app/features/projects/`         | Projects page and projects interactions                                                                                                | `core/`, `shared/`                                             | `features/map`, other siblings                                   |
| `src/app/features/upload/`           | Upload panel and upload workflows UI                                                                                                   | `core/`, `shared/`                                             | Other sibling features                                           |
| `src/app/features/settings-overlay/` | Settings overlay and settings sections                                                                                                 | `core/`, `shared/`                                             | `features/account`, other siblings                               |
| `src/app/app.routes.ts`              | Route configuration and lazy loading boundaries                                                                                        | `core` guards and lazy `features/*` imports                    | Direct component imports for route pages                         |
| `src/app/app.config.ts`              | Global app providers and bootstrap config                                                                                              | `core` singletons                                              | Feature components                                               |
| `src/app/app.component.ts`           | Root shell composition only                                                                                                            | `features/nav`, global shared/core overlays                    | Feature domain logic                                             |

## Rules for New Files

- Where does a new component go?
  - Put route/page or feature-owned orchestration components in `src/app/features/<feature>/...`.
  - Put reusable or cross-feature UI components in `src/app/shared/...`.
  - Never create a new component directly in `src/app/` root (except the app root component).

- Where does a new service go?
  - Put singleton services, API clients, guards, app-wide state/services in `src/app/core/...`.
  - Keep Supabase access in `src/app/core/supabase/` and access it through service abstractions.
  - Do not place business services under `shared/`.

- Where does a new type/interface go?
  - Feature-local types: inside the owning feature folder (for example `features/projects/projects-page.types.ts`).
  - Cross-feature or app-wide types: `src/app/core/workspace-view.types.ts` or a dedicated `core/<domain>/*.types.ts`.
  - Do not define cross-feature shared types inside a feature folder.

- When do you create a new feature folder?
  - Create one when a new user-visible domain has its own route, major panel/workflow, or independent state/event model.
  - Do not create a feature for a single reusable widget; that belongs in `shared/`.

- When do you move something to `shared/`?
  - Move when at least two features need the same component/directive/pattern.
  - Move when a component currently imported from one feature into another would create sibling-feature coupling.
  - Keep `shared/` free of feature-owned orchestration state.

## File Size Limits

- TypeScript: max 120 lines (`max-lines` in ESLint for non-spec TS files)
- HTML templates: max 60 lines (`max-lines` in ESLint)
- SCSS: max 100 lines (project architecture convention for maintainability)

## Naming Conventions

- Files use kebab-case.
- Classes, types, and interfaces use PascalCase.
- Components: `feature-name.component.ts|html|scss|spec.ts`.
- Services: `feature-name.service.ts`.
- Types: `feature-name.type.ts` or `feature-name.types.ts` when grouped.
- Keep folder names domain-oriented (`map-shell`, `workspace-pane`, `view-toggle`, `dropdown-trigger`).

## AI Agent Instructions

- Always check this document before creating a new file.
- Never create a component directly in `app/` root.
- Never import from a sibling feature folder.
- Always place shared primitives in `shared/`, not in a feature folder.
- When in doubt: ask before creating.

## Enforcement Checklist

- After each file move, update all imports immediately.
- After each top-level migration block (`core`, `shared`, `features`), run `ng build`.
- Keep lazy route imports in `app.routes.ts` aligned with actual file locations.
- If a feature needs another feature component/type, extract it to `shared/` or `core/` first.
