import { Injectable } from '@angular/core';
import type { FeatureFlagName } from '../feature-flags.types';

/** Same `feldpost.ui.*` prefix as the nav collapse key. */
export function featureFlagStorageKey(name: FeatureFlagName): string {
  return `feldpost.ui.flag.${name}`;
}

@Injectable({ providedIn: 'root' })
export class FeatureFlagsStorageAdapter {
  read(name: FeatureFlagName): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(featureFlagStorageKey(name));
  }

  write(name: FeatureFlagName, value: boolean): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(featureFlagStorageKey(name), value ? 'true' : 'false');
  }
}
