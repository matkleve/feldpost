import type { GeocodingService } from '../../geocoding/geocoding.service';
import type { SupabaseService } from '../../supabase/supabase.service';
import { deriveAddressPrecisionFromReverse } from './upload-address-precision.helpers';
import type { UploadAddressPersistContext } from './upload-address-persist-context.helpers';

type PersistErrorDescriptor = (error: unknown) => {
  code: string | null;
  status: number | null;
  message: string;
  details: string | null;
  hint: string | null;
  bodySnippet: string | null;
};

export async function resolveUploadAddress(args: {
  mediaItemId: string;
  lat: number;
  lng: number;
  geocoding: GeocodingService;
  supabaseClient: SupabaseService['client'];
  describePersistError: PersistErrorDescriptor;
  /** When set, persist text-derived fields and skip reverse geocode (NF-40). */
  addressContext?: UploadAddressPersistContext | null;
}): Promise<void> {
  const {
    mediaItemId,
    lat,
    lng,
    geocoding,
    supabaseClient,
    describePersistError,
    addressContext,
  } = args;

  if (addressContext?.hasEstablishedTextAddress) {
    await persistTextDerivedUploadAddress({
      mediaItemId,
      lat,
      lng,
      supabaseClient,
      describePersistError,
      addressContext,
    });
    return;
  }

  try {
    const result = await geocoding.reverse(lat, lng);
    if (!result) {
      await markUploadLocationUnresolvable(mediaItemId, supabaseClient, describePersistError);
      return;
    }

    const precision = deriveAddressPrecisionFromReverse(result);
    const { error } = await supabaseClient.rpc('resolve_media_location', {
      p_media_item_id: mediaItemId,
      p_latitude: lat,
      p_longitude: lng,
      p_address_label: result.addressLabel,
      p_city: result.city,
      p_district: result.district,
      p_street: result.street,
      p_house_number: result.streetNumber,
      p_postcode: result.zip,
      p_country: result.country,
      p_address_precision: precision,
    });

    if (error) {
      console.error('Failed to persist address for media item', mediaItemId, {
        mediaItemId,
        ...describePersistError(error),
      });
      await markUploadLocationUnresolvable(mediaItemId, supabaseClient, describePersistError);
    }
  } catch (error) {
    await markUploadLocationUnresolvable(mediaItemId, supabaseClient, describePersistError);
    console.warn('Upload address resolution ended as unresolvable for media item', mediaItemId, {
      mediaItemId,
      ...describePersistError(error),
    });
  }
}

async function persistTextDerivedUploadAddress(args: {
  mediaItemId: string;
  lat: number;
  lng: number;
  supabaseClient: SupabaseService['client'];
  describePersistError: PersistErrorDescriptor;
  addressContext: UploadAddressPersistContext;
}): Promise<void> {
  const { mediaItemId, lat, lng, supabaseClient, describePersistError, addressContext } = args;
  const { fields, precision, addressLabel } = addressContext;

  const { error } = await supabaseClient.rpc('resolve_media_location', {
    p_media_item_id: mediaItemId,
    p_latitude: lat,
    p_longitude: lng,
    p_address_label: addressLabel,
    p_city: fields.city,
    p_street: fields.street,
    p_house_number: fields.houseNumber,
    p_postcode: fields.postcode,
    p_country: fields.country,
    p_address_precision: precision,
  });

  if (error) {
    console.error('Failed to persist text-derived address for media item', mediaItemId, {
      mediaItemId,
      ...describePersistError(error),
    });
  }
}

async function markUploadLocationUnresolvable(
  mediaItemId: string,
  supabaseClient: SupabaseService['client'],
  describePersistError: PersistErrorDescriptor,
): Promise<void> {
  const { error } = await supabaseClient.rpc('resolve_media_location', {
    p_media_item_id: mediaItemId,
    p_location_status: 'unresolvable',
  });

  if (error) {
    console.error('Failed to mark media item as unresolvable', mediaItemId, {
      mediaItemId,
      ...describePersistError(error),
    });
  }
}
