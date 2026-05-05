# Feldpost — Agent Guidelines

Feldpost is a geo-temporal image management system for construction companies.
Angular SPA + Leaflet map + Supabase (Auth, PostgreSQL + PostGIS, Storage).

## Instruction precedence (resolve conflicts in this order)

1. **Data and security** — Row-Level Security, migrations, and `supabase/AGENTS.md` (frontend is untrusted).
2. **This file** — `AGENTS.md` at repository root (global engineering rules).
3. **Spec system** — `docs/specs/README.md`, governance artifacts under `docs/specs/`, and **Spec split and organization policy** in this file.
4. **Concrete specs** — implementation contracts under `docs/specs/...` for the feature or module you are changing.
5. **Package `AGENTS.md`** — `apps/web/`, `supabase/`, or `docs/` only where they **narrow** scope; they must not contradict 1–4.
6. **Tool overlays** — `.github/instructions/`, `.github/copilot-instructions.md`, and similar: shortcuts only; if something disagrees with 1–4, **1–4 win**.

Implementation contracts live under **`docs/specs/`** (not `docs/element-specs/`). Treat any legacy `element-specs` path as a rename unless explicitly archived.

## Project Structure

```
apps/web/             → Angular frontend application (Angular CLI 21.1.5)
apps/web/src/app/     → Components, services, routing
apps/web/src/         → index.html, main.ts, styles.scss
supabase/             → Database migrations, RLS policies, edge functions
docs/                 → Design docs, element specs, glossary (source of truth)
```

## Development

### Install dependencies

```bash
npm install
```

### Run the dev server

```bash
cd apps/web && ng serve
```

### Build

```bash
cd apps/web && ng build
```

### Run tests

```bash
cd apps/web && ng test
```

### Design System Gates (Required)

Run from repository root when changes touch design-system docs, panel SCSS, or geometry logic:

```bash
npm run design-system:check
```

This command runs:

- `node scripts/validate-design-system-registry.mjs`
- `node scripts/audit-panel-breakpoints.mjs`
- `node scripts/guard-visual-behavior.mjs`

Reference workflow and checklist:

- `.github/workflows/design-system-check.yml`
- `.github/pull_request_template.md`
- `CONTRIBUTING.md`

## Code Conventions

- Use Angular **standalone components** (no NgModules)
- Use Angular **signals** and new control flow syntax (`@if`, `@for`, `@switch`)
- Prefer **`inject()`** over constructor injection
- **SCSS** for component styling
- Prefer standardized shared UI components from `apps/web/src/app/shared/` (especially dialogs/modals) before building feature-local variants
- Avoid browser-native UI primitives (`window.prompt`, `window.confirm`, native context UI) for product flows when a shared component exists
- When splitting large files or extracting inline templates/styles, always use a dedicated script that performs a strict 1:1 copy before removing the original block
- Use service-module symmetry for new/refactored services:
  - Docs: `docs/specs/service/[service-name]/`
  - Code: `apps/web/src/app/core/[service-name]/`
  - Required files per module: `[service-name].service.ts`, `[service-name].service.spec.ts`, `[service-name].types.ts`, `[service-name].helpers.ts`, `adapters/`, `README.md`
  - Keep one central `types.ts` per module; do not split into nested sub-service type files
  - Keep facade slim and delegate heavy logic to local `adapters/`
  - Forbid global adapter folders like `apps/web/src/app/core/adapters/`
  - Archive replaced code only as a last resort, using dated refactor snapshot folders and `.legacy.ts` suffix
  - Do not reference archived files/specs from active specs or service contracts
- For non-obvious behavior gates or state transitions, add concise inline comments that reference the governing element spec section (for example `upload-panel.md § Media Item Menu Contract`).
- Commit messages follow **Conventional Commits** (`feat:`, `fix:`, `chore:`)
- Always run `ng build` to verify changes compile before submitting

## Universal Invariants

- **RLS is the security boundary** — frontend is untrusted; Row-Level Security enforces all data access
- **Adapter pattern** — never call Leaflet, Supabase, or Nominatim directly from components; use `MapAdapter`, `GeocodingAdapter`, `SupabaseService`
- **Element specs are contracts** — implement features from `docs/specs/...`; spec governance itself lives in `docs/specs/README.md`
- **Glossary is canonical** — use exact names from `docs/glossary.md`
- **Database-first debugging** — for overlaps, feasibility, uniqueness, publication, immutability, or history: inspect PostgreSQL constraints, triggers, and RLS **before** assuming frontend or adapter bugs (`supabase/migrations/`, `docs/architecture/database-schema.md`).

## Component Structure Rules (Hard Blockers)

- Ownership Matrix required before first HTML. No code without matrix.
- Max 3 HTML levels per component. Every additional level requires documented justification.
- No interactive element inside interactive element. No button inside button.
- No aria-hidden on nodes with interactive descendants.
- Every CSS property defined exactly once per purpose. Duplicate ownership is a blocker.
- **Styling stack (default):** Tailwind utility classes in templates **and** component SCSS are both standard. The "no mixing" rule means **do not solve the same visual concern twice** (e.g. duplicating spacing in Tailwind and SCSS) without an explicit plan—not "never use both languages."
- Loading/Error/Empty are mutually exclusive. Each has exactly one visual owner.

## Document Authority

- **Project rules and invariants**: `AGENTS.md`
- **Spec system, structure contract, split policy, and index**: `docs/specs/README.md`; normative split rules also in **Spec split and organization policy** (this file).
- **Spec writing template**: `docs/agent-workflows/element-spec-format.md`
- **Post-implementation verification**: `docs/agent-workflows/implementation-checklist.md`

## Required Feature Workflow

1. Read the target element spec: `docs/specs/...`
2. Read the relevant **service facade spec** under `docs/specs/service/<module>/` when the feature depends on that boundary (see `docs/specs/service/README.md` index).
3. Read additional design docs only if the spec or service contract does not answer the question
4. Reuse shared UI and adapter abstractions before introducing new structure
5. Verify the result against `docs/agent-workflows/implementation-checklist.md`

## Component Spec Coverage (Mandatory)

- Every production component must have its own dedicated element spec in `docs/specs/component/` or `docs/specs/ui/`.
- Parent specs may define shared contracts, but domain and shared components still require child specs for their own behavior, state, wiring, and acceptance criteria.
- Do not collapse multiple non-trivial component contracts into one monolithic spec when child-spec split is possible.
- Before implementing or refactoring a component, create or update that component's dedicated spec first.

## Feedback-to-Spec Sync (Mandatory)

- When user feedback changes expected behavior, update the relevant spec(s) first in the same work session.
- Do not defer spec synchronization when behavior requirements change.
- Keep Acceptance Criteria aligned with the latest user-confirmed behavior before finalizing implementation.

## Design Principles (summary)

Field-first, map-primary, progressive disclosure, warmth, calm confidence.
Non-negotiable rules: `docs/design/constitution.md`

## Settings Overlay Convention

For any feature that introduces user-configurable behavior, add an optional `## Settings` section to that feature's element spec in `docs/specs/`. Use concise bullets in the form `- **Section**: what it configures`. The settings inventory is centralized in `docs/settings-registry.md` and must stay in sync with all spec `## Settings` sections via `node scripts/lint-specs.mjs`. When adding a new configurable feature, update the spec first and then run the linter (or `--fix`) to refresh/validate the registry.

## Spec Folder Taxonomy (Mandatory)

Use the following top-level structure in `docs/specs/`:

- `ui/` = feature-level UI contracts (for example map/workspace/media-detail systems)
- `component/` = reusable UI building blocks and local component contracts
- `service/` = service-module contracts mirrored to `apps/web/src/app/core/`
- `system/` = cross-cutting behavior systems and orchestration matrices
- `page/` = route/page-level contracts

Authoring and governance rules belong in AGENTS/instructions. `docs/specs/README.md` remains primarily an index and navigation aid.

## Spec split and organization policy

- **Single entry point:** Each feature or service module has **one** canonical contract parent (`docs/specs/service/<module>/` facade spec, or per-component spec under `component/` / `ui/`). Child files hold detail; the parent summarizes and links (plain Markdown links, no duplicate normative bodies across folders).
- **Lint gate:** Run `node scripts/lint-specs.mjs`. Default caps: warn **400** lines, error **600**; oversized specs must be split (see `scripts/lint-specs.mjs`). Settings and `docs/settings-registry.md` stay in sync when specs expose `## Settings`.
- **When to split (if / then):**
  - **Adapter boundaries** match `apps/web/src/app/core/<module>/adapters/` → add `docs/specs/service/<module>/adapters/<name>.adapter.md` and link from the facade spec (structural mirror).
  - **Bloat is** long acceptance criteria, FSM, transition map, or Visual Behavior / ownership tables → add concern slices in the same folder, e.g. `<name>.acceptance-criteria.md` or `<name>.visual-behavior.md`; do not duplicate checkbox lists in both parent and child.
  - **UI vs service:** Service orchestration and facade contracts belong under `docs/specs/service/`; UI composition stays under `docs/specs/ui/` or `component/`. **Never** paste the full service contract into a UI spec—use a **stub** that links to the service entry (see `docs/specs/ui/workspace/workspace-view-system.md`).
- **Anti-patterns:** Duplicate filenames with identical contract text in `ui/` and `service/`; flat `docs/specs/service/foo.md` without `docs/specs/service/foo/` when the module is a full service module—use a folder mirroring `core/<name>/` unless the registry documents an explicit thin-module exception.

## Sub-rules Index

Detailed normative contracts are in always-applied rule files under `.cursor/rules/`:

- `scss-ownership.mdc` — SCSS ownership, geometry, typography, wrapper, comment contract, CSS layer architecture
- `visual-behavior.mdc` — Visual Behavior Contract, Ownership Triad Rule, full spec tables, pseudo-CSS examples
- `ui-state-machine.mdc` — FSM contract, stable state comments, animation/transition contract, component implementation order, ESLint gates
- `i18n-workflow.mdc` — Mandatory i18n workflow and translation pipeline steps
- `bulk-operation-safety.mdc` — Bulk replace/edit quality gates
- `figma-integration.mdc` — Token-first gate, i18n-first gate for labels, component scan gate, import boundary
