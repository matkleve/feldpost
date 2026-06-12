# Agent prompt — Delete `archive/item-grid-legacy/` (product-confirmed only)

**Use when:** Product confirms the legacy media grid archive is **dead** (unreachable, no planned resurrection).

**Do not run** until a human explicitly approves deletion. The item-grid migration spec intentionally **archived** (not deleted) files for inspectable history ([`item-grid.migration-acceptance-and-gates.md`](../../specs/component/item-grid/item-grid.migration-acceptance-and-gates.md) § Migration and Archival Policy).

---

## Evidence (2026-05-19 — code survey)

| Check | Result |
| ----- | ------ |
| Route / lazy `loadComponent` imports | **None** — `app.routes.ts`, `authenticated-app.routes.ts` do not reference archive paths |
| `apps/web/src` TypeScript imports of archive | **None** — only `media-grid.component.ts` imports `media-card` inside the archive folder |
| Template use of `app-media-grid` / `app-media-card` / `app-media-loading` | **Only** under `archive/item-grid-legacy/` |
| Runtime replacement | Active grid: `shared/item-grid/` + `media-item` per migration gates doc |
| Tree size | **9 files** — `media-page/` only (3× component ts/html/scss) |

---

## PROMPT (copy below)

```
PROMPT: Delete unreachable item-grid-legacy archive tree

You are removing the archived legacy media grid components under apps/web/src/app/archive/item-grid-legacy/. Product has confirmed this archive is dead (no routes, no production imports).

PHASE 0 — Verify still dead
From repo root:
  rg 'archive/item-grid-legacy|item-grid-legacy' apps/web/src --glob '*.{ts,html}'
  rg 'app-media-grid|app-media-card|app-media-loading' apps/web/src --glob '*.{ts,html}'
Expect: hits only under archive/item-grid-legacy/ (or zero after deletion). If any hit outside archive/, STOP and report.

PHASE 1 — Delete tree
Remove entire directory:
  apps/web/src/app/archive/item-grid-legacy/

PHASE 2 — Doc touch (minimal)
- If docs/migration/phase-7-token-migration.md or other docs only mention archive paths as historical batch examples, leave them OR add one line "archive tree removed YYYY-MM-DD" — do not rewrite batch history.
- Update docs/specs/component/item-grid/item-grid.migration-acceptance-and-gates.md § Archive location convention: note that on-disk archive was removed after product sign-off (optional one sentence).

PHASE 3 — Gates
  cd apps/web && npx ng build
  npm run design-system:check
Both exit 0.

PHASE 4 — Commit
Single commit only:
  chore: remove dead item-grid-legacy archive tree

Forbidden:
- Do not change active item-grid, media-item, or map/workspace components
- Do not delete other archive/ folders
- Do not bundle unrelated migration or token work
```

---

## Product question (for Matthias)

> **`apps/web/src/app/archive/item-grid-legacy/`** holds the pre–item-grid media card/grid/loading implementations. Nothing in routing or production code imports them; only docs and Phase 7 batch history mention the paths. **OK to delete the whole tree** (9 files), or keep archive for history per the item-grid migration policy?
