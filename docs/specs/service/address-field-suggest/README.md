# address-field-suggest service spec index

Code module: apps/web/src/app/core/address-field-suggest/
Primary facade: apps/web/src/app/core/address-field-suggest/address-field-suggest.service.ts
Types contract: apps/web/src/app/core/address-field-suggest/address-field-suggest.types.ts
Helpers: apps/web/src/app/core/address-field-suggest/address-field-suggest.helpers.ts
Adapters: apps/web/src/app/core/address-field-suggest/adapters/

## Child Specs

- [address-field-suggest.md](address-field-suggest.md) — facade API, query algorithm, verification model
- [adapters/nominatim-field-suggest.adapter.md](adapters/nominatim-field-suggest.adapter.md) — Nominatim query mapping
- [adapters/org-field-suggest.adapter.md](adapters/org-field-suggest.adapter.md) — org-scoped DB distinct queries

## Contract Scope

- Owns per-field address suggestions (country/city/district/street) with hierarchical context constraints.
- DB-first: org database results rank before Nominatim results.
- Owns `AddressFieldMeta` / `AddressFieldVerification` types (verification metadata written to `media_items.address_field_meta`).
- Does NOT own address reconciliation prompts — see [address-reconciliation](../location-resolver/address-reconciliation.md).
