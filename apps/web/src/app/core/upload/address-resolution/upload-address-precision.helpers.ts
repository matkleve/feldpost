/**
 * Address precision tier vocabulary — mirrors Search Object `groupingKey` decomposition.
 * @see docs/specs/service/media-upload-service/address-resolution-model.md § Address precision principle
 */

import type {
  ForwardGeocodeResult,
  ReverseGeocodeResult,
} from '../../geocoding/geocoding.service';
import type { UploadAddressCandidate } from '../upload-manager.types';
import type { UploadSearchObject } from './upload-address-resolution.types';

/** Highest established tier in groupingKey order: country → state → postcode → city → street → houseNumber. */
export type AddressPrecisionTier =
  | 'country'
  | 'state'
  | 'postcode'
  | 'city'
  | 'street'
  | 'houseNumber';

export const ADDRESS_PRECISION_TIERS: readonly AddressPrecisionTier[] = [
  'country',
  'state',
  'postcode',
  'city',
  'street',
  'houseNumber',
] as const;

const TIER_FIELD_MAP: Record<
  AddressPrecisionTier,
  keyof Pick<
    UploadSearchObject,
    'country' | 'state' | 'postcode' | 'city' | 'street' | 'houseNumber'
  >
> = {
  country: 'country',
  state: 'state',
  postcode: 'postcode',
  city: 'city',
  street: 'street',
  houseNumber: 'houseNumber',
};

export type AddressPrecisionFields = Pick<
  UploadSearchObject,
  'country' | 'state' | 'postcode' | 'city' | 'street' | 'houseNumber'
>;

/** Derive the highest precision tier established on a Search Object (or partial). */
export function deriveAddressPrecisionFromFields(
  fields: Partial<AddressPrecisionFields>,
): AddressPrecisionTier | null {
  for (let i = ADDRESS_PRECISION_TIERS.length - 1; i >= 0; i -= 1) {
    const tier = ADDRESS_PRECISION_TIERS[i];
    const key = TIER_FIELD_MAP[tier];
    if (fields[key]?.trim()) {
      return tier;
    }
  }
  return null;
}

/** Parse groupingKey segments back into field slots (normalized lowercase values). */
export function parseGroupingKeyFields(groupingKey: string): AddressPrecisionFields {
  const [country = '', state = '', postcode = '', city = '', street = '', houseNumber = ''] =
    groupingKey.split('|');
  return {
    country: country || null,
    state: state || null,
    postcode: postcode || null,
    city: city || null,
    street: street || null,
    houseNumber: houseNumber || null,
  };
}

/** Derive precision from reverse-geocode enrichment (coordinates-only path). */
export function deriveAddressPrecisionFromReverse(
  result: ReverseGeocodeResult,
): AddressPrecisionTier {
  if (result.streetNumber?.trim()) {
    return 'houseNumber';
  }
  if (result.street?.trim()) {
    return 'street';
  }
  if (result.city?.trim()) {
    return 'city';
  }
  if (result.zip?.trim()) {
    return 'postcode';
  }
  if (result.country?.trim()) {
    return 'country';
  }
  return 'country';
}

/** Forward-geocode / suggestion persist — highest tier established on geocoder fields. */
export function deriveAddressPrecisionFromForwardResult(
  result: Pick<
    ForwardGeocodeResult,
    'city' | 'street' | 'streetNumber' | 'zip' | 'country'
  >,
): AddressPrecisionTier | null {
  return deriveAddressPrecisionFromFields({
    country: result.country,
    state: null,
    postcode: result.zip,
    city: result.city,
    street: result.street,
    houseNumber: result.streetNumber,
  });
}

/** Tray / Issues candidate pick — structured fields only (not addressLabel parsing). */
export function deriveAddressPrecisionFromCandidate(
  candidate: Pick<UploadAddressCandidate, 'city' | 'state' | 'postcode'>,
): AddressPrecisionTier | null {
  return deriveAddressPrecisionFromFields({
    country: null,
    state: candidate.state ?? null,
    postcode: candidate.postcode ?? null,
    city: candidate.city ?? null,
    street: null,
    houseNumber: null,
  });
}

/**
 * Map pin without explicit address — coords are exact but address must not
 * claim houseNumber from opportunistic reverse geocode.
 */
export function deriveAddressPrecisionFromPinReverse(
  result: ReverseGeocodeResult,
): AddressPrecisionTier | null {
  const tier = deriveAddressPrecisionFromReverse(result);
  if (tier === 'houseNumber') {
    return 'street';
  }
  return tier;
}

export function geocodeResultToPrecisionFields(
  result: Pick<
    ForwardGeocodeResult,
    'city' | 'street' | 'streetNumber' | 'zip' | 'country'
  >,
): AddressPrecisionFields {
  return {
    country: result.country,
    state: null,
    postcode: result.zip,
    city: result.city,
    street: result.street,
    houseNumber: result.streetNumber,
  };
}

/** Zero out address fields more precise than the established tier. */
export function capFieldsToPrecisionTier<T extends AddressPrecisionFields>(
  fields: T,
  precision: AddressPrecisionTier,
): T {
  const capIndex = ADDRESS_PRECISION_TIERS.indexOf(precision);
  const capped = { ...fields };
  for (let i = capIndex + 1; i < ADDRESS_PRECISION_TIERS.length; i += 1) {
    const key = TIER_FIELD_MAP[ADDRESS_PRECISION_TIERS[i]];
    capped[key] = null;
  }
  return capped;
}
