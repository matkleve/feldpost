# Phase 7 — Token System Unification

**Status:** In progress (2026-05-16) — Batch 1: cleared **`var(--fp-*)`** from **`panel-trigger`** + **`chip`** → **`var(--spacing-*)`** (`apps/web/tailwind.config.js` spacing scale).

**Goal:** Shrink or retire **`apps/web/src/styles/_legacy-design-tokens.scss`** (successor to the removed monolithic `tokens.scss`) so **component** SCSS uses **tweakcn** semantics (`--primary`, `--background`, `--muted`, `--foreground`, `--border`, `--destructive`, **`--spacing-*`**, etc.) — not legacy **`--color-*`**, **`--fp-sys-*`**, or **`--fp-ref-*`** hand-offs where avoidable.

**Prerequisites:**

- Phase 6 acceptance criteria met for templates (no dependency on global `ui-*` class semantics).
- Identify every non–Tailwind utility color usage in SCSS; map to semantic tokens or add **named** custom properties in the tweakcn `:root` / theme blocks (not ad hoc hex in components).

---

## Why this is its own phase

The former monolithic **`tokens.scss`** content now lives in **`_legacy-design-tokens.scss`** (see that file’s header). **`styles.scss`** loads tweakcn, **CDK overlay** (once), Tailwind, then **`@include meta.load-css('styles/legacy-design-tokens')`** as the bridge. Phase 7 is the controlled burn-down of that bridge and any remaining **fp** / **`--color-*`** indirection in SCSS consumers.

---

## Pre-flight scan (record counts + file list in §Baseline)

From repository root:

```bash
rg 'var\(--color-' apps/web/src/app --glob "*.scss" -l
rg 'var\(--fp-' apps/web/src/app --glob "*.scss" -l
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
| `var(--color-` | **0** files in `apps/web/src/app` (`*.scss`) — legacy **`var(--color-*)`** remains inside **`_legacy-design-tokens.scss`** only |
| `var(--fp-` (base / alias spacing in components) | **2** files (`panel-trigger`, `chip`) — **Batch 1 cleared 2026-05-16** → **0** |

Re-run before execution; archive components under `archive/` may still reference legacy vars — decide **migrate vs exclude** explicitly in §Baseline.

### Batch 1 — `var(--fp-*)` in app component SCSS (2026-05-16)

| Pattern | Before (`apps/web/src/app`, `*.scss`) | After |
|---------|----------------------------------------|-------|
| `var(--fp-` | **2** files, **18** matches (`panel-trigger`, `chip`) | **0** files, **0** matches |

Replaced with **`var(--spacing-1|2|3|4)`** where values match the legacy fp pixel scale (4 / 8 / 12 / 16 px → `spacing-1` … `spacing-4` per `apps/web/tailwind.config.js` §Spacing scale). **`border-radius`** on panel trigger uses **`var(--spacing-1)`** (4px) in place of **`--fp-alias-r-4`**.

**Still out of scope for this batch:** `_legacy-design-tokens.scss` (bridge definitions), `var(--color-*)` inside the legacy bridge file, and any **`--fp-sys-*` / `--fp-ref-*`** remaining inside non–`src/app` SCSS.

---

## Token mapping table (extend as you discover variants)

| Legacy / alias | tweakcn / semantic target | Notes |
|----------------|---------------------------|--------|
| `--color-primary` (where used as **ink** on links) | Prefer **`--primary`** or **`--foreground`** depending on context | `styles.scss` link baseline uses **`var(--primary)`** today |
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
   - **Done:** loaded from **`styles.scss`** (not from the removed `tokens.scss` graph). Re-verify overlays when changing load order.

2. **`styles.scss` legacy alias block** (`:root { --color-accent-brand: var(--primary); … }` inside the bridge)  
   - Delete **only after** `rg 'var\(--color-'` on component SCSS is zero **and** no remaining TS/SCSS references alias names.  
   - **Link baseline** uses **`var(--primary)`** in `styles.scss` today; keep aligned when removing **`--color-primary`** aliases from the bridge.

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
| No legacy **`var(--fp-*)`** in app SCSS | `rg 'var\(--fp-' apps/web/src/app --glob "*.scss"` → **zero** (**2026-05-16**, post–Batch 1) |
| No legacy color / fp-sys in app SCSS | `rg 'var\(--color-|var\(--fp-sys-|var\(--fp-ref-' apps/web/src/app --glob "*.scss"` → **zero** (explicit waiver list empty unless archived code deleted) |
| Monolithic `tokens.scss` | **Removed** — payload lives in **`_legacy-design-tokens.scss`** (tracked shrink target) |
| No `@use './styles/tokens'` | `styles.scss` has **no** `@use './styles/tokens'` |
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

- **Archive first:** Historical snapshot optional — canonical bridge today is **`_legacy-design-tokens.scss`** (header notes former `tokens.scss`).
- **Delete / shrink bridge:** Retire **`_legacy-design-tokens.scss`** (or replace with minimal stubs) only after Phase 7 acceptance gates pass and `cd apps/web && npx ng build` is green **without** remaining consumers of its **`--color-*` / `--fp-*`** outputs.
- **Legacy alias block** in `styles.scss` (`:root { --color-* … }`): strip only when `rg 'var\(--color-'` across consuming code is negligible or fully migrated; record the go/no-go in this section or [decisions-log.md](./decisions-log.md) so later agents do not assume the alias block is intentional forever.
