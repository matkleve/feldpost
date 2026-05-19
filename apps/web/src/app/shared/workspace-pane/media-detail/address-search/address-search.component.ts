import { Component, effect, ElementRef, HostListener, inject, input, output, signal, viewChild, OnDestroy } from '@angular/core';
import type { ForwardGeocodeResult } from '../../../../core/geocoding/geocoding.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { SearchBarService } from '../../../../core/search/search-bar.service';
import { SearchOrchestratorService } from '../../../../core/search/search-orchestrator.service';
import type {
  SearchCandidate,
  SearchQueryContext,
  SearchResultSet,
} from '../../../../core/search/search.models';
import { BehaviorSubject, Subscription, take } from 'rxjs';

@Component({
  selector: 'app-address-search',
  standalone: true,
  imports: [],
  templateUrl: './address-search.component.html',
  styleUrl: './address-search.component.scss',
})
export class AddressSearchComponent implements OnDestroy {
  private readonly elementRef = inject(ElementRef);
  private readonly searchBarService = inject(SearchBarService);
  private readonly searchOrchestrator = inject(SearchOrchestratorService);
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly currentAddress = input('');
  readonly suggestionApplied = output<ForwardGeocodeResult>();

  // Stable state: idle — trigger button visible, input and dropdown hidden
  // @see docs/specs/ui/workspace/workspace-pane.md
  readonly active = signal(false);
  readonly query = signal('');

  // Stable state: active — two-section results dropdown (saved locations + geocoded places)
  // @see docs/specs/ui/workspace/workspace-pane.md
  readonly savedSuggestions = signal<SearchCandidate[]>([]);
  readonly placeSuggestions = signal<SearchCandidate[]>([]);
  readonly loadingSaved = signal(false);
  readonly loadingPlaces = signal(false);

  // Template reference to the text input — used for auto-focus when search opens
  // @see docs/specs/ui/workspace/workspace-pane.md
  private readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('addressSearchInput');

  private readonly queryChanges = new BehaviorSubject<string>('');
  private readonly contextChanges = new BehaviorSubject<SearchQueryContext>({});
  private searchSubscription: Subscription | null = null;
  private geocoderDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private geocoderSubscription: Subscription | null = null;

  constructor() {
    // Auto-focus the input whenever the search activates
    // @see docs/specs/ui/workspace/workspace-pane.md
    effect(() => {
      if (!this.active()) return;
      setTimeout(() => {
        const input = this.searchInputRef()?.nativeElement;
        if (input) {
          input.focus();
          const len = input.value.length;
          input.setSelectionRange(len, len);
        }
      }, 0);
    });
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.active()) return;
    const target = event.target as Node | null;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.cancel();
    }
  }

  open(): void {
    const current = this.currentAddress();
    this.query.set(current);
    this.active.set(true);
    // Reset before subscribing to avoid carrying over stale query
    this.queryChanges.next('');

    // Geocoder is bypassed here to avoid shared-singleton adapter conflicts with the map search bar.
    // resolveGeocoderCandidates is called directly in runGeocoderDebounced instead.
    // @see docs/specs/ui/workspace/workspace-pane.md
    this.searchOrchestrator.configureSources({
      dbAddressResolver: (q, ctx) => this.searchBarService.resolveDbAddressCandidates(q, ctx),
    });

    this.searchSubscription?.unsubscribe();
    this.searchSubscription = this.searchOrchestrator
      .searchInput(this.queryChanges.asObservable(), this.contextChanges.asObservable())
      .subscribe((result) => this.applySearchResult(result));

    if (current.trim()) {
      this.queryChanges.next(current);
      this.runGeocoderDebounced(current);
    }
  }

  cancel(): void {
    this.active.set(false);
    this.query.set('');
    this.savedSuggestions.set([]);
    this.placeSuggestions.set([]);
    this.loadingSaved.set(false);
    this.loadingPlaces.set(false);
    this.clearGeocoderDebounce();
    this.searchSubscription?.unsubscribe();
    this.searchSubscription = null;
  }

  onInput(q: string): void {
    this.query.set(q);
    if (!q.trim()) {
      this.savedSuggestions.set([]);
      this.placeSuggestions.set([]);
    }
    this.queryChanges.next(q);
    this.runGeocoderDebounced(q);
  }

  selectFirst(): void {
    const saved = this.savedSuggestions();
    const places = this.placeSuggestions();
    const first = saved[0] ?? places[0];
    if (first) this.apply(first);
  }

  apply(candidate: SearchCandidate): void {
    const lat =
      candidate.family === 'db-address' || candidate.family === 'geocoder' ? candidate.lat : 0;
    const lng =
      candidate.family === 'db-address' || candidate.family === 'geocoder' ? candidate.lng : 0;
    const mapped: ForwardGeocodeResult = {
      lat,
      lng,
      addressLabel: candidate.label,
      city: null,
      district: null,
      street: null,
      streetNumber: null,
      zip: null,
      country: null,
    };
    this.suggestionApplied.emit(mapped);
    this.active.set(false);
    this.query.set('');
    this.savedSuggestions.set([]);
    this.placeSuggestions.set([]);
    this.loadingSaved.set(false);
    this.loadingPlaces.set(false);
    this.clearGeocoderDebounce();
    this.searchSubscription?.unsubscribe();
    this.searchSubscription = null;
  }

  clearAddress(): void {
    // Emit empty suggestion to clear stored address on parent
    this.suggestionApplied.emit({
      lat: 0, lng: 0, addressLabel: '', city: null,
      district: null, street: null, streetNumber: null, zip: null, country: null,
    });
  }

  ngOnDestroy(): void {
    this.clearGeocoderDebounce();
    this.searchSubscription?.unsubscribe();
  }

  private applySearchResult(result: SearchResultSet): void {
    const dbAddressSection = result.sections.find((s) => s.family === 'db-address');
    this.savedSuggestions.set(dbAddressSection?.items ?? []);
    // DB address results arrive with the partial result — loading is false by the time items appear
    this.loadingSaved.set(false);
    // placeSuggestions and loadingPlaces are managed by runGeocoderDebounced (direct geocoder path)
  }

  private runGeocoderDebounced(q: string): void {
    if (this.geocoderDebounceTimer !== null) {
      clearTimeout(this.geocoderDebounceTimer);
      this.geocoderDebounceTimer = null;
    }
    if (!q.trim()) {
      this.geocoderSubscription?.unsubscribe();
      this.geocoderSubscription = null;
      this.placeSuggestions.set([]);
      this.loadingPlaces.set(false);
      return;
    }
    this.loadingPlaces.set(true);
    this.geocoderDebounceTimer = setTimeout(() => {
      this.geocoderDebounceTimer = null;
      this.geocoderSubscription?.unsubscribe();
      this.geocoderSubscription = this.searchBarService
        .resolveGeocoderCandidates(q.trim(), {})
        .pipe(take(1))
        .subscribe({
          next: (candidates) => {
            this.placeSuggestions.set(candidates);
            this.loadingPlaces.set(false);
          },
          error: () => {
            this.placeSuggestions.set([]);
            this.loadingPlaces.set(false);
          },
        });
    }, 400);
  }

  private clearGeocoderDebounce(): void {
    if (this.geocoderDebounceTimer !== null) {
      clearTimeout(this.geocoderDebounceTimer);
      this.geocoderDebounceTimer = null;
    }
    this.geocoderSubscription?.unsubscribe();
    this.geocoderSubscription = null;
  }
}
