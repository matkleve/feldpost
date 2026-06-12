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

    return L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxNativeZoom: 19,
      maxZoom: 22,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
    });
  }
}
