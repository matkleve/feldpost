import type { SupabaseClient } from '@supabase/supabase-js';
import { displayLocationFromRows, legacyMediaHasGps } from './media-locations.helpers';
import type { MediaItemLocationRow } from './media-locations.types';

type LinkLocationRow = {
  media_item_id: string;
  sort_order: number;
  locations: MediaItemLocationRow | MediaItemLocationRow[] | null;
};

export interface MediaLocationSummaryMaps {
  zoomableCountByMediaId: Map<string, number>;
  displayLocationByMediaId: Map<string, MediaItemLocationRow>;
}

const LOCATION_LINK_SELECT =
  'media_item_id, sort_order, locations(id, street, house_number, staircase, door, floor, postcode, extra_information, city, district, country, latitude, longitude, address_label, organization_id, staircase_sort_key, door_sort_key, created_at, updated_at)';

/**
 * One pass over links: zoomable count + first-row display location per media.
 * @see docs/specs/service/media-locations/media-locations-service.md
 */
export async function loadLocationSummaryByMediaIds(
  client: SupabaseClient,
  mediaItemIds: string[],
  chunkSize = 200,
): Promise<MediaLocationSummaryMaps> {
  const zoomableCountByMediaId = new Map<string, number>();
  const displayLocationByMediaId = new Map<string, MediaItemLocationRow>();

  if (mediaItemIds.length === 0) {
    return { zoomableCountByMediaId, displayLocationByMediaId };
  }

  const byMedia = new Map<string, MediaItemLocationRow[]>();

  for (let i = 0; i < mediaItemIds.length; i += chunkSize) {
    const chunk = mediaItemIds.slice(i, i + chunkSize);
    const { data, error } = await client
      .from('media_item_location_links')
      .select(LOCATION_LINK_SELECT)
      .in('media_item_id', chunk)
      .order('sort_order', { ascending: true });

    if (error || !Array.isArray(data)) {
      continue;
    }

    for (const row of data as LinkLocationRow[]) {
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
      });
      byMedia.set(row.media_item_id, bucket);
    }
  }

  for (const [mediaId, rows] of byMedia) {
    let zoomable = 0;
    for (const row of rows) {
      if (legacyMediaHasGps(row.latitude, row.longitude)) {
        zoomable += 1;
      }
    }
    zoomableCountByMediaId.set(mediaId, zoomable);

    const display = displayLocationFromRows(rows);
    if (display) {
      displayLocationByMediaId.set(mediaId, display);
    }
  }

  return { zoomableCountByMediaId, displayLocationByMediaId };
}

/** Display location per media (first link by sort_order). Prefer `loadLocationSummaryByMediaIds` when counts are needed too. */
export async function loadDisplayLocationsByMediaIds(
  client: SupabaseClient,
  mediaItemIds: string[],
  chunkSize = 200,
): Promise<Map<string, MediaItemLocationRow>> {
  const { displayLocationByMediaId } = await loadLocationSummaryByMediaIds(
    client,
    mediaItemIds,
    chunkSize,
  );
  return displayLocationByMediaId;
}
