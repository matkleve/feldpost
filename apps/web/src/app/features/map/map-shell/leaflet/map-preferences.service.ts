import { Injectable } from '@angular/core';

export type MapBasemapPreference = 'default' | 'satellite';

@Injectable({ providedIn: 'root' })
export class MapPreferencesService {
  readBasemapPreference(storageKey: string): MapBasemapPreference {
    if (typeof window === 'undefined') return 'default';
    const stored = window.localStorage.getItem(storageKey);
    return stored === 'satellite' ? 'satellite' : 'default';
  }

  persistBasemapPreference(storageKey: string, value: MapBasemapPreference): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, value);
  }
}
