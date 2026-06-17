import { Injectable, computed, inject, signal } from '@angular/core';
import type { ToggleValue } from '@spartan-ng/brain/toggle-group';
import type { ToggleGroupOption } from '../../../../shared/ui/toggle-group/toggle-group-option.types';
import { toggleSingleStringValue } from '../../../../shared/ui/toggle-group/toggle-group-option.helpers';
import { MapBasemapPreference, MapPreferencesService } from './map-preferences.service';
import { MapBasemapLayerService } from './map-basemap-layer.service';
import type { MapInstance, MapTileLayer } from './map-leaflet.service';

export type MapViewMode = 'street' | 'photo';

const BASEMAP_STORAGE_KEY = 'sitesnap.settings.map.basemap';

@Injectable({ providedIn: 'root' })
export class MapShellBasemapService {
  private readonly mapPreferencesService = inject(MapPreferencesService);
  private readonly mapBasemapLayerService = inject(MapBasemapLayerService);

  private activeBaseTileLayer: MapTileLayer | null = null;

  private readonly _mapBasemap = signal<MapBasemapPreference>(
    this.mapPreferencesService.readBasemapPreference(BASEMAP_STORAGE_KEY),
  );

  readonly mapBasemap = this._mapBasemap.asReadonly();

  readonly mapViewOptions = computed<ReadonlyArray<ToggleGroupOption>>(() => [
    { id: 'street', label: 'Street', icon: 'map', ariaLabel: 'Street map', title: 'Street map' },
    { id: 'photo', label: 'Photo', icon: 'satellite_alt', ariaLabel: 'Photo map', title: 'Photo map' },
  ]);

  readonly mapViewMode = computed<MapViewMode>(() =>
    this._mapBasemap() === 'satellite' ? 'photo' : 'street',
  );

  applyToMap(map: MapInstance | undefined): void {
    const result = this.mapBasemapLayerService.applyBasemapLayer({
      map,
      activeBaseTileLayer: this.activeBaseTileLayer,
      basemap: this._mapBasemap(),
    });
    this.activeBaseTileLayer = result.activeBaseTileLayer;
  }

  toggle(map: MapInstance | undefined): void {
    const next: MapBasemapPreference = this._mapBasemap() === 'default' ? 'satellite' : 'default';
    this._mapBasemap.set(next);
    this.mapPreferencesService.persistBasemapPreference(BASEMAP_STORAGE_KEY, next);
    this.applyToMap(map);
  }

  setViewMode(mode: MapViewMode, map: MapInstance | undefined): void {
    const previous = this._mapBasemap();
    this._mapBasemap.set(mode === 'photo' ? 'satellite' : 'default');
    this.mapPreferencesService.persistBasemapPreference(BASEMAP_STORAGE_KEY, this._mapBasemap());
    if (this._mapBasemap() !== previous) {
      this.applyToMap(map);
    }
  }

  onViewModeChange(raw: ToggleValue<string>, map: MapInstance | undefined): void {
    const mode = toggleSingleStringValue(raw);
    if (mode === 'street' || mode === 'photo') {
      this.setViewMode(mode, map);
    }
  }
}
