import { describe, expect, it } from 'vitest';
import { isMissingAddressFieldMetaColumn } from './media-detail-data.helpers';

describe('isMissingAddressFieldMetaColumn', () => {
  it('detects PostgREST missing column message', () => {
    expect(
      isMissingAddressFieldMetaColumn('column media_items.address_field_meta does not exist'),
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isMissingAddressFieldMetaColumn('permission denied')).toBe(false);
  });
});
