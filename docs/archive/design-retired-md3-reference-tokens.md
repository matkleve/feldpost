# Archived — Retired MD3 reference palette CSS variables (Phase 7 Batch 5b)

**Status:** Historical record only. **Do not** reintroduce these names in `apps/web` or active specs.

**Superseded by:** [`docs/design/tokens.md`](../design/tokens.md) §3.1a tonal stop hex tables + tweakcn semantics (`--primary`, `--background`, …) in `apps/web/src/styles.scss`.

**Removed from runtime:** 2026-05-16 (Phase 7 Batch 5b). Bridge file `_legacy-design-tokens.scss` was later deleted entirely (Batch 50).

---

## What was retired

Material Design 3 **reference** tonal ladders were once emitted on `:root` under a Feldpost-prefixed naming scheme, for example:

- Primary / secondary / tertiary / neutral / neutral-variant stops `0`–`100`
- Typeface weight lines paired with those ladders

Consumers used `var(--fp-ref-<palette>-<stop>)` in SCSS. **Batch 5b** deleted all `:root` definitions; canonical hex moved into `tokens.md` stop tables. Implementation must use **tweakcn** (`var(--primary)`, `color-mix(...)`, etc.) — not resurrected reference-variable names.

Figma exports may still label stops with legacy path segments (`…/ref/primary/95`). Map those to **stop number + hex** in `tokens.md` §3.1a only.

---

## Verification gates (2026-05-16 audit)

```bash
# Zero runtime consumers of retired reference vars
rg --glob '*.{ts,html,scss,css}' 'var\(--fp-ref-' .
# → 0 matches

# No :root definitions under apps/web
rg -c -e '--fp-ref-' apps/web/src
# → 0
```

Post-closure app SCSS gate (combined — covers sys + ref + other fp prefixes):

```bash
rg 'var\(--fp-' apps/web/src/app --glob '*.scss'
# → 0 (exit 1)
```

---

## Batch 5b code/doc actions (summary)

| Area | Action |
|------|--------|
| `_legacy-design-tokens.scss` | Deleted all reference-palette custom property definitions (five tonal ladders + typeface lines) |
| `docs/design/tokens.md` | §3.1a — full tonal stop hex tables (authoritative design reference) |
| `docs/specs/component/filters/chip.md` | Default fill documents `color-mix` + stop **95** hex |
| Active specs | Must cite stop numbers / hex / tweakcn — not retired CSS variable names |

**Build proof:** `cd apps/web && npx ng build` → exit 0.

---

## Related migration narrative

Full Phase 7 batch index: [`docs/migration/phase-7-token-migration.md`](../migration/phase-7-token-migration.md) (active doc uses neutral wording; this archive holds retired **token name** literals for archaeology).
