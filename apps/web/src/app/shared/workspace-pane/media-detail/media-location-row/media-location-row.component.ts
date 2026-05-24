/**
 * One **saved location row** in media detail (read / edit / actions).
 *
 * **What it does:**
 * - Read: `{street} {house_number}[, staircase][, Top door]`
 * - Edit: street, house_number, staircase, door, extra_information (note not in read line)
 * - Actions: edit (l2), show on map (l1), overflow menu (r1), delete (r2)
 *
 * **Parent:** `app-media-detail-location-section` (list). **Data:** `MediaItemLocationRow` from
 * `MediaLocationsService` via parent view.
 *
 * @see docs/specs/ui/media-detail/media-detail-location-section.md
 */
import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DropdownShellComponent } from '../../../dropdown-trigger/dropdown-shell.component';
import { DetailRowInlineConfirmActionComponent } from '../detail-row-inline-confirm-action/detail-row-inline-confirm-action.component';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import type { MediaItemLocationRow } from '../../../../core/media-locations/media-locations.types';
import {
  formatLocationDisplayLine,
  locationGpsDisplay,
} from '../../../../core/media-locations/media-locations.helpers';
import { I18nService } from '../../../../core/i18n/i18n.service';

export type MediaLocationRowVisualState =
  | 'read'
  | 'editing'
  | 'overflow_menu_open'
  | 'delete_armed';

export interface MediaLocationRowSavePayload {
  locationId: string;
  street: string | null;
  house_number: string | null;
  staircase: string | null;
  door: string | null;
  floor: string | null;
  postcode: string | null;
  extra_information: string | null;
}

export interface MediaLocationCopyField {
  field: 'street' | 'house_number' | 'staircase' | 'door' | 'district' | 'country' | 'gps';
  value: string;
  labelKey: string;
  labelFallback: string;
}

@Component({
  selector: 'app-media-location-row',
  standalone: true,
  imports: [
    DropdownShellComponent,
    DetailRowInlineConfirmActionComponent,
    ...HLM_BUTTON_IMPORTS,
  ],
  templateUrl: './media-location-row.component.html',
  styleUrls: ['./media-location-row.component.scss', '../_detail-row-slots.scss'],
  host: {
    '[attr.data-state]': 'effectiveVisualState()',
  },
})
export class MediaLocationRowComponent {
  private readonly i18n = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18n.t(key, fallback);

  readonly location = input.required<MediaItemLocationRow>();
  readonly locationCount = input(1);
  readonly saving = input(false);

  readonly editRequested = output<string>();
  readonly saveRequested = output<MediaLocationRowSavePayload>();
  readonly editCancelled = output<void>();
  readonly deleteRequested = output<string>();
  readonly mapPickRequested = output<string>();
  readonly showOnMapRequested = output<string>();
  readonly copyFieldRequested = output<MediaLocationCopyField>();
  readonly primaryErrorDismissed = output<void>();

  readonly visualState = signal<MediaLocationRowVisualState>('read');
  readonly overflowMenuOpen = signal(false);

  private readonly overflowAnchorRef = viewChild<ElementRef<HTMLElement>>('overflowAnchorEl');

  readonly overflowAnchorElement = computed(() => this.overflowAnchorRef()?.nativeElement ?? null);

  readonly doorLabel = computed(() => this.t('location.door.label', 'Top'));

  readonly displayLine = computed(() =>
    formatLocationDisplayLine(this.location(), this.doorLabel()),
  );

  readonly canShowOnMap = computed(() => {
    const row = this.location();
    return row.latitude != null && row.longitude != null;
  });

  readonly draftStreet = signal('');
  readonly draftHouseNumber = signal('');
  readonly draftStaircase = signal('');
  readonly draftDoor = signal('');
  readonly draftExtra = signal('');
  readonly draftPostcode = signal('');
  readonly draftFloor = signal('');

  readonly copyActions = computed((): MediaLocationCopyField[] => {
    const row = this.location();
    const gps = locationGpsDisplay(row);
    const items: Array<MediaLocationCopyField | null> = [
      row.street
        ? {
            field: 'street',
            value: row.street,
            labelKey: 'location.copy.street',
            labelFallback: 'Copy street',
          }
        : null,
      row.house_number
        ? {
            field: 'house_number',
            value: row.house_number,
            labelKey: 'location.copy.house_number',
            labelFallback: 'Copy house number',
          }
        : null,
      row.staircase
        ? {
            field: 'staircase',
            value: row.staircase,
            labelKey: 'location.copy.staircase',
            labelFallback: 'Copy staircase',
          }
        : null,
      row.door
        ? {
            field: 'door',
            value: row.door,
            labelKey: 'location.copy.door',
            labelFallback: 'Copy door / Top',
          }
        : null,
      row.district
        ? {
            field: 'district',
            value: row.district,
            labelKey: 'location.copy.district',
            labelFallback: 'Copy district',
          }
        : null,
      row.country
        ? {
            field: 'country',
            value: row.country,
            labelKey: 'location.copy.country',
            labelFallback: 'Copy country',
          }
        : null,
      gps
        ? {
            field: 'gps',
            value: gps,
            labelKey: 'location.copy.gps',
            labelFallback: 'Copy GPS',
          }
        : null,
    ];
    return items.filter((item): item is MediaLocationCopyField => item !== null);
  });

  readonly effectiveVisualState = computed((): MediaLocationRowVisualState => {
    if (this.visualState() === 'delete_armed') {
      return 'delete_armed';
    }
    if (this.visualState() === 'editing') {
      return 'editing';
    }
    if (this.overflowMenuOpen()) {
      return 'overflow_menu_open';
    }
    return 'read';
  });

  startEdit(): void {
    const row = this.location();
    this.draftStreet.set(row.street ?? '');
    this.draftHouseNumber.set(row.house_number ?? '');
    this.draftStaircase.set(row.staircase ?? '');
    this.draftDoor.set(row.door ?? '');
    this.draftExtra.set(row.extra_information ?? '');
    this.draftPostcode.set(row.postcode ?? '');
    this.draftFloor.set(row.floor ?? '');
    this.visualState.set('editing');
    this.editRequested.emit(row.id);
  }

  cancelEdit(): void {
    this.visualState.set('read');
    this.editCancelled.emit();
  }

  saveEdit(): void {
    const row = this.location();
    this.saveRequested.emit({
      locationId: row.id,
      street: this.draftStreet().trim() || null,
      house_number: this.draftHouseNumber().trim() || null,
      staircase: this.draftStaircase().trim() || null,
      door: this.draftDoor().trim() || null,
      floor: this.draftFloor().trim() || null,
      postcode: this.draftPostcode().trim() || null,
      extra_information: this.draftExtra().trim() || null,
    });
    this.visualState.set('read');
  }

  toggleOverflowMenu(): void {
    this.overflowMenuOpen.update((v) => !v);
  }

  closeOverflowMenu(): void {
    this.overflowMenuOpen.set(false);
  }

  onCopyAction(action: MediaLocationCopyField): void {
    this.copyFieldRequested.emit(action);
    this.closeOverflowMenu();
  }

  onMapPick(): void {
    this.mapPickRequested.emit(this.location().id);
    this.closeOverflowMenu();
  }

  onShowOnMap(): void {
    if (!this.canShowOnMap()) {
      return;
    }
    this.showOnMapRequested.emit(this.location().id);
  }

  onDeleteConfirmed(): void {
    this.deleteRequested.emit(this.location().id);
    this.visualState.set('read');
  }

  armDelete(): void {
    this.visualState.set('delete_armed');
    this.closeOverflowMenu();
  }
}
