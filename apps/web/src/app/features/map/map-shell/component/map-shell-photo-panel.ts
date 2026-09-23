import type { WritableSignal } from '@angular/core';
import { featureFlagStorageKey } from '../../../../core/feature-flags/adapters/feature-flags-storage.adapter';
import { resolveFlag } from '../../../../core/feature-flags/feature-flags.helpers';
import type { ShellLayoutService } from '../../../../core/shell-layout/shell-layout.service';

/**
 * Grid shell opens the download panel. The workspace pane stays shut so the map
 * does not also offset by the pane width.
 * @see docs/specs/ui/shell/selected-items-panel.md
 */
export function workspacePaneOpeningWidth(current: number): number {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  return Math.min(Math.max(current, vw * 0.25), vw * 0.75);
}

export function routePhotoPanelOpen(
  value: boolean,
  paneOpen: WritableSignal<boolean>,
  shellLayout: ShellLayoutService,
): void {
  const grid = resolveFlag('shellGridLayout', {
    query: typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('ff'),
    stored:
      typeof localStorage === 'undefined'
        ? null
        : localStorage.getItem(featureFlagStorageKey('shellGridLayout')),
  }).value;
  if (grid) {
    shellLayout.setOpen('download', value);
    paneOpen.set(false);
    return;
  }
  paneOpen.set(value);
}
