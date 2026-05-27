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

### Creating GitHub Issues (Required)

Use the batch script — never call `gh issue create` one-by-one in a loop (it requires an interactive permission prompt per call):

```bash
node scripts/create-github-issues.mjs path/to/issues.json
```

Build a JSON file first (see `scripts/create-github-issues.example.json` for the schema: `{ title, body, labels?, milestone? }`), then run the script once. Auth resolves automatically from `GITHUB_TOKEN` env var or `gh auth token`.

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

### i18n Gates (Required)

Run from repository root when changes touch translation workbench CSV, `translation-catalog.ts`, or `seed_i18n.sql`:

```bash
npm run i18n:check
```

After editing non-English translations, normalize first if needed:

```bash
node scripts/normalize-i18n-diacritics.mjs
npm run i18n:check
node scripts/import-i18n-csv-to-sql.mjs
```

CI workflow: `.github/workflows/i18n-check.yml`

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
- **Flex/grid child hosts:** Every component `:host` that participates as a **flex or grid child** must declare **`min-height: 0`** and **`min-width: 0`** (in component SCSS). Omission is a **spec violation**. Example: `app-map-shell` `:host` must comply when touched.
- **Styling stack (default):** Tailwind utility classes in templates **and** component SCSS are both standard. The "no mixing" rule means **do not solve the same visual concern twice** (e.g. duplicating spacing in Tailwind and SCSS) without an explicit plan—not "never use both languages."
- Loading/Error/Empty are mutually exclusive. Each has exactly one visual owner.

### Ownership Matrix (Mandatory)

Per-component specs carry the full matrix and examples; column contract is fixed:

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |

## Dead code (`apps/web/src/app/archive/`)

The folder **`apps/web/src/app/archive/`** holds **dead code**: it is **excluded from the Angular app build** (`apps/web/tsconfig.app.json` → `exclude` includes `src/app/archive/**/*.ts`). Treat it as **historical reference only**.

- **Do not** import, extend, or wire these files into production routes or libraries.
- **Do not** cite them in specs, service contracts, or active implementation as a pattern source.
- **Do not** copy SCSS, token names, or component structure from here — the tree is intentionally frozen and may reference removed paths or legacy conventions.

**Current contents (avoid by name):** `item-grid-legacy/media-page/` — legacy **`MediaGridComponent`**, **`MediaCardComponent`**, **`MediaLoadingComponent`** (`.ts` / `.html` / `.scss` snapshots).

## Document Authority

- **Project rules and invariants**: `AGENTS.md`
- **Spec system, structure contract, split policy, and index**: `docs/specs/README.md`; normative split rules also in **Spec split and organization policy** (this file).
- **Spec writing template**: `docs/agent-workflows/element-spec-format.md`
- **Post-implementation verification**: `docs/agent-workflows/implementation-checklist.md`
- **Session memory (decisions, mistakes, communication)**: `docs/ai-diary/` — one file per day; read the latest entry before resuming the same feature area.
- **Collaboration with the user (ask early, prompting)**: `docs/agent-workflows/agent-communication.md`

## Collaboration with the user

Agents should ask **enough questions that requirements are clear** before multi-file work — there is no fixed limit of one or two. Walk the ambiguity checklist in [`docs/agent-workflows/agent-communication.md`](docs/agent-workflows/agent-communication.md) (equivalence/dedupe, geographic precedence, fallbacks, UI semantics, allowed-file boundaries, call budget). Batch related questions in one message; do not guess table or tuning names from prompts — verify against `docs/architecture/database-schema.md` and service types.

**Before coding:** restate the invariant in your own words and confirm; list open ambiguities and ask about each that is not locked in spec/plan; then list files you will touch, what you will not touch, and how you will verify.

**When the user corrects you:** treat it as an invariant update — fix minimal code, sync spec/plan if applicable, add a short note to `docs/ai-diary/YYYY-MM-DD.md` if the mistake is likely to recur.

**🔴 Live verification (product owner):** When agents change route cache, media preview FSM, signing, or tile aspect caches, you must run the browser checks in [`docs/agent-workflows/agent-communication.md`](docs/agent-workflows/agent-communication.md) § **LIVE VERIFICATION** — especially **second visit to `/media`**. `ng build` alone does not prove revisit UX. Agents must call this out explicitly; if they do not, ask for the LIVE CHECK block.

**FSM ↔ CSS:** Layered stateful components require transition map, layer opacity matrix in spec supplement, and aligned SCSS — see `.cursor/rules/ui-state-machine.mdc` § FSM ↔ CSS ↔ DOM alignment. Example: [`docs/specs/component/media/media-display.rendering-matrix.supplement.md`](docs/specs/component/media/media-display.rendering-matrix.supplement.md).

Full triggers, anti-patterns, and prompt templates: [`docs/agent-workflows/agent-communication.md`](docs/agent-workflows/agent-communication.md). Recent examples: geocoder [`docs/ai-diary/2026-05-23.md`](docs/ai-diary/2026-05-23.md); media grid FSM/cache [`docs/ai-diary/2026-05-25.md`](docs/ai-diary/2026-05-25.md).

## Required Feature Workflow

1. Read the target element spec: `docs/specs/...`
2. Read the relevant **service facade spec** under `docs/specs/service/<module>/` when the feature depends on that boundary (see `docs/specs/service/README.md` index).
3. Read additional design docs only if the spec or service contract does not answer the question
4. Reuse shared UI and adapter abstractions before introducing new structure
5. **Before creating any new Angular component, consult the component registry:** `docs/specs/component/registry.md` (index: slice map and workflow) **and** the linked `docs/specs/component/registry.*.supplement.md` files (selector/variant tables). If the required component or variant exists, use it. If a variant is missing, flag it and ask. Do not implement inline HTML patterns that duplicate a registered component.
6. Verify the result against `docs/agent-workflows/implementation-checklist.md`

   *Figma-assisted flows (screenshots, Code Connect, strict No-Figma new-component gate from the archived rule): **(deferred — Figma work paused)**.*

## Multi-agent coordination (migration)

Canonical migration index: `docs/migration/README.md`.

- **CSS custom properties (`var(--*)`) in `apps/web`:** **MUST** read [`docs/design/agent-css-variable-contract.md`](docs/design/agent-css-variable-contract.md) before any SCSS or token edit — decision tree, forbidden legacy names, verification gates; **no invented variable names**. Shell geometry: also [`docs/design/shell-layout-tokens.md`](docs/design/shell-layout-tokens.md) and [`docs/migration/reports/agent-handoff-authenticated-shell-layout-ownership.md`](docs/migration/reports/agent-handoff-authenticated-shell-layout-ownership.md) §10. Closure status: [`docs/migration/reports/agent-token-decision-closure.md`](docs/migration/reports/agent-token-decision-closure.md).

### Parallel migration streams

When migration work spans **several independent streams** (see the **phase index** in `docs/migration/README.md`—not a separate “wave” checklist here), the coordinator should **decompose** into **sibling tasks** runnable in parallel when dependencies do not force a single serial chain. **Do not** collapse everything into one default subagent or one undifferentiated mega-change unless scope is explicitly narrowed or a true blocking dependency requires it. **Do not** maintain a second, free-floating “what to do next” list in this file; the migration index and phase docs are the single queue—update those when status changes so work is not duplicated.

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
- **Lint gate:** Run `node scripts/lint-specs.mjs`. Default caps: warn **150** lines, error **180** on parent specs; oversized parents must be split into linked children (`*.supplement.md`, `*.acceptance-criteria.md`, or `parent-name.slice.md` — see `scripts/lint-specs.mjs`). Settings and `docs/settings-registry.md` stay in sync when specs expose `## Settings`.
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
- ~~`figma-integration.mdc`~~ — **archived** (Figma work deferred); recoverable at `.cursor/rules/archive/figma-integration.mdc.archived`. Token-first / i18n-from-Figma / component-scan / **No-Figma No-Component** gates in that file are **(deferred — Figma work paused)** — reference-only until the rule is restored to `.cursor/rules/figma-integration.mdc`.
