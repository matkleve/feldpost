# Feldpost — Agent Guidelines

Feldpost is a geo-temporal image management system for construction companies.
Angular SPA + Leaflet map + Supabase (Auth, PostgreSQL + PostGIS, Storage).

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
- **Element specs are contracts** — implement features from `docs/element-specs/[element].md`; spec governance itself lives in `docs/element-specs/README.md`
- **Glossary is canonical** — use exact names from `docs/glossary.md`

## Component Structure Rules (Hard Blockers)

- Ownership Matrix required before first HTML. No code without matrix.
- Max 3 HTML levels per component. Every additional level requires documented justification.
- No interactive element inside interactive element. No button inside button.
- No aria-hidden on nodes with interactive descendants.
- Every CSS property defined exactly once per purpose. Duplicate ownership is a blocker.
- Per component: decide Tailwind or SCSS before implementing. No mixing without explicit plan.
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

### Stacking Context

Exactly one element per component declares `position: relative`.
All absolutely positioned children (overlays, badges, actions) are
children of this element. No exceptions.

Stacking context ownership must be defined separately from visual geometry ownership.
The stacking owner can differ from the visual owner when overlays are anchored to a
nested geometry surface.

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
- **Spec system, structure contract, split policy, and index**: `docs/element-specs/README.md`
- **Spec writing template**: `docs/agent-workflows/element-spec-format.md`
- **Post-implementation verification**: `docs/agent-workflows/implementation-checklist.md`

## Required Feature Workflow

1. Read the target element spec: `docs/element-specs/[element].md`
2. Read the implementation blueprint if it exists: `docs/implementation-blueprints/[element].md`
3. Read additional design docs only if the spec or blueprint does not answer the question
4. Reuse shared UI and adapter abstractions before introducing new structure
5. Verify the result against `docs/agent-workflows/implementation-checklist.md`

## Component Spec Coverage (Mandatory)

- Every production component must have its own dedicated element spec in `docs/element-specs/`.
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

For any feature that introduces user-configurable behavior, add an optional `## Settings` section to that feature's element spec in `docs/element-specs/`. Use concise bullets in the form `- **Section**: what it configures`. The settings inventory is centralized in `docs/settings-registry.md` and must stay in sync with all spec `## Settings` sections via `node scripts/lint-specs.mjs`. When adding a new configurable feature, update the spec first and then run the linter (or `--fix`) to refresh/validate the registry.

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

```

```
