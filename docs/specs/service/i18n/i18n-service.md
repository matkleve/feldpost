# I18n Service

## What It Is

Canonical **`t(key, fallback)`** lookups for product UI copy: in-repo **catalog** first, then **runtime DB** dictionary entries, with **English fallbacks** always available. Owns **active language** signal, `documentElement.lang`, persistence in `localStorage`, and lightweight **number/date** formatting helpers. DOM translation and DB fetch live in sibling services (`DomTranslationService`, `DbTranslationService`) — not duplicated here.

## What It Looks Like

Every user-visible string flows through `I18nService.t` or `translateOriginal` per root i18n workflow (CSV + DB seed pipeline). Language switch labels stay native (`English`, `Deutsch`, `Italiano`).

## Where It Lives

- **Route:** global
- **Runtime module:** `apps/web/src/app/core/i18n/`

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | Component renders copy | Resolved string for active language | `t(key, fallback)` |
| 2 | User switches language | Updates signal + persistence + `lang` attr | `setLanguage` |
| 3 | Runtime translations loaded | Merges per-language runtime map | `setRuntimeTranslations` |
| 4 | Format dates/numbers | `Intl` with locale from language | `formatDate`, `formatDateTime`, `formatNumber` |

## Component Hierarchy

```text
I18nService (facade)
|- translation-catalog.ts (static keys)
|- i18n.types.ts, i18n.helpers.ts
|- DbTranslationService / DomTranslationService (siblings; not re-specified here)
```

## Data

| Source | Notes |
| --- | --- |
| `TRANSLATION_BY_KEY` | Canonical catalog |
| Runtime dictionaries | DB-backed overrides |

## State

| Name | Type | Notes |
| --- | --- | --- |
| language | `ReadonlySignal<LanguageCode>` | `en` \| `de` \| `it` |
| runtimeRevision | signal | Bumps on runtime merge |

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/i18n/i18n.service.ts` | Facade |
| `docs/specs/service/i18n/i18n-service.md` | This contract |

## Wiring

### Policy

- Catalog keys are authoritative for shipped UI; runtime fills gaps (especially Italian).
- `legacyFallbackEnabled` gates heuristic Italian path.

## Acceptance Criteria

- [ ] `t(key, fallback)` contract documented; fallbacks remain English.
- [ ] Language list and native labels match glossary / AGENTS rules.
- [ ] DB translation pipeline referenced from agent workflow docs, not duplicated verbatim here.
