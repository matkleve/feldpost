/**
 * Org-DB adapter: queries media_items for distinct address field values
 * scoped to the current organization. Results surface before geocoder results.
 * @see docs/specs/service/address-field-suggest/adapters/org-field-suggest.adapter.md
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AddressFieldKind, AddressFieldContext, AddressFieldSuggestion } from '../address-field-suggest.types';
import { computeTextMatchScore } from '../../search/search-query';
import { normalizeForDedup } from '../address-field-suggest.helpers';

/** Map field kind to DB column name. */
const FIELD_COLUMN: Record<Exclude<AddressFieldKind, 'country'>, string> = {
  city: 'city',
  district: 'district',
  street: 'street',
};

/** Maximum org-DB results per field query. */
const ORG_DB_LIMIT = 8;
const ORG_DB_MAX_RESULTS = 5;
const MIN_ORG_DB_SCORE = 0.1;

/**
 * Query the org's media_items for distinct non-null values for the given address field.
 * Returns [] for country queries (handled by static ISO list).
 * Returns [] when organizationId is absent or on Supabase error.
 */
export async function fetchOrgFieldSuggestions(
  field: AddressFieldKind,
  query: string,
  context: AddressFieldContext,
  supabase: SupabaseClient,
): Promise<AddressFieldSuggestion[]> {
  if (field === 'country') return [];
  if (!context.organizationId) return [];

  const column = FIELD_COLUMN[field as Exclude<AddressFieldKind, 'country'>];
  if (!column) return [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase as any)
      .from('media_items')
      .select(column)
      .eq('organization_id', context.organizationId)
      .ilike(column, `*${query}*`)
      .not(column, 'is', null)
      .limit(ORG_DB_LIMIT);

    // Narrow by parent city for district/street queries
    if ((field === 'district' || field === 'street') && context.city) {
      q = q.eq('city', context.city);
    }

    const { data, error } = await q;
    if (error || !Array.isArray(data)) return [];

    // Extract distinct values
    const seen = new Set<string>();
    const suggestions: AddressFieldSuggestion[] = [];

    for (const row of data as Record<string, string | null>[]) {
      const raw = row[column];
      if (!raw) continue;
      const key = normalizeForDedup(raw);
      if (seen.has(key)) continue;
      seen.add(key);

      const score = computeTextMatchScore(raw, query);
      if (score < MIN_ORG_DB_SCORE) continue;

      suggestions.push({ value: raw, source: 'org-db', score });
      if (suggestions.length >= ORG_DB_MAX_RESULTS) break;
    }

    return suggestions.sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}
