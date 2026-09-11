import { describe, expect, it } from 'vitest';
import {
  capFieldsToPrecisionTier,
  deriveAddressPrecisionFromFields,
  parseGroupingKeyFields,
} from './upload-address-precision.helpers';

describe('upload-address-precision.helpers', () => {
  it('derives city precision from city-only fields', () => {
    expect(deriveAddressPrecisionFromFields({ city: 'Vienna', country: 'AT' })).toBe('city');
  });

  it('derives houseNumber as highest tier', () => {
    expect(
      deriveAddressPrecisionFromFields({
        street: 'Street Name',
        houseNumber: '5',
      }),
    ).toBe('houseNumber');
  });

  it('caps fields below established precision', () => {
    const capped = capFieldsToPrecisionTier(
      {
        country: 'AT',
        state: null,
        postcode: null,
        city: 'Vienna',
        street: 'Fabricated',
        houseNumber: '1',
      },
      'city',
    );
    expect(capped.city).toBe('Vienna');
    expect(capped.street).toBeNull();
    expect(capped.houseNumber).toBeNull();
  });

  it('parses groupingKey segments', () => {
    expect(parseGroupingKeyFields('at|wien||wien||')).toEqual({
      country: 'at',
      state: 'wien',
      postcode: null,
      city: 'wien',
      street: null,
      houseNumber: null,
    });
  });
});
