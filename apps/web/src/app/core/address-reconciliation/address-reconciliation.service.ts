/**
 * AddressReconciliationService — checks unverified address fields and offers
 * a forward-geocode based correction to the user without silent overwriting.
 *
 * Triggered on media detail open and by the per-row "Resolve address" button.
 * @see docs/specs/service/location-resolver/address-reconciliation.md
 */

import { Injectable, inject } from '@angular/core';
import { GeocodingService } from '../geocoding/geocoding.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AddressFieldSuggestService } from '../address-field-suggest/address-field-suggest.service';
import type {
  ReconciliationInput,
  ReconciliationOffer,
  ReconciliationFieldOffer,
  ReconciliationDecision,
  AddressFieldKind,
} from './address-reconciliation.types';
import {
  RECONCILIATION_CONFIDENCE_HIGH,
  RECONCILIATION_CONFIDENCE_MEDIUM,
  RECONCILIATION_MIN_MATCH_MEDIUM,
} from './address-reconciliation.types';
import type { AddressFieldMeta, AddressFieldVerification } from '../address-field-suggest/address-field-suggest.types';
import type { ForwardGeocodeResult } from '../geocoding/geocoding.service';
import { ISO_COUNTRY_BY_CODE, isoCodeFromCountryName } from '../address-field-suggest/data/iso-countries';
import { isMissingAddressFieldMetaColumn } from '../media-detail-data/media-detail-data.helpers';

const ADDRESS_FIELDS: readonly AddressFieldKind[] = ['street', 'city', 'district', 'country'];

@Injectable({ providedIn: 'root' })
export class AddressReconciliationService {
  private readonly geocodingService = inject(GeocodingService);
  private readonly supabase = inject(SupabaseService);
  private readonly addressFieldSuggest = inject(AddressFieldSuggestService);

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Check all address fields for unverified values and attempt forward geocode.
   * Returns null when all verified, no candidate found, or confidence below threshold.
   * Never throws.
   */
  async reconcileOnDetailOpen(mediaItem: ReconciliationInput): Promise<ReconciliationOffer | null> {
    if (!this.hasEligibleFields(mediaItem)) return null;
    const assembled = this.assembleQuery(mediaItem);
    if (!assembled) return null;

    try {
      const result = await this.geocodingService.forward(assembled);
      if (!result) return null;
      return this.buildOffer(mediaItem, result);
    } catch {
      return null;
    }
  }

  /**
   * Attempt field-scoped resolution using sibling context.
   * Returns null when no confident candidate found. Never throws.
   */
  async reconcileField(
    mediaItem: ReconciliationInput,
    field: AddressFieldKind,
  ): Promise<ReconciliationOffer | null> {
    // Check if this specific field is eligible (unverified or no meta)
    const meta = mediaItem.address_field_meta;
    const fieldMeta = meta?.[field];
    if (fieldMeta?.suppressReconciliationPrompt) return null;

    if (field === 'country') {
      const localOffer = this.tryLocalCountryOffer(mediaItem);
      if (localOffer) return localOffer;
    }

    const assembled = this.assembleQuery(mediaItem);
    if (!assembled) return null;

    try {
      const result = await this.geocodingService.forward(assembled);
      if (!result) return null;
      return this.buildOffer(mediaItem, result, field);
    } catch {
      return null;
    }
  }

  /**
   * Persist the user's decision: apply values, suppress future prompts, or retry.
   * On retry: re-runs reconcileOnDetailOpen with relaxed importance threshold.
   */
  async applyOffer(
    mediaItemId: string,
    offer: ReconciliationOffer,
    decision: ReconciliationDecision,
  ): Promise<ReconciliationOffer | null> {
    if (decision === 'apply') {
      await this.persistApply(mediaItemId, offer);
      return null;
    }

    if (decision === 'suppress') {
      await this.persistSuppress(mediaItemId, offer);
      return null;
    }

    // retry: re-query without importance threshold (handled by caller re-calling reconcileOnDetailOpen)
    return null;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Return true if any address field is unverified and not suppressed.
   */
  private hasEligibleFields(item: ReconciliationInput): boolean {
    const meta = item.address_field_meta;

    for (const field of ADDRESS_FIELDS) {
      const value = item[field];
      if (!value) continue; // no value → nothing to reconcile

      const fieldMeta = meta?.[field];
      if (fieldMeta?.suppressReconciliationPrompt) continue;
      if (!fieldMeta) return true; // legacy record: assume unverified
      if (!fieldMeta.verified) return true;
    }
    return false;
  }

  /**
   * Assemble a forward geocode query from non-null address fields.
   * Returns null when no fields are present.
   */
  private assembleQuery(item: ReconciliationInput): string | null {
    const parts = [item.street, item.city, item.district, item.country].filter(Boolean);
    if (parts.length === 0) return null;
    return parts.join(', ');
  }

  /**
   * Build a ReconciliationOffer from a forward geocode result.
   * Returns null when confidence is below threshold.
   * When focusField is provided, only that field's offer is considered for threshold.
   */
  private buildOffer(
    item: ReconciliationInput,
    result: ForwardGeocodeResult,
    focusField?: AddressFieldKind,
  ): ReconciliationOffer | null {
    const fieldOffers: ReconciliationFieldOffer[] = [];

    const suggested: Record<AddressFieldKind, string | null> = {
      street: result.street,
      city: result.city,
      district: result.district,
      country: result.country,
    };

    for (const field of ADDRESS_FIELDS) {
      const current = item[field] ?? null;
      const suggestion = suggested[field];
      if (!suggestion) continue;

      const changed = !fieldValuesMatch(field, current, suggestion);

      fieldOffers.push({ field, currentValue: current, suggestedValue: suggestion, changed });
    }

    if (fieldOffers.length === 0) return null;

    // Count how many existing non-null fields match the geocoder result
    let matchingFields = 0;
    for (const field of ADDRESS_FIELDS) {
      const current = item[field];
      if (!current) continue;
      const suggestion = suggested[field];
      if (!suggestion) continue;
      if (fieldValuesMatch(field, current, suggestion)) matchingFields++;
    }

    // Confidence scoring
    // ForwardGeocodeResult doesn't carry importance — use a heuristic:
    // high = all non-null fields matched, medium = >= 2 fields matched
    const nonNullFields = ADDRESS_FIELDS.filter((f) => item[f]).length;
    const allMatch = nonNullFields > 0 && matchingFields === nonNullFields;
    let confidence: 'high' | 'medium' | null = null;

    if (allMatch && nonNullFields >= 1) {
      confidence = 'high';
    } else if (matchingFields >= RECONCILIATION_MIN_MATCH_MEDIUM) {
      confidence = 'medium';
    }

    // For focused single-field reconcile, we're more lenient — any result is medium
    if (!confidence && focusField) {
      confidence = 'medium';
    }

    if (!confidence) return null;

    const changedFields = fieldOffers.filter((f) => f.changed);
    const verificationOnly = changedFields.length === 0 && matchingFields > 0;
    if (changedFields.length === 0 && !verificationOnly) return null;

    return {
      mediaItemId: item.id,
      fields: fieldOffers,
      confidence,
      candidateLabel: result.addressLabel,
      verificationOnly,
    };
  }

  /**
   * Country values that match the static ISO list can be verified without Nominatim.
   */
  private tryLocalCountryOffer(item: ReconciliationInput): ReconciliationOffer | null {
    const current = item.country?.trim();
    if (!current) return null;

    const code = isoCodeFromCountryName(current);
    if (!code) return null;

    const canonical = ISO_COUNTRY_BY_CODE[code]?.name;
    if (!canonical) return null;

    const changed = normalizeForCompare(current) !== normalizeForCompare(canonical);

    return {
      mediaItemId: item.id,
      fields: [
        {
          field: 'country',
          currentValue: current,
          suggestedValue: canonical,
          changed,
        },
      ],
      confidence: 'high',
      candidateLabel: canonical,
      verificationOnly: !changed,
    };
  }

  private async persistApply(mediaItemId: string, offer: ReconciliationOffer): Promise<void> {
    const updates: Record<string, string> = {};

    const existingMeta = await this.loadAddressFieldMeta(mediaItemId);
    const metaUpdates: AddressFieldMeta = { ...existingMeta };

    for (const fieldOffer of offer.fields) {
      if (fieldOffer.changed) {
        updates[fieldOffer.field] = fieldOffer.suggestedValue;
      }
      metaUpdates[fieldOffer.field] = { source: 'geocoder', verified: true };
    }

    const payload: Record<string, unknown> = { ...updates };
    if (await this.canPersistAddressFieldMeta(mediaItemId)) {
      payload['address_field_meta'] = metaUpdates;
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    await this.supabase.client
      .from('media_items')
      .update(payload)
      .or(`id.eq.${mediaItemId},source_image_id.eq.${mediaItemId}`);
  }

  private async canPersistAddressFieldMeta(mediaItemId: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('media_items')
      .select('address_field_meta')
      .eq('id', mediaItemId)
      .limit(1);

    return !error || !isMissingAddressFieldMetaColumn(error.message);
  }

  private async loadAddressFieldMeta(mediaItemId: string): Promise<AddressFieldMeta> {
    const { data, error } = await this.supabase.client
      .from('media_items')
      .select('address_field_meta')
      .eq('id', mediaItemId)
      .maybeSingle();

    if (error && isMissingAddressFieldMetaColumn(error.message)) {
      return {};
    }

    return (data as { address_field_meta?: AddressFieldMeta } | null)?.address_field_meta ?? {};
  }

  private async persistSuppress(mediaItemId: string, offer: ReconciliationOffer): Promise<void> {
    if (!(await this.canPersistAddressFieldMeta(mediaItemId))) {
      return;
    }

    const existingMeta = await this.loadAddressFieldMeta(mediaItemId);
    const metaUpdates: AddressFieldMeta = { ...existingMeta };

    for (const fieldOffer of offer.fields) {
      const existing = metaUpdates[fieldOffer.field] ?? { source: 'user' as const, verified: false };
      metaUpdates[fieldOffer.field] = { ...existing, suppressReconciliationPrompt: true };
    }

    await this.supabase.client
      .from('media_items')
      .update({ address_field_meta: metaUpdates })
      .or(`id.eq.${mediaItemId},source_image_id.eq.${mediaItemId}`);
  }
}

function normalizeForCompare(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function fieldValuesMatch(
  field: AddressFieldKind,
  current: string | null | undefined,
  suggestion: string | null | undefined,
): boolean {
  if (!current || !suggestion) return false;
  if (normalizeForCompare(current) === normalizeForCompare(suggestion)) return true;
  if (field === 'country') {
    const codeA = isoCodeFromCountryName(current);
    const codeB = isoCodeFromCountryName(suggestion);
    return !!codeA && codeA === codeB;
  }
  return false;
}
