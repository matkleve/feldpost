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
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  computeLocationCopySubmenuGeom,
  type LocationCopySubmenuGeom,
} from './media-location-copy-submenu-geometry';
import { DropdownShellComponent } from '../../../dropdown-trigger/dropdown-shell.component';
import { ConfirmDialogComponent } from '../../../confirm-dialog/confirm-dialog.component';
import { DetailRowInlineConfirmActionComponent } from '../detail-row-inline-confirm-action/detail-row-inline-confirm-action.component';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import { HlmMenuItemDirective, HlmMenuSeparatorDirective } from '../../../../shared/ui/menu';
import type { MediaItemLocationRow } from '../../../../core/media-locations/media-locations.types';
import {
  formatLocationFullAddressCopy,
  formatLocationDisplayLine,
  legacyMediaHasGps,
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

export type MediaLocationCopyFieldId =
  | 'full_address'
  | 'street'
  | 'house_number'
  | 'staircase'
  | 'door'
  | 'postcode'
  | 'floor'
  | 'city'
  | 'district'
  | 'country'
  | 'gps';

export interface MediaLocationCopyField {
  field: MediaLocationCopyFieldId;
  value: string;
  labelKey: string;
  labelFallback: string;
  icon: string;
}

const COPY_FIELD_ICONS: Record<MediaLocationCopyFieldId, string> = {
  full_address: 'home',
  street: 'signpost',
  house_number: 'tag',
  staircase: 'stairs',
  door: 'door_front',
  postcode: 'local_post_office',
  floor: 'layers',
  city: 'location_city',
  district: 'terrain',
  country: 'public',
  gps: 'my_location',
};

@Component({
  selector: 'app-media-location-row',
  standalone: true,
  imports: [
    DropdownShellComponent,
    ConfirmDialogComponent,
    DetailRowInlineConfirmActionComponent,
    HlmMenuItemDirective,
    HlmMenuSeparatorDirective,
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
  private readonly destroyRef = inject(DestroyRef);
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
  readonly changeAddressRequested = output<string>();
  readonly copyFieldRequested = output<MediaLocationCopyField>();
  readonly primaryErrorDismissed = output<void>();

  readonly visualState = signal<MediaLocationRowVisualState>('read');
  readonly overflowMenuOpen = signal(false);
  readonly copySubmenuOpen = signal(false);
  readonly sharedEditConfirmOpen = signal(false);
  readonly copySubmenuGeom = signal<LocationCopySubmenuGeom | null>(null);

  private readonly overflowAnchorRef = viewChild<ElementRef<HTMLElement>>('overflowAnchorEl');
  private readonly copySubmenuTriggerRef =
    viewChild<ElementRef<HTMLButtonElement>>('copySubmenuTrigger');

  readonly overflowAnchorElement = computed(() => this.overflowAnchorRef()?.nativeElement ?? null);

  private copySubmenuCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private copySubmenuRepositionListener: (() => void) | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearCopySubmenuCloseTimer();
      this.unbindCopySubmenuReposition();
    });
  }

  readonly doorLabel = computed(() => this.t('location.door.label', 'Top'));

  readonly displayLine = computed(() =>
    formatLocationDisplayLine(this.location(), this.doorLabel()),
  );

  readonly canShowOnMap = computed(() => {
    const row = this.location();
    return legacyMediaHasGps(row.latitude, row.longitude);
  });

  readonly draftStreet = signal('');
  readonly draftHouseNumber = signal('');
  readonly draftStaircase = signal('');
  readonly draftDoor = signal('');
  readonly draftExtra = signal('');
  readonly draftPostcode = signal('');
  readonly draftFloor = signal('');

  readonly copyMenuActions = computed((): MediaLocationCopyField[] => {
    const row = this.location();
    const doorLabel = this.doorLabel();
    const gps = locationGpsDisplay(row);
    const items: MediaLocationCopyField[] = [];

    const fullAddress = formatLocationFullAddressCopy(row, doorLabel).trim();
    if (fullAddress) {
      items.push({
        field: 'full_address',
        value: fullAddress,
        labelKey: 'location.copy.full_address',
        labelFallback: 'Copy full address',
        icon: COPY_FIELD_ICONS.full_address,
      });
    }

    const parts: Array<MediaLocationCopyField | null> = [
      row.street
        ? {
            field: 'street',
            value: row.street,
            labelKey: 'location.copy.street',
            labelFallback: 'Copy street',
            icon: COPY_FIELD_ICONS.street,
          }
        : null,
      row.house_number
        ? {
            field: 'house_number',
            value: row.house_number,
            labelKey: 'location.copy.house_number',
            labelFallback: 'Copy house number',
            icon: COPY_FIELD_ICONS.house_number,
          }
        : null,
      row.staircase
        ? {
            field: 'staircase',
            value: row.staircase,
            labelKey: 'location.copy.staircase',
            labelFallback: 'Copy staircase',
            icon: COPY_FIELD_ICONS.staircase,
          }
        : null,
      row.door
        ? {
            field: 'door',
            value: row.door,
            labelKey: 'location.copy.door',
            labelFallback: 'Copy door / Top',
            icon: COPY_FIELD_ICONS.door,
          }
        : null,
      row.postcode
        ? {
            field: 'postcode',
            value: row.postcode,
            labelKey: 'location.copy.postcode',
            labelFallback: 'Copy postcode',
            icon: COPY_FIELD_ICONS.postcode,
          }
        : null,
      row.floor
        ? {
            field: 'floor',
            value: row.floor,
            labelKey: 'location.copy.floor',
            labelFallback: 'Copy floor',
            icon: COPY_FIELD_ICONS.floor,
          }
        : null,
      row.city
        ? {
            field: 'city',
            value: row.city,
            labelKey: 'location.copy.city',
            labelFallback: 'Copy city',
            icon: COPY_FIELD_ICONS.city,
          }
        : null,
      row.district
        ? {
            field: 'district',
            value: row.district,
            labelKey: 'location.copy.district',
            labelFallback: 'Copy district',
            icon: COPY_FIELD_ICONS.district,
          }
        : null,
      row.country
        ? {
            field: 'country',
            value: row.country,
            labelKey: 'location.copy.country',
            labelFallback: 'Copy country',
            icon: COPY_FIELD_ICONS.country,
          }
        : null,
      gps
        ? {
            field: 'gps',
            value: gps,
            labelKey: 'location.copy.gps',
            labelFallback: 'Copy GPS',
            icon: COPY_FIELD_ICONS.gps,
          }
        : null,
    ];

    items.push(...parts.filter((item): item is MediaLocationCopyField => item !== null));
    return items;
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

  requestEditAddress(): void {
    this.sharedEditConfirmOpen.set(true);
  }

  onSharedEditConfirm(): void {
    this.sharedEditConfirmOpen.set(false);
    this.startEdit();
  }

  onSharedEditCancel(): void {
    this.sharedEditConfirmOpen.set(false);
  }

  onEditAddressMenu(): void {
    this.closeOverflowMenu();
    this.requestEditAddress();
  }

  onChangeAddressMenu(): void {
    this.changeAddressRequested.emit(this.location().id);
    this.closeOverflowMenu();
  }

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
    if (!this.overflowMenuOpen()) {
      this.copySubmenuOpen.set(false);
    }
  }

  closeOverflowMenu(): void {
    this.overflowMenuOpen.set(false);
    this.closeCopySubmenu();
  }

  openCopySubmenu(): void {
    const trigger = this.copySubmenuTriggerRef()?.nativeElement;
    if (!trigger) {
      return;
    }
    this.clearCopySubmenuCloseTimer();
    this.copySubmenuGeom.set(computeLocationCopySubmenuGeom(trigger));
    this.copySubmenuOpen.set(true);
    this.bindCopySubmenuReposition();
  }

  scheduleCloseCopySubmenu(): void {
    this.clearCopySubmenuCloseTimer();
    this.copySubmenuCloseTimer = setTimeout(() => this.closeCopySubmenu(), 150);
  }

  cancelCloseCopySubmenu(): void {
    this.clearCopySubmenuCloseTimer();
  }

  onCopySubmenuTriggerClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.copySubmenuOpen()) {
      this.closeCopySubmenu();
      return;
    }
    this.openCopySubmenu();
  }

  private closeCopySubmenu(): void {
    this.clearCopySubmenuCloseTimer();
    this.copySubmenuOpen.set(false);
    this.copySubmenuGeom.set(null);
    this.unbindCopySubmenuReposition();
  }

  private clearCopySubmenuCloseTimer(): void {
    if (this.copySubmenuCloseTimer != null) {
      clearTimeout(this.copySubmenuCloseTimer);
      this.copySubmenuCloseTimer = null;
    }
  }

  private bindCopySubmenuReposition(): void {
    if (typeof document === 'undefined' || this.copySubmenuRepositionListener) {
      return;
    }
    this.copySubmenuRepositionListener = () => {
      if (!this.copySubmenuOpen()) {
        return;
      }
      const trigger = this.copySubmenuTriggerRef()?.nativeElement;
      if (trigger) {
        this.copySubmenuGeom.set(computeLocationCopySubmenuGeom(trigger));
      }
    };
    document.addEventListener('scroll', this.copySubmenuRepositionListener, {
      capture: true,
      passive: true,
    });
    window.addEventListener('resize', this.copySubmenuRepositionListener, { passive: true });
  }

  private unbindCopySubmenuReposition(): void {
    if (!this.copySubmenuRepositionListener) {
      return;
    }
    document.removeEventListener('scroll', this.copySubmenuRepositionListener, true);
    window.removeEventListener('resize', this.copySubmenuRepositionListener);
    this.copySubmenuRepositionListener = null;
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
