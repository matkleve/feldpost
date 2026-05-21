import type { WritableSignal } from '@angular/core';
import type {
  AddressFieldKind,
  AddressFieldMeta,
} from '../../../core/address-field-suggest/address-field-suggest.types';
import type { ForwardGeocodeResult } from '../../../core/geocoding/geocoding.service';
import type { SupabaseService } from '../../../core/supabase/supabase.service';
import type { ToastService } from '../../../core/toast/toast.service';
import type { DateSaveEvent } from './captured-date-editor.component';
import type { DetailEditingField, ImageRecord } from './media-detail-view.types';

type DetailTranslateFn = (key: string, fallback: string) => string;

export interface AddressFieldSnapshot {
  street: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  address_label: string | null;
}

export const EMPTY_ADDRESS_SUGGESTION: ForwardGeocodeResult = {
  lat: 0,
  lng: 0,
  addressLabel: '',
  city: null,
  district: null,
  street: null,
  streetNumber: null,
  zip: null,
  country: null,
};

function verifiedMetaFromGeocodeSuggestion(suggestion: ForwardGeocodeResult): AddressFieldMeta {
  const meta: AddressFieldMeta = {};
  const pairs: [AddressFieldKind, string | null][] = [
    ['street', suggestion.street],
    ['city', suggestion.city],
    ['district', suggestion.district],
    ['country', suggestion.country],
  ];
  for (const [field, value] of pairs) {
    if (value) meta[field] = { source: 'address-search', verified: true };
  }
  return meta;
}

export function snapshotAddressFields(img: ImageRecord): AddressFieldSnapshot {
  return {
    street: img.street,
    city: img.city,
    district: img.district,
    country: img.country,
    address_label: img.address_label,
  };
}

export function addressSnapshotToSuggestion(snapshot: AddressFieldSnapshot): ForwardGeocodeResult {
  return {
    ...EMPTY_ADDRESS_SUGGESTION,
    addressLabel: snapshot.address_label ?? '',
    street: snapshot.street,
    city: snapshot.city,
    district: snapshot.district,
    country: snapshot.country,
  };
}

interface ImageDetailFieldsHelperDeps {
  services: {
    supabase: SupabaseService;
    toastService: ToastService;
  };
  signals: {
    image: WritableSignal<ImageRecord | null>;
    editingField: WritableSignal<DetailEditingField>;
    saving: WritableSignal<boolean>;
    editDate: WritableSignal<string>;
    editTime: WritableSignal<string>;
  };
  helpers: {
    t: DetailTranslateFn;
  };
}

export class ImageDetailFieldsHelper {
  constructor(private readonly deps: ImageDetailFieldsHelperDeps) {}

  async saveImageField(field: string, newValue: string): Promise<void> {
    const img = this.deps.signals.image();
    if (!img) return;

    const oldValue = (img as unknown as Record<string, unknown>)[field] as string | null;
    if (newValue === (oldValue ?? '')) {
      this.deps.signals.editingField.set(null);
      return;
    }

    const updateValue = newValue || null;
    this.deps.signals.image.update((prev) => (prev ? { ...prev, [field]: updateValue } : prev));
    this.deps.signals.editingField.set(null);
    this.deps.signals.saving.set(true);

    const { error } = await this.deps.services.supabase.client
      .from('media_items')
      .update({ [field]: updateValue })
      .or(`id.eq.${img.id},source_image_id.eq.${img.id}`);

    if (error) {
      this.deps.signals.image.update((prev) => (prev ? { ...prev, [field]: oldValue } : prev));
    }

    this.deps.signals.saving.set(false);
  }

  openCapturedAtEditor(): void {
    const img = this.deps.signals.image();
    if (img?.captured_at) {
      const d = new Date(img.captured_at);
      this.deps.signals.editDate.set(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      );
      if (img.has_time) {
        this.deps.signals.editTime.set(
          `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        );
      } else {
        this.deps.signals.editTime.set('');
      }
    } else {
      this.deps.signals.editDate.set('');
      this.deps.signals.editTime.set('');
    }
    this.deps.signals.editingField.set('captured_at');
  }

  async saveCapturedAt(event: DateSaveEvent): Promise<void> {
    this.deps.signals.editingField.set(null);
    const img = this.deps.signals.image();
    if (!img) return;

    if (!event.date) {
      const oldCapturedAt = img.captured_at;
      const oldHasTime = img.has_time;
      this.deps.signals.image.update((prev) =>
        prev ? { ...prev, captured_at: null, has_time: false } : prev,
      );
      this.deps.signals.saving.set(true);
      const { error } = await this.deps.services.supabase.client
        .from('media_items')
        .update({ captured_at: null })
        .or(`id.eq.${img.id},source_image_id.eq.${img.id}`);
      if (error) {
        this.deps.signals.image.update((prev) =>
          prev ? { ...prev, captured_at: oldCapturedAt, has_time: oldHasTime } : prev,
        );
      }
      this.deps.signals.saving.set(false);
      return;
    }

    const hasTime = !!event.time;
    const localStr = hasTime ? `${event.date}T${event.time}:00` : `${event.date}T00:00:00`;
    const combined = new Date(localStr).toISOString();
    const oldCapturedAt = img.captured_at;
    const oldHasTime = img.has_time;

    this.deps.signals.image.update((prev) =>
      prev ? { ...prev, captured_at: combined, has_time: hasTime } : prev,
    );
    this.deps.signals.saving.set(true);

    const { error } = await this.deps.services.supabase.client
      .from('media_items')
      .update({ captured_at: combined })
      .or(`id.eq.${img.id},source_image_id.eq.${img.id}`);

    if (error) {
      this.deps.signals.image.update((prev) =>
        prev ? { ...prev, captured_at: oldCapturedAt, has_time: oldHasTime } : prev,
      );
    }

    this.deps.signals.saving.set(false);
  }

  /** Writes geocoder verification meta after resolve_media_location already saved address + coords. */
  async persistAddressFieldMetaFromGeocode(suggestion: ForwardGeocodeResult): Promise<void> {
    const img = this.deps.signals.image();
    if (!img) return;

    const addressFieldMeta = {
      ...(img.address_field_meta ?? {}),
      ...verifiedMetaFromGeocodeSuggestion(suggestion),
    };

    this.deps.signals.image.update((prev) =>
      prev ? { ...prev, address_field_meta: addressFieldMeta } : prev,
    );

    await this.deps.services.supabase.client
      .from('media_items')
      .update({ address_field_meta: addressFieldMeta })
      .or(`id.eq.${img.id},source_image_id.eq.${img.id}`);
  }

  async applyAddressSuggestion(suggestion: ForwardGeocodeResult): Promise<void> {
    const img = this.deps.signals.image();
    if (!img) return;

    const hasCoordinates = Number.isFinite(suggestion.lat) && Number.isFinite(suggestion.lng);
    const verifiedMeta = verifiedMetaFromGeocodeSuggestion(suggestion);
    const addressFieldMeta = { ...(img.address_field_meta ?? {}), ...verifiedMeta };

    this.deps.signals.image.update((prev) =>
      prev
        ? {
            ...prev,
            street: suggestion.street,
            city: suggestion.city,
            district: suggestion.district,
            country: suggestion.country,
            address_label: suggestion.addressLabel,
            address_field_meta: addressFieldMeta,
            ...(hasCoordinates
              ? {
                  latitude: suggestion.lat,
                  longitude: suggestion.lng,
                  location_unresolved: false,
                }
              : {}),
          }
        : prev,
    );

    this.deps.signals.editingField.set(null);

    const { error } = await this.deps.services.supabase.client
      .from('media_items')
      .update({
        street: suggestion.street,
        city: suggestion.city,
        district: suggestion.district,
        country: suggestion.country,
        address_label: suggestion.addressLabel,
        address_field_meta: addressFieldMeta,
        ...(hasCoordinates
          ? {
              latitude: suggestion.lat,
              longitude: suggestion.lng,
              location_status: 'resolved',
            }
          : {}),
      })
      .or(`id.eq.${img.id},source_image_id.eq.${img.id}`);

    if (error) {
      this.deps.signals.image.update((prev) =>
        prev
          ? {
              ...prev,
              street: img.street,
              city: img.city,
              district: img.district,
              country: img.country,
              address_label: img.address_label,
              address_field_meta: img.address_field_meta,
              latitude: img.latitude,
              longitude: img.longitude,
              location_unresolved: img.location_unresolved,
            }
          : prev,
      );
    }
  }

  async revertCoordinatesToExif(options?: { suppressToast?: boolean }): Promise<boolean> {
    const img = this.deps.signals.image();
    if (!img || img.exif_latitude == null || img.exif_longitude == null) return false;

    const oldLatitude = img.latitude;
    const oldLongitude = img.longitude;

    this.deps.signals.image.update((prev) =>
      prev
        ? {
            ...prev,
            latitude: img.exif_latitude,
            longitude: img.exif_longitude,
          }
        : prev,
    );

    this.deps.signals.saving.set(true);
    const { error } = await this.deps.services.supabase.client
      .from('media_items')
      .update({
        latitude: img.exif_latitude,
        longitude: img.exif_longitude,
        location_status: 'resolved',
      })
      .or(`id.eq.${img.id},source_image_id.eq.${img.id}`);

    if (error) {
      this.deps.signals.image.update((prev) =>
        prev
          ? {
              ...prev,
              latitude: oldLatitude,
              longitude: oldLongitude,
            }
          : prev,
      );
      this.deps.services.toastService.show({
        message: this.deps.helpers.t(
          'workspace.imageDetail.toast.coordinatesRevertFailed',
          'Could not revert coordinates',
        ),
        type: 'error',
      });
      this.deps.signals.saving.set(false);
      return false;
    }

    if (!options?.suppressToast) {
      this.deps.services.toastService.show({
        message: this.deps.helpers.t(
          'workspace.imageDetail.toast.coordinatesReverted',
          'Coordinates reverted to EXIF',
        ),
        type: 'success',
      });
    }

    this.deps.signals.saving.set(false);
    return true;
  }

  async clearActiveCoordinates(options?: { suppressToast?: boolean }): Promise<boolean> {
    const img = this.deps.signals.image();
    if (!img || (img.latitude == null && img.longitude == null)) {
      return false;
    }

    const hasAddressText = [img.street, img.city, img.district, img.country, img.address_label].some(
      (part) => !!part?.trim(),
    );
    const nextStatus = hasAddressText ? 'unresolved' : 'unresolvable';

    const previousLatitude = img.latitude;
    const previousLongitude = img.longitude;
    const previousStatus = img.location_status;

    this.deps.signals.image.update((prev) =>
      prev
        ? {
            ...prev,
            latitude: null,
            longitude: null,
            location_status: nextStatus,
          }
        : prev,
    );

    this.deps.signals.saving.set(true);
    const { error } = await this.deps.services.supabase.client
      .from('media_items')
      .update({
        latitude: null,
        longitude: null,
        location_status: nextStatus,
      })
      .or(`id.eq.${img.id},source_image_id.eq.${img.id}`);

    if (error) {
      this.deps.signals.image.update((prev) =>
        prev
          ? {
              ...prev,
              latitude: previousLatitude,
              longitude: previousLongitude,
              location_status: previousStatus,
            }
          : prev,
      );
      this.deps.services.toastService.show({
        message: this.deps.helpers.t(
          'workspace.imageDetail.toast.coordinatesClearFailed',
          'Could not clear coordinates',
        ),
        type: 'error',
      });
      this.deps.signals.saving.set(false);
      return false;
    }

    if (!options?.suppressToast) {
      this.deps.services.toastService.show({
        message: this.deps.helpers.t(
          'workspace.imageDetail.toast.coordinatesCleared',
          'Coordinates removed',
        ),
        type: 'success',
      });
    }

    this.deps.signals.saving.set(false);
    return true;
  }

  async restoreCoordinates(
    latitude: number | null,
    longitude: number | null,
    options?: { location_status?: string | null },
  ): Promise<boolean> {
    const img = this.deps.signals.image();
    if (!img) return false;

    const previousLatitude = img.latitude;
    const previousLongitude = img.longitude;
    const previousStatus = img.location_status;
    const nextStatus = options?.location_status;

    this.deps.signals.image.update((prev) =>
      prev
        ? {
            ...prev,
            latitude,
            longitude,
            ...(nextStatus !== undefined ? { location_status: nextStatus } : {}),
          }
        : prev,
    );

    this.deps.signals.saving.set(true);
    const updatePayload: {
      latitude: number | null;
      longitude: number | null;
      location_status?: string | null;
    } = { latitude, longitude };
    if (nextStatus !== undefined) {
      updatePayload.location_status = nextStatus;
    }
    const { error } = await this.deps.services.supabase.client
      .from('media_items')
      .update(updatePayload)
      .or(`id.eq.${img.id},source_image_id.eq.${img.id}`);

    if (error) {
      this.deps.signals.image.update((prev) =>
        prev
          ? {
              ...prev,
              latitude: previousLatitude,
              longitude: previousLongitude,
              location_status: previousStatus,
            }
          : prev,
      );
      this.deps.signals.saving.set(false);
      return false;
    }

    this.deps.signals.saving.set(false);
    return true;
  }
}
