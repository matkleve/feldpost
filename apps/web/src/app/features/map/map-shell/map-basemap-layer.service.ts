import { Injectable } from '@angular/core';
import * as L from 'leaflet';

export type MapBasemapPreference = 'default' | 'satellite';
export type MapMaterialPreference = 'default' | 'analog';

interface ApplyBasemapParams {
  map: L.Map | undefined;
  activeBaseTileLayer: L.TileLayer | null;
  activeHistoricLabelTileLayer: L.TileLayer | null;
  basemap: MapBasemapPreference;
  material: MapMaterialPreference;
  historicBasePane: string;
  historicLabelPane: string;
}

interface ApplyBasemapResult {
  activeBaseTileLayer: L.TileLayer | null;
  activeHistoricLabelTileLayer: L.TileLayer | null;
}

@Injectable({ providedIn: 'root' })
export class MapBasemapLayerService {
  applyBasemapLayer(params: ApplyBasemapParams): ApplyBasemapResult {
    const map = params.map;
    if (!map) {
      return {
        activeBaseTileLayer: params.activeBaseTileLayer,
        activeHistoricLabelTileLayer: params.activeHistoricLabelTileLayer,
      };
    }

    if (params.activeBaseTileLayer) {
      map.removeLayer(params.activeBaseTileLayer);
    }

    if (params.activeHistoricLabelTileLayer) {
      map.removeLayer(params.activeHistoricLabelTileLayer);
    }

    const activeBaseTileLayer = this.createMapBasemapLayer(
      params.basemap,
      params.material,
      params.historicBasePane,
    );
    activeBaseTileLayer.addTo(map);

    let activeHistoricLabelTileLayer: L.TileLayer | null = null;
    if (params.basemap === 'default' && params.material === 'analog') {
      activeHistoricLabelTileLayer = this.createHistoricLabelLayer(params.historicLabelPane);
      activeHistoricLabelTileLayer.addTo(map);
    }

    return {
      activeBaseTileLayer,
      activeHistoricLabelTileLayer,
    };
  }

  private createMapBasemapLayer(
    mode: MapBasemapPreference,
    material: MapMaterialPreference,
    historicBasePane: string,
  ): L.TileLayer {
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

    if (material === 'analog') {
      return L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
        {
          pane: historicBasePane,
          maxNativeZoom: 19,
          maxZoom: 22,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
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

  private createHistoricLabelLayer(historicLabelPane: string): L.TileLayer {
    return L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
      {
        pane: historicLabelPane,
        maxNativeZoom: 19,
        maxZoom: 22,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    );
  }
}
