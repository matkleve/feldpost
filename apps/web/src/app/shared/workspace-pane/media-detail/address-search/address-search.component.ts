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
import { DropdownShellComponent } from '../../../dropdown-trigger/shell/dropdown-shell.component';
import { DetailRowInlineConfirmActionComponent } from '../detail-row-inline-confirm-action/detail-row-inline-confirm-action.component';
import { HlmSpinnerComponent } from '../../../../shared/ui/spinner';
import { HLM_BUTTON_IMPORTS } from '../../../ui/button';
import type { ForwardGeocodeResult } from '../../../../core/geocoding/geocoding.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { SearchBarService } from '../../../../core/search/search-bar.service';
import { SearchEngine } from '../../../../core/search/engine/search-engine';
import { createAddressSearchEngine } from '../../../../core/search/engine/search-engine.factory';
import { RecentsProvider } from '../../../../core/search/providers/recents.provider';
import { DbAddressProvider } from '../../../../core/search/providers/db-address.provider';
import { GeocoderProvider } from '../../../../core/search/providers/geocoder.provider';
import { OrgSearchTuningService } from '../../../../core/search/org-search-tuning.service';
import type {
  SearchAddressCandidate,
  SearchCandidate,
  SearchQueryContext,
  SearchResultSet,
} from '../../../../core/search/search.models';
import { BehaviorSubject, Subscription } from 'rxjs';

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
  styleUrls: ['./address-search.component.scss', '../_detail-row-slots.scss'],
  host: {
    '[attr.data-detail-active-editor]': 'active() ? "address_search" : null',
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
        return createAddressSearchEngine(
          {
            recents: inject(RecentsProvider),
            dbAddress,
            geocoder: inject(GeocoderProvider),
          },
          inject(OrgSearchTuningService),
        );
      },
    },
  ],
})
export class AddressSearchComponent implements OnDestroy {
  private readonly elementRef = inject(ElementRef);
  private readonly searchBarService = inject(SearchBarService);
  private readonly searchEngine = inject(SearchEngine);
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly currentAddress = input('');
  readonly addressFieldsResolving = input(false);
  readonly addressHighlighted = input(false);
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

  /** Flat selectable list: saved locations first, then geocoder places. */
  readonly selectableCandidates = computed(() => [
    ...this.savedSuggestions(),
    ...this.placeSuggestions(),
  ]);

  /** -1 = highlight on input; 0..n-1 = highlighted result row. */
  readonly focusedIndex = signal(-1);

  readonly focusedOptionId = computed(() => {
    const idx = this.focusedIndex();
    return idx >= 0 ? `address-search-option-${idx}` : null;
  });

  private readonly queryChanges = new BehaviorSubject<string>('');
  private readonly contextChanges = new BehaviorSubject<SearchQueryContext>({});
  private searchSubscription: Subscription | null = null;
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

    this.searchSubscription?.unsubscribe();
    this.searchSubscription = this.searchEngine
      .searchInput(this.queryChanges.asObservable(), this.contextChanges.asObservable())
      .subscribe((result) => this.applySearchResult(result));

    this.queryChanges.next(current.trim() ? current : '');
  }

  cancel(): void {
    this.active.set(false);
    this.query.set('');
    this.savedSuggestions.set([]);
    this.placeSuggestions.set([]);
    this.loadingSaved.set(false);
    this.loadingPlaces.set(false);
    this.focusedIndex.set(-1);
    this.searchSubscription?.unsubscribe();
    this.searchSubscription = null;
    this.deactivated.emit();
  }

  onInput(q: string): void {
    this.query.set(q);
    this.focusedIndex.set(-1);
    if (!q.trim()) {
      this.savedSuggestions.set([]);
      this.placeSuggestions.set([]);
    }
    this.loadingPlaces.set(!!q.trim());
    this.queryChanges.next(q);
  }

  onInputKeydown(event: KeyboardEvent): void {
    const candidates = this.selectableCandidates();
    const maxIndex = candidates.length - 1;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (candidates.length === 0) {
        return;
      }
      const index = this.focusedIndex() >= 0 ? this.focusedIndex() : 0;
      void this.apply(candidates[index]!);
      return;
    }

    if (event.key === 'Tab') {
      if (!this.showResultsPanel() || candidates.length === 0) {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) {
        this.moveHighlight(-1, maxIndex);
      } else {
        this.moveHighlight(1, maxIndex);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      if (!this.showResultsPanel() || candidates.length === 0) {
        return;
      }
      event.preventDefault();
      this.moveHighlight(1, maxIndex);
      return;
    }

    if (event.key === 'ArrowUp') {
      if (!this.showResultsPanel() || candidates.length === 0) {
        return;
      }
      event.preventDefault();
      this.moveHighlight(-1, maxIndex);
    }
  }

  savedCandidateIndex(localIndex: number): number {
    return localIndex;
  }

  placeCandidateIndex(localIndex: number): number {
    return this.savedSuggestions().length + localIndex;
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

  private applySearchResult(result: SearchResultSet): void {
    if (result.query !== this.query()) {
      return;
    }

    const dbAddressSection = result.sections.find((s) => s.family === 'db-address');
    const geocoderSection = result.sections.find((s) => s.family === 'geocoder');
    const items = dbAddressSection?.items ?? [];
    this.savedSuggestions.set(this.filterSuggestionsByQuery(items, this.query()));
    this.loadingSaved.set(result.state === 'typing' && !!this.query().trim());
    this.placeSuggestions.set(geocoderSection?.items ?? []);
    this.loadingPlaces.set(
      geocoderSection?.loading === true || result.state === 'typing' || result.state === 'results-partial',
    );

    if (result.state === 'results-complete' || result.state === 'focused-empty') {
      this.loadingSaved.set(false);
      this.loadingPlaces.set(false);
    }
  }

  private moveHighlight(delta: 1 | -1, maxIndex: number): void {
    if (maxIndex < 0) {
      return;
    }

    const current = this.focusedIndex();
    if (delta > 0) {
      if (current < 0) {
        this.focusedIndex.set(0);
      } else {
        this.focusedIndex.set(Math.min(current + 1, maxIndex));
      }
    } else if (current <= 0) {
      this.focusedIndex.set(-1);
      this.searchInputRef()?.nativeElement.focus();
    } else {
      this.focusedIndex.set(current - 1);
    }

    this.scrollFocusedIntoView();
  }

  private scrollFocusedIntoView(): void {
    const idx = this.focusedIndex();
    if (idx < 0) {
      return;
    }
    setTimeout(() => {
      const root = this.elementRef.nativeElement as HTMLElement;
      const option = root.querySelector(`[data-address-search-option="${idx}"]`);
      option?.scrollIntoView({ block: 'nearest' });
    });
  }

}
