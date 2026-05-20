# Org Address Field Suggest Adapter

> **Parent:** [address-field-suggest.md](../address-field-suggest.md)
> **Code:** `apps/web/src/app/core/address-field-suggest/adapters/org-address-field-suggest.adapter.ts`

## What It Is

Adapter that queries the organization's own `media_items` table for distinct non-null values for a given address field, filtered by parent context. Org results surface first in suggestions because they represent confirmed project locations.

## What It Looks Like

Headless adapter — no UI. Used internally by `AddressFieldSuggestService`.

## Where It Lives

- **Code:** `apps/web/src/app/core/address-field-suggest/adapters/org-address-field-suggest.adapter.ts`
- **Consumer:** `AddressFieldSuggestService`

## Actions

| # | Trigger | System Response |
| --- | --- | --- |
| 1 | `fetchOrgFieldSuggestions(field, query, context, supabase)` called | Distinct org-scoped values from `media_items` filtered by query |

## Component Hierarchy

Internal function — no class hierarchy.

## Responsibilities

- Query `media_items` with `ilike` on the target column, scoped by `organization_id`.
- Apply parent-field equality filters when context provides them.
- Map distinct values to `AddressFieldSuggestion` with `source: 'org-db'`.
- Return `[]` on Supabase error — never throws.

## Query Contract

| Field | Column | Context filters applied |
| --- | --- | --- |
| `city` | `city` | None beyond org scope |
| `district` | `district` | `city = ctx.city` if non-null |
| `street` | `street` | `city = ctx.city` if non-null |
| `country` | — | Handled by static ISO list; this adapter is NOT called for country |

### Query shape (illustrative)

```typescript
supabase
  .from('media_items')
  .select('city')
  .eq('organization_id', ctx.organizationId)
  .ilike('city', `*${query}*`)
  .not('city', 'is', null)
  .limit(8)
```

Parent-field equality filters (e.g. `.eq('city', ctx.city)`) are applied when the context field is a non-empty string.

## Deduplication

Values are de-duplicated in memory by normalized form (`normalizeSegment` from `location-path-parser.util.ts` or equivalent lowercase+trim). The adapter returns at most **5 distinct values** after dedup.

## Score Computation

```typescript
score = computeTextMatchScore(distinctValue, query)
```

Results with `score < 0.1` are dropped.

## Acceptance Criteria

- [ ] Query is always scoped to `organization_id`; MUST NOT return cross-org data.
- [ ] Parent-field equality filter applied when context city/district is non-empty.
- [ ] Returns at most 5 results per call.
- [ ] Returns `[]` when `organizationId` is null/undefined (no org context available).
- [ ] Returns `[]` on Supabase error without throwing.
