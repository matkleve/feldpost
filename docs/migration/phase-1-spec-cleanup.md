# Phase 1 — Spec Cleanup

**Status:** In progress — superseded in part by Phase **7**/**8** (2026-05-17); checklist below stays open for traceability; each item carries a **blocked** / **superseded** / **needs product decision** note (nothing closed here unless independently satisfied).

### 2026-05-17 — Shipped reality / supersession

Phase **7** and **8** have already collapsed much of the old **dual-token** story: **tweakcn** semantics on **`:root`** (plus dark / sandstone paths) are the live implementation palette, typography and motion primitives largely live in **`_typography-baseline.scss`**, and **`_legacy-design-tokens.scss`** is an intentionally **shrinking bridge** (not a parallel system). **`docs/design/tokens.md`** and **`docs/migration/phase-7-token-migration.md`** are the operational narrative for that baseline. Treat the Phase 1 bullets below as **legacy intent**—re-scope any new work against those docs instead of assuming a greenfield “map everything to spartan `:root`” checklist.

- [ ] **Phase 1** — Spec Cleanup — **blocked**: umbrella item; close only when the annotated children are either satisfied on current repo facts or explicitly archived with owner sign-off.
  - [ ] Resolve primary color decision: `--color-accent-brand` (warm orange) vs `--fp-sys-color-primary` (MD3 gold) as the single brand primary — **needs product decision**: MD3 **`--fp-sys-color-*`** is no longer emitted on `:root` (Phase 7); product still must name the canonical **brand primary** vs tweakcn **`--primary`** / marketing accents in prose and specs.
  - [ ] Write spartan token-override spec: what goes in `:root` to wire Feldpost palette into spartan variables — **superseded**: shipped direction is **tweakcn + bridge shrink** + documented handoffs in **`tokens.md`** / Phase 7; a standalone “spartan `:root` override spec” would duplicate that unless rescoped to library-specific gaps.
  - [ ] Update `docs/design/tokens.md` with spartan variable mapping section — **superseded**: **`tokens.md`** already carries bridge inventory, tweakcn vs legacy layering, and MD3-as-documentation tables (Phase 7 doc waves); add a titled “spartan mapping” slice only if product still wants that **label** for onboarding.
  - [ ] Decide: migrate `--fp-sys-color-*` tokens fully OR keep dual system with spartan as an overlay — **superseded**: runtime **dual emission** of **`--fp-sys-color-*`** is gone from the bridge (Phase 7 Batch 16); remaining work is **named tweakcn roles** for deferred MD3 semantics (see **`tokens.md`** §3.1a handoff), not a literal dual-CSS-variable system.
  - [ ] Decide: CDK overlay CSS stays or is replaced by spartan's CDK usage — **superseded**: Phase **8** global-stack goal keeps **CDK overlay** in the minimal **`styles.scss`** chain; “replace vs keep” is no longer an open architecture fork unless a future stack change is proposed.
  - [ ] Identify if any component specs need the spartan primitive contract (dialog FSM, popover, tabs) before migration — **blocked**: inventory against current **`docs/specs/component/**`** and template migration waves is not closed here; treat as an explicit audit ticket, not implied complete.


The following cursor rule files are relevant to the files you just read:

- /home/matthias/Projects/feldpost/docs/AGENTS.md
# Documentation — Package Guidelines

## Element Specs

- Every UI element has a spec in `specs/` — this is the **implementation contract**
- Every production component has its own dedicated spec file; parent specs reference child specs instead of collapsing multiple component contracts into one document
- Service specs must mirror code modules one-to-one: `docs/specs/service/[service-name]/` matches `apps/web/src/app/core/[service-name]/`

## Spec split and organization

- Canonical contracts live in `docs/specs/`; parents link to children—**no duplicate normative bodies** across `ui/` and `service/` for the same concern (UI may hold a short stub that links to the service spec).
- Split oversized specs when `lint-specs` warns or errors on line count; use adapter mirror (`adapters/*.adapter.md`) for adapter-shaped boundaries, or concern slices (AC, FSM, visual) in the same folder. Full rules: repository root `AGENTS.md` → **Spec split and organization policy**.

## Spec Folder Taxonomy

- `docs/specs/ui/` for feature-level UI contracts
- `docs/specs/component/` for reusable/local component contracts
- `docs/specs/service/` for service-module contracts
- `docs/specs/system/` for cross-cutting behavior systems
- `docs/specs/page/` for route/page-level contracts

Operational rules and governance belong in AGENTS/instructions files; `docs/specs/README.md` should stay focused on indexing and navigation.

- Specs are the source of truth: code must match spec, not the other way around
- Update specs **before** modifying features
- When user feedback changes behavior expectations, update the relevant spec sections immediately in the same session (Actions, Mermaids, Wiring/Data, Acceptance Criteria)
- Follow the template in `agent-workflows/element-spec-format.md`
- Follow service symmetry workflow in `agent-workflows/service-symmetry-standard.md` for service modules/refactors

## Glossary

- `glossary.md` defines canonical UI element names — use these in code and specs

## Design Docs

- `design/constitution.md` — non-negotiable design rules
- `design/tokens.md` — colors, typography, sizing
- `design/layout.md` — breakpoints, panel dimensions
- `design/motion.md` — animation timing
- `design/map-system.md` — map hierarchy, markers, clustering
- `design/components/` — component-specific design rules
- Do **not** load `archive/reference-products.md` in agentic sessions

Consider these rules if they affect your actions.
