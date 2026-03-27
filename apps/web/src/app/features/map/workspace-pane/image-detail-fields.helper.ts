import { WritableSignal } from '@angular/core';
import { ForwardGeocodeResult } from '../../../core/geocoding.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ToastService } from '../../../core/toast.service';
import { DateSaveEvent } from './captured-date-editor.component';
import { DetailEditingField, ImageRecord } from './image-detail-view.types';

type DetailTranslateFn = (key: string, fallback: string) => string;

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
    if (newValue === (oldValue ?? '')) return;

    const updateValue = newValue || null;
    this.deps.signals.image.update((prev) => (prev ? { ...prev, [field]: updateValue } : prev));
    this.deps.signals.editingField.set(null);
    this.deps.signals.saving.set(true);

    const { error } = await this.deps.services.supabase.client
      .from('images')
      .update({ [field]: updateValue })
      .eq('id', img.id);

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

  async applyAddressSuggestion(suggestion: ForwardGeocodeResult): Promise<void> {
    const img = this.deps.signals.image();
    if (!img) return;

    this.deps.signals.image.update((prev) =>
      prev
        ? {
            ...prev,
            street: suggestion.street,
            city: suggestion.city,
            district: suggestion.district,
            country: suggestion.country,
            address_label: suggestion.addressLabel,
          }
        : prev,
    );

    this.deps.signals.editingField.set(null);

    const { error } = await this.deps.services.supabase.client
      .from('images')
      .update({
        street: suggestion.street,
        city: suggestion.city,
        district: suggestion.district,
        country: suggestion.country,
        address_label: suggestion.addressLabel,
      })
      .eq('id', img.id);

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
            }
          : prev,
      );
    }
  }

  async revertCoordinatesToExif(): Promise<void> {
    const img = this.deps.signals.image();
    if (!img || img.exif_latitude == null || img.exif_longitude == null) return;

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
        location_status: 'gps',
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
    } else {
      this.deps.services.toastService.show({
        message: this.deps.helpers.t(
          'workspace.imageDetail.toast.coordinatesReverted',
          'Coordinates reverted to EXIF',
        ),
        type: 'success',
      });
    }

    this.deps.signals.saving.set(false);
  }
}
