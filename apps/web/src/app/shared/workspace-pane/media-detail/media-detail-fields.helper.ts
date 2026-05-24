import type { WritableSignal } from '@angular/core';
import type {
  AddressFieldKind,
  AddressFieldMeta,
} from '../../../core/address-field-suggest/address-field-suggest.types';
import type { ForwardGeocodeResult } from '../../../core/geocoding/geocoding.service';
import type { MediaLocationUpdateService } from '../../../core/media-location-update/media-location-update.service';
import type { MediaLocationsService } from '../../../core/media-locations/media-locations.service';
import {
  locationDisplaySnapshotFromRows,
  mergeLocationDisplayIntoImageRecord,
} from '../../../core/media-locations/media-locations.helpers';
import type { MediaItemLocationRow } from '../../../core/media-locations/media-locations.types';
import type { MediaLocationAddressPatch } from '../../../core/media-locations/media-locations.types';
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

/** Persisted on `locations` (first linked row), not `media_items`. */
const LOCATION_DISPLAY_FIELDS = new Set([
  'address_label',
  'street',
  'city',
  'district',
  'country',
  'latitude',
  'longitude',
]);

interface MediaDetailFieldsHelperDeps {
  services: {
    supabase: SupabaseService;
    toastService: ToastService;
    mediaLocations: MediaLocationsService;
    mediaLocationUpdate: MediaLocationUpdateService;
  };
  signals: {
    media: WritableSignal<ImageRecord | null>;
    editingField: WritableSignal<DetailEditingField>;
    saving: WritableSignal<boolean>;
    editDate: WritableSignal<string>;
    editTime: WritableSignal<string>;
    displayLocationId: WritableSignal<string | null>;
    locations: WritableSignal<MediaItemLocationRow[]>;
  };
  callbacks: {
    syncDisplayFromRows: (rows: readonly MediaItemLocationRow[]) => void;
  };
  helpers: {
    t: DetailTranslateFn;
  };
}

export class MediaDetailFieldsHelper {
  constructor(private readonly deps: MediaDetailFieldsHelperDeps) {}

  async saveImageField(field: string, newValue: string): Promise<boolean> {
    const img = this.deps.signals.media();
    if (!img) return false;

    const oldValue = (img as unknown as Record<string, unknown>)[field] as string | null;
    if (newValue === (oldValue ?? '')) {
      this.deps.signals.editingField.set(null);
      return true;
    }

    const updateValue = newValue || null;
    this.deps.signals.media.update((prev) => (prev ? { ...prev, [field]: updateValue } : prev));
    this.deps.signals.editingField.set(null);
    this.deps.signals.saving.set(true);

    const persisted = LOCATION_DISPLAY_FIELDS.has(field)
      ? await this.persistLocationDisplayField(img.id, field, updateValue)
      : await this.persistMediaItemScalarField(img.id, field, updateValue);

    if (!persisted) {
      this.deps.signals.media.update((prev) => (prev ? { ...prev, [field]: oldValue } : prev));
      this.deps.signals.saving.set(false);
      return false;
    }

    this.deps.signals.saving.set(false);
    return true;
  }

  private async persistMediaItemScalarField(
    mediaId: string,
    field: string,
    updateValue: string | null,
  ): Promise<boolean> {
    const { error } = await this.deps.services.supabase.client
      .from('media_items')
      .update({ [field]: updateValue })
      .or(`id.eq.${mediaId},source_image_id.eq.${mediaId}`);
    return !error;
  }

  private async persistLocationDisplayField(
    mediaId: string,
    field: string,
    updateValue: string | null,
  ): Promise<boolean> {
    const patch = this.locationPatchFromField(field, updateValue);
    if (!patch) {
      return false;
    }

    const displayLocationId = this.deps.signals.displayLocationId();
    if (displayLocationId) {
      const updated = await this.deps.services.mediaLocations.updateLocation({
        locationId: displayLocationId,
        ...patch,
      });
      if (!updated.ok || !('row' in updated)) {
        return false;
      }
      this.replaceLocationRowAndSyncDisplay(updated.row);
      return true;
    }

    if (!this.hasPatchValue(patch)) {
      return true;
    }

    const added = await this.deps.services.mediaLocations.addLocation({
      mediaItemId: mediaId,
      ...patch,
    });
    if (!added.ok || !('row' in added)) {
      return false;
    }
    const rows = [...this.deps.signals.locations(), added.row];
    this.deps.signals.locations.set(rows);
    this.deps.callbacks.syncDisplayFromRows(rows);
    return true;
  }

  private replaceLocationRowAndSyncDisplay(row: MediaItemLocationRow): void {
    const rows = this.deps.signals.locations().map((existing) =>
      existing.id === row.id ? row : existing,
    );
    this.deps.signals.locations.set(rows);
    this.deps.callbacks.syncDisplayFromRows(rows);
    const current = this.deps.signals.media();
    if (current) {
      const snapshot = locationDisplaySnapshotFromRows(rows);
      this.deps.signals.media.set(mergeLocationDisplayIntoImageRecord(current, snapshot));
    }
  }

  private locationPatchFromField(
    field: string,
    value: string | null,
  ): MediaLocationAddressPatch | null {
    switch (field) {
      case 'address_label':
        return { address_label: value };
      case 'street':
        return { street: value };
      case 'city':
        return { city: value };
      case 'district':
        return { district: value };
      case 'country':
        return { country: value };
      case 'latitude':
        return { latitude: value != null ? Number(value) : null };
      case 'longitude':
        return { longitude: value != null ? Number(value) : null };
      default:
        return null;
    }
  }

  private hasPatchValue(patch: MediaLocationAddressPatch): boolean {
    return Object.values(patch).some((v) => v != null && v !== '');
  }

  private async updateMediaLocationStatus(
    mediaId: string,
    locationStatus: string,
  ): Promise<boolean> {
    const { error } = await this.deps.services.supabase.client
      .from('media_items')
      .update({ location_status: locationStatus })
      .or(`id.eq.${mediaId},source_image_id.eq.${mediaId}`);
    return !error;
  }

  private async patchDisplayLocationCoords(
    _mediaId: string,
    latitude: number | null,
    longitude: number | null,
  ): Promise<boolean> {
    const displayLocationId = this.deps.signals.displayLocationId();
    if (!displayLocationId) {
      return latitude == null && longitude == null;
    }
    const updated = await this.deps.services.mediaLocations.updateLocation({
      locationId: displayLocationId,
      latitude,
      longitude,
    });
    if (!updated.ok || !('row' in updated)) {
      return false;
    }
    this.replaceLocationRowAndSyncDisplay(updated.row);
    return true;
  }

  openCapturedAtEditor(): void {
    const img = this.deps.signals.media();
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
    const img = this.deps.signals.media();
    if (!img) return;

    if (!event.date) {
      const oldCapturedAt = img.captured_at;
      const oldHasTime = img.has_time;
      this.deps.signals.media.update((prev) =>
        prev ? { ...prev, captured_at: null, has_time: false } : prev,
      );
      this.deps.signals.saving.set(true);
      const { error } = await this.deps.services.supabase.client
        .from('media_items')
        .update({ captured_at: null })
        .or(`id.eq.${img.id},source_image_id.eq.${img.id}`);
      if (error) {
        this.deps.signals.media.update((prev) =>
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

    this.deps.signals.media.update((prev) =>
      prev ? { ...prev, captured_at: combined, has_time: hasTime } : prev,
    );
    this.deps.signals.saving.set(true);

    const { error } = await this.deps.services.supabase.client
      .from('media_items')
      .update({ captured_at: combined })
      .or(`id.eq.${img.id},source_image_id.eq.${img.id}`);

    if (error) {
      this.deps.signals.media.update((prev) =>
        prev ? { ...prev, captured_at: oldCapturedAt, has_time: oldHasTime } : prev,
      );
    }

    this.deps.signals.saving.set(false);
  }

  /** Writes geocoder verification meta after resolve_media_location already saved address + coords. */
  async persistAddressFieldMetaFromGeocode(suggestion: ForwardGeocodeResult): Promise<void> {
    const img = this.deps.signals.media();
    if (!img) return;

    const addressFieldMeta = {
      ...(img.address_field_meta ?? {}),
      ...verifiedMetaFromGeocodeSuggestion(suggestion),
    };

    this.deps.signals.media.update((prev) =>
      prev ? { ...prev, address_field_meta: addressFieldMeta } : prev,
    );

    await this.deps.services.supabase.client
      .from('media_items')
      .update({ address_field_meta: addressFieldMeta })
      .or(`id.eq.${img.id},source_image_id.eq.${img.id}`);
  }

  async applyAddressSuggestion(suggestion: ForwardGeocodeResult): Promise<void> {
    const img = this.deps.signals.media();
    if (!img) return;

    const hasCoordinates = Number.isFinite(suggestion.lat) && Number.isFinite(suggestion.lng);
    const verifiedMeta = verifiedMetaFromGeocodeSuggestion(suggestion);
    const addressFieldMeta = { ...(img.address_field_meta ?? {}), ...verifiedMeta };

    this.deps.signals.media.update((prev) =>
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
    this.deps.signals.saving.set(true);

    const resolved = await this.deps.services.mediaLocationUpdate.updateFromAddressSuggestion(
      img.id,
      suggestion,
    );

    if (!resolved.ok) {
      this.deps.signals.media.update((prev) =>
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
      this.deps.signals.saving.set(false);
      return;
    }

    if (hasCoordinates) {
      await this.updateMediaLocationStatus(img.id, 'resolved');
    }

    await this.deps.services.supabase.client
      .from('media_items')
      .update({ address_field_meta: addressFieldMeta })
      .or(`id.eq.${img.id},source_image_id.eq.${img.id}`);

    this.deps.signals.saving.set(false);
  }

  async revertCoordinatesToExif(options?: { suppressToast?: boolean }): Promise<boolean> {
    const img = this.deps.signals.media();
    if (!img || img.exif_latitude == null || img.exif_longitude == null) return false;

    const oldLatitude = img.latitude;
    const oldLongitude = img.longitude;

    this.deps.signals.media.update((prev) =>
      prev
        ? {
            ...prev,
            latitude: img.exif_latitude,
            longitude: img.exif_longitude,
          }
        : prev,
    );

    this.deps.signals.saving.set(true);
    const coordsOk = await this.patchDisplayLocationCoords(
      img.id,
      img.exif_latitude,
      img.exif_longitude,
    );
    const statusOk = await this.updateMediaLocationStatus(img.id, 'resolved');

    if (!coordsOk || !statusOk) {
      this.deps.signals.media.update((prev) =>
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
    const img = this.deps.signals.media();
    if (!img || (img.latitude == null && img.longitude == null)) {
      return false;
    }

    const hasAddressText = [img.street, img.city, img.district, img.country, img.address_label].some(
      (part) => !!part?.trim(),
    );
    const nextStatus = hasAddressText ? 'pending' : 'unresolvable';

    const previousLatitude = img.latitude;
    const previousLongitude = img.longitude;
    const previousStatus = img.location_status;

    this.deps.signals.media.update((prev) =>
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
    const coordsOk = await this.patchDisplayLocationCoords(img.id, null, null);
    const statusOk = await this.updateMediaLocationStatus(img.id, nextStatus);

    if (!coordsOk || !statusOk) {
      this.deps.signals.media.update((prev) =>
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
    const img = this.deps.signals.media();
    if (!img) return false;

    const previousLatitude = img.latitude;
    const previousLongitude = img.longitude;
    const previousStatus = img.location_status;
    const nextStatus = options?.location_status;

    this.deps.signals.media.update((prev) =>
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
      this.deps.signals.media.update((prev) =>
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
