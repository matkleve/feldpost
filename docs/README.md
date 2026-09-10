# Feldpost documentation

Geo-temporal image management for construction companies — Angular SPA + Leaflet map +
Supabase (Auth, PostgreSQL + PostGIS, Storage).

You almost certainly arrived with an intention rather than a curiosity. Start there.

## I want to…

| I want to… | Start here | Then |
| --- | --- | --- |
| **implement a feature** | the contract in [`specs/`](specs/README.md) — find it via the [folder taxonomy](specs/README.md#folder-taxonomy-mandatory) | [`playbooks/idea-to-ship-pipeline.md`](playbooks/idea-to-ship-pipeline.md) for Definition of Ready/Done, then [`agent-workflows/implementation-checklist.md`](agent-workflows/implementation-checklist.md) |
| **change styling, a colour, or a token** | [`design/agent-css-variable-contract.md`](design/agent-css-variable-contract.md) — **mandatory** before any SCSS or token edit; no invented variable names | [`design/tokens.md`](design/tokens.md), [`design/constitution.md`](design/constitution.md), and `.cursor/rules/token-usage-gate.mdc` for the traps that eat an afternoon |
| **add a component** | [`specs/component/registry.md`](specs/component/registry.md) + its supplements — **reuse before you build**; if the variant is missing, say so and ask | [`agent-workflows/element-spec-format.md`](agent-workflows/element-spec-format.md) for the new component's own spec |
| **write or update a spec** | [`agent-workflows/element-spec-format.md`](agent-workflows/element-spec-format.md) | [`specs/README.md`](specs/README.md) for taxonomy, the split policy and the size caps; run `node scripts/lint-specs.mjs` |
| **understand why a decision was made** | [`adr/`](adr/README.md) — the decision and, more usefully, the rejected alternatives | [`study/`](study/README.md) when the question is still open: reasoning with evidence grades |
| **find out how the code misleads me** | [`TRAPS.md`](TRAPS.md) — read it before your **second** attempt at a bug | promote a lesson there once it has bitten twice |
| **see what happened recently** | [`ai-diary/`](ai-diary/README.md) — one file per day; read the latest entry for your area before resuming it | |
| **work on the database, RLS, or a migration** | [`security-boundaries.md`](security-boundaries.md) and [`../supabase/AGENTS.md`](../supabase/AGENTS.md) — RLS is *the* boundary, the frontend is untrusted | [`architecture/database-schema.md`](architecture/database-schema.md); replay migrations against a real database — a static read is not a review |
| **run the gates before committing** | `npm run verify` — one command, runs everything, keeps going after a failure | [`agent-workflows/gates-and-commands.md`](agent-workflows/gates-and-commands.md) for per-gate commands and the soft-check ratchet |
| **add or change user-visible text** | [`i18n/translation-workbench.csv`](i18n/translation-workbench.csv), then `node scripts/import-i18n-csv-to-sql.mjs` | `.cursor/rules/i18n-workflow.mdc`; commit the regenerated `supabase/seed_i18n.sql` with the code |
| **know what to call something** | [`glossary.md`](glossary.md) — canonical names, used exactly, in code and in docs | |
| **know what the user is trying to do** | [`use-cases/`](use-cases/README.md) — interaction scenarios, `UC-NNN`, citable | |
| **set up the environment** | [`playbooks/setup-guide.md`](playbooks/setup-guide.md) | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) |
| **debug something that makes no sense** | [`TRAPS.md`](TRAPS.md) first, then [`architecture.md`](architecture.md) | for data-shaped bugs — overlaps, uniqueness, immutability, history — start in PostgreSQL, not in the component |

## Four kinds of memory

These are four document types on purpose. Each is read at a different moment, and merging
any two means both get read at the wrong one.

| Type | Answers | Consult it when | Never |
| --- | --- | --- | --- |
| [`specs/`](specs/README.md) | what it **must** do | implementing, reviewing, or arguing about behaviour | treat a spec as a record of what the code does today |
| [`study/`](study/README.md) | **why this** and not the alternatives — every claim graded `[A]`–`[D]` | a settled question is being reopened, or you need to know how sure someone was | implement a `[D]` (a decision nobody accepted) as though it were an `[A]` |
| [`ai-diary/`](ai-diary/README.md) | what **happened**, on a date | resuming an area someone else touched | expect a lesson to be found here later — promote it |
| [`TRAPS.md`](TRAPS.md) | how the code **misleads** a careful reader | your first fix did not work | add an observation that has only bitten once with no user-visible cost |

Two more, adjacent: [`adr/`](adr/README.md) records a decision and what it rejected — never
edited, superseded in place. [`audits/`](audits/README.md) records what was true at one point
in time and is **not normative**; new reasoning goes to `study/`.

## What outranks what

1. [`CONSTITUTION.md`](CONSTITUTION.md) — eight non-negotiables (delete means delete, no
   silent failure, claims carry their evidence). Above every document **and** above a direct
   instruction; amended only by a pull request that changes only that file.
2. Data and security — RLS, migrations, [`../supabase/AGENTS.md`](../supabase/AGENTS.md).
3. [`../AGENTS.md`](../AGENTS.md) — the single instruction file, and the map to everything
   else. `.cursor/rules/*.mdc` are normative extensions of it.
4. The spec system ([`specs/README.md`](specs/README.md)), then the concrete spec you are
   implementing.

Design non-negotiables are the design chapter of the constitution:
[`design/constitution.md`](design/constitution.md).

---

## The tour

Everything below is orientation, not routing.

### Where things live

```
apps/web/            Angular frontend
  src/app/core/      services, adapters, utilities   (mirrored by docs/specs/service/)
  src/app/features/  feature components
  src/app/shared/    reusable UI components
  src/app/archive/   dead code — excluded from the build, never cite or copy
  src/styles.scss    global tokens: the source of every colour, radius and spacing value
supabase/            migrations, RLS policies, edge functions
docs/                this folder
  archive/           frozen documents — do not load in agentic sessions
scripts/             the gates (verify.mjs runs them all)
```

`docs/archive/` is the documentation counterpart to `apps/web/src/app/archive/`: kept for history, never a source of current truth. It holds superseded design references (retired token tables, the 2026-04-15 cleanup snapshot) that describe paths and token names the tree no longer has, so citing it produces confidently wrong answers. `docs/AGENTS.md` previously named one file here, `archive/reference-products.md`, at a path that has since moved — the rule generalizes to the whole tree.

### Commands

```bash
npm install && npm --prefix apps/web install   # once — apps/web has its own node_modules
npm run dev                                    # dev server
npm run verify                                 # the gate; run before every commit
node scripts/verify.mjs <name>                 # one check: doc-links, specs, design-system,
                                               # i18n, lint, test, build
```

Some checks in `verify` are **soft** — they report and do not fail, because they were already
red when the gate was built. Their counts are a ratchet that may only go down. The numbers
and the per-gate commands are in [`agent-workflows/gates-and-commands.md`](agent-workflows/gates-and-commands.md).

### Patterns that are not optional

- **Adapters.** Never call Leaflet, Supabase or Nominatim from a component. Use `MapAdapter`,
  `SupabaseService`, `GeocodingAdapter`. See [`architecture.md`](architecture.md).
- **Standalone components, signals, `inject()`,** and the new control flow (`@if`, `@for`).
- **Service–module symmetry.** `docs/specs/service/<name>/` mirrors
  `apps/web/src/app/core/<name>/`; one `types.ts` per module; a slim facade over local
  `adapters/`. Contract: [`agent-workflows/service-symmetry-standard.md`](agent-workflows/service-symmetry-standard.md).
- **Organization scoping.** Every row is scoped by `organization_id`, and the scoping is
  enforced by RLS — a client-side filter is UX, not security.
- **One owner per visual concern.** Tailwind and component SCSS both ship; solving the same
  concern twice is the bug ([ADR-0004](adr/0004-tailwind-and-scss-coexist.md)).

### Reference

- [`architecture.md`](architecture.md) — system design and adapter boundaries
- [`architecture/database-schema.md`](architecture/database-schema.md) — tables, relationships, PostGIS
- [`security-boundaries.md`](security-boundaries.md) — trust model, RLS, storage policies
- [`settings-registry.md`](settings-registry.md) — every user-configurable setting
- [`specs/system/user-lifecycle.md`](specs/system/user-lifecycle.md) — auth and onboarding flows
- [`playbooks/security/role-permissions.md`](playbooks/security/role-permissions.md) — who may do what
- [`design/README.md`](design/README.md) — design system index
- [`migration/README.md`](migration/README.md) — the migration phase queue

---

_Specs are contracts. Code matches the spec, not the other way around._
