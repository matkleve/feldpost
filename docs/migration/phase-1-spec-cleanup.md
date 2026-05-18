# Phase 1 — Spec Cleanup

**Status:** In progress — superseded in part by Phase **7**/**8** (2026-05-17); checklist below stays open for traceability; **four** historical bullets **closed with proof (2026-05-18)** — see `[x]` rows. **Index %:** migration [README](./README.md) Phase **1** row (**22**) is a coarse rollup (umbrella + brand-primary + primitive-contract audit still open).

### 2026-05-17 — Shipped reality / supersession

Phase **7** and **8** have already collapsed much of the old **dual-token** story: **tweakcn** semantics on **`:root`** (plus dark / sandstone paths) are the live implementation palette, typography and motion primitives largely live in **`_typography-baseline.scss`**, and the legacy **`_legacy-design-tokens.scss`** bridge is **retired** (**file removed** from **`apps/web`** — not a parallel system). **`docs/design/tokens.md`** and **`docs/migration/phase-7-token-migration.md`** are the operational narrative for that baseline. Treat the Phase 1 bullets below as **legacy intent**—re-scope any new work against those docs instead of assuming a greenfield “map everything to spartan `:root`” checklist.

- [ ] **Phase 1** — Spec Cleanup — **blocked**: umbrella item; close only when the annotated children are either satisfied on current repo facts or explicitly archived with owner sign-off.
  - [ ] Resolve primary color decision: `--color-accent-brand` (warm orange) vs `--fp-sys-color-primary` (MD3 gold) as the single brand primary — **needs product decision**: MD3 **`--fp-sys-color-*`** is no longer emitted on `:root` (Phase 7); product still must name the canonical **brand primary** vs tweakcn **`--primary`** / marketing accents in prose and specs.
  - [x] Write spartan token-override spec: what goes in `:root` to wire Feldpost palette into spartan variables — **superseded (provable 2026-05-18):** shipped direction is **tweakcn** semantic blocks + **`_typography-baseline.scss`** + **`@theme inline`** in **`apps/web/src/styles.scss`**; narrative in **`docs/design/tokens.md`** + [phase-7-token-migration.md](./phase-7-token-migration.md) — no separate “spartan `:root` override” spec required unless product rescopes.
  - [x] Update `docs/design/tokens.md` with spartan variable mapping section — **superseded (provable 2026-05-18):** **`tokens.md`** carries tweakcn / MD3-doc / Figma-bridge sections; legacy bridge file removed from **`apps/web`** (Batch **50**).
  - [x] Decide: migrate `--fp-sys-color-*` tokens fully OR keep dual system with spartan as an overlay — **superseded (provable 2026-05-18):** **`rg 'var\(--fp-sys-color' apps/web/src`** → **0** files; MD3 roles documented-only per **`tokens.md`** §3.1a — [phase-7-token-migration.md](./phase-7-token-migration.md) §Batch 16.
  - [x] Decide: CDK overlay CSS stays or is replaced by spartan's CDK usage — **superseded (provable 2026-05-18):** **`@import "@angular/cdk/overlay-prebuilt.css"`** remains in **`apps/web/src/styles.scss`** (see [phase-8-global-scss-elimination.md](./phase-8-global-scss-elimination.md) preconditions / Phase 7 special cases).
  - [ ] Identify if any component specs need the spartan primitive contract (dialog FSM, popover, tabs) before migration — **Wave P5** ([migration README](./README.md#next-wave-post-recovery-queue--2026-05-18)): explicit **`docs/specs/component/**`** inventory vs template migration waves — **open** audit (not implied complete); schedule after **P1–P4**; no product veto.

### Wave P5 — Primitive contract inventory (2026-05-18, audit-only)

**Scope:** `docs/specs/component/**` specs that define or bound **dialog**, **popover**, and **tab** primitives (FSM / stacking / wiring called out in the Phase 1 bullet). **Not** an implementation or umbrella **brand-primary** decision.

| Primitive area | Spec paths (repo-relative) | Notes |
|----------------|----------------------------|--------|
| **Dialog — confirm** | `docs/specs/component/confirm-dialog/confirm-dialog.md` | Dedicated dialog contract. |
| **Dialog — text input** | `docs/specs/component/text-input-dialog/text-input-dialog.md` | |
| **Dialog — project select** | `docs/specs/component/project-select-dialog/project-select-dialog.md` | |
| **Dialog — share link audience** | `docs/specs/component/workspace/share-link-audience-dialog.md` | |
| **Popover (library primitive)** | `docs/specs/component/ui-primitives/popover.md` | Single popover spec under `component/`. |
| **Tabs** | `docs/specs/component/ui-primitives/ui-primitives.tab.md`, `docs/specs/component/workspace/group-tab-bar.md` | **Tabs** + workspace **group tab bar**; `editable-property-row.md` is row chrome, not a tab primitive spec. |
| **Anchored menus (related shell)** | `docs/specs/component/filters/dropdown-system.md` | Cross-cutting **toolbar menu** / stacking; often edited with popover/menu work. |

**Proof command (inventory refresh):** `find docs/specs/component \( -iname '*dialog*' -o -iname '*popover*' \) | sort` — dialog/popover hits match the table above; tab specs picked from `ui-primitives.tab.md` + `group-tab-bar.md` by naming.

