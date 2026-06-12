# Phase 9 — Spartan Package Upgrade (published helm)

**Status:** Planned (**blocked** until `@spartan-ng` ships Tailwind **v4–compatible** `@spartan-ng/ui-*-helm` packages and resolves `@spartan-ng/ui-core` peer `tailwindcss: ^3` conflict)

**Goal:** Replace **local** CVA + brain shims under `apps/web/src/app/shared/ui/*/` with **published** `@spartan-ng/ui-*-helm` packages where they are drop-in compatible. **No** local `*-variants.ts` for standard atoms/molecules that spartan publishes. Feldpost-specific extensions (if any) remain in thin wrapper files, not full forks.

**Track upstream:** [spartan / goetzrobin](https://github.com/goetzrobin/spartan)

**Related open questions:** `docs/migration/open-questions.md` — Q3 (Tailwind v4 peer), Q6 (`tailwindcss-animate`), Q7–Q9 (menu/dialog/toast integration).

---

## Preconditions

- Phase 6–8 complete: templates clean, tokens unified, global primitives gone.
- `npm ls tailwindcss @spartan-ng/ui-core @spartan-ng/brain` shows **no** forced `--legacy-peer-deps` for the target upgrade PR.

---

## Pre-flight scan (before first package bump)

```bash
cat apps/web/package.json
rg '@spartan-ng/' apps/web/package.json
ls apps/web/src/app/shared/ui
rg 'buttonVariants|badgeVariants|inputVariants' apps/web/src/app/shared/ui --glob "*.ts" -l
```

Record **current** `@spartan-ng/*` versions and **Angular** minor.

---

## Dependency additions (expected)

- **`tailwindcss-animate`** — spartan animations historically expect this plugin; add per upstream docs and wire in PostCSS / Tailwind config as required.
- **Peer alignment** — bump `@spartan-ng/brain`, `@angular/cdk`, and `tailwindcss` together per spartan release notes.

---

## Component swap matrix (local → published)

| Local path | Target npm package |
|------------|-------------------|
| `shared/ui/button/` | `@spartan-ng/ui-button-helm` |
| `shared/ui/badge/` | `@spartan-ng/ui-badge-helm` |
| `shared/ui/input/` | `@spartan-ng/ui-input-helm` |
| `shared/ui/label/` | `@spartan-ng/ui-label-helm` |
| `shared/ui/select/` | `@spartan-ng/ui-select-helm` |
| `shared/ui/card/` | `@spartan-ng/ui-card-helm` |
| `shared/ui/skeleton/` | `@spartan-ng/ui-skeleton-helm` |
| `shared/ui/spinner/` | `@spartan-ng/ui-spinner-helm` |
| `shared/ui/switch/` | `@spartan-ng/ui-switch-helm` |
| `shared/ui/dialog/` | `@spartan-ng/ui-dialog-helm` |
| `shared/ui/tabs/` | `@spartan-ng/ui-tabs-helm` |
| `shared/ui/toast/` | `@spartan-ng/ui-sonner-helm` |
| `shared/ui/popover/` | `@spartan-ng/ui-popover-helm` |
| `shared/ui/menu/` | `@spartan-ng/ui-menu-helm` (**blocked** if `BrnMenu` exports / positioning differ — see open Q7) |
| `shared/ui/toggle-group/` | `@spartan-ng/ui-toggle-group-helm` |
| `shared/ui/form-field/` | `@spartan-ng/ui-form-field-helm` |

**Execution order suggestion:** `label` → `input` → `button` → `badge` → `card` → `dialog` → `popover` → `menu` → `select` → `tabs` → `toggle-group` → `toast` → `form-field` → `switch` / `spinner` / `skeleton` (adjust based on interdependency graph from spartan docs).

---

## Work items (phased)

### A. Tooling unblock

1. Confirm upstream issue / release notes for **Tailwind v4** support.
2. Add `tailwindcss-animate` and any **peer** packages spartan lists.
3. `ng build` on a **branch** with only dependency + config changes.

### B. Atom swap (low coupling)

Replace imports in **shared** and **features** to helm barrels; delete local `hlm-*.directive.ts` + `*-variants.ts` when unused.

### C. Molecule swap (higher coupling)

**Dialog / Popover / Menu / Select:** run **focus trap**, **scroll strategy**, and **map z-index** tests documented in workspace specs. Do not merge until overlay stacking is verified on **map + workspace pane**.

### D. Toast / Sonner

Bridge **signal-based** `ToastService` API to Sonner if upstream is imperative — adapter layer or service refactor (see open Q9). Acceptance: **no** duplicate toast systems in production.

### E. Cleanup

- Remove dead **barrel** exports and **SCSS** partials tied to deleted locals.
- `rg 'shared/ui/(button|badge|…)/' apps/web/src/app` should only hit **wrappers** or be empty per swap completion.

---

## Acceptance criteria

| Gate | Condition |
|------|-----------|
| Local UI folders | `apps/web/src/app/shared/ui/*/` **removed** or contains **only** Feldpost-specific extensions (list them in PR) |
| Published packages | `@spartan-ng/ui-*-helm` installed with **npm** resolving peers **without** `--legacy-peer-deps` |
| Build | `cd apps/web && npx ng build` → **0** |
| Design system | `npm run design-system:check` → **0** |
| Tests | `ng test` (or CI equivalent) green for touched modules |

---

## Definition of done

- Acceptance table green.
- `docs/migration/open-questions.md` updated: close Q3/Q6 when resolved; note remaining positioning/toast risks if any waivers exist.
- Phase 10 visual QA receives a **package delta** appendix (version numbers).
