import {
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
import { DetailRowInlineConfirmActionComponent } from '../detail-row-inline-confirm-action/detail-row-inline-confirm-action.component';
import { HlmSpinnerComponent } from '../../../../shared/ui/spinner';
import { HLM_BUTTON_IMPORTS } from '../../../ui/button';
import type { ForwardGeocodeResult } from '../../../../core/geocoding/geocoding.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { SearchBarService } from '../../../../core/search/search-bar.service';
import { SearchOrchestratorService } from '../../../../core/search/search-orchestrator.service';
import type {
  SearchAddressCandidate,
  SearchCandidate,
  SearchQueryContext,
  SearchResultSet,
} from '../../../../core/search/search.models';
import { BehaviorSubject, Subscription, finalize, take } from 'rxjs';

@Component({
  selector: 'app-address-search',
  standalone: true,
  imports: [
    DropdownShellComponent,
    HlmSpinnerComponent,
    DetailRowInlineConfirmActionComponent,
    ...HLM_BUTTON_IMPORTS,
  ],
  templateUrl: './address-search.component.html',
  styleUrl: './address-search.component.scss',
  host: {
    '[attr.data-detail-active-editor]': 'active() ? "address_search" : null',
  },
})
export class AddressSearchComponent implements OnDestroy {
  private readonly elementRef = inject(ElementRef);
  private readonly searchBarService = inject(SearchBarService);
  private readonly searchOrchestrator = inject(SearchOrchestratorService);
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly currentAddress = input('');
  readonly addressResolving = input(false);
  readonly searchContext = input<SearchQueryContext>({});
  /** When parent clears `editingField`, close the active search surface. */
  readonly editingActive = input(false);
  readonly suggestionApplied = output<ForwardGeocodeResult>();
  /** Parent must set `editingField` to `address_search` before the search surface activates. */
  readonly searchOpened = output<void>();
  readonly addressClearRequested = output<void>();
  readonly deactivated = output<void>();

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
  readonly applyingSuggestion = signal(false);

  // Template reference to the text input — used for auto-focus when search opens
  // @see docs/specs/ui/workspace/workspace-pane.md
  private readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('addressSearchInput');
  private readonly addressCenterRef = viewChild<ElementRef<HTMLElement>>('addressCenter');
  readonly addressAnchorEl = computed(() => this.addressCenterRef()?.nativeElement ?? null);
  readonly addressCenterWidth = computed(
    () => this.addressCenterRef()?.nativeElement.offsetWidth ?? null,
  );
  readonly showResultsPanel = computed(
    () =>
      this.active() &&
      (this.savedSuggestions().length > 0 ||
        this.placeSuggestions().length > 0 ||
        this.loadingSaved() ||
        this.loadingPlaces()),
  );

  private readonly queryChanges = new BehaviorSubject<string>('');
  private readonly contextChanges = new BehaviorSubject<SearchQueryContext>({});
  private searchSubscription: Subscription | null = null;
  private geocoderDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private geocoderSubscription: Subscription | null = null;
  private ignoreOutsideCloseUntil = 0;

  constructor() {
    effect(() => {
      this.contextChanges.next(this.searchContext());
    });

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

    effect(() => {
      if (!this.editingActive() && this.active() && !this.applyingSuggestion()) {
        this.cancel();
      }
    });

  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.active() || Date.now() < this.ignoreOutsideCloseUntil) return;
    const target = event.target as Node | null;
    if (!target || !this.elementRef.nativeElement.contains(target)) {
      this.cancel();
    }
  }

  open(event?: Event): void {
    event?.stopPropagation();
    this.ignoreOutsideCloseUntil = Date.now() + 250;
    this.searchOpened.emit();

    const current = this.currentAddress();
    this.query.set(current);
    this.active.set(true);

    // Geocoder is bypassed here to avoid shared-singleton adapter conflicts with the map search bar.
    // resolveGeocoderCandidates is called directly in runGeocoderDebounced instead.
    // @see docs/specs/ui/workspace/workspace-pane.md
    this.searchOrchestrator.configureSources({
      dbAddressResolver: (q, ctx) =>
        this.searchBarService.resolveDbAddressCandidates(this.dbSearchTerm(q), ctx),
    });

    this.searchSubscription?.unsubscribe();
    this.searchSubscription = this.searchOrchestrator
      .searchInput(this.queryChanges.asObservable(), this.contextChanges.asObservable())
      .subscribe((result) => this.applySearchResult(result));

    if (current.trim()) {
      this.queryChanges.next(current);
      this.runGeocoderDebounced(current);
    } else {
      this.queryChanges.next('');
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
    this.deactivated.emit();
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
    if (first) {
      void this.apply(first);
    }
  }

  onResultSelect(candidate: SearchCandidate, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    void this.apply(candidate);
  }

  async apply(candidate: SearchCandidate): Promise<void> {
    if (candidate.family !== 'db-address' && candidate.family !== 'geocoder') {
      return;
    }

    this.applyingSuggestion.set(true);
    try {
      const mapped = await this.searchBarService.resolveForwardGeocodeFromAddressCandidate(
        candidate as SearchAddressCandidate,
      );
      this.suggestionApplied.emit(mapped);
      this.cancel();
    } finally {
      this.applyingSuggestion.set(false);
    }
  }

  clearAddress(): void {
    this.addressClearRequested.emit();
  }

  ngOnDestroy(): void {
    this.clearGeocoderDebounce();
    this.searchSubscription?.unsubscribe();
  }

  /** Narrow saved/geocoder lists to tokens the user typed (e.g. house number). */
  private filterSuggestionsByQuery(
    candidates: SearchCandidate[],
    query: string,
  ): SearchCandidate[] {
    const tokens = query
      .trim()
      .toLowerCase()
      .split(/[\s,]+/)
      .filter((token) => token.length >= 2 || /^\d$/.test(token));
    if (tokens.length === 0) {
      return candidates;
    }
    return candidates.filter((candidate) => {
      const label = candidate.label.toLowerCase();
      return tokens.every((token) => label.includes(token));
    });
  }

  /** Saved-location ilike works best on the street segment, not the full comma-separated label. */
  private dbSearchTerm(displayQuery: string): string {
    const trimmed = displayQuery.trim();
    if (!trimmed) return '';
    const head = trimmed.split(',')[0]?.trim() ?? trimmed;
    return head.length >= 3 ? head : trimmed;
  }

  private applySearchResult(result: SearchResultSet): void {
    const dbAddressSection = result.sections.find((s) => s.family === 'db-address');
    const items = dbAddressSection?.items ?? [];
    this.savedSuggestions.set(this.filterSuggestionsByQuery(items, this.query()));
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

    this.placeSuggestions.set([]);
    this.loadingPlaces.set(true);
    this.geocoderDebounceTimer = setTimeout(() => {
      this.geocoderDebounceTimer = null;
      this.geocoderSubscription?.unsubscribe();
      this.geocoderSubscription = this.searchBarService
        .resolveGeocoderCandidates(q.trim(), this.searchContext())
        .pipe(
          take(1),
          finalize(() => this.loadingPlaces.set(false)),
        )
        .subscribe({
          next: (candidates) => {
            // Geocoder labels may omit the query token (e.g. "Stephansplatz, Vienna"); ranking is server-side.
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
    this.loadingPlaces.set(false);
  }
}
