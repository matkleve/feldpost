# Org Field Suggest Adapter

> **Code:** `apps/web/src/app/core/address-field-suggest/adapters/org-address-field-suggest.adapter.ts`  
> **Parent:** [address-field-suggest](../address-field-suggest.md)

## What It Is

Queries the organization's **`locations`** table for distinct non-null values for a given address field (`city`, `district`, `street`). Org results surface **before** geocoder results in `app-address-field-combobox`.

## Contract

| Field kind | Source table | Column |
| --- | --- | --- |
| `city` | `locations` | `city` |
| `district` | `locations` | `district` (optional filter: `city` from context) |
| `street` | `locations` | `street` (optional filter: `city` from context) |
| `country` | — | Static ISO list (not this adapter) |

- Scope: `organization_id = context.organizationId`
- Match: `ilike` on column with user query
- Dedupe: normalized text key in adapter
- Limit: 8 fetched, max 5 returned after score filter

## Acceptance Criteria

- [x] Uses `locations`, not dropped `media_items` address columns
- [x] Returns `[]` when `organizationId` is absent
- [x] District/street queries narrow by parent `city` when provided
