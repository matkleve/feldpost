import { Injectable } from '@angular/core';
import * as L from 'leaflet';

export type MapBasemapPreference = 'default' | 'satellite';

interface ApplyBasemapParams {
  map: L.Map | undefined;
  activeBaseTileLayer: L.TileLayer | null;
  basemap: MapBasemapPreference;
}

interface ApplyBasemapResult {
  activeBaseTileLayer: L.TileLayer | null;
}

@Injectable({ providedIn: 'root' })
export class MapBasemapLayerService {
  applyBasemapLayer(params: ApplyBasemapParams): ApplyBasemapResult {
    const map = params.map;
    if (!map) {
      return {
        activeBaseTileLayer: params.activeBaseTileLayer,
      };
    }

    if (params.activeBaseTileLayer) {
      map.removeLayer(params.activeBaseTileLayer);
    }

    const activeBaseTileLayer = this.createMapBasemapLayer(params.basemap);
    activeBaseTileLayer.addTo(map);

    return {
      activeBaseTileLayer,
    };
  }

  private createMapBasemapLayer(mode: MapBasemapPreference): L.TileLayer {
    if (mode === 'satellite') {
      return L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxNativeZoom: 19,
          maxZoom: 22,
          attribution: 'Tiles &copy; Esri',
        },
      );
    }

    // Street basemap follows the active theme. CARTO ships matched tilesets;
    // sandstone (warm theme) uses the cream-toned Voyager style. Satellite
    // imagery is theme-agnostic, so it is left untouched.
    const variant = this.resolveStreetTilePath();
    return L.tileLayer(`https://{s}.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}{r}.png`, {
      maxNativeZoom: 19,
      maxZoom: 22,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
    });
  }

  /**
   * Picks the CARTO tile path for the street basemap from the effective theme,
   * resolved the same way the rest of the app does (explicit `data-theme` wins,
   * otherwise OS preference):
   *   - `dark`       → `dark_all` (neutral dark)
   *   - `sandstone`  → `rastertiles/voyager` (warm, cream-toned)
   *   - light / else → `light_all`
   */
  private resolveStreetTilePath(): string {
    if (typeof document === 'undefined') {
      return 'light_all';
    }
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'sandstone') {
      return 'rastertiles/voyager';
    }
    if (theme === 'dark') {
      return 'dark_all';
    }
    if (theme === 'light') {
      return 'light_all';
    }
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark_all' : 'light_all';
  }
}
