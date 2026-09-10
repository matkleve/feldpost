# Feldpost — Agent Guidelines

Feldpost is a geo-temporal image management system for construction companies.
Angular SPA + Leaflet map + Supabase (Auth, PostgreSQL + PostGIS, Storage).

**This file is capped at 150 lines** and the cap is enforced (`agents-md-max-lines` in `scripts/lint-specs.mjs`). A longer instruction file gets skimmed instead of read — which is worse than a short one, because the reader believes they read it. Detail moved out is still normative at its new address; § Document Authority is the map.

## Instruction precedence (resolve conflicts in this order)

1. **Data and security** — Row-Level Security, migrations, and `supabase/AGENTS.md` (frontend is untrusted).
2. **This file** — `AGENTS.md` at repository root (global engineering rules).
3. **Always-applied rules** — `.cursor/rules/*.mdc` (normative extensions of this file; same authority as #2, must not contradict #1).
4. **Spec system** — [`docs/specs/README.md`](docs/specs/README.md) and governance artifacts under `docs/specs/` (folder taxonomy and the spec split policy live there).
5. **Concrete specs** — implementation contracts under `docs/specs/...` for the feature or module you are changing.
6. **Package `AGENTS.md`** — `apps/web/`, `supabase/`, or `docs/` only where they **narrow** scope; they must not contradict 1–5.
7. **Tool overlays** — `CLAUDE.md`, `.github/instructions/`, `.github/copilot-instructions.md` and similar: pointers and shortcuts only; if something disagrees with 1–5, **1–5 win**. There is **one** instruction file; tool-specific files must not carry project rules.

Implementation contracts live under **`docs/specs/`** (not `docs/element-specs/`). Treat any legacy `element-specs` path as a rename unless explicitly archived.

## Project Structure

- `apps/web/` — Angular frontend (`src/app/` components and services; `src/styles.scss` global tokens)
- `supabase/` — database migrations, RLS policies, edge functions
- `docs/` — specs, design docs, glossary (source of truth)
- `apps/web/src/app/archive/` — **dead code**, excluded from the build; never import, cite, or copy patterns from it ([rules and inventory](apps/web/src/app/archive/README.md))

## Development

```bash
npm install && npm --prefix apps/web install   # once
npm run dev                                    # dev server (cd apps/web && ng serve)
npm run verify                                 # ← the gate. Run before every commit.
```

`npm run verify` runs every check — doc links, spec lint, design-system gates, i18n gates, ESLint, unit tests, `ng build` — and keeps going after a failure, so one run tells you everything that is wrong. CI runs the same command (`.github/workflows/verify.yml`), so local and CI cannot drift. Re-run one check with `node scripts/verify.mjs <name>`.

**Never report work as done without a green `verify` — paste the output.** Some checks are **soft**: they report and do not fail the run, because they were red before the gate existed. Their measured counts are a ratchet that **may only go down — do not add to them.** Counts, per-gate commands, the Node pin, and the GitHub-issue script: [`docs/agent-workflows/gates-and-commands.md`](docs/agent-workflows/gates-and-commands.md).

## Code Conventions

- Use Angular **standalone components** (no NgModules), **signals**, the new control flow (`@if`, `@for`, `@switch`), and **`inject()`** over constructor injection
- **SCSS** for component styling
- Prefer standardized shared UI components from `apps/web/src/app/shared/` (especially dialogs/modals) before building feature-local variants
- Avoid browser-native UI primitives (`window.prompt`, `window.confirm`, native context UI) for product flows when a shared component exists
- When splitting large files or extracting inline templates/styles, always use a dedicated script that performs a strict 1:1 copy before removing the original block
- **Service-module symmetry (mandatory)** for new/refactored services: docs `docs/specs/service/[name]/` mirror code `apps/web/src/app/core/[name]/`; one central `types.ts` per module; slim facade delegating to local `adapters/`; no global adapter folder. Required files, archive protocol, full contract: [`docs/agent-workflows/service-symmetry-standard.md`](docs/agent-workflows/service-symmetry-standard.md)
- For non-obvious behavior gates or state transitions, add concise inline comments that reference the governing element spec section (for example `upload-panel.md § Media Item Menu Contract`)
- Commit messages follow **Conventional Commits** (`feat:`, `fix:`, `chore:`)

## Universal Invariants

- **RLS is the security boundary** — frontend is untrusted; Row-Level Security enforces all data access
- **Adapter pattern** — never call Leaflet, Supabase, or Nominatim directly from components; use `MapAdapter`, `GeocodingAdapter`, `SupabaseService`
- **Element specs are contracts** — implement features from `docs/specs/...`; spec governance itself lives in [`docs/specs/README.md`](docs/specs/README.md)
- **Glossary is canonical** — use exact names from [`docs/glossary.md`](docs/glossary.md)
- **Database-first debugging** — for overlaps, feasibility, uniqueness, publication, immutability, or history: inspect PostgreSQL constraints, triggers, and RLS **before** assuming frontend or adapter bugs (`supabase/migrations/`, `docs/architecture/database-schema.md`)

## Change Classification (Fast Lane / Full Lane)

Every change MUST declare a **class** before work starts (in the issue, PR description, or the agent's preflight). The class determines how much ceremony is required: most changes do not need the full ownership-matrix ritual, and forcing them through it is the main source of process drag. **When unsure between two classes, pick the higher one.**

| Class | Examples | Required before merge |
| --- | --- | --- |
| **Trivial** | typo, copy/label text, log line, comment, single token swap, pure rename, migration cleanup ([Migration Exemption](docs/migration/README.md#migration-exemption-phase-68)) | `npm run verify` green. No ownership matrix, no FSM tables. |
| **Standard** | new non-stateful component, new service method, list/filter/sort, a self-contained UI surface | spec touched first; `npm run verify` green; component-reuse/registry check; `/code-review` skill on the diff. |
| **Sensitive** | RLS or migrations, auth, billing/money, export, stateful/FSM UI, **the upload pipeline**, anything touching `organization_id` scoping | full ceremony: `npm run verify` green; ownership matrix + FSM/transition tables; `/security-review` skill; the matching `validate-*-rls.sql` / `validate-dsgvo-security.sql`; **LIVE VERIFICATION** ([`agent-communication.md`](docs/agent-workflows/agent-communication.md)); fresh-context adversarial review by a different agent than the implementer. |

The class is a **floor, not a ceiling** — reviewers may escalate. Anything that changes a security boundary or the data model is **Sensitive** regardless of how small the diff looks.

### Change-Completeness Rule (all classes — Hard Blocker)

**A change is not done until the thing it replaces is gone.** When you alter behavior, you MUST remove — in the *same* change — every artifact the old behavior left behind:

- Dead code paths, now-unreachable branches, and unused exports/fields/types.
- **Spec and type references to removed concepts** — specs and `types.ts` MUST NOT outlive the code they describe.
- Obsolete tests, fixtures, and feature flags.

Leftover-after-change is the single most expensive recurring failure in this codebase (see the upload pipeline: `project_address_a`/`project_address_b` survived as dead fields *and* lingered in the stepper-FSM spec and types after their producer was removed — `docs/ai-diary/2026-06-13.md`). Worked example and the standing checklist: [`docs/playbooks/change-classification-upload-example.md`](docs/playbooks/change-classification-upload-example.md).

Verification floor for any behavior change: `grep` the removed symbol/field/concept across `apps/web/src` **and** `docs/specs` and confirm **0** stray references before declaring done. Do not layer a new fix on top of an old one without re-reading the current baseline first.

**Red-test-first (Sensitive-class, Hard Blocker):** for Sensitive work (RLS, migrations, auth, money, stateful UI, the upload pipeline), the acceptance test MUST be shown **failing before** the implementation and **passing after**. A test that was never red proves nothing. A flaky test is not a gate — fix isolation first (e.g. the upload spec cross-file injector pollution noted in `docs/ai-diary/2026-05-27.md`).

**State-machine invariants (stateful services, Hard Blocker):** any stateful service (queues, FSMs, resolvers — e.g. the upload queue) MUST declare in its spec its states, its **terminal** states, and its **idempotency rules** (an action on a job already in a terminal state is a no-op). Acceptance criteria MUST assert those invariants. This is the service-side counterpart to the UI FSM contract in `.cursor/rules/ui-state-machine.mdc`; see [`docs/playbooks/idea-to-ship-pipeline.md`](docs/playbooks/idea-to-ship-pipeline.md) § State coherence also applies to services.

## Component Structure Rules (Hard Blockers)

- Ownership Matrix required before first HTML. No code without matrix. Fixed column contract: `.cursor/rules/visual-behavior.mdc` § Ownership Matrix columns; per-component specs carry the filled matrix.
- Max 3 HTML levels per component. Every additional level requires documented justification.
- No interactive element inside interactive element. No button inside button.
- No aria-hidden on nodes with interactive descendants.
- Every CSS property defined exactly once per purpose. Duplicate ownership is a blocker.
- **Flex/grid child hosts:** Every component `:host` that participates as a **flex or grid child** must declare **`min-height: 0`** and **`min-width: 0`** (in component SCSS). Omission is a **spec violation**. Example: `app-map-shell` `:host` must comply when touched.
- **Styling stack (default):** Tailwind utility classes in templates **and** component SCSS are both standard. The "no mixing" rule means **do not solve the same visual concern twice** (e.g. duplicating spacing in Tailwind and SCSS) without an explicit plan — not "never use both languages."
- Loading/Error/Empty are mutually exclusive. Each has exactly one visual owner.

## Required Feature Workflow

1. Read the target element spec: `docs/specs/...`
2. Read the relevant **service facade spec** under `docs/specs/service/<module>/` when the feature depends on that boundary (index: `docs/specs/service/README.md`).
3. Read additional design docs only if the spec or service contract does not answer the question.
4. Reuse shared UI and adapter abstractions before introducing new structure.
5. **Before creating any new Angular component, consult the component registry:** `docs/specs/component/registry.md` (index: slice map and workflow) **and** the linked `docs/specs/component/registry.*.supplement.md` files (selector/variant tables). If the required component or variant exists, use it. If a variant is missing, flag it and ask. Do not implement inline HTML patterns that duplicate a registered component.
6. Verify the result against [`docs/agent-workflows/implementation-checklist.md`](docs/agent-workflows/implementation-checklist.md).

*Figma-assisted flows (screenshots, Code Connect, strict No-Figma new-component gate from the archived rule): **(deferred — Figma work paused)**.*

## Collaboration with the user

Ask **enough questions that requirements are clear** before multi-file work — there is no fixed limit of one or two. Walk the ambiguity checklist in [`docs/agent-workflows/agent-communication.md`](docs/agent-workflows/agent-communication.md) (equivalence/dedupe, geographic precedence, fallbacks, UI semantics, allowed-file boundaries, call budget), batch related questions in one message, and do not guess table or tuning names from prompts — verify against `docs/architecture/database-schema.md` and service types. Before inventing a convention, check the sibling repository for it first.

**Before coding:** restate the invariant in your own words and confirm; list open ambiguities and ask about each that is not locked in spec/plan; then list the files you will touch, what you will not touch, and how you will verify.

**When the user corrects you:** treat it as an invariant update — fix minimal code, sync spec/plan if applicable, add a short note to `docs/ai-diary/YYYY-MM-DD.md` if the mistake is likely to recur.

Also normative, and all in [`agent-communication.md`](docs/agent-workflows/agent-communication.md): the **component styling gate** (no unapproved visual diffs), **🔴 LIVE VERIFICATION** (route cache, media preview FSM, signing, tile aspect caches — `ng build` does not prove revisit UX; agents must emit the LIVE CHECK block), and the **two-attempt rule** (revert a failed attempt before trying the next idea; stop and offer options after two).

## Document Authority

- **Gates, commands, soft-check debt, Node pin** — [`docs/agent-workflows/gates-and-commands.md`](docs/agent-workflows/gates-and-commands.md)
- **Spec system** — [`docs/specs/README.md`](docs/specs/README.md): folder taxonomy, **spec split and organization policy**, component spec coverage, feedback-to-spec sync, settings overlay convention
- **Spec writing template** — [`docs/agent-workflows/element-spec-format.md`](docs/agent-workflows/element-spec-format.md)
- **Idea → ship pipeline (Definition of Ready / Done)** — [`docs/playbooks/idea-to-ship-pipeline.md`](docs/playbooks/idea-to-ship-pipeline.md)
- **Post-implementation verification** — [`docs/agent-workflows/implementation-checklist.md`](docs/agent-workflows/implementation-checklist.md)
- **Working with the user** — [`docs/agent-workflows/agent-communication.md`](docs/agent-workflows/agent-communication.md)
- **Session memory (decisions, mistakes)** — [`docs/ai-diary/`](docs/ai-diary/) — one file per day; read the latest entry for your area before resuming it
- **Migration** — [`docs/migration/README.md`](docs/migration/README.md): canonical phase queue, **Migration Exemption (Phase 6–8)**, **parallel migration streams** (how to split independent migration work across agents; no second "next" list anywhere)
- **Dead code** — [`apps/web/src/app/archive/README.md`](apps/web/src/app/archive/README.md)
- **CSS custom properties** — [`docs/design/agent-css-variable-contract.md`](docs/design/agent-css-variable-contract.md) is **mandatory reading** before any SCSS or token edit in `apps/web` (decision tree, forbidden legacy names, **no invented variable names**); shell geometry also [`docs/design/shell-layout-tokens.md`](docs/design/shell-layout-tokens.md)
- **Design principles** — field-first, map-primary, progressive disclosure, warmth, calm confidence; non-negotiables in [`docs/design/constitution.md`](docs/design/constitution.md)

## Sub-rules Index

Normative contracts in always-applied rule files under `.cursor/rules/`:

- `scss-ownership.mdc` — SCSS ownership, geometry, typography, wrapper, comment contract, CSS layer architecture
- `visual-behavior.mdc` — Visual Behavior Contract, Ownership Triad Rule, ownership-matrix columns, stacking/layer rules
- `ui-state-machine.mdc` — FSM contract, FSM ↔ CSS ↔ DOM alignment, stable state comments, animation/transition contract, component implementation order
- `i18n-workflow.mdc` — mandatory i18n workflow and translation pipeline steps
- `bulk-operation-safety.mdc` — bulk replace/edit quality gates
- `token-usage-gate.mdc` — design token lookup table; prevents hardcoded colors, radii, spacing, motion, z-index
- `component-reuse-gate.mdc` — mandatory component-registry pattern lookup before new UI wiring
- ~~`figma-integration.mdc`~~ — **archived** (Figma work deferred); recoverable at `.cursor/rules/archive/figma-integration.mdc.archived`. Its token-first / i18n-from-Figma / component-scan / **No-Figma No-Component** gates are reference-only until the rule is restored.
