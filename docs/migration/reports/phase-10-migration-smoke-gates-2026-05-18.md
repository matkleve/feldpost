# Phase 10 — Migration smoke (automated gates) — 2026-05-18

**Scope:** Post–Phase **7 Batch 49–50** / parallel doc wave — **automated** regression signals only. This is **not** a substitute for the manual **tight smoke** and **high-risk spot-check** lists in [`phase-10-visual-qa.md`](../phase-10-visual-qa.md) (those rows stay unchecked until a human runs them).

## Environment

- Repo: Feldpost `apps/web` (Angular **21**)
- Date: **2026-05-18** (UTC timestamp from local build log: `2026-05-18T13:43:58Z` on one `ng build` run; hash/size drift with content)

## Automated results (exit codes)

| Gate | Command | Result |
|------|---------|--------|
| Spec lint | `node scripts/lint-specs.mjs` (repo root) | **exit 0** — 151 specs checked |
| Angular production build | `cd apps/web && npx ng build` | **exit 0** (CommonJS dependency warnings only — Leaflet, jszip, qrcode, heic2any) |
| Design system | `npm run design-system:check` (repo root) | **exit 0** — registry + panel MQ audit + visual-behavior guard |
| Legacy bridge path | `rg 'legacy-design-tokens\|_legacy-design-tokens' apps/web` | **0** matches (**exit 1** = no lines, ripgrep convention) |
| `sync-tokens` fail-fast | `npm run sync-tokens` | **exit 1** with remediation stderr (expected until `scripts/sync-tokens.mjs` is rewired off the removed bridge file) |

## `styles` initial chunk (monitoring baseline)

Captured from **`npx ng build`** stdout (one run, same day):

```text
styles-U46CN7B5.css | styles                             |  81.44 kB |                11.83 kB
```

Use this row for **Phase 8 §7** global bundle monitoring; compare after future hoists or token edits. See [`phase-8-global-scss-elimination.md`](../phase-8-global-scss-elimination.md#7-inventory-remaining-styles-tree).

## Follow-ups

1. Execute manual bullets under [Phase 10 — 2026-05-18 post-wave](../phase-10-visual-qa.md#2026-05-18-post-wave-batch-49-and-docs) and [High-risk migration spot-check](../phase-10-visual-qa.md#high-risk-migration-spot-check); record Pass/Fail in that doc or linked tickets.
2. Rewire **`npm run sync-tokens`** to a supported canonical SCSS path when Figma export is needed again (`docs/design/tokens.md` § Figma Bridge).
