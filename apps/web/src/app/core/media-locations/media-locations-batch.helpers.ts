import type { SupabaseClient } from '@supabase/supabase-js';
import { primaryLocationFromRows } from './media-locations.helpers';
import type { MediaItemLocationRow } from './media-locations.types';

type LinkLocationRow = {
  media_item_id: string;
  sort_order: number;
  locations: MediaItemLocationRow | MediaItemLocationRow[] | null;
};

/** Batch-load first linked location per media item (for workspace/detail enrichment). */
export async function loadPrimaryLocationsByMediaIds(
  client: SupabaseClient,
  mediaItemIds: string[],
  chunkSize = 200,
): Promise<Map<string, MediaItemLocationRow>> {
  const result = new Map<string, MediaItemLocationRow>();
  if (mediaItemIds.length === 0) {
    return result;
  }

  const accum: LinkLocationRow[] = [];
  for (let i = 0; i < mediaItemIds.length; i += chunkSize) {
    const chunk = mediaItemIds.slice(i, i + chunkSize);
    const { data, error } = await client
      .from('media_item_location_links')
      .select(
        'media_item_id, sort_order, locations(id, street, house_number, staircase, door, floor, postcode, extra_information, city, district, country, latitude, longitude, address_label, organization_id, staircase_sort_key, door_sort_key, created_at, updated_at)',
      )
      .in('media_item_id', chunk)
      .order('sort_order', { ascending: true });

    if (error || !Array.isArray(data)) {
      continue;
    }
    accum.push(...(data as LinkLocationRow[]));
  }

  const byMedia = new Map<string, MediaItemLocationRow[]>();
  for (const row of accum) {
    const locRaw = row.locations;
    const loc = Array.isArray(locRaw) ? locRaw[0] : locRaw;
    if (!loc) {
      continue;
    }
    const bucket = byMedia.get(row.media_item_id) ?? [];
    bucket.push({
      ...loc,
      media_item_id: row.media_item_id,
      sort_order: row.sort_order,
      link_id: undefined,
      is_primary: false,
    });
    byMedia.set(row.media_item_id, bucket);
  }

  for (const [mediaId, rows] of byMedia) {
    const primary = primaryLocationFromRows(rows);
    if (primary) {
      result.set(mediaId, primary);
    }
  }

  return result;
}
