# Address Reconciliation

> **Parent:** [location-resolver README](README.md)
> **Related:** [address-field-suggest](../address-field-suggest/address-field-suggest.md) · [address-resolver](address-resolver.md) · `LocationResolverService`

## What It Is

Headless service that checks whether any address field on a media item has low-confidence (unverified / free-text / parser) values, attempts a forward geocode from the assembled address, and — when confident — surfaces a **reconciliation offer** to the user. The user always decides; no silent overwrites.

---

## What It Looks Like

Headless service — no UI of its own. Triggers an inline reconciliation banner in `MediaDetailViewComponent` when a confident address suggestion is found.

## Actions

| # | Trigger | System Response | Contract |
| --- | --- | --- | --- |
| 1 | `reconcileOnDetailOpen(mediaItem)` | Forward geocode from assembled address; return offer if confident | `Promise<ReconciliationOffer \| null>` |
| 2 | `reconcileField(mediaItem, field)` | Field-scoped forward geocode; return offer if confident | `Promise<ReconciliationOffer \| null>` |
| 3 | `applyOffer(…, 'apply')` | Write suggested values + `verified: true` to DB | `Promise<void>` |
| 4 | `applyOffer(…, 'suppress')` | Write `suppressReconciliationPrompt: true` to meta | `Promise<void>` |

## Where It Lives

- **Code:** `apps/web/src/app/core/address-reconciliation/`
- **Service file:** `address-reconciliation.service.ts`
- **Types file:** `address-reconciliation.types.ts`
- **Triggered by:** `MediaDetailViewComponent` on detail open and on manual "Resolve address" row action.

## Component Hierarchy

```text
AddressReconciliationService (facade)
|- address-reconciliation.types.ts
└- GeocodingService (injected)
```

---

## API Contract

```typescript
@Injectable({ providedIn: 'root' })
export class AddressReconciliationService {
  /**
   * Check a media item for unverified address fields and attempt resolution.
   * Returns null when all fields are verified, no candidate found, or confidence below threshold.
   * Never throws.
   */
  reconcileOnDetailOpen(mediaItem: ReconciliationInput): Promise<ReconciliationOffer | null>;

  /**
   * Attempt resolution for a single field using sibling context.
   * Used by the per-row "Resolve address" button.
   * Returns null when no confident candidate is found. Never throws.
   */
  reconcileField(
    mediaItem: ReconciliationInput,
    field: AddressFieldKind,
  ): Promise<ReconciliationOffer | null>;

  /**
   * Persist the user's decision. Writes resolved values and/or suppress flags to DB.
   */
  applyOffer(mediaItemId: string, offer: ReconciliationOffer, decision: ReconciliationDecision): Promise<void>;
}

interface ReconciliationInput {
  id: string;
  street?: string | null;
  city?: string | null;
  district?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address_field_meta?: AddressFieldMeta | null;  // from address-field-suggest types
}

interface ReconciliationOffer {
  mediaItemId: string;
  fields: ReconciliationFieldOffer[];
  confidence: 'high' | 'medium';
  candidateLabel: string; // human-readable assembled address for the prompt
}

interface ReconciliationFieldOffer {
  field: AddressFieldKind;
  currentValue: string | null;
  suggestedValue: string;
  changed: boolean;
}

type ReconciliationDecision = 'apply' | 'suppress' | 'retry';
type AddressFieldKind = 'country' | 'city' | 'district' | 'street';
```

---

## Eligibility Rules

A media item is eligible for reconciliation if **any** of the following conditions are met:

| Condition | Details |
| --- | --- |
| Field has `address_field_meta[field].verified = false` | User-typed or parser-populated value |
| Field is non-null but `address_field_meta` is null/absent | Legacy record: assume unverified |
| Field has `source: 'parser'` | Parser may have misclassified segments |

A field with `suppressReconciliationPrompt = true` in `address_field_meta` MUST be skipped.

Reconciliation is skipped entirely if **all** non-null address fields are verified (`verified: true`) OR if all have `suppressReconciliationPrompt: true`.

---

## Confidence Scoring

Confidence is derived from the forward geocode result:

| Score | Criteria |
| --- | --- |
| `high` | Geocoder result `importance >= 0.6` AND all non-null address fields match the result's structured address (case-insensitive) |
| `medium` | Geocoder result `importance >= 0.35` AND at least 2 non-null fields match |
| below threshold | `importance < 0.35` OR fewer than 2 matching fields — offer NOT shown |

Only `high` and `medium` confidence offers are surfaced. Below-threshold results are silently discarded.

---

## Detail-Open Flow

```
MediaDetailViewComponent.ngOnInit / detail open
  → reconcileOnDetailOpen(mediaItem)
  → if offer returned:
      show reconciliation prompt dialog/toast
      user picks: Apply | Don't ask again | Try again
  → applyOffer(mediaItemId, offer, decision)
```

1. Called once per detail open per media item. Subsequent opens within the same session do not re-trigger unless the user chose "Try again".
2. If `decision === 'apply'`: write suggested field values to `media_items`, set `verified: true, source: 'geocoder'` in `address_field_meta`.
3. If `decision === 'suppress'`: write `suppressReconciliationPrompt: true` to `address_field_meta` for each offered field. No field values changed.
4. If `decision === 'retry'`: re-run `reconcileOnDetailOpen` immediately with relaxed constraints (no `importance` minimum; accept first non-null result). Same prompt shown with new result (if any).

---

## Row-Level "Resolve Address" Flow

1. User clicks `travel_explore` icon on an unverified address row.
2. `reconcileField(mediaItem, field)` is called.
3. If offer returned: same prompt pattern as detail-open (apply / suppress / retry).
4. If no offer: show inline transient message "No suggestion found" (toast or inline, per UX).

---

## Prompt UI Contract

The reconciliation prompt MUST reuse existing shared dialog/toast primitives (no new dialog component). Suggested pattern: toast with action buttons (consistent with existing confirm-action toasts in the codebase).

Content (i18n keys):
- Title: `workspace.reconciliation.prompt.title` — "Address suggestion found"
- Body: `workspace.reconciliation.prompt.body` — "We found: {candidateLabel}. Apply to this item?"
- Apply: `workspace.reconciliation.action.apply` — "Apply"
- Suppress: `workspace.reconciliation.action.dontAskAgain` — "Don't ask again"
- Retry: `workspace.reconciliation.action.retry` — "Try again"

---

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/address-reconciliation/address-reconciliation.service.ts` | Facade |
| `apps/web/src/app/core/address-reconciliation/address-reconciliation.types.ts` | Types |
| `apps/web/src/app/core/address-reconciliation/README.md` | Module index |

---

## Acceptance Criteria

- [ ] `reconcileOnDetailOpen` returns `null` when all fields are verified.
- [ ] `reconcileOnDetailOpen` returns `null` when all unverified fields have `suppressReconciliationPrompt: true`.
- [ ] `high` confidence offer shown when `importance >= 0.6` and all fields match.
- [ ] `medium` confidence offer shown when `importance >= 0.35` and ≥ 2 fields match.
- [ ] Below-threshold results silently discarded (no prompt).
- [ ] `applyOffer(…, 'apply')` writes geocoder values + `verified: true` to DB.
- [ ] `applyOffer(…, 'suppress')` writes `suppressReconciliationPrompt: true` without changing field values.
- [ ] `applyOffer(…, 'retry')` triggers new resolve cycle.
- [ ] Service never throws; all failures return `null` or are silent.
- [ ] Fields with `suppressReconciliationPrompt: true` are excluded from future offers.
