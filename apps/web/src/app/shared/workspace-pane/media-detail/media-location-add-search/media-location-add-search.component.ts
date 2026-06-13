/**
 * **Add or search address** row at the top of the Location section.
 *
 * Org Recent/Results via `search_locations`; other media + Internet via search stack;
 * pre-resolved pick commits with `link_media_to_location` only when query unchanged.
 *
 * @see docs/specs/ui/media-detail/media-detail-location-section.md
 */
import {
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
  OnDestroy,
} from '@angular/core';
import { DropdownShellComponent } from '../../../dropdown-trigger/shell/dropdown-shell.component';
import { LocationPickerRowComponent } from '../location-picker-row/location-picker-row.component';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MediaLocationsService } from '../../../../core/media-locations/media-locations.service';
import { SearchBarService } from '../../../../core/search/search-bar.service';
import { SearchEngine } from '../../../../core/search/engine/search-engine';
import {
  createCustomSearchEngine,
  engineOptionsFromOrgTuning,
} from '../../../../core/search/engine/search-engine.factory';
import { DbAddressProvider } from '../../../../core/search/providers/db-address.provider';
import { OrgSearchTuningService } from '../../../../core/search/org-search-tuning.service';
import type {
  SearchAddressCandidate,
  SearchCandidate,
  SearchQueryContext,
  SearchResultSet,
} from '../../../../core/search/search.models';
import type { OrgLocationSearchRow } from '../../../../core/media-locations/media-locations.types';
import {
  filterAndDedupeOrgSuggestions,
  formatLocationDisplayLine,
  formatLocationPickerLines,
  legacyMediaHasGps,
  locationRowHasAddressContent,
} from '../../../../core/media-locations/media-locations.helpers';
import type { ForwardGeocodeResult } from '../../../../core/geocoding/geocoding.service';
import { BehaviorSubject, Subscription, finalize, take } from 'rxjs';

export interface MediaLocationLinkedPayload {
  locationId: string;
  /** Set when org row was already linked to this media (idempotent link). */
  alreadyLinked?: boolean;
}

type FlatSelectable =
  | { kind: 'org'; row: OrgLocationSearchRow }
  | { kind: 'other'; candidate: SearchCandidate }
  | { kind: 'internet'; candidate: SearchCandidate }
  | { kind: 'addNew' };

@Component({
  selector: 'app-media-location-add-search',
  standalone: true,
  imports: [DropdownShellComponent, LocationPickerRowComponent, ...HLM_BUTTON_IMPORTS],
  templateUrl: './media-location-add-search.component.html',
  styleUrls: [
    '../address-search/address-search.component.scss',
    './media-location-add-search.component.scss',
    '../_detail-row-slots.scss',
  ],
  host: {
    '[attr.data-state]': 'panelState()',
  },
  providers: [
    {
      provide: SearchEngine,
      useFactory: () => {
        const dbAddress = inject(DbAddressProvider);
        dbAddress.configure({
          termTransform: (displayQuery: string) => {
            const trimmed = displayQuery.trim();
            if (!trimmed) return '';
            const head = trimmed.split(',')[0]?.trim() ?? trimmed;
            return head.length >= 3 ? head : trimmed;
          },
        });
        return createCustomSearchEngine(
          [dbAddress],
          engineOptionsFromOrgTuning(inject(OrgSearchTuningService)),
        );
      },
    },
  ],
})
export class MediaLocationAddSearchComponent implements OnDestroy {
  private readonly elementRef = inject(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly searchBarService = inject(SearchBarService);
  private readonly searchEngine = inject(SearchEngine);
  private readonly mediaLocationsService = inject(MediaLocationsService);
  private readonly i18n = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18n.t(key, fallback);

  readonly mediaItemId = input.required<string>();
  readonly searchContext = input<SearchQueryContext>({});
  readonly disabled = input(false);

  readonly addFromText = output<string>();
  readonly addFromGeocode = output<ForwardGeocodeResult>();
  readonly locationLinked = output<MediaLocationLinkedPayload>();

  readonly active = signal(false);
  readonly query = signal('');
  readonly orgLocationSuggestions = signal<OrgLocationSearchRow[]>([]);
  readonly loadingOrgLocations = signal(false);
  readonly otherMediaSuggestions = signal<SearchCandidate[]>([]);
  readonly placeSuggestions = signal<SearchCandidate[]>([]);
  readonly loadingOther = signal(false);
  readonly loadingPlaces = signal(false);
  readonly focusedIndex = signal(-1);

  readonly preResolvedLocationId = signal<string | null>(null);
  private pickQuerySnapshot = '';

  private readonly internetHistoryStack = signal<SearchCandidate[][]>([]);
  private readonly internetForwardStack = signal<SearchCandidate[][]>([]);

  readonly canGoBackInternet = computed(() => this.internetHistoryStack().length > 0);
  readonly canGoForwardInternet = computed(() => this.internetForwardStack().length > 0);
  readonly internetResultsRefreshing = computed(
    () => this.loadingPlaces() && this.placeSuggestions().length > 0,
  );

  private readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly addressCenterRef = viewChild<ElementRef<HTMLElement>>('addressCenter');
  readonly addressAnchorEl = computed(() => this.addressCenterRef()?.nativeElement ?? null);
  readonly addressCenterWidth = computed(
    () => this.addressCenterRef()?.nativeElement.offsetWidth ?? null,
  );

  readonly doorLabel = computed(() => this.t('location.door.label', 'Top'));

  readonly orgSectionLabel = computed(() =>
    this.query().trim()
      ? this.t('location.dropdown.section.results', 'Results')
      : this.t('location.dropdown.section.recent', 'Recent'),
  );

  readonly flatSelectable = computed((): FlatSelectable[] => {
    const items: FlatSelectable[] = [];
    for (const row of this.orgLocationSuggestions()) {
      items.push({ kind: 'org', row });
    }
    for (const candidate of this.otherMediaSuggestions()) {
      items.push({ kind: 'other', candidate });
    }
    for (const candidate of this.placeSuggestions()) {
      items.push({ kind: 'internet', candidate });
    }
    if (this.query().trim()) {
      items.push({ kind: 'addNew' });
    }
    return items;
  });

  readonly showPanel = computed(
    () =>
      this.active() &&
      (this.orgLocationSuggestions().length > 0 ||
        this.otherMediaSuggestions().length > 0 ||
        this.placeSuggestions().length > 0 ||
        this.loadingOrgLocations() ||
        this.loadingOther() ||
        this.loadingPlaces() ||
        this.query().trim().length > 0),
  );

  readonly panelState = computed(() => {
    if (!this.active()) return 'idle';
    if (this.showPanel()) return 'dropdown_open';
    return 'typing';
  });

  readonly newAddressRowLabel = computed(() => this.formatNewAddressLabel(this.query().trim()));
  readonly addNewAriaLabel = computed(() => this.newAddressRowLabel());

  readonly newAddressPickerLines = computed(() => ({
    primary: this.query().trim(),
    secondary: this.t('location.dropdown.addNew.hint', 'Creates a new org location'),
  }));

  pickerLines(row: OrgLocationSearchRow): { primary: string; secondary: string } {
    return formatLocationPickerLines(row, this.doorLabel());
  }

  candidatePickerLines(candidate: SearchCandidate): { primary: string; secondary: string } {
    if (candidate.family === 'db-address' || candidate.family === 'geocoder') {
      return {
        primary: candidate.label,
        secondary: candidate.secondaryLabel?.trim() ?? '',
      };
    }
    return { primary: candidate.label, secondary: '' };
  }

  isFocusedFlatIndex(index: number): boolean {
    return this.focusedIndex() === index;
  }

  flatIndexForOrg(rowId: string): number {
    return this.flatSelectable().findIndex(
      (item) => item.kind === 'org' && item.row.id === rowId,
    );
  }

  private readonly queryChanges = new BehaviorSubject<string>('');
  private readonly contextChanges = new BehaviorSubject<SearchQueryContext>({});
  private searchSub: Subscription | null = null;
  private geocoderTimer: ReturnType<typeof setTimeout> | null = null;
  private geocoderSub: Subscription | null = null;
  private orgSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private orgSearchGen = 0;

  constructor() {
    effect(() => this.contextChanges.next(this.searchContext()));
    effect(() => {
      if (!this.active()) return;
      setTimeout(() => this.searchInputRef()?.nativeElement?.focus(), 0);
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.active()) return;
    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.close();
    }
  }

  open(): void {
    if (this.disabled()) return;
    this.active.set(true);
    this.query.set('');
    this.clearPreResolved();
    this.searchSub?.unsubscribe();
    this.searchSub = this.searchEngine
      .searchInput(this.queryChanges.asObservable(), this.contextChanges.asObservable())
      .subscribe((r) => this.applyDbResult(r));
    this.queryChanges.next('');
    void this.loadOrgLocations('');
  }

  close(): void {
    this.active.set(false);
    this.query.set('');
    this.orgLocationSuggestions.set([]);
    this.otherMediaSuggestions.set([]);
    this.placeSuggestions.set([]);
    this.internetHistoryStack.set([]);
    this.internetForwardStack.set([]);
    this.focusedIndex.set(-1);
    this.clearPreResolved();
    this.clearGeocoder();
    this.clearOrgSearchTimer();
    this.searchSub?.unsubscribe();
    this.searchSub = null;
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.syncQuery(value);
  }

  private syncQuery(value: string): void {
    this.query.set(value);
    if (this.preResolvedLocationId() && value !== this.pickQuerySnapshot) {
      this.clearPreResolved();
    }
    this.focusedIndex.set(-1);
    if (value.trim()) {
      this.loadingOther.set(true);
    } else {
      this.loadingOther.set(false);
      this.otherMediaSuggestions.set([]);
    }
    this.queryChanges.next(value);
    this.scheduleOrgSearch(value);
    this.runGeocoderDebounced(value);
    this.cdr.detectChanges();
  }

  onOrgLocationClick(row: OrgLocationSearchRow, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const displayLine = formatLocationDisplayLine(row, this.doorLabel());
    this.preResolvedLocationId.set(row.id);
    this.pickQuerySnapshot = displayLine;
    const input = this.searchInputRef()?.nativeElement;
    if (input) {
      input.value = displayLine;
    }
    this.syncQuery(displayLine);
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    const flat = this.flatSelectable();
    if (event.key === 'ArrowDown' && flat.length > 0) {
      event.preventDefault();
      const next = Math.min(flat.length - 1, this.focusedIndex() + 1);
      this.focusedIndex.set(next);
      return;
    }
    if (event.key === 'ArrowUp' && flat.length > 0) {
      event.preventDefault();
      const next = Math.max(0, this.focusedIndex() - 1);
      this.focusedIndex.set(next === 0 && this.focusedIndex() === 0 ? -1 : next);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      void this.commitAddNew();
    }
  }

  onInternetClick(candidate: SearchCandidate, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.clearPreResolved();
    this.syncQuery(candidate.label);
    const input = this.searchInputRef()?.nativeElement;
    if (input) {
      input.value = candidate.label;
    }
  }

  async commitAddNew(): Promise<void> {
    const text = this.query().trim();
    if (!text) return;

    const preId = this.preResolvedLocationId();
    if (preId && text === this.pickQuerySnapshot) {
      const row = this.orgLocationSuggestions().find((r) => r.id === preId);
      if (
        row &&
        !locationRowHasAddressContent(row) &&
        !legacyMediaHasGps(row.latitude, row.longitude)
      ) {
        return;
      }
      this.locationLinked.emit({
        locationId: preId,
        alreadyLinked: row?.is_linked_to_media === true,
      });
      this.close();
      return;
    }

    const flat = this.flatSelectable();
    const idx = this.focusedIndex();
    if (idx >= 0 && flat[idx]) {
      const item = flat[idx]!;
      if (item.kind === 'org') {
        this.onOrgLocationClick(item.row, new Event('click'));
        return;
      }
      if (item.kind === 'other' || item.kind === 'internet') {
        await this.applyInternetCandidate(item.candidate);
        return;
      }
      if (item.kind === 'addNew') {
        this.addFromText.emit(text);
        this.close();
        return;
      }
    }

    this.addFromText.emit(text);
    this.close();
  }

  goBackInternet(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const stack = this.internetHistoryStack();
    if (stack.length === 0) return;
    this.clearGeocoder();
    this.pushInternetForwardSnapshotFrom([...this.placeSuggestions()]);
    this.placeSuggestions.set(stack[stack.length - 1] ?? []);
    this.internetHistoryStack.set(stack.slice(0, -1));
    this.cdr.detectChanges();
  }

  goForwardInternet(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const stack = this.internetForwardStack();
    if (stack.length === 0) return;
    this.clearGeocoder();
    this.pushInternetBackSnapshotFrom([...this.placeSuggestions()]);
    this.placeSuggestions.set(stack[stack.length - 1] ?? []);
    this.internetForwardStack.set(stack.slice(0, -1));
    this.cdr.detectChanges();
  }

  async applyInternetCandidate(candidate: SearchCandidate): Promise<void> {
    if (candidate.family !== 'geocoder' && candidate.family !== 'db-address') {
      return;
    }
    const mapped = await this.searchBarService.resolveForwardGeocodeFromAddressCandidate(
      candidate as SearchAddressCandidate,
    );
    this.addFromGeocode.emit(mapped);
    this.close();
  }

  ngOnDestroy(): void {
    this.clearGeocoder();
    this.clearOrgSearchTimer();
    this.searchSub?.unsubscribe();
  }

  private clearPreResolved(): void {
    this.preResolvedLocationId.set(null);
    this.pickQuerySnapshot = '';
  }

  private scheduleOrgSearch(value: string): void {
    this.clearOrgSearchTimer();
    this.orgSearchTimer = setTimeout(() => {
      this.orgSearchTimer = null;
      void this.loadOrgLocations(value);
    }, 280);
  }

  private clearOrgSearchTimer(): void {
    if (this.orgSearchTimer) clearTimeout(this.orgSearchTimer);
    this.orgSearchTimer = null;
  }

  private async loadOrgLocations(displayQuery: string): Promise<void> {
    const gen = ++this.orgSearchGen;
    const trimmed = displayQuery.trim();
    const limit = trimmed ? 12 : 5;
    this.loadingOrgLocations.set(true);
    const result = await this.mediaLocationsService.searchLocations(
      trimmed || null,
      limit,
      this.mediaItemId(),
    );
    if (gen !== this.orgSearchGen) return;
    this.loadingOrgLocations.set(false);
    if (result.ok) {
      this.orgLocationSuggestions.set(filterAndDedupeOrgSuggestions(result.rows));
    } else {
      this.orgLocationSuggestions.set([]);
    }
    this.cdr.detectChanges();
  }

  private applyDbResult(result: SearchResultSet): void {
    if (result.query !== this.query()) {
      return;
    }

    const section = result.sections.find((s) => s.family === 'db-address');
    this.otherMediaSuggestions.set(section?.items ?? []);
    this.loadingOther.set(result.state === 'typing' && !!this.query().trim());
    if (result.state === 'results-complete' || result.state === 'focused-empty') {
      this.loadingOther.set(false);
    }
  }

  private runGeocoderDebounced(q: string): void {
    this.clearGeocoder();
    if (!q.trim()) {
      this.placeSuggestions.set([]);
      return;
    }
    const previousSnapshot = [...this.placeSuggestions()];
    this.loadingPlaces.set(true);
    this.geocoderTimer = setTimeout(() => {
      this.geocoderTimer = null;
      this.geocoderSub = this.searchBarService
        .resolveGeocoderCandidates(q.trim(), this.searchContext())
        .pipe(take(1), finalize(() => this.loadingPlaces.set(false)))
        .subscribe({
          next: (items) => {
            if (
              previousSnapshot.length > 0 &&
              this.areInternetResultListsEquivalent(previousSnapshot, items)
            ) {
              return;
            }
            if (previousSnapshot.length > 0) {
              this.pushInternetBackSnapshotFrom(previousSnapshot);
              this.internetForwardStack.set([]);
            }
            this.placeSuggestions.set(items);
          },
          error: () => this.placeSuggestions.set([]),
        });
    }, this.searchBarService.orchestratorOptionsFromOrg().debounceMs);
  }

  private clearGeocoder(): void {
    if (this.geocoderTimer) clearTimeout(this.geocoderTimer);
    this.geocoderTimer = null;
    this.geocoderSub?.unsubscribe();
    this.geocoderSub = null;
    this.loadingPlaces.set(false);
  }

  private areInternetResultListsEquivalent(
    left: SearchCandidate[],
    right: SearchCandidate[],
  ): boolean {
    if (left.length !== right.length) return false;
    const leftKeys = left.map((c) => this.internetResultFingerprint(c)).sort();
    const rightKeys = right.map((c) => this.internetResultFingerprint(c)).sort();
    return leftKeys.every((key, index) => key === rightKeys[index]);
  }

  private internetResultFingerprint(candidate: SearchCandidate): string {
    const label = candidate.label.trim().toLowerCase().replace(/\s+/g, ' ');
    const head = label.split(',')[0]?.trim() ?? label;
    const houseMatch = head.match(/(\d+[a-z]?)$/i);
    const street = (houseMatch ? head.slice(0, houseMatch.index).trim() : head).replace(/\.+$/, '');
    const house = houseMatch?.[1]?.toLowerCase() ?? '';
    const geo =
      candidate.family === 'geocoder' || candidate.family === 'db-address'
        ? `${candidate.lat.toFixed(4)}|${candidate.lng.toFixed(4)}`
        : '';
    return `${street}|${house}|${geo}`;
  }

  private pushInternetBackSnapshotFrom(snapshot: SearchCandidate[]): void {
    if (snapshot.length === 0) return;
    this.internetHistoryStack.update((stack) => {
      const top = stack[stack.length - 1];
      if (top && this.areInternetResultListsEquivalent(top, snapshot)) {
        return stack;
      }
      return [...stack, snapshot];
    });
  }

  private pushInternetForwardSnapshotFrom(snapshot: SearchCandidate[]): void {
    if (snapshot.length === 0) return;
    this.internetForwardStack.update((stack) => {
      const top = stack[stack.length - 1];
      if (top && this.areInternetResultListsEquivalent(top, snapshot)) {
        return stack;
      }
      return [...stack, snapshot];
    });
  }

  private dbSearchTerm(displayQuery: string): string {
    const trimmed = displayQuery.trim();
    if (!trimmed) return '';
    const head = trimmed.split(',')[0]?.trim() ?? trimmed;
    return head.length >= 3 ? head : trimmed;
  }

  private formatNewAddressLabel(trimmedQuery: string): string {
    return this.t('location.dropdown.addNew', 'Add new Address: "{query}"').replace('{query}', trimmedQuery);
  }
}
