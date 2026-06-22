import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import {
  coerceLocationCoordinate,
  formatLocationPickerLines,
  legacyMediaHasGps,
  locationMatchesQuery,
  locationsWithGps,
} from '../../core/media-locations/media-locations.helpers';
import { LocationPickerRowComponent } from '../workspace-pane/media-detail/location-picker-row/location-picker-row.component';
import { MediaLocationsService } from '../../core/media-locations/media-locations.service';
import type { MediaItemLocationRow } from '../../core/media-locations/media-locations.types';
import { DropdownShellComponent } from '../dropdown-trigger/shell/dropdown-shell.component';
import { StandardDropdownComponent } from '../dropdown-trigger/standard/standard-dropdown.component';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import { HlmMenuItemDirective } from '../ui/menu';
import {
  mapPickerShowsSearch,
  mapZoomAffordanceFromTargetCount,
} from './media-item-map-action.helpers';

export interface MediaItemMapZoomEvent {
  readonly mediaId: string;
  readonly lat: number;
  readonly lng: number;
  readonly locationId?: string;
}

type MapZoomTarget = {
  readonly locationId?: string;
  readonly lat: number;
  readonly lng: number;
  readonly primary: string;
  readonly secondary: string;
  readonly searchRow: MediaItemLocationRow | null;
};

@Component({
  selector: 'app-media-item-map-action',
  standalone: true,
  imports: [
    DropdownShellComponent,
    StandardDropdownComponent,
    LocationPickerRowComponent,
    HlmMenuItemDirective,
    ...HLM_BUTTON_IMPORTS,
  ],
  templateUrl: './media-item-map-action.component.html',
  styleUrl: './media-item-map-action.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'media-item-map-action',
  },
})
export class MediaItemMapActionComponent {
  private readonly i18nService = inject(I18nService);
  private readonly mediaLocationsService = inject(MediaLocationsService);
  readonly mediaItemId = input.required<string>();
  readonly legacyLatitude = input<number | null>(null);
  readonly legacyLongitude = input<number | null>(null);
  readonly legacyAddressLabel = input<string | null>(null);
  readonly mapLabel = input('');
  readonly disabled = input(false);

  readonly mapZoomRequested = output<MediaItemMapZoomEvent>();

  readonly open = signal(false);
  readonly loading = signal(false);
  readonly searchTerm = signal('');
  readonly targets = signal<readonly MapZoomTarget[]>([]);

  private readonly triggerRef = viewChild<ElementRef<HTMLElement>>('mapTriggerRef');
  readonly triggerEl = signal<HTMLElement | null>(null);

  readonly doorLabel = computed(() => this.t('location.door.label', 'Top'));

  readonly showSearch = computed(() => mapPickerShowsSearch(this.targets().length));

  readonly filteredTargets = computed(() => {
    const query = this.searchTerm().trim();
    const rows = this.targets();
    if (!query) {
      return rows;
    }
    return rows.filter((target) => {
      if (target.searchRow) {
        return locationMatchesQuery(target.searchRow, query);
      }
      return (
        target.primary.toLowerCase().includes(query.toLowerCase()) ||
        target.secondary.toLowerCase().includes(query.toLowerCase())
      );
    });
  });

  t(key: string, fallback: string): string {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  }

  async onMapClick(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled() || this.loading()) {
      return;
    }

    this.triggerEl.set(this.triggerRef()?.nativeElement ?? null);
    this.loading.set(true);
    try {
      const resolved = await this.resolveZoomTargets();
      this.targets.set(resolved);
      switch (mapZoomAffordanceFromTargetCount(resolved.length)) {
        case 'noop':
          return;
        case 'direct-zoom': {
          const target = resolved[0]!;
          queueMicrotask(() => this.emitZoom(target));
          return;
        }
        case 'picker':
        case 'picker-with-search':
          this.searchTerm.set('');
          this.open.set(true);
          return;
      }
    } finally {
      this.loading.set(false);
      this.releasePointerFocus(event);
    }
  }

  onPickerSelect(target: MapZoomTarget, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.emitZoom(target);
    queueMicrotask(() => this.close());
  }

  close(): void {
    this.open.set(false);
    this.searchTerm.set('');
  }

  private emitZoom(target: MapZoomTarget): void {
    this.mapZoomRequested.emit({
      mediaId: this.mediaItemId(),
      lat: target.lat,
      lng: target.lng,
      locationId: target.locationId,
    });
  }

  private async resolveZoomTargets(): Promise<MapZoomTarget[]> {
    const mediaId = this.mediaItemId();
    const doorLabel = this.doorLabel();

    const fromList = await this.targetsFromList(mediaId, doorLabel);
    if (fromList.length > 0) {
      return fromList;
    }

    await this.mediaLocationsService.syncListCacheAfterPlacement(mediaId);
    const retried = await this.targetsFromList(mediaId, doorLabel);
    if (retried.length > 0) {
      return retried;
    }

    const lat = coerceLocationCoordinate(this.legacyLatitude());
    const lng = coerceLocationCoordinate(this.legacyLongitude());
    if (lat == null || lng == null) {
      return [];
    }

    const fallback =
      this.legacyAddressLabel()?.trim() ||
      this.t('workspace.thumbnailCard.mapLocations.legacyFallback', 'Location');
    return [
      {
        lat,
        lng,
        primary: fallback,
        secondary: '',
        searchRow: null,
      },
    ];
  }

  private async targetsFromList(
    mediaId: string,
    doorLabel: string,
  ): Promise<MapZoomTarget[]> {
    const result = await this.mediaLocationsService.listForMedia(mediaId);
    if (!result.ok || !('rows' in result)) {
      return [];
    }
    const gpsRows = locationsWithGps(result.rows);
    return gpsRows.map((row) => this.rowToTarget(row, doorLabel));
  }

  private rowToTarget(row: MediaItemLocationRow, doorLabel: string): MapZoomTarget {
    const lat = coerceLocationCoordinate(row.latitude)!;
    const lng = coerceLocationCoordinate(row.longitude)!;
    const lines = formatLocationPickerLines(row, doorLabel);
    return {
      locationId: row.id,
      lat,
      lng,
      primary: lines.primary,
      secondary: lines.secondary || row.address_label?.trim() || '',
      searchRow: row,
    };
  }

  private releasePointerFocus(event: Event): void {
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      target.blur();
    }
  }
}
