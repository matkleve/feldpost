# Legacy token deletion status (2026-05-19)

**Purpose:** Honest inventory of what is **already deleted** vs **still in tree**, which migration phase owns each remainder, and a realistic order to reach “zero legacy token debt.” This is a **truth doc** for humans and agents — not a claim that Phase 7 is incomplete (Phase 7 is **Done** per [phase-7-token-migration.md](../phase-7-token-migration.md) § **Closure verification**).

**Canonical queue:** [README.md — Next wave](../README.md#next-wave-post-recovery-queue--2026-05-18) — **P4 Phase 10** (browser matrix) is next; token **file** deletion is **not** on the open queue.

---

## Executive answer: “When are we finally deleting all legacy tokens?”

| Layer | Status (2026-05-19) | When “done” |
| ----- | ------------------- | ----------- |
| **On-disk bridge** (`_legacy-design-tokens.scss`, `tokens.scss`, `load-css('styles/legacy-design-tokens')`) | **Deleted** | **Already done** (Phase 7 Batch 50, 2026-05-18) |
| **Runtime `var(--color-*)` Feldpost v1** in `apps/web/src/app/**/*.scss` | **0** call sites | **Already done** (Phase 7) |
| **Runtime `var(--fp-sys-*)` / `var(--fp-ref-*)`** in `apps/web/src` | **0** | **Already done** (Phase 7) |
| **Tailwind `tailwind.config.js` legacy utility names** (`bg-surface`, `text-text-primary`, …) | **Still present** — map to **tweakcn** `var(--card)`, `var(--foreground)`, … | After **Phase 10** theme pass + **Phase 5/8** “full v4 token migration” (deferred from Phase 7 DoD) |
| **`styles.scss` `@theme inline` `--color-*`** (shadcn/Tailwind v4) | **Still present** — **not** Feldpost v1; required for utilities | **Phase 9** upstream / Tailwind v4 peer work — do not delete as “legacy” |
| **Docs/specs** mentioning bridge path or `--fp-*` tables | **Historical strings remain** in `tokens.md`, phase-7 batch history, some specs | **Phase 11** hygiene on edit; **Phase 1 Wave P5** inventory audit |
| **Archive** (`docs/archive/figma-tokens.json` → `tokens.scss`) | Stale export metadata | Optional archive cleanup — **no product impact** |

**Bottom line:** The **legacy token bridge file and Feldpost v1 CSS variable call sites in app SCSS are already gone.** What remains is (1) **compatibility aliases in `tailwind.config.js`**, (2) **normal shadcn/Tailwind v4 `--color-*` theme wiring**, (3) **documentation history**, and (4) **human Phase 10 verification** that themes did not regress — not a hidden `tokens.scss` waiting for deletion.

---

## Verification snapshot (repo root, 2026-05-19)

Run from repository root to reproduce:

```bash
# Bridge file + load-css — expect no matches under apps/web
rg 'legacy-design-tokens|_legacy-design-tokens' apps/web
rg 'load-css.*legacy' apps/web

# Monolithic tokens.scss — expect absent
test ! -f apps/web/src/styles/tokens.scss && echo 'tokens.scss absent OK'

# Feldpost v1 consumer vars in app SCSS — expect 0
rg 'var\(--color-' apps/web/src/app --glob '*.scss'
rg 'var\(--fp-' apps/web/src

# styles/ partials — seven files, no bridge
ls apps/web/src/styles/
```

| Check | Expected | Actual (2026-05-19) |
| ----- | -------- | ------------------- |
| `legacy-design-tokens` under `apps/web` | 0 files | **0** |
| `apps/web/src/styles/tokens.scss` | absent | **absent** |
| `var(--color-` in `apps/web/src/app/**/*.scss` | 0 | **0** |
| `var(--fp-` in `apps/web/src` | 0 | **0** |
| `meta.load-css` legacy | 0 | **0** (only `typography-baseline`) |
| `apps/web/src/styles/` partial count | 7 | **7** (`_typography-baseline.scss`, map/layout partials — no bridge) |

---

## Inventory table

| Item | Already deleted? | Still in tree? | Owner phase | Realistic order |
| ---- | ---------------- | -------------- | ----------- | --------------- |
| `apps/web/src/styles/tokens.scss` (monolith) | Yes (predecessor retired earlier) | No | Phase 7 (history) | — |
| `apps/web/src/styles/_legacy-design-tokens.scss` | Yes (Batch 50 + file delete) | No | Phase 7 **Done** | — |
| `@include meta.load-css('styles/legacy-design-tokens')` in `styles.scss` | Yes (2026-05-18) | No | Phase 7 **Done** | — |
| `styles/primitives/*.scss`, `styles/patterns/*.scss` | Yes (Phase 5 SCSS removal) | No | Phase 5 | — |
| `var(--color-bg-base)`, `var(--color-clay)`, … in component SCSS | Yes (Phase 7 batches) | No in `src/app` | Phase 7 **Done** | — |
| `var(--fp-sys-*)` / `var(--fp-ref-*)` in runtime SCSS | Yes | No in `apps/web/src` | Phase 7 **Done** | — |
| `--fp-*` / bridge path in **docs** (`tokens.md`, phase-7, specs) | N/A (documentation) | Yes (historical tables + `@see`) | Phase 11 / Phase 1 P5 | **4** — scrub when touching specs |
| `tailwind.config.js` `extend.colors` legacy **names** (`bg-surface`, `text-text-primary`, …) | No — **intentional bridge to tweakcn** | Yes | Phase 5 / 8 (v4 tail); Phase 7 noted **out of DoD** | **2** — after Phase 10 pass |
| `styles.scss` `@theme inline` `--color-primary`, … | N/A (shadcn/Tailwind v4) | Yes | Phase 2 foundation + Phase 9 | **Do not delete** as legacy |
| `text-text-primary`, `bg-success`, … in CVA variant TS | Uses config aliases | Yes (~8 files) | Phase 5 / 10 | **2** — rename utilities when config migrates |
| Phase 5 checkbox “Delete `tokens.scss`” | Work completed under Phase 7 | Stale open checkbox in phase-5 doc | Phase 5 doc sync | **3** — close checkbox (this report) |
| `docs/archive/figma-tokens.json` `exportedFrom: tokens.scss` | N/A | Yes (archive) | Optional | **5** — archive only |

---

## What “legacy” means now (avoid false alarms)

1. **`--color-*` in `styles.scss` `@theme inline`** — Tailwind v4 maps semantic tweakcn vars (`--primary`, `--card`, …) to utility color keys. This is **current** stack, not Feldpost v1 `var(--color-clay)`.
2. **`tailwind.config.js` comments** mentioning “legacy utility names” — documents that **`bg-surface`** etc. now resolve to **`var(--card)`**, not that a bridge file exists.
3. **`docs/design/tokens.md` `--fp-sys-color-*` tables** — **reference hex** for MD3 roles without on-disk `--fp-*` definitions (Phase 7 Batch 16+).

---

## Recommended order to “zero” (remaining work)

1. **Phase 10 (P4)** — Browser **Token theme checklist** + screen matrix ([phase-10-visual-qa.md](../phase-10-visual-qa.md)); sign rows in parent checklist or a dated pass report. **Proves** tweakcn themes; does not delete files.
2. **Phase 5 / 8** — Migrate or collapse **`tailwind.config.js`** legacy **utility name** aliases once callsites use v4-native semantic utilities; track as “full v4 token migration” (Phase 7 § remaining work table).
3. **Phase 5 doc** — Mark **`tokens.scss` / bridge deletion** checkboxes **closed** (superseded by Phase 7).
4. **Phase 11 / Phase 1 P5** — Spec + `tokens.md` parity: no normative text implying `_legacy-design-tokens.scss` on disk.
5. **Optional** — Archive JSON metadata; remove `item-grid-legacy` archive tree when product drops it (unrelated to global token bridge).

---

## Phase 10 linkage

Legacy-token **verification rows** (grep gates + theme checklist — desk vs browser) live in [phase-10-manual-visual-matrix-gap-2026-05-18.md](./phase-10-manual-visual-matrix-gap-2026-05-18.md) § **Legacy token verification (desk)**.

---

## Layout / shell vars (not bridge — still agent-gated)

Bridge deletion is **done**, but **component-local** layout vars (`--settings-overlay-*`, `--sidebar-width-*`) still require the owner matrix and decision tree — agents must not invent **`--shell-*`**. See [agent-css-variable-contract.md](../../design/agent-css-variable-contract.md), [agent-token-decision-closure.md](./agent-token-decision-closure.md), and [shell-layout-tokens.md](../../design/shell-layout-tokens.md).

---

## Related

- [agent-token-decision-closure.md](./agent-token-decision-closure.md) — bridge done vs layout/shell decision closure
- [agent-css-variable-contract.md](../../design/agent-css-variable-contract.md) — global `var(--*)` contract for all layers
- [shell-layout-tokens.md](../../design/shell-layout-tokens.md) — shell-only geometry
- [phase-7-token-migration.md](../phase-7-token-migration.md) — batch history and closure gates
- [phase-5-callsite-migration.md](../phase-5-callsite-migration.md) — callsite + barrel removal (stale `tokens.scss` checkbox)
- [token-layers.md](../../design/token-layers.md) — runtime ownership after bridge retirement
- [migration explicit progress analysis (2026-05-18)](./migration-explicit-progress-analysis-2026-05-18.md)
