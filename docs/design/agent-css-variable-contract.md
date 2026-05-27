# Agent CSS custom property contract (`apps/web`)

**Purpose:** One **global** rule for agents: before adding or changing any `var(--*)` in `apps/web`, follow the decision tree below — **no guessing**, **no invented names**.

**Scope:** All layers (global theme, typography baseline, Tailwind `@theme`, component `:host`, shell layout). Shell geometry is a **subsection** — see [shell-layout-tokens.md](./shell-layout-tokens.md).

**App archive:** `apps/web/src/app/archive/` is dead code (excluded from the app build); never use it as a source for `var(--*)` or SCSS patterns — see root [`AGENTS.md`](../../AGENTS.md) § Dead code.

**Related:** [token-layers.md](./token-layers.md) (layer architecture), [tokens.md](./tokens.md) (values), [agent-token-decision-closure.md](../migration/reports/agent-token-decision-closure.md) (closure status), [legacy-token-deletion-status-2026-05-19.md](../migration/reports/legacy-token-deletion-status-2026-05-19.md) (bridge deletion truth), [phase-7-token-migration.md](../migration/phase-7-token-migration.md) § Closure verification (grep gates — history only).

---

## Deleted forever (do not reintroduce)

| Item | Verdict |
| ---- | ------- |
| `apps/web/src/styles/_legacy-design-tokens.scss` | **Absent** — do not restore |
| `apps/web/src/styles/tokens.scss` (monolith) | **Absent** — do not restore |
| `@include meta.load-css('styles/legacy-design-tokens')` in `styles.scss` | **Removed** — only `meta.load-css('styles/typography-baseline')` remains |
| `--overlay-rail-*` | **Removed** (Batch 34) → `--settings-overlay-*` on settings overlay `:host` |
| `--layout-sidebar-*` | **Removed** (Batch 33) → `--sidebar-width-*` on nav `:host` |
| `var(--fp-*)` (retired Feldpost MD3 prefixes) in runtime SCSS | **Forbidden** — tonal tables in `tokens.md` §3.1a are **design reference only**; retired names: [`docs/archive/design-retired-md3-reference-tokens.md`](../archive/design-retired-md3-reference-tokens.md) |
| Feldpost v1 `var(--color-bg-base)`, `var(--color-clay)`, … in **component** SCSS | **Forbidden** — use tweakcn semantics (`--primary`, `--background`, …) |
| New ad-hoc `--shell-*` on `:root` or layout hosts | **Forbidden** without spec row + ownership matrix |
| Copying removed bridge names (`--menu-*`, `--action-*`, `--field-*`, `--interactive-transition-standard`, …) | **Forbidden** — see [token-layers.md](./token-layers.md) Layer C notes |

**Not “legacy” (keep):** `styles.scss` `@theme inline` **`--color-primary`**, **`--color-background`**, … — Tailwind v4 utility keys bound to tweakcn; **not** Feldpost v1 `var(--color-clay)` in app SCSS.

---

## Allowed layers (pick exactly one; cite spec or design doc)

| Layer | Where defined | Use for | Cite |
| ----- | ------------- | ------- | ---- |
| **A — Tweakcn semantics** | `apps/web/src/styles.scss` `:root` / `html[data-theme]` | Product color, shadow ladder, theme surfaces | [tokens.md](./tokens.md) §3.1a handoff, [token-layers.md](./token-layers.md) Layer A |
| **A — Typography / spacing primitives** | `apps/web/src/styles/_typography-baseline.scss` `:root` | `--spacing-*`, `--font-size-*`, `--motion-*`, `--container-radius-*`, `--interactive-focus-ring` | [tokens.md](./tokens.md) § Legacy bridge → Typography baseline |
| **A — Tailwind theme radius** | `styles.scss` `@theme inline` | `--radius-sm` … `--radius-xl` for utilities and `var(--radius-*)` in SCSS | [token-layers.md](./token-layers.md) § Tailwind theme radius |
| **Tailwind `@theme` `--color-*`** | `styles.scss` `@theme inline` | **Utility classes only** (`bg-primary`, `text-foreground`) — not a license to add new global names | [phase-7-token-migration.md](../migration/phase-7-token-migration.md) § Closure |
| **Component `:host` vars** | Named component SCSS | Geometry or role aliases **only when the element spec names the custom property** | Component spec + [token-layers.md](./token-layers.md) Layer C |
| **Documented duplicate `calc()`** | Callsite SCSS (sibling geometry) | When two **DOM siblings** must share a metric but `:host` vars do not cross siblings — e.g. nav collapsed rail + settings overlay `left` | [shell-layout-tokens.md](./shell-layout-tokens.md), [agent-handoff-authenticated-shell-layout-ownership.md](../migration/reports/agent-handoff-authenticated-shell-layout-ownership.md) §10 |

---

## Forbidden improvisations (agents)

| Pattern | Why | Instead |
| ------- | --- | ------- |
| Inventing new global `:root` custom properties | No owner; breaks layer model | Add tweakcn semantic in `styles.scss` **or** component `:host` per spec |
| `var(--chart-*)` for success / warning / error product UI | Chart tokens are data-viz palette | `var(--success)`, `var(--warning)`, `var(--destructive)` / tweakcn semantics |
| Product **`dark:`** Tailwind utilities for **theme color** | `dark:` only matches `[data-theme="dark"] *`, not system dark | `var(--foreground)`, `var(--muted)`, … — see [tokens.md](./tokens.md) § Phase 7 handoff — Tailwind `dark:` |
| Re-adding bridge `load-css` or `_legacy-design-tokens.scss` | Phase 7 **Done** | [legacy-token-deletion-status-2026-05-19.md](../migration/reports/legacy-token-deletion-status-2026-05-19.md) |
| `--shell-settings-overlay-left` and similar “shell bridge” names | Never shipped; wrong layer | [shell-layout-tokens.md](./shell-layout-tokens.md) |
| Restored `--overlay-rail-*`, `--layout-sidebar-*`, `var(--fp-*)`, Feldpost v1 `var(--color-*)` in app SCSS | Phase 7 deleted | This file § Deleted forever |

---

## Decision tree (15 lines — use in order)

```text
 1. Need var(--*) in apps/web? Start here — do not invent names.
 2. Global color, shadow, surface, or theme? → tweakcn in styles.scss (:root / data-theme). Cite tokens.md.
 3. Spacing, type, motion, focus ring, container radius? → _typography-baseline.scss only — no duplicate :root.
 4. Tailwind bg-*/text-* utility? → styles.scss @theme --color-* — utilities only.
 5. Component geometry/role named in element spec? → that component :host only.
 6. Settings overlay panel/rail? → --settings-overlay-* on ss-settings-overlay :host; .settings-overlay left. shell-layout-tokens.md.
 7. Nav rail width/metrics? → --sidebar-width-* on app-nav :host. shell-layout-tokens.md.
 8. Workspace main column / map fill? → workspace-pane.md geometry owners — no --shell-* bridge.
 9. Nav + overlay horizontal alignment? → sibling calc() duplicate OR future AppComponent :host spec row.
10. Product success/warning/error UI? → --success / --warning / --destructive — not --chart-*.
11. Theme-aware color in SCSS? → var(--foreground) etc. — not product dark: utilities.
12. Re-add bridge, --fp-*, --overlay-rail-*, --layout-sidebar-*, Feldpost v1 var(--color-*)? → STOP — deleted.
13. New --shell-* on :root or layout host? → STOP unless spec row + ownership matrix exist.
14. New global :root alias not in tokens.md / token-layers.md? → STOP — add design doc first.
15. Still unclear? → STOP; update spec (owner element + property) before coding.
```

---

## Shell layout (subsection)

Nav rail, settings overlay offset, authenticated main column: **[shell-layout-tokens.md](./shell-layout-tokens.md)** — geometry matrix and shell-only forbidden/allowed names. This file does **not** repeat that matrix; shell work **must** read both.

---

## Phase 7 verification (`rg` — run from repo root after token/SCSS edits)

```bash
# Bridge file + load-css — expect 0
rg 'legacy-design-tokens|_legacy-design-tokens' apps/web
rg 'load-css.*legacy' apps/web

# Monolithic tokens.scss — expect absent
test ! -f apps/web/src/styles/tokens.scss && echo 'tokens.scss absent OK'

# Feldpost v1 / fp in app SCSS — expect 0
rg 'var\(--color-' apps/web/src/app --glob '*.scss'
rg 'var\(--fp-' apps/web/src

# Removed bridge name prefixes — expect 0 in apps/web
rg '--overlay-rail-|--layout-sidebar-' apps/web
rg '--shell-' apps/web --glob '*.scss'

# styles/ partials — seven files, no bridge
ls apps/web/src/styles/
```

| Gate | Expected |
| ---- | -------- |
| `legacy-design-tokens` under `apps/web` | **0** |
| `apps/web/src/styles/tokens.scss` | **absent** |
| `var(--color-` in `apps/web/src/app/**/*.scss` | **0** |
| `var(--fp-` in `apps/web/src` | **0** |
| `--overlay-rail-` / `--layout-sidebar-` in `apps/web` | **0** |
| `--shell-` in `apps/web/**/*.scss` (live vars, not comments) | **0** |

If SCSS changed: `cd apps/web && npx ng build` (exit **0**). Phase 7 closure table: [phase-7-token-migration.md](../migration/phase-7-token-migration.md) § Closure verification.

---

## When to read what

| Task | Read |
| ---- | ---- |
| **Any** `var(--*)` / SCSS token edit in `apps/web` | **This file** (first) |
| Shell / nav / settings overlay / workspace column geometry | [shell-layout-tokens.md](./shell-layout-tokens.md) + [agent-handoff-authenticated-shell-layout-ownership.md](../migration/reports/agent-handoff-authenticated-shell-layout-ownership.md) |
| Concrete hex / MD3 reference tables | [tokens.md](./tokens.md) |
| Layer A/B/C ownership | [token-layers.md](./token-layers.md) |
| Bridge deletion inventory | [legacy-token-deletion-status-2026-05-19.md](../migration/reports/legacy-token-deletion-status-2026-05-19.md) |
