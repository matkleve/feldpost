# Phase 7 — Token System Unification

**Status:** Planned (blocked until Phase 6 template gates are green unless a file already has zero `ui-*` and can migrate independently — prefer **sequential** completion to avoid churn)

**Goal:** Remove `apps/web/src/styles/tokens.scss` and stop `@use './styles/tokens'` from `styles.scss`. All **component** SCSS (and any feature SCSS) references **tweakcn** semantic variables (`--primary`, `--background`, `--muted`, `--foreground`, `--border`, `--destructive`, etc.) — not legacy `--color-*`, `--fp-sys-*`, or `--fp-ref-*`.

**Prerequisites:**

- Phase 6 acceptance criteria met for templates (no dependency on global `ui-*` class semantics).
- Identify every non–Tailwind utility color usage in SCSS; map to semantic tokens or add **named** custom properties in the tweakcn `:root` / theme blocks (not ad hoc hex in components).

---

## Why this is its own phase

`tokens.scss` still carries the **full Feldpost v2 fp-ref/fp-sys palette** and the **`@angular/cdk/overlay-prebuilt.css` import**. `styles.scss` already hosts the **tweakcn** stack and a **legacy alias** block (`:root { --color-* … }`) for backward compatibility. Phase 7 is the controlled burn-down of that dual system: migrate consumers, relocate CDK import, delete `tokens.scss`, delete or shrink the legacy alias block.

---

## Pre-flight scan (record counts + file list in §Baseline)

From repository root:

```bash
rg 'var\(--color-' apps/web/src/app --glob "*.scss" -l
rg 'var\(--fp-sys-|var\(--fp-ref-' apps/web/src/app --glob "*.scss" -l
rg 'var\(--color-|var\(--fp-sys-|var\(--fp-ref-' apps/web/src --glob "*.scss" -l
```

Optional: totals per pattern.

```bash
rg 'var\(--color-' apps/web/src/app --glob "*.scss" -c
rg 'var\(--fp-sys-|var\(--fp-ref-' apps/web/src/app --glob "*.scss" -c
```

### Baseline snapshot (2026-05-14, informational)

| Pattern | Files (`apps/web/src/app`, approx.) |
|---------|--------------------------------------|
| `var(--color-` | **51** SCSS paths |
| `var(--fp-sys-` or `var(--fp-ref-` | **2** (`panel-trigger.component.scss`, `chip.component.scss`) |

Re-run before execution; archive components under `archive/` may still reference legacy vars — decide **migrate vs exclude** explicitly in §Baseline.

---

## Token mapping table (extend as you discover variants)

| Legacy / alias | tweakcn / semantic target | Notes |
|----------------|---------------------------|--------|
| `--color-primary` (where used as **ink** on links) | Prefer **`--primary`** or **`--foreground`** depending on context | `styles.scss` link baseline today uses `var(--color-primary)` — migrate to **`--primary`** or a dedicated **link** token if contrast requires |
| `--color-bg-base` / `--color-surface` | `--background` | |
| `--color-bg-surface` / `--color-surface-elevated` | `--card` | Surfaces / elevated panels |
| `--color-bg-muted` / `--color-surface-variant` | `--muted` | |
| `--color-text-primary` / `--color-ink` | `--foreground` | |
| `--color-text-secondary` / `--color-ink-muted` / `--color-ink-subtle` | `--muted-foreground` | |
| `--color-border` / outline tokens | `--border` or `--input` | Pick by control vs chrome |
| `--color-danger` / error | `--destructive` | |
| `--color-warning` | **`--warning`** | Add to tweakcn `:root` + dark + sandstone if missing; document in `docs/design/tokens.md` |
| `--color-success` | **`--success`** | Same |
| `--color-clay` / brand emphasis | **`--primary`** | Warm orange brand alignment per Phase 1 decision |
| `--fp-sys-color-primary` (and other `--fp-sys-*`) | Respective tweakcn semantic | Prefer **deleting** fp indirection in app SCSS entirely |
| `--fp-ref-*` | **Never in components** — if encountered, replace with semantic or remove dead code | |

**Tailwind `@theme inline` note:** Utilities like `bg-primary` map through `--color-primary` in `styles.scss` — that is **not** the same as `var(--color-*)` in component SCSS. Phase 7 targets **hand-written `var(--color-…)`** in SCSS files; keep `@theme inline` mapping coherent when adding `--warning` / `--success`.

---

## Special cases

1. **`@import '@angular/cdk/overlay-prebuilt.css'`**  
   - Today: top of `tokens.scss`.  
   - Action: move to **`styles.scss`** immediately **before** or **after** Tailwind import per CDK + bundler constraints; verify overlays (menus, dialogs, map panes) once moved.

2. **`styles.scss` legacy alias block** (`:root { --color-accent-brand: var(--primary); … }`)  
   - Delete **only after** `rg 'var\(--color-'` on component SCSS is zero **and** no remaining TS/SCSS references alias names.  
   - **Link baseline** (`a { color: var(--color-primary) }`) must be updated in the same PR that removes `--color-primary` alias.

3. **Map tokens** (marker colors, cluster halo, selection rings)  
   - If they still use `--color-*` or raw hex, introduce **`--map-*`** (or reuse chart tokens) in tweakcn blocks with three-theme coverage.

4. **`hlm-toggle-group.scss`**  
   - If any **state** color still references legacy vars, migrate in **Phase 7** (or Phase 8 if file deleted later). Coordinate with Phase 6 so directives own layout first.

---

## Work strategy (per file / per feature area)

1. Pick a **feature slice** (e.g. `features/media`, `shared/workspace-pane`) or a **single high-churn file**.
2. Replace each `var(--color-*)` / `var(--fp-sys-*)` / `var(--fp-ref-*)` with the mapped semantic `var(--…)` from tweakcn.
3. Run **`cd apps/web && npx ng build`** on the slice PR; fix contrast regressions before merging.
4. **Commit discipline:** one slice per commit or PR to simplify bisect.

**Order suggestion:** shared layout (`nav`, `authenticated-app-layout`) → map chrome → workspace pane → media → projects → settings → upload → remainder.

---

## Acceptance criteria

| Gate | Condition |
|------|-----------|
| No legacy vars in app SCSS | `rg 'var\(--color-|var\(--fp-sys-|var\(--fp-ref-' apps/web/src/app --glob "*.scss"` → **zero** hits (explicit waiver list empty unless archived code deleted) |
| `tokens.scss` gone | File **deleted** from `apps/web/src/styles/tokens.scss` |
| No `@use` of tokens | `styles.scss` has **no** `@use './styles/tokens'` |
| CDK overlay | Still loaded exactly **once** from `styles.scss` (or documented alternative) |
| Build | `cd apps/web && npx ng build` → exit **0** |

**Optional stretch (if alias block removed):** `rg '--color-' apps/web/src/app --glob "*.scss"'` should also be clean for **non–`@theme`** hand-written references.

---

## Definition of done

- Acceptance table green.
- `docs/migration/open-questions.md` updated if any token decision resolves Q1/Q12-style CDK notes.
- Phase 8 pre-flight re-run; attach to `phase-8-global-scss-elimination.md` §Baseline.

---

## Archive vs delete

- **Archive first:** Before deleting `apps/web/src/styles/tokens.scss`, copy it to a non-imported snapshot — for example `docs/archive/tokens.legacy.snapshot.scss` or `apps/web/src/styles/archive/tokens.legacy.snapshot.scss` — with a file header comment: `Archived 2026-05-14 — superseded by tweakcn + styles.scss; do not import in builds.` Adjust the date on the day of archival.
- **Delete:** Remove `tokens.scss` and `@use './styles/tokens'` from `styles.scss` only after Phase 7 acceptance gates pass and `cd apps/web && npx ng build` is green **without** that file in the graph.
- **Legacy alias block** in `styles.scss` (`:root { --color-* … }`): strip only when `rg 'var\(--color-'` across consuming code is negligible or fully migrated; record the go/no-go in this section or [decisions-log.md](./decisions-log.md) so later agents do not assume the alias block is intentional forever.
