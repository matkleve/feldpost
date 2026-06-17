import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../../../core/toast/toast.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MediaLocationUpdateService } from '../../../../core/media-location-update/media-location-update.service';
import { MediaLocationsService } from '../../../../core/media-locations/media-locations.service';
import { MediaDetailLocationSyncService } from '../../../../core/media-detail-data/media-detail-location-sync.service';
import { buildLocationUpdateFailureToast } from '../../../../core/media-location-update/location-update-toast.util';
import type { ImageUploadedEvent, UploadLocationMapPickRequest } from '../../../../core/workspace-pane/workspace-pane-shell-events.types';
import type { MediaLocationAddressPatch } from '../../../../core/media-location-update/media-location-update.types';

export interface LocationPickContext {
  onImageUploaded(event: ImageUploadedEvent): void;
}

@Injectable({ providedIn: 'root' })
export class MapLocationPickService {
  private readonly mediaLocationsService = inject(MediaLocationsService);
  private readonly mediaLocationUpdateService = inject(MediaLocationUpdateService);
  private readonly mediaDetailLocationSync = inject(MediaDetailLocationSyncService);
  private readonly toastService = inject(ToastService);
  private readonly i18nService = inject(I18nService);
  private readonly router = inject(Router);

  private ctx: LocationPickContext | null = null;
  private locationMapPickReturnUrl: string | null = null;
  private lastLocationMapPickSync: {
    mediaId: string;
    lat: number;
    lng: number;
    locationRowId?: string;
    address?: MediaLocationAddressPatch;
  } | null = null;

  bind(ctx: LocationPickContext): void {
    this.ctx = ctx;
  }

  setReturnUrl(url: string | null): void {
    this.locationMapPickReturnUrl = url;
  }

  async applyAndNavigate(request: UploadLocationMapPickRequest, coords: { lat: number; lng: number }): Promise<void> {
    const saved = await this.applyUploadedLocationMapPick(request, coords);
    if (saved) {
      this.navigateBackAfterLocationMapPick();
    }
  }

  navigateBackAfterLocationMapPick(): void {
    const returnUrl = this.locationMapPickReturnUrl;
    const sync = this.lastLocationMapPickSync;
    if (!returnUrl) {
      return;
    }
    this.locationMapPickReturnUrl = null;
    void this.router.navigateByUrl(returnUrl).then(() => {
      if (!sync) {
        return;
      }
      this.lastLocationMapPickSync = null;
      this.mediaDetailLocationSync.notifyCoordinatesUpdated(
        sync.mediaId,
        sync.lat,
        sync.lng,
        sync.address,
        sync.locationRowId,
      );
    });
  }

  private async applyUploadedLocationMapPick(
    request: UploadLocationMapPickRequest,
    coords: { lat: number; lng: number },
  ): Promise<boolean> {
    const rowId = request.locationRowId;
    let lat: number | undefined;
    let lng: number | undefined;
    let address: MediaLocationAddressPatch | undefined;

    if (rowId) {
      const rowResult = await this.mediaLocationsService.updateFromCoordinates(rowId, coords);
      if (!rowResult.ok) {
        this.toastService.show({
          ...buildLocationUpdateFailureToast(rowResult.error, {
            file: 'map-location-pick.service.ts',
            fn: 'applyUploadedLocationMapPick',
          }),
        });
        return false;
      }
      if (!('row' in rowResult)) {
        return false;
      }
      const row = rowResult.row;
      if (row.latitude == null || row.longitude == null) {
        this.toastService.show({
          ...buildLocationUpdateFailureToast('Location update failed.', {
            file: 'map-location-pick.service.ts',
            fn: 'applyUploadedLocationMapPick',
          }),
        });
        return false;
      }
      lat = row.latitude;
      lng = row.longitude;
      address = {
        address_label: row.address_label,
        street: row.street,
        city: row.city,
        district: row.district,
        country: row.country,
      };
    } else {
      const legacyResult = await this.mediaLocationUpdateService.updateFromCoordinates(
        request.mediaId,
        coords,
      );
      if (!legacyResult.ok || typeof legacyResult.lat !== 'number' || typeof legacyResult.lng !== 'number') {
        this.toastService.show({
          ...buildLocationUpdateFailureToast(
            legacyResult.ok ? 'Location update failed.' : legacyResult.error,
            {
              file: 'map-location-pick.service.ts',
              fn: 'applyUploadedLocationMapPick',
            },
          ),
        });
        return false;
      }
      lat = legacyResult.lat;
      lng = legacyResult.lng;
      address = legacyResult.address;
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return false;
    }

    this.ctx?.onImageUploaded({ id: request.mediaId, lat, lng });
    this.lastLocationMapPickSync = {
      mediaId: request.mediaId,
      lat,
      lng,
      locationRowId: rowId,
      address,
    };
    this.mediaDetailLocationSync.notifyCoordinatesUpdated(
      request.mediaId,
      lat,
      lng,
      address,
      rowId,
    );
    this.toastService.show({
      title: this.i18nService.t('upload.location.update.success', 'Location updated.'),
      type: 'success',
      dedupe: true,
    });
    return true;
  }
}
