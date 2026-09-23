import { describe, expect, it } from 'vitest';
import {
  isMissingAddressFieldMetaColumn,
  isMissingMediaDetailColumn,
  isMissingUploadMetadataColumn,
} from './media-detail-data.helpers';

describe('media-detail-data.helpers', () => {
  it('detects missing address_field_meta column', () => {
    expect(
      isMissingAddressFieldMetaColumn('column media_items.address_field_meta does not exist'),
    ).toBe(true);
  });

  it('detects missing address_notes column', () => {
    expect(
      isMissingUploadMetadataColumn('column media_items.address_notes does not exist'),
    ).toBe(true);
  });

  it('treats upload-metadata missing column as retryable detail select error', () => {
    expect(
      isMissingMediaDetailColumn('column media_items.address_notes does not exist'),
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isMissingMediaDetailColumn('permission denied')).toBe(false);
  });
});
