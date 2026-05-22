/**
 * **Add or search address** row at the top of the Location section.
 *
 * **What it does:**
 * - Collapsed: looks like metadata "Add metadata" row (search icon + label)
 * - Active: combobox + dropdown with 4 zones:
 *   1. Results — rows already on this media (filter only, not selectable to add)
 *   2. Other media — org DB addresses (`SearchBarService` / resolver stack)
 *   3. Internet — Nominatim; click fills input and re-searches (does not create row)
 *   4. Add new Address — always visible; Enter or click creates row via parent
 *
 * **Parent:** `app-media-detail-location-section`. **Persistence:** parent emits
 * `addFromText` / `addFromGeocode` → `MediaDetailViewComponent` → `MediaLocationsService`.
 *
 * Reuses search patterns from legacy `app-address-search` (different product rules).
 *
 * @see docs/specs/ui/media-detail/media-detail-location-section.md
 * @see docs/specs/ui/media-detail/address-search.md (legacy whole-address search)
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
import { DropdownShellComponent } from '../../../dropdown-trigger/dropdown-shell.component';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { SearchBarService } from '../../../../core/search/search-bar.service';
import { SearchOrchestratorService } from '../../../../core/search/search-orchestrator.service';
import type {
  SearchAddressCandidate,
  SearchCandidate,
  SearchQueryContext,
  SearchResultSet,
} from '../../../../core/search/search.models';
import type { MediaItemLocationRow } from '../../../../core/media-locations/media-locations.types';
import { formatLocationDisplayLine, locationMatchesQuery } from '../../../../core/media-locations/media-locations.helpers';
import type { ForwardGeocodeResult } from '../../../../core/geocoding/geocoding.service';
import { BehaviorSubject, Subscription, finalize, take } from 'rxjs';

@Component({
  selector: 'app-media-location-add-search',
  standalone: true,
  imports: [DropdownShellComponent, ...HLM_BUTTON_IMPORTS],
  templateUrl: './media-location-add-search.component.html',
  styleUrls: [
    '../address-search/address-search.component.scss',
    './media-location-add-search.component.scss',
    '../_detail-row-slots.scss',
  ],
  host: {
    '[attr.data-state]': 'panelState()',
  },
})
export class MediaLocationAddSearchComponent implements OnDestroy {
  private readonly elementRef = inject(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly searchBarService = inject(SearchBarService);
  private readonly searchOrchestrator = inject(SearchOrchestratorService);
  private readonly i18n = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18n.t(key, fallback);

  readonly locations = input<MediaItemLocationRow[]>([]);
  readonly searchContext = input<SearchQueryContext>({});
  readonly disabled = input(false);

  readonly addFromText = output<string>();
  readonly addFromGeocode = output<ForwardGeocodeResult>();

  // Stable state: idle — collapsed row; active — combobox open; panelState maps to data-state on host.
  // @see docs/specs/ui/media-detail/media-detail-location-section.md
  /** Whether the add/search row is expanded (combobox + optional dropdown). */
  readonly active = signal(false);

  /**
   * Raw combobox text (may include trailing spaces). Drives DB/geocoder search and Results filter.
   * Updated only in `syncQuery` from the native input — never bound with `[value]` on the input.
   */
  readonly query = signal('');

  readonly otherMediaSuggestions = signal<SearchCandidate[]>([]);
  readonly placeSuggestions = signal<SearchCandidate[]>([]);
  readonly loadingOther = signal(false);
  readonly loadingPlaces = signal(false);
  readonly focusedIndex = signal(-1);

  /** Template ref `#searchInput` — source of truth for typed text on `(input)`. */
  private readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  /** Template ref `#addressCenter` — dropdown anchors to this element’s width/position. */
  private readonly addressCenterRef = viewChild<ElementRef<HTMLElement>>('addressCenter');
  readonly addressAnchorEl = computed(() => this.addressCenterRef()?.nativeElement ?? null);
  readonly addressCenterWidth = computed(
    () => this.addressCenterRef()?.nativeElement.offsetWidth ?? null,
  );

  readonly doorLabel = computed(() => this.t('location.door.label', 'Top'));

  readonly resultRows = computed(() => {
    const q = this.query();
    return this.locations().filter((row) => locationMatchesQuery(row, q));
  });

  readonly selectableCandidates = computed(() => [
    ...this.otherMediaSuggestions(),
    ...this.placeSuggestions(),
  ]);

  /** True when dropdown should render (any zone has content or user has typed non-empty query). */
  readonly showPanel = computed(
    () =>
      this.active() &&
      (this.resultRows().length > 0 ||
        this.otherMediaSuggestions().length > 0 ||
        this.placeSuggestions().length > 0 ||
        this.loadingOther() ||
        this.loadingPlaces() ||
        this.query().trim().length > 0),
  );

  readonly panelState = computed(() => {
    if (!this.active()) return 'idle';
    if (this.showPanel()) return 'dropdown_open';
    return 'typing';
  });

  /** i18n label for the New address row — derived from `query` only. */
  readonly newAddressRowLabel = computed(() => this.formatNewAddressLabel(this.query().trim()));

  readonly addNewAriaLabel = computed(() => this.newAddressRowLabel());

  formatRowLine(row: MediaItemLocationRow): string {
    return formatLocationDisplayLine(row, this.doorLabel());
  }

  /** Rx bridge for `SearchOrchestratorService.searchInput` (debounced DB search). */
  private readonly queryChanges = new BehaviorSubject<string>('');
  private readonly contextChanges = new BehaviorSubject<SearchQueryContext>({});
  private searchSub: Subscription | null = null;
  private geocoderTimer: ReturnType<typeof setTimeout> | null = null;
  private geocoderSub: Subscription | null = null;

  constructor() {
    effect(() => this.contextChanges.next(this.searchContext()));
    // Focus combobox once when row opens. MUST NOT read `query` here — that re-ran the effect on
    // every keystroke and (with setTimeout) overwrote input.value back to a stale character.
    // @see docs/specs/ui/media-detail/media-detail-location-section.md
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
    this.searchOrchestrator.configureSources({
      dbAddressResolver: (q, ctx) =>
        this.searchBarService.resolveDbAddressCandidates(this.dbSearchTerm(q), ctx),
    });
    this.searchSub?.unsubscribe();
    this.searchSub = this.searchOrchestrator
      .searchInput(this.queryChanges.asObservable(), this.contextChanges.asObservable())
      .subscribe((r) => this.applyDbResult(r));
    this.queryChanges.next('');
  }

  close(): void {
    this.active.set(false);
    this.query.set('');
    this.otherMediaSuggestions.set([]);
    this.placeSuggestions.set([]);
    this.focusedIndex.set(-1);
    this.clearGeocoder();
    this.searchSub?.unsubscribe();
    this.searchSub = null;
  }

  /**
   * Native `(input)` handler. Reads `event.target.value` synchronously — do not use `[value]="query()"`
   * on the input; that binding fought the DOM and left `query` stuck on the first character.
   */
  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.syncQuery(value);
  }

  /** Single place that updates `query` and search side effects from combobox text. */
  private syncQuery(value: string): void {
    this.query.set(value);
    this.focusedIndex.set(-1);
    if (value.trim()) {
      this.loadingOther.set(true);
    } else {
      this.loadingOther.set(false);
      this.otherMediaSuggestions.set([]);
    }
    this.queryChanges.next(value);
    this.runGeocoderDebounced(value);
    // Same as metadata-property-picker: projected dropdown content must be re-checked explicitly.
    this.cdr.detectChanges();
  }

  private formatNewAddressLabel(trimmedQuery: string): string {
    return this.t('location.dropdown.addNew', 'Add new Address: "{query}"').replace('{query}', trimmedQuery);
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      void this.commitAddNew();
    }
  }

  /** Internet/DB pick: copy label into combobox and re-run search (does not create a row). */
  onInternetClick(candidate: SearchCandidate, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.syncQuery(candidate.label);
    const input = this.searchInputRef()?.nativeElement;
    if (input) {
      input.value = candidate.label;
    }
  }

  async commitAddNew(): Promise<void> {
    const text = this.query().trim();
    if (!text) return;
    const candidates = this.selectableCandidates();
    const idx = this.focusedIndex();
    if (idx >= 0 && candidates[idx]) {
      await this.applyInternetCandidate(candidates[idx]!);
      return;
    }
    this.addFromText.emit(text);
    this.close();
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
    this.searchSub?.unsubscribe();
  }

  private applyDbResult(result: SearchResultSet): void {
    const section = result.sections.find((s) => s.family === 'db-address');
    this.otherMediaSuggestions.set(section?.items ?? []);
    this.loadingOther.set(false);
  }

  private runGeocoderDebounced(q: string): void {
    this.clearGeocoder();
    if (!q.trim()) {
      this.placeSuggestions.set([]);
      return;
    }
    this.loadingPlaces.set(true);
    this.geocoderTimer = setTimeout(() => {
      this.geocoderTimer = null;
      this.geocoderSub = this.searchBarService
        .resolveGeocoderCandidates(q.trim(), this.searchContext())
        .pipe(take(1), finalize(() => this.loadingPlaces.set(false)))
        .subscribe({
          next: (items) => this.placeSuggestions.set(items),
          error: () => this.placeSuggestions.set([]),
        });
    }, 400);
  }

  private clearGeocoder(): void {
    if (this.geocoderTimer) clearTimeout(this.geocoderTimer);
    this.geocoderTimer = null;
    this.geocoderSub?.unsubscribe();
    this.geocoderSub = null;
    this.loadingPlaces.set(false);
  }

  private dbSearchTerm(displayQuery: string): string {
    const trimmed = displayQuery.trim();
    if (!trimmed) return '';
    const head = trimmed.split(',')[0]?.trim() ?? trimmed;
    return head.length >= 3 ? head : trimmed;
  }

}
