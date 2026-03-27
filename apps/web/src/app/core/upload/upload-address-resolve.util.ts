import type { GeocodingService } from '../geocoding.service';
import type { SupabaseService } from '../supabase/supabase.service';

export async function resolveUploadAddress(args: {
  mediaItemId: string;
  lat: number;
  lng: number;
  geocoding: GeocodingService;
  supabaseClient: SupabaseService['client'];
  describePersistError: (error: unknown) => {
    code: string | null;
    status: number | null;
    message: string;
    details: string | null;
    hint: string | null;
    bodySnippet: string | null;
  };
}): Promise<void> {
  const { mediaItemId, lat, lng, geocoding, supabaseClient, describePersistError } = args;
  try {
    const result = await geocoding.reverse(lat, lng);
    if (!result) return;

    const { error } = await supabaseClient.rpc('bulk_update_media_addresses', {
      p_media_item_ids: [mediaItemId],
      p_address_label: result.addressLabel,
      p_city: result.city,
      p_district: result.district,
      p_street: result.street,
      p_country: result.country,
    });

    if (error) {
      console.error('Failed to persist address for media item', mediaItemId, {
        mediaItemId,
        ...describePersistError(error),
      });
    }
  } catch {
    // Non-critical - address will show as "Unknown district" until resolved.
  }
}
