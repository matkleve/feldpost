import { describe, expect, it } from 'vitest';
import {
  draftExclusionKey,
  propertyExclusionKey,
  validateMetadataValueForSave,
} from './metadata-validation.helpers';

describe('metadata-validation.helpers', () => {
  it('builds canonical exclusion keys', () => {
    expect(propertyExclusionKey('abc')).toBe('id:abc');
    expect(draftExclusionKey('number', 'Floor')).toBe('def:number|floor');
  });

  it('validates number at save time', () => {
    expect(validateMetadataValueForSave('number', '12.5').valid).toBe(true);
    expect(validateMetadataValueForSave('number', 'nope').valid).toBe(false);
  });

  it('validates date at save time', () => {
    expect(validateMetadataValueForSave('date', '2025-06-01').valid).toBe(true);
    expect(validateMetadataValueForSave('date', '06-01-2025').valid).toBe(false);
  });
});
