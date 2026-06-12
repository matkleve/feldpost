/**
 * Types for the address reconciliation service.
 * @see docs/specs/service/location-resolver/address-reconciliation.md
 */

import type { AddressFieldKind, AddressFieldMeta } from '../address-field-suggest/address-field-suggest.types';

export type { AddressFieldKind };

export interface ReconciliationInput {
  id: string;
  street?: string | null;
  city?: string | null;
  district?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address_field_meta?: AddressFieldMeta | null;
}

export interface ReconciliationFieldOffer {
  field: AddressFieldKind;
  currentValue: string | null;
  suggestedValue: string;
  /** Whether suggestedValue differs from currentValue. */
  changed: boolean;
}

export interface ReconciliationOffer {
  mediaItemId: string;
  /** Fields that have a suggested value (may include unchanged ones for context). */
  fields: ReconciliationFieldOffer[];
  confidence: 'high' | 'medium';
  /** Human-readable assembled address shown in the prompt. */
  candidateLabel: string;
  /**
   * True when geocoder values match what is stored — Apply only marks fields verified,
   * without changing column values.
   */
  verificationOnly?: boolean;
}

export type ReconciliationDecision = 'apply' | 'suppress' | 'retry';

/** Minimum Nominatim importance score for medium confidence. */
export const RECONCILIATION_CONFIDENCE_MEDIUM = 0.35;

/** Minimum Nominatim importance score for high confidence. */
export const RECONCILIATION_CONFIDENCE_HIGH = 0.6;

/** Minimum non-null fields that must match for medium confidence. */
export const RECONCILIATION_MIN_MATCH_MEDIUM = 2;
