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
  formatLocationDisplayLine,
  legacyMediaHasGps,
  locationMatchesQuery,
  locationsWithGps,
} from '../../core/media-locations/media-locations.helpers';
import { MediaLocationsService } from '../../core/media-locations/media-locations.service';
import type { MediaItemLocationRow } from '../../core/media-locations/media-locations.types';
import { DropdownShellComponent } from '../dropdown-trigger/dropdown-shell.component';
import { StandardDropdownComponent } from '../dropdown-trigger/standard-dropdown.component';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import { HlmMenuItemDirective } from '../ui/menu';

/** Show search when location pick list exceeds this count. */
const MAP_LOCATION_SEARCH_THRESHOLD = 5;

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
  readonly label: string;
  readonly isPrimary: boolean;
  readonly searchRow: MediaItemLocationRow | null;
};

@Component({
  selector: 'app-media-item-map-action',
  standalone: true,
  imports: [
    DropdownShellComponent,
    StandardDropdownComponent,
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

  readonly showSearch = computed(() => this.targets().length > MAP_LOCATION_SEARCH_THRESHOLD);

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
      return target.label.toLowerCase().includes(query.toLowerCase());
    });
  });

  readonly panelMinWidth = computed(() => {
    const width = this.triggerRef()?.nativeElement.getBoundingClientRect().width ?? 0;
    return Math.max(200, Math.round(width));
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
      if (resolved.length === 0) {
        return;
      }
      if (resolved.length === 1) {
        this.emitZoom(resolved[0]!);
        return;
      }
      this.searchTerm.set('');
      this.open.set(true);
    } finally {
      this.loading.set(false);
      this.releasePointerFocus(event);
    }
  }

  selectTarget(target: MapZoomTarget): void {
    this.emitZoom(target);
    this.close();
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
    const result = await this.mediaLocationsService.listForMedia(mediaId);
    const doorLabel = this.doorLabel();

    if (result.ok && 'rows' in result) {
      const gpsRows = locationsWithGps(result.rows);
      if (gpsRows.length > 0) {
        return gpsRows.map((row) => this.rowToTarget(row, doorLabel));
      }
    }

    const lat = this.legacyLatitude();
    const lng = this.legacyLongitude();
    if (!legacyMediaHasGps(lat, lng)) {
      return [];
    }

    return [
      {
        lat: lat!,
        lng: lng!,
        label:
          this.legacyAddressLabel()?.trim() ||
          this.t('workspace.thumbnailCard.mapLocations.legacyFallback', 'Location'),
        isPrimary: true,
        searchRow: null,
      },
    ];
  }

  private rowToTarget(row: MediaItemLocationRow, doorLabel: string): MapZoomTarget {
    return {
      locationId: row.id,
      lat: row.latitude!,
      lng: row.longitude!,
      label: formatLocationDisplayLine(row, doorLabel),
      isPrimary: false,
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
