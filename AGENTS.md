# Feldpost — Agent Guidelines

Feldpost is a geo-temporal image management system for construction companies.
Angular SPA + Leaflet map + Supabase (Auth, PostgreSQL + PostGIS, Storage).

## Instruction precedence (resolve conflicts in this order)

1. **Data and security** — Row-Level Security, migrations, and `supabase/AGENTS.md` (frontend is untrusted).
2. **This file** — `AGENTS.md` at repository root (global engineering rules).
3. **Spec system** — `docs/specs/README.md` and governance artifacts under `docs/specs/`.
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
  - Do not reference archived files/specs from active specs, blueprints, or implementation docs
- For non-obvious behavior gates or state transitions, add concise inline comments that reference the governing element spec section (for example `upload-panel.md § Media Item Menu Contract`).
- Commit messages follow **Conventional Commits** (`feat:`, `fix:`, `chore:`)
- Always run `ng build` to verify changes compile before submitting

## SCSS Ownership and Comment Contract (Mandatory)

Every SCSS file is responsible for exactly one component. Styling responsibilities
are strictly non-overlapping across component layers.

### Geometry ownership

- Layout container components own columns, gaps, and breakpoints only.
- Shared state-frame components own loading, error, empty, and selection visuals only.
- Domain item components own only domain-specific visuals: typography, icons, media details.
- Any given CSS property may be defined in exactly one component layer.
  Defining the same property in multiple layers is forbidden.

### Intermediate wrapper rule

Structural or functional wrapper elements — any element that exists solely for
JS hooks, Angular directives, state layers, ng-content, or similar —
must carry zero styling. The following properties are explicitly forbidden
on intermediate wrappers:

width, height, min-width, min-height, max-width, max-height,
aspect-ratio, padding, margin, position, top, right, bottom, left,
inset, display, flex, grid, gap, overflow, transform, opacity,
visibility, pointer-events, z-index

Exception: a single property may appear on an intermediate wrapper only if it is
functionally unavoidable. It must be accompanied by a comment explaining exactly
why it cannot live on the layout owner or the content element instead.

### The two-element rule

In any rendered stack, only two elements may carry geometry:

1. The outermost layout owner — sets the space
2. The innermost content element — fills the space (e.g. `img` with `object-fit`)

Everything in between: zero styling.

### Comment contract

Every CSS class, custom property, and keyframe must have two comment lines
directly above it:

- Line 1: what it does
- Line 2: spec reference

Example:

````scss
// Defines column layout for grid-md mode, 3 columns with token-based gap
// @see item-grid.md#layout-modes
.item-grid--grid-md { ... }

## Bulk Operation Safety (Mandatory Quality Gates)

**QUALITY OVER SPEED. These gates prevent data loss and error cascades.**

### Before Bulk-Replace Operations

1. **Audit Phase** (Always First)
   - `grep_search` for the pattern to find all occurrences
   - Create audit table: file, line, exact snippet
   - Verify no imports or critical methods will be affected
   - Confirm no accidental matches in comments or strings

2. **Isolation Phase**
   - Max 3-5 related changes per `multi_replace_string_in_file` batch
   - Each replacement must have 3-5 lines of context before AND after (no exceptions)
   - Never combine unrelated concerns (e.g., rename + comment in same replace)
   - Test-pilot one file if unsure

3. **Verification Phase** (After Every Batch)
   - Run `get_errors()` on modified files immediately
   - Run `ng build` to verify TypeScript compilation
   - If errors: STOP, do NOT proceed to next batch
   - Check for orphaned imports, unused properties, broken method signatures

### Comment Addition Safety

- Comments must NOT be inserted between import statements or function signatures
- Always insert before the import block or inside the function AFTER the signature
- Use JSDoc `/** */` style, never inline `//` comments above imports
- Verify exact line numbers with `read_file` before replacing

### Slowdown = Quality

- Parallel operations: ONLY for completely independent files
- Sequential: Always for files in same feature/service hierarchy
- Time cost of mistakes (rollback, git recovery, re-testing) >> time saved by batching
- If unsure: read first, plan second, execute third — maintain separation

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
- **Styling stack (default):** Tailwind utility classes in templates **and** component SCSS are both standard. The “no mixing” rule means **do not solve the same visual concern twice** (e.g. duplicating spacing in Tailwind and SCSS) without an explicit plan—not “never use both languages.”
- Loading/Error/Empty are mutually exclusive. Each has exactly one visual owner.

## Visual Behavior Contract (Mandatory per Component Spec)

Every component spec must include a `## Visual Behavior Contract` section
before any implementation starts. This section defines in pseudo-CSS
exactly which element owns which visual behavior.

Required entries for every component with overlays, states, or interactions:

### Ownership Matrix (Mandatory)

Each spec must include one behavior-to-CSS ownership matrix with these columns:

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| example | `.media-frame` | `:host` | `.open-button` | `.media-frame--selected` | `surface/selected` | selected ring only around media frame |

No implementation may start without this matrix.

## Ownership Triad Rule (Hard Blocker)

Every visual behavior in a component has exactly three owners.
They must be explicitly declared before any HTML or CSS is written.

| Owner | Responsible for | Forbidden from |
| --- | --- | --- |
| Geometry Owner | width, height, aspect-ratio, display | state classes, event bindings |
| State Owner | state class bindings (`[class.x]`) | geometry properties |
| Visual Owner | CSS rules that produce visible output (color, border, shadow, opacity, animation) | geometry of other elements |

### The Core Rule (Default)

Geometry Owner == State Owner == Visual Owner

By default, all three point to the same element.
If they diverge, the implementation is valid only as an explicitly documented exception.

### Why they diverge (common failure modes)

- State class on parent, visual effect intended on child -> wrong
- Geometry set on wrapper, visual owner is different element -> wrong
- `position: relative` on wrong element causes overlay to size against wrong container -> wrong

### Declaration format (mandatory per component spec)

Every spec must declare this table before implementation:

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| --- | --- | --- | --- | --- |
| selected ring | `.media-item-render-surface__media-frame` | `.media-item-render-surface__media-frame--selected` | `.media-item-render-surface__media-frame--selected` | ✅ |
| loading pulse | `.item-state-frame__state-layer--loading` | `.item-state-frame__state-layer--loading` | `.item-state-frame__state-layer--loading` | ✅ |
| hover reveal | `.media-item__quiet-actions` | `.media-item--selected` (on parent) | `.media-item__quiet-actions` | ⚠️ exception — document why |

### Exceptions

If the three owners cannot be the same element, the exception must be:
1. Documented explicitly in the spec table with reason
2. Solved via `position: absolute; inset: 0` on the visual owner relative to the geometry owner's stacking context
3. Never solved by duplicating geometry on multiple layers

### Stacking context rule

Exactly one element per component declares `position: relative`. That element owns the stacking context for overlays, badges, and actions; those children use `position: absolute; inset: 0` relative to it. **Stacking context ownership** (which element establishes `position: relative`) must be declared separately from **visual geometry ownership** when they differ — for example when an overlay is anchored to a nested geometry surface.

### Layer Order (z-index)

Define every layer explicitly using named layer roles and concrete selectors.
Recommended default mapping:
- layer content: image, icon, text
- layer upload: upload overlay
- layer selected: selected emphasis
- layer actions: quiet actions and controls
No undeclared z-index values anywhere in the component.

### State Ownership

Every visual state must name its owner element:
- loading pulse -> item-state-frame
- selected ring -> visual geometry owner (for example media frame)
- hover reveal -> domain item quiet-actions
- error surface -> item-state-frame

For each state, list the exact class/selector that renders the state.

### Pseudo-CSS Contract Example

```css
:host {
   display: block;
   position: relative; /* sole stacking context owner */
   aspect-ratio: [defined by domain item];
}

.overlay {
   position: absolute;
   inset: 0;
   z-index: [declared value];
}

.selected-state {
   /* Selected emphasis may be drawn on a nested visual owner */
   box-shadow: inset 0 0 0 2px var(--color-clay);
}

img {
   width: 100%;
   height: 100%;
   object-fit: contain;
   object-position: top center;
}
````

Any implementation that deviates from this contract is a blocker.

## Document Authority

- **Project rules and invariants**: `AGENTS.md`
- **Spec system, structure contract, split policy, and index**: `docs/specs/README.md`
- **Spec writing template**: `docs/agent-workflows/element-spec-format.md`
- **Post-implementation verification**: `docs/agent-workflows/implementation-checklist.md`

## Required Feature Workflow

1. Read the target element spec: `docs/specs/...`
2. Read the implementation blueprint if it exists: `docs/implementation-blueprints/[element].md`
3. Read additional design docs only if the spec or blueprint does not answer the question
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

## Mandatory i18n Workflow

When creating or changing UI components, all user-facing text must be added to the translation pipeline with context. Do not ship hardcoded UI strings without i18n registration.

Non-negotiable behavior:

- Use deterministic key-based i18n lookups (`t(key, fallback)`) for all product UI copy.
- Keep every `fallback` in `t(key, fallback)` in English as the canonical source text.
- Avoid introducing new hardcoded user-visible literals in templates/component strings (except explicit temporary migration fallback).
- Language switch option labels must remain in native form and never be translated by active locale: `English`, `Deutsch`, `Italiano`.

Required steps for any new/changed visible text:

1. Add/update text in `docs/i18n/translation-workbench.csv` with meaningful `context`.
2. Ensure extraction covers both `.component.html` and inline `template` strings in `.component.ts`.
3. Regenerate SQL translations via `node scripts/import-i18n-csv-to-sql.mjs`.
4. Commit updated `supabase/seed_i18n.sql` together with code changes.
5. If new language content is needed, keep `en/de/it` columns populated (no mixed-language fragments).

Translation data in DB (`app_texts` + `app_text_translations`) is part of the feature definition, not an optional follow-up.

## UI State Machine Contract

- FSM is required whenever a component has programmatic state — state that cannot be expressed purely through CSS pseudo-classes (`:hover`, `:focus`, `:disabled`, `:checked`).
- CSS pseudo-classes are browser-native interaction states and are not FSM states.
- Any component with programmatic state must expose a single typed state enum as its visual API.
- Public boolean inputs that represent visual state are forbidden.
- State transitions must be validated by a transition guard function backed by an explicit transition map.
- Stateful component roots must expose one visual state driver attribute: `[attr.data-state]`.
- Parent components must pass one state value instead of coordinating multiple visual-state flags.

### Universal Media Boundary Contract

- `app-universal-media` is the shared rendering adapter boundary and keeps its structured `MediaRenderState` object contract.
- Feature components still expose a single local enum visual-state API and map that enum to `MediaRenderState` at the adapter boundary.
- Do not reintroduce multiple boolean visual-state inputs at callsites to feed `app-universal-media`.
- Stable-state comments must document both local enum states and the mapping to `MediaRenderState` with spec references.

### Stable State Comment Segmentation (Mandatory)

- Every stateful component must segment state logic in `*.component.ts`, `*.component.html`, and `*.component.scss` with explicit English comment blocks.
- Each state comment must start with `Stable state:` and describe the rendered visual behavior briefly.
- Every state comment block must include a spec reference line (`@see docs/specs/...`).

## Spec Folder Taxonomy (Mandatory)

Use the following top-level structure in `docs/specs/`:

- `ui/` = feature-level UI contracts (for example map/workspace/media-detail systems)
- `component/` = reusable UI building blocks and local component contracts
- `service/` = service-module contracts mirrored to `apps/web/src/app/core/`
- `system/` = cross-cutting behavior systems and orchestration matrices
- `page/` = route/page-level contracts

Authoring and governance rules belong in AGENTS/instructions. `docs/specs/README.md` remains primarily an index and navigation aid.

- In TypeScript: place state comment blocks above the enum/state contract and derived state helpers.
- In HTML: place state comment blocks immediately before each state branch/region.
- In SCSS: place state comment blocks immediately above each state selector block.

### When FSM is required

Does NOT need FSM:

- Components whose only state changes are CSS pseudo-classes (`:hover`, `:focus`, `:disabled`, `:checked`).

Needs FSM:

- Any component where JavaScript tracks or switches a condition.
- Programmatic examples include: open/closed, loading/loaded/error, selected, uploading, expanded, results/no-results, filled, searching.
- A searchbar has programmatic state.
- A button with a loading spinner has programmatic state.
- An icon alone does not.

## Transition & Animation Contract

- Components with programmatic state must define an explicit transition map.
- Every stateful component spec must include a transition choreography table before SCSS work starts.
- All transition and animation timings must come from token variables.
- Forbidden patterns:
  - `transition: all ...`
  - hardcoded duration/easing magic numbers
  - unscoped animation not tied to state selectors

## CSS Layer Architecture

- Component-local layering is mandatory for refactored components:
  - `@layer components` for geometry, layout, and default visuals
  - `@layer states` for state-driven visuals only
- State selectors may not change geometry (`width`, `height`, `aspect-ratio`, layout geometry).
- Geometry must be stable in the components layer.
- Geometry changes are allowed only through data binding values (for example CSS custom properties), not through state selector toggles.

## Visual State Consistency

- `docs/design/state-visuals.md` is the source of truth for canonical state visuals.
- Before implementing a state treatment, check for canonical treatment in that file.
- If canonical treatment is missing, define it in design docs first and then implement.
- Per-component ad-hoc treatments for shared semantic states are forbidden.

## Component Implementation Order

Follow this sequence for every stateful component:

1. Create or update the element spec and complete ownership triad table.
2. Define the state enum, transition map, and transition guard contract.
3. Add the choreography table and timing-token mapping in the spec.
4. Implement component API with a single enum state input and `[attr.data-state]` on root.
5. Implement HTML structure using the two-geometry-owner rule.
6. Implement SCSS in `@layer components` and `@layer states`.
7. Run gates: lint, build, and design-system checks.

No HTML/CSS implementation starts before steps 1-3 are complete.

## ESLint / Stylelint and visual-contract enforcement

### Contract rules (must hold in shipped code)

These follow from the UI state machine and animation contracts above. Enforce via **code review** until dedicated lint rules exist:

1. No public `@Input()` boolean solely for visual state on stateful components (use one typed visual API / `[attr.data-state]`).
2. Stateful component roots expose `[attr.data-state]` where the FSM contract applies.
3. State-driven selectors must not introduce layout geometry (`width`, `height`, `aspect-ratio`, etc.); geometry stays in `@layer components`.
4. Transitions and animations use design tokens — no unexplained duration or easing literals.

### What is automated today

- **`apps/web/eslint.config.mjs`** — TypeScript and Angular template rules (including `feldpost-template/no-nested-interactive`: interactive elements must not nest inside other interactive elements). Document additional custom rules in that file when added.

### Stylelint

- Optional future gate: `apps/web/stylelint.config.cjs` when Stylelint rules are introduced. Until then, SCSS contracts rely on review and `npm run design-system:check`.
