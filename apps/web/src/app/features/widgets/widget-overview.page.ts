import { Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

type WidgetOverviewState = 'on-rail' | 'not-added';

interface WidgetOverviewRow {
  id: string;
  nameKey: string;
  nameFallback: string;
  state: WidgetOverviewState;
}

/** Static until the catalog module and the install table exist. @see docs/specs/page/widget-overview.md */
const OVERVIEW_ROWS: readonly WidgetOverviewRow[] = [
  { id: 'map', nameKey: 'shell.control.map', nameFallback: 'Map', state: 'on-rail' },
  { id: 'projects', nameKey: 'shell.control.projects', nameFallback: 'Projects', state: 'on-rail' },
  { id: 'media', nameKey: 'shell.control.media', nameFallback: 'Media', state: 'on-rail' },
  { id: 'workers', nameKey: 'widget.catalog.workers', nameFallback: 'Workers', state: 'not-added' },
  { id: 'organisation', nameKey: 'widget.catalog.organisation', nameFallback: 'Organisation', state: 'not-added' },
  { id: 'vehicles', nameKey: 'widget.catalog.vehicles', nameFallback: 'Vehicles', state: 'not-added' },
  { id: 'boats', nameKey: 'widget.catalog.boats', nameFallback: 'Boats', state: 'not-added' },
  { id: 'material', nameKey: 'widget.catalog.material', nameFallback: 'Material', state: 'not-added' },
  {
    id: 'storage-locations',
    nameKey: 'widget.catalog.storageLocations',
    nameFallback: 'Storage locations',
    state: 'not-added',
  },
  { id: 'buildings', nameKey: 'widget.catalog.buildings', nameFallback: 'Buildings', state: 'not-added' },
];

@Component({
  selector: 'app-widget-overview',
  standalone: true,
  templateUrl: './widget-overview.page.html',
  styleUrl: './widget-overview.page.scss',
})
export class WidgetOverviewPage {
  private readonly i18n = inject(I18nService);

  readonly rows = OVERVIEW_ROWS;

  readonly t = (key: string, fallback = ''): string => this.i18n.t(key, fallback);

  stateKey(state: WidgetOverviewState): string {
    return state === 'on-rail' ? 'widget.overview.state.onRail' : 'widget.overview.state.notAdded';
  }

  stateFallback(state: WidgetOverviewState): string {
    return state === 'on-rail' ? 'On the rail' : 'Not added';
  }
}
