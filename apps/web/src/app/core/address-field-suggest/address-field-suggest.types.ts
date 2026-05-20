// @see docs/specs/service/address-field-suggest/address-field-suggest.md

/** The four hierarchical address components. */
export type AddressFieldKind = 'country' | 'city' | 'district' | 'street';

/** Sibling field values and GPS coordinates available at suggestion time. */
export interface AddressFieldContext {
  country?: string | null;
  /** ISO 3166-1 alpha-2 lower-case, derived from country name via ISO list. */
  countryCode?: string | null;
  city?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  organizationId?: string | null;
}

export interface AddressFieldSuggestion {
  /** Canonical display value to write to the DB column. */
  value: string;
  /** Secondary line, e.g. "Vienna, Austria" for a street result. */
  subtitle?: string;
  source: 'org-db' | 'geocoder';
  /** 0..1 relevance score used for intra-tier ranking. */
  score: number;
  /** Populated only for country-level results. */
  countryCode?: string;
}

export interface CountrySuggestion {
  /** Canonical English country name. */
  name: string;
  /** ISO 3166-1 alpha-2 lower-case. */
  code: string;
}

// ── Verification metadata stored in media_items.address_field_meta ────────────

export type AddressFieldSource = 'user' | 'geocoder' | 'parser' | 'address-search';

export interface AddressFieldVerification {
  source: AddressFieldSource;
  verified: boolean;
  /** Set true when user chose "Don't ask again" for this field. */
  suppressReconciliationPrompt?: boolean;
}

export interface AddressFieldMeta {
  street?: AddressFieldVerification;
  city?: AddressFieldVerification;
  district?: AddressFieldVerification;
  country?: AddressFieldVerification;
}
