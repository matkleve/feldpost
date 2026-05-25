import type { SupabaseClient } from '@supabase/supabase-js';
import { countZoomableLinks, displayLocationFromRows } from './media-locations.helpers';
import type { MediaItemLocationRow } from './media-locations.types';

type LinkLocationRow = {
  /** Junction row id (`media_item_location_links.id`). */
  id: string;
  media_item_id: string;
  sort_order: number;
  locations: MediaItemLocationRow | MediaItemLocationRow[] | null;
};

export interface MediaLocationSummaryMaps {
  zoomableCountByMediaId: Map<string, number>;
  displayLocationByMediaId: Map<string, MediaItemLocationRow>;
  rowsByMediaId: Map<string, MediaItemLocationRow[]>;
}

const LOCATION_LINK_SELECT =
  'id, media_item_id, sort_order, locations(id, street, house_number, staircase, door, floor, postcode, extra_information, city, district, country, latitude, longitude, address_label, organization_id, staircase_sort_key, door_sort_key, created_at, updated_at)';

/** Clone row objects for cache/export (batch return layer — see also `seedListCache`). */
export function cloneLocationRowsForCache(
  rows: readonly MediaItemLocationRow[],
): MediaItemLocationRow[] {
  return rows.map((row) => ({ ...row }));
}

function buildRowsByMediaIdSnapshot(
  byMedia: Map<string, MediaItemLocationRow[]>,
): Map<string, MediaItemLocationRow[]> {
  const rowsByMediaId = new Map<string, MediaItemLocationRow[]>();
  for (const [mediaId, rows] of byMedia) {
    rowsByMediaId.set(mediaId, cloneLocationRowsForCache(rows));
  }
  return rowsByMediaId;
}

/**
 * One pass over links: zoomable count + first-row display location + full row list per media.
 * @see docs/specs/service/media-locations/media-locations-service.md
 */
export async function loadLocationSummaryByMediaIds(
  client: SupabaseClient,
  mediaItemIds: string[],
  chunkSize = 200,
): Promise<MediaLocationSummaryMaps> {
  const zoomableCountByMediaId = new Map<string, number>();
  const displayLocationByMediaId = new Map<string, MediaItemLocationRow>();
  const rowsByMediaId = new Map<string, MediaItemLocationRow[]>();

  if (mediaItemIds.length === 0) {
    return { zoomableCountByMediaId, displayLocationByMediaId, rowsByMediaId };
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
        id: loc.id,
        link_id: row.id,
        media_item_id: row.media_item_id,
        sort_order: row.sort_order,
      });
      byMedia.set(row.media_item_id, bucket);
    }
  }

  const snapshot = buildRowsByMediaIdSnapshot(byMedia);

  for (const [mediaId, rows] of snapshot) {
    rowsByMediaId.set(mediaId, rows);

    zoomableCountByMediaId.set(mediaId, countZoomableLinks(rows));

    const display = displayLocationFromRows(rows);
    if (display) {
      displayLocationByMediaId.set(mediaId, { ...display });
    }
  }

  return { zoomableCountByMediaId, displayLocationByMediaId, rowsByMediaId };
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
