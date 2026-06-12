import { Injectable, Injector, afterNextRender, inject } from '@angular/core';
import { Router } from '@angular/router';
import { resolveAuthenticatedActiveShell } from '../../layout/authenticated-shell-active.helpers';
import {
  coerceLocationCoordinate,
  legacyMediaHasGps,
} from '../media-locations/media-locations.helpers';
import { WorkspacePaneLayoutMapEffectsService } from '../workspace-pane/workspace-pane-layout-map-effects.service';
import type { MapZoomPayload, MapZoomRequest } from './map-zoom.types';

/**
 * Single entry point for “fly map to these coordinates”.
 *
 * @see docs/specs/service/media-locations/media-locations.zoomable-map-contract.supplement.md
 */
@Injectable({ providedIn: 'root' })
export class MapZoomOrchestratorService {
  private readonly mapLayoutEffects = inject(WorkspacePaneLayoutMapEffectsService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  private pending: MapZoomPayload | null = null;

  /** Last rejection reason (for tests / optional UI). */
  lastRejectReason: string | null = null;

  requestZoom(request: MapZoomRequest): void {
    const lat = coerceLocationCoordinate(request.lat);
    const lng = coerceLocationCoordinate(request.lng);
    const activeShell = resolveAuthenticatedActiveShell(this.router.url);

    if (!request.mediaId?.trim()) {
      this.reject('missing-media-id');
      return;
    }

    if (!legacyMediaHasGps(lat, lng) || lat == null || lng == null) {
      this.reject('invalid-coordinates');
      return;
    }

    const payload: MapZoomPayload = {
      mediaId: request.mediaId,
      lat,
      lng,
      zoomMode: request.zoomMode,
      locationId: request.locationId,
    };

    this.lastRejectReason = null;
    this.pending = payload;

    const mapFx = this.mapLayoutEffects.getMapEffects();

    // Map shell stays mounted but is hidden on /media and /projects — zoom must reveal the map route first.
    if (activeShell !== 'map') {
      void this.router
        .navigate(['/map'], {
          state: {
            mapFocus: {
              mediaId: payload.mediaId,
              lat: payload.lat,
              lng: payload.lng,
            },
          },
        })
        .then((navigated) => {
          if (!navigated) {
            this.reject('navigation-failed');
            return;
          }
          afterNextRender(
            () => {
              const fx = this.mapLayoutEffects.getMapEffects();
              fx?.onZoomToLocation(payload);
            },
            { injector: this.injector },
          );
        });
      return;
    }

    if (mapFx) {
      mapFx.onZoomToLocation(payload);
      return;
    }

    void this.router.navigate(['/map'], {
      state: {
        mapFocus: {
          mediaId: payload.mediaId,
          lat: payload.lat,
          lng: payload.lng,
        },
      },
    });
  }

  /** Called from map-shell when Leaflet is not ready yet. */
  deferUntilMapReady(payload: MapZoomPayload): void {
    this.pending = payload;
  }

  /** Called from map-shell after `initMap()`. */
  consumePending(): MapZoomPayload | null {
    const payload = this.pending;
    if (!payload) {
      return null;
    }
    this.pending = null;
    return payload;
  }

  private reject(reason: string): void {
    this.lastRejectReason = reason;
  }
}
