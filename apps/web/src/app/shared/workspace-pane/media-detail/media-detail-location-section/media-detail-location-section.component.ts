/**
 * Media detail **Location** section — multi-address UI (replaces single shared street/GPS block).
 *
 * **Structure (top → bottom):**
 * 1. `app-media-location-add-search` — collapsed "Add or search address" → 4-zone dropdown
 * 2. Optional list filter (when row count > threshold)
 * 3. Scrollable `app-media-location-row` list (plain rows, no card chrome)
 *
 * **What it does:** Presentational only. All persistence goes through parent
 * `MediaDetailViewComponent` → `MediaLocationsService`.
 *
 * **Parent:** `media-detail-view.component.html` (below Details, above Metadata).
 *
 * @see docs/specs/ui/media-detail/media-detail-location-section.md
 * @see apps/web/src/app/core/media-locations/README.md
 */
import { Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import type { ForwardGeocodeResult } from '../../../../core/geocoding/geocoding.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import type { MediaItemLocationRow } from '../../../../core/media-locations/media-locations.types';
import { locationMatchesQuery } from '../../../../core/media-locations/media-locations.helpers';
import type { SearchQueryContext } from '../../../../core/search/search.models';
import type { ImageRecord } from '../media-detail-view.types';
import { MediaLocationAddSearchComponent } from '../media-location-add-search/media-location-add-search.component';
import {
  MediaLocationRowComponent,
  type MediaLocationCopyField,
  type MediaLocationRowSavePayload,
} from '../media-location-row/media-location-row.component';
import { MEDIA_DETAIL_LOCATION_LIST_SCROLL_THRESHOLD } from '../media-location-constants';

export interface MediaLocationReplaceFromTextPayload {
  previousLocationId: string;
  label: string;
}

export interface MediaLocationReplaceFromGeocodePayload {
  previousLocationId: string;
  suggestion: ForwardGeocodeResult;
}

@Component({
  selector: 'app-media-detail-location-section',
  standalone: true,
  imports: [MediaLocationAddSearchComponent, MediaLocationRowComponent],
  templateUrl: './media-detail-location-section.component.html',
  styleUrls: ['./media-detail-location-section.component.scss', '../_detail-row-slots.scss'],
})
export class MediaDetailLocationSectionComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly media = input.required<ImageRecord>();
  readonly locations = input<MediaItemLocationRow[]>([]);
  readonly saving = input(false);

  readonly addFromText = output<string>();
  readonly addFromGeocode = output<ForwardGeocodeResult>();
  readonly replaceFromText = output<MediaLocationReplaceFromTextPayload>();
  readonly replaceFromGeocode = output<MediaLocationReplaceFromGeocodePayload>();
  readonly rowSaveRequested = output<MediaLocationRowSavePayload>();
  readonly rowDeleteRequested = output<string>();
  readonly mapPickRequested = output<string>();
  readonly showOnMapRequested = output<string>();
  readonly copyFieldRequested = output<MediaLocationCopyField>();

  readonly listFilter = signal('');

  /** When set, the next add/search completion replaces this row's link instead of adding. */
  private readonly replaceTargetLocationId = signal<string | null>(null);

  private readonly addSearchRef = viewChild(MediaLocationAddSearchComponent);

  readonly scrollThreshold = MEDIA_DETAIL_LOCATION_LIST_SCROLL_THRESHOLD;

  readonly addressSearchContext = computed<SearchQueryContext>(() => {
    const img = this.media();
    const context: SearchQueryContext = {
      organizationId: img.organization_id ?? undefined,
      countryCodes: countryCodesForMediaSearch(img.country),
    };
    const lat = img.latitude ?? img.exif_latitude;
    const lng = img.longitude ?? img.exif_longitude;
    if (lat != null && lng != null) {
      context.activeMarkerCentroid = { lat, lng };
    }
    return context;
  });

  readonly showListFilter = computed(
    () => this.locations().length > MEDIA_DETAIL_LOCATION_LIST_SCROLL_THRESHOLD,
  );

  readonly filteredLocations = computed(() => {
    const q = this.listFilter().trim();
    if (!q) return this.locations();
    return this.locations().filter((row) => locationMatchesQuery(row, q));
  });

  readonly listNeedsScroll = computed(
    () => this.filteredLocations().length > MEDIA_DETAIL_LOCATION_LIST_SCROLL_THRESHOLD,
  );

  beginChangeAddress(locationId: string): void {
    this.replaceTargetLocationId.set(locationId);
    this.addSearchRef()?.open();
  }

  onAddFromText(label: string): void {
    const previousLocationId = this.replaceTargetLocationId();
    if (previousLocationId) {
      this.replaceTargetLocationId.set(null);
      this.addSearchRef()?.close();
      this.replaceFromText.emit({ previousLocationId, label });
      return;
    }
    this.addFromText.emit(label);
  }

  onAddFromGeocode(suggestion: ForwardGeocodeResult): void {
    const previousLocationId = this.replaceTargetLocationId();
    if (previousLocationId) {
      this.replaceTargetLocationId.set(null);
      this.addSearchRef()?.close();
      this.replaceFromGeocode.emit({ previousLocationId, suggestion });
      return;
    }
    this.addFromGeocode.emit(suggestion);
  }
}

/** Bias geocoder toward Austria when media has no country; map free-text country to ISO codes. */
function countryCodesForMediaSearch(country: string | null): string[] {
  const raw = country?.trim().toLowerCase() ?? '';
  if (!raw) return ['at'];
  if (raw === 'at' || raw === 'austria' || raw.includes('osterreich') || raw.includes('österreich')) {
    return ['at'];
  }
  if (raw.length === 2) return [raw];
  return ['at'];
}
