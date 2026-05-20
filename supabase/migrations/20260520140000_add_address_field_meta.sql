-- Add address_field_meta JSONB column to media_items for per-field verification metadata.
-- Stores source, verified flag, and suppressReconciliationPrompt per address component.
-- @see docs/specs/service/address-field-suggest/address-field-suggest.md#data-model--verification-metadata
-- @see docs/specs/service/location-resolver/address-reconciliation.md

ALTER TABLE media_items
  ADD COLUMN IF NOT EXISTS address_field_meta JSONB DEFAULT NULL;

-- No constraint on shape: TypeScript layer owns schema via AddressFieldMeta type.
-- RLS unchanged: existing org-scoped policies cover this column automatically.

COMMENT ON COLUMN media_items.address_field_meta IS
  'Per-field address verification metadata. Shape: { street?, city?, district?, country? } '
  'each with { source, verified, suppressReconciliationPrompt? }. '
  'See apps/web/src/app/core/address-field-suggest/address-field-suggest.types.ts.';
