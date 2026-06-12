# Phase 1 — Spec Cleanup

**Status:** In progress — superseded in part by Phase **7**/**8** (2026-05-17); checklist below stays open for traceability; **six** historical bullets **closed with proof** — see `[x]` rows (includes **Wave P5** primitive-contract audit). **Index %:** migration [README](./README.md) Phase **1** row — **6/7** checklist rows closed; umbrella sign-off still open.

### 2026-05-17 — Shipped reality / supersession

Phase **7** and **8** have already collapsed much of the old **dual-token** story: **tweakcn** semantics on **`:root`** (plus dark / sandstone paths) are the live implementation palette, typography and motion primitives largely live in **`_typography-baseline.scss`**, and the legacy **`_legacy-design-tokens.scss`** bridge is **retired** (**file removed** from **`apps/web`** — not a parallel system). **`docs/design/tokens.md`** and **`docs/migration/phase-7-token-migration.md`** are the operational narrative for that baseline. Treat the Phase 1 bullets below as **legacy intent**—re-scope any new work against those docs instead of assuming a greenfield “map everything to spartan `:root`” checklist.

- [ ] **Phase 1** — Spec Cleanup — **blocked**: umbrella item; close only when the annotated children are either satisfied on current repo facts or explicitly archived with owner sign-off.
  - [x] Resolve primary color decision — **closed (2026-05-27):** brand primary = golden stop **70** `#c9a84c` shipped as tweakcn **`--primary`** in `apps/web/src/styles.scss` (light `oklch(0.748 0.128 84.6)`; dark `oklch(0.796 0.134 80)`). See [`open-questions.md`](./open-questions.md), [`decisions-log.md`](./decisions-log.md).
  - [x] Write spartan token-override spec: what goes in `:root` to wire Feldpost palette into spartan variables — **superseded (provable 2026-05-18):** shipped direction is **tweakcn** semantic blocks + **`_typography-baseline.scss`** + **`@theme inline`** in **`apps/web/src/styles.scss`**; narrative in **`docs/design/tokens.md`** + [phase-7-token-migration.md](./phase-7-token-migration.md) — no separate “spartan `:root` override” spec required unless product rescopes.
  - [x] Update `docs/design/tokens.md` with spartan variable mapping section — **superseded (provable 2026-05-18):** **`tokens.md`** carries tweakcn + tonal hex reference; legacy bridge file removed from **`apps/web`** (Batch **50**).
  - [x] Decide: migrate `--fp-sys-color-*` tokens fully OR keep dual system with spartan as an overlay — **superseded (provable 2026-05-18):** **`rg 'var\(--fp-sys-color' apps/web/src`** → **0** files; retired role tables archived — [phase-7-token-migration.md](./phase-7-token-migration.md) §Batch 16.
  - [x] Decide: CDK overlay CSS stays or is replaced by spartan's CDK usage — **superseded (provable 2026-05-18):** **`@import "@angular/cdk/overlay-prebuilt.css"`** remains in **`apps/web/src/styles.scss`** (see [phase-8-global-scss-elimination.md](./phase-8-global-scss-elimination.md) preconditions / Phase 7 special cases).
  - [x] Identify if any component specs need the spartan primitive contract (dialog FSM, popover, tabs) before migration — **provable (2026-05-18, Wave P5 audit):** **no net-new** primitive-contract specs required for **dialogs**, **popover chrome**, or **anchored toolbar menus** before template migration — shipped **`BrnDialog` + `hlmDialog*`** on all four dialog components; **`app-popover`** + **`dropdown-system.md`** own stacking (**`z-index: 300`**); parent-owned open/close is normative (no dialog FSM enum). **Follow-up (not a migration blocker):** sync **`ui-primitives.tab.md`** + **`group-tab-bar.md`** to **`BrnTabs` / `hlmTabs`** (legacy **`tab.scss` / `ui-tab*`** paths absent from tree). Umbrella + **brand-primary** unchanged — **skipped** this wave.

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

#### Wave P5 — Audit verdicts (2026-05-18)

**Gate:** `node scripts/lint-specs.mjs` → exit **0** (151 specs).

| Spec | Pre-migration primitive contract needed? | Verdict | Proof (repo) |
|------|------------------------------------------|---------|--------------|
| `confirm-dialog/confirm-dialog.md` | No | **Provable** | `rg 'BrnDialog' apps/web/src/app/shared/confirm-dialog` → hits; parent-owned lifecycle + ownership matrix in spec; no `data-state` FSM required |
| `text-input-dialog/text-input-dialog.md` | No | **Provable** | `rg 'BrnDialog' apps/web/src/app/shared/text-input-dialog` → hits |
| `project-select-dialog/project-select-dialog.md` | No | **Provable** | `rg 'BrnDialog' apps/web/src/app/shared/project-select-dialog` → hits |
| `workspace/share-link-audience-dialog.md` | No | **Provable** | `rg 'BrnDialog' apps/web/src/app/shared/share-link-audience-dialog` → hits; local signals only (spec §State) |
| `ui-primitives/popover.md` | No | **Provable** | Spec §State: no programmatic FSM; `rg 'z-index:\s*300' apps/web/src/app/shared/popover/popover.component.scss` → match |
| `filters/dropdown-system.md` | No | **Provable** | Stacking + ownership matrix normative; `app-dropdown-shell` + `z-index: 300` contract (see spec §Stacking) |
| `ui-primitives/ui-primitives.tab.md` | **Spec sync on edit** (Phase 11) | **Closed (2026-05-19)** | Spec updated: dead `tab.scss` / `[uiTabList]` / `[uiTab]` paths removed; `BrnTabs` + `hlmTabs*` shim wiring + CVA ownership table added. |
| `workspace/group-tab-bar.md` | **Spec sync on edit** (Phase 11) | **Closed (2026-05-19)** | Spec updated: `--color-clay` / `--color-bg-elevated` replaced by `var(--primary)` / `var(--foreground)`; component hierarchy aligned to `[brnTabsTrigger]` pattern; current implementation state noted. |

**Wave P5 sub-checklist (this wave only):**

- [x] Inventory refresh (`find` + table above).
- [x] Dialog / popover / anchored-menu — **no new** spartan primitive-contract spec before migration.
- [x] Tab primitive specs — **edit-time parity closed (2026-05-19):** `ui-primitives.tab.md` updated (removed dead `tab.scss` / `[uiTabList]` / `[uiTab]` paths; added `BrnTabs` / `hlmTabs*` shim contract, CVA table, ownership triad); `group-tab-bar.md` updated (removed `--color-clay` / `--color-bg-elevated`; aligned to `var(--primary)` / `var(--foreground)` per `group-tab-bar.component.scss`; hierarchy updated to `[brnTabsTrigger][hlmTabsTrigger]` pattern; current implementation state documented). `node scripts/lint-specs.mjs` → **0 errors** (1 pre-existing warn on unrelated `workspace-pane.md`).
- [ ] Umbrella Phase 1 parent — **unchanged** (sign-off still open; brand-primary **closed 2026-05-27**).
- [ ] Brand primary (`--color-accent-brand` vs tweakcn `--primary`) — **skipped** (product-blocked).

