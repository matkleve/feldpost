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
