import { CommonModule } from '@angular/common';
import type { OnDestroy, OnInit } from '@angular/core';
import {
  Component,
  ElementRef,
  HostListener,
  Injector,
  computed,
  effect,
  input,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { SearchDropdownItemComponent } from './search-dropdown-item.component';
import { SearchFilterChipsComponent } from './search-filter-chips.component';
import type { GhostTrieEntry } from '../../../core/search/search-bar.service';
import { SearchBarService } from '../../../core/search/search-bar.service';
import { GeocodingService } from '../../../core/geocoding/geocoding.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { HLM_INPUT_IMPORTS } from '../../../shared/ui/input';
import { SearchEngine } from '../../../core/search/engine/search-engine';
import { createMapSearchEngine } from '../../../core/search/engine/search-engine.factory';
import { RecentsProvider } from '../../../core/search/providers/recents.provider';
import { DbAddressProvider } from '../../../core/search/providers/db-address.provider';
import { ProjectsProvider } from '../../../core/search/providers/projects.provider';
import { GeocoderProvider } from '../../../core/search/providers/geocoder.provider';
import { CommandProvider } from '../../../core/search/providers/command.provider';
import { OrgSearchTuningService } from '../../../core/search/org-search-tuning.service';
import { parseSearchQuery } from '../../../core/search/engine/search-operator';
import type {
  SearchCandidate,
  SearchFilterChip,
  SearchOperatorSuggestionCandidate,
  SearchQueryContext,
  SearchRecentCandidate,
  SearchResultSet,
  SearchSection,
  SearchState,
} from '../../../core/search/search.models';

const MAX_RECENT_SEARCHES = 8;
const MAX_RECENT_MATCHES_WHILE_TYPING = 2;

const PLACEHOLDER_EXAMPLES = [
  'Search address or project…',
  'Denisgasse 46, Vienna',
  '48.2082, 16.3738',
  'maps.google.com/…',
  'Project Alpha',
  'Schönbrunner Allee 6',
  '48°12\'30"N 16°22\'23"E',
];
const PLACEHOLDER_INTERVAL_MS = 4000;
const PLACEHOLDER_FADE_MS = 300;

type SearchSectionsState = {
  dbAddress: SearchSection;
  dbContent: SearchSection;
  geocoder: SearchSection;
};

@Component({
  selector: 'ss-search-bar',
  standalone: true,
  imports: [
    CommonModule,
    SearchDropdownItemComponent,
    SearchFilterChipsComponent,
    ...HLM_BUTTON_IMPORTS,
    ...HLM_INPUT_IMPORTS,
  ],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
  providers: [
    {
      provide: SearchEngine,
      useFactory: () =>
        createMapSearchEngine(
          {
            recents: inject(RecentsProvider),
            dbAddress: inject(DbAddressProvider),
            projects: inject(ProjectsProvider),
            geocoder: inject(GeocoderProvider),
            commands: inject(CommandProvider),
          },
          inject(OrgSearchTuningService),
        ),
    },
  ],
  host: {
    class: 'search-bar-host',
  },
})
export class SearchBarComponent implements OnInit, OnDestroy {
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly searchBarService = inject(SearchBarService);
  private readonly searchEngine = inject(SearchEngine);
  private readonly recentsProvider = inject(RecentsProvider);
  private readonly geocodingService = inject(GeocodingService);
  private readonly i18nService = inject(I18nService);
  private readonly injector = inject(Injector);

  private readonly subscription = new Subscription();
  private suppressNextDocumentClick = false;
  private placeholderTimer: ReturnType<typeof setInterval> | null = null;
  private placeholderFadeTimer: ReturnType<typeof setTimeout> | null = null;
  private placeholderIndex = 0;
  private destroyed = false;
  /** Query text that last finished a search cycle (`applySearchResult`). */
  private readonly lastResolvedQuery = signal<string | null>(null);

  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  readonly queryContext = input<SearchQueryContext>({});

  readonly mapCenterRequested = output<{ lat: number; lng: number; label: string }>();
  readonly clearRequested = output<void>();
  readonly goToLocationRequested = output<void>();
  readonly qrInviteCommandRequested = output<void>();
  readonly queryChanged = output<string>();
  readonly projectFilterIdsChanged = output<string[]>();

  readonly state = signal<SearchState>('idle');
  readonly query = signal('');
  readonly dropdownOpen = signal(false);
  readonly placeholderText = signal(PLACEHOLDER_EXAMPLES[0]);
  readonly placeholderFading = signal(false);
  readonly activeIndex = signal(-1);
  readonly sections = signal<SearchSectionsState>(this.createEmptySections());
  readonly recentSearches = signal<SearchRecentCandidate[]>([]);
  readonly committedCandidate = signal<SearchCandidate | null>(null);
  readonly commandSection = signal<SearchSection | null>(null);
  readonly operatorSection = signal<SearchSection | null>(null);
  readonly filterChips = signal<SearchFilterChip[]>([]);
  readonly liveRegionText = signal('');
  readonly ghostText = signal<string | null>(null);

  readonly allEmpty = computed(() => {
    const sections = this.sections();
    return (
      sections.dbAddress.items.length === 0 &&
      sections.dbContent.items.length === 0 &&
      sections.geocoder.items.length === 0
    );
  });

  readonly geocoderLoading = computed(() => this.sections().geocoder.loading === true);
  readonly showingRecentSearches = computed(
    () => this.dropdownOpen() && this.query().trim().length === 0,
  );
  readonly showingEmptyState = computed(
    () =>
      this.dropdownOpen() &&
      this.query().trim().length > 0 &&
      this.state() === 'results-complete' &&
      !this.geocoderLoading() &&
      this.allEmpty() &&
      this.hasResolvedResultsForCurrentQuery(),
  );
  readonly showDropdownPanel = computed(() => {
    if (!this.dropdownOpen() || this.committedCandidate()) {
      return false;
    }

    if (this.showingRecentSearches()) {
      return true;
    }

    if (this.geocoderLoading() || this.state() === 'results-partial') {
      return true;
    }

    if (this.showingEmptyState()) {
      return true;
    }

    if (!this.allEmpty()) {
      return true;
    }

    if ((this.operatorSection()?.items.length ?? 0) > 0) {
      return true;
    }

    if ((this.commandSection()?.items.length ?? 0) > 0) {
      return true;
    }

    return this.matchingRecents().length > 0;
  });
  readonly showClearButton = computed(
    () => this.query().trim().length > 0 || this.committedCandidate() !== null,
  );

  readonly matchingRecents = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q || this.showingRecentSearches()) return [];
    return this.recentSearches()
      .filter((r) => r.label.toLowerCase().includes(q))
      .slice(0, MAX_RECENT_MATCHES_WHILE_TYPING);
  });

  readonly selectableItems = computed(() => {
    if (!this.dropdownOpen()) {
      return [] as SearchCandidate[];
    }

    if (this.showingRecentSearches()) {
      return this.recentSearches();
    }

    const sections = this.sections();
    return [
      ...(this.operatorSection()?.items ?? []),
      ...this.matchingRecents(),
      ...sections.dbAddress.items,
      ...sections.dbContent.items,
      ...(this.commandSection()?.items ?? []),
      ...sections.geocoder.items,
    ];
  });

  readonly optionIndexOffsets = computed(() => {
    const operators = this.operatorSection()?.items.length ?? 0;
    const recents = this.matchingRecents().length;
    const addresses = this.sections().dbAddress.items.length;
    const content = this.sections().dbContent.items.length;
    const commands = this.commandSection()?.items.length ?? 0;

    return {
      operators: 0,
      recentMatches: operators,
      addresses: operators + recents,
      content: operators + recents + addresses,
      commands: operators + recents + addresses + content,
      geocoder: operators + recents + addresses + content + commands,
    };
  });

  private readonly ghostTrieEffect = effect(() => {
    this.queryContext();
    this.recentSearches();
    this.rebuildGhostTrie();
  });

  readonly t = (key: string, fallback: string): string => {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  };

  constructor() {
    this.subscription.add(
      this.searchEngine
        .searchInput(
          toObservable(this.query, { injector: this.injector }),
          toObservable(this.queryContext, { injector: this.injector }),
        )
        .subscribe((result) => this.applySearchResult(result)),
    );
  }

  ngOnInit(): void {
    this.recentSearches.set(
      this.recentsProvider.getRecentSearches(MAX_RECENT_SEARCHES).slice(0, MAX_RECENT_SEARCHES),
    );
    this.rebuildGhostTrie();
    this.startPlaceholderRotation();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.subscription.unsubscribe();
    this.ghostTrieEffect.destroy();
    this.stopPlaceholderRotation();
  }

  focusSearch(): void {
    const input = this.searchInput()?.nativeElement;
    if (!input) return;
    this.stopPlaceholderRotation();
    input.focus();
    input.select();
    this.activeIndex.set(-1);
    if (this.committedCandidate()) {
      this.dropdownOpen.set(false);
      this.state.set('committed');
      return;
    }
    this.dropdownOpen.set(true);
    this.restoreDropdownStateOnOpen();
  }

  onFocus(): void {
    this.stopPlaceholderRotation();
    this.recentSearches.set(
      this.recentsProvider.getRecentSearches(MAX_RECENT_SEARCHES).slice(0, MAX_RECENT_SEARCHES),
    );
    this.activeIndex.set(-1);
    if (this.committedCandidate()) {
      this.dropdownOpen.set(false);
      this.state.set('committed');
      return;
    }
    this.dropdownOpen.set(true);
    this.restoreDropdownStateOnOpen();
  }

  onInput(event: Event): void {
    const nextQuery = (event.target as HTMLInputElement).value;
    this.query.set(nextQuery);
    this.dropdownOpen.set(true);
    this.activeIndex.set(-1);
    this.queryChanged.emit(nextQuery);

    if (nextQuery.trim()) {
      this.invalidateResultsUnlessQueryMatches(nextQuery.trim());
    }

    const committedCandidate = this.committedCandidate();
    if (
      committedCandidate &&
      this.normalizeLabel(committedCandidate.label) !== this.normalizeLabel(nextQuery)
    ) {
      this.committedCandidate.set(null);
      this.clearRequested.emit();
    }

    if (!nextQuery.trim()) {
      this.state.set('focused-empty');
      this.clearResultSections();
      this.liveRegionText.set('');
      this.ghostText.set(null);
      this.lastResolvedQuery.set(null);
      return;
    }

    const coords = this.searchBarService.detectCoordinates(nextQuery);
    if (coords) {
      this.state.set('committed');
      this.dropdownOpen.set(false);
      this.ghostText.set(null);
      const label = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
      this.committedCandidate.set({
        id: `coords-${label}`,
        family: 'geocoder',
        label,
        lat: coords.lat,
        lng: coords.lng,
      });
      this.mapCenterRequested.emit({ lat: coords.lat, lng: coords.lng, label });
      this.reverseGeocodeAndUpdateLabel(coords.lat, coords.lng);
      return;
    }

    this.state.set('typing');
    this.ghostText.set(this.searchBarService.queryGhostCompletion(nextQuery));
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab' && this.ghostText()) {
      event.preventDefault();
      const fullQuery = this.query() + this.ghostText();
      this.query.set(fullQuery);
      this.ghostText.set(null);
      this.invalidateResultsUnlessQueryMatches(fullQuery.trim());
      this.state.set('typing');
      this.ghostText.set(this.searchBarService.queryGhostCompletion(fullQuery));
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      const items = this.selectableItems();
      if (items.length > 0) {
        this.activeIndex.set(0);
      }
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      const items = this.selectableItems();
      if (items.length > 0) {
        this.activeIndex.set(items.length - 1);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveActiveIndex(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveActiveIndex(-1);
      return;
    }

    if (event.key === 'Enter') {
      const candidate = this.selectableItems()[this.activeIndex()] ?? this.selectableItems()[0];
      if (!candidate) {
        return;
      }

      event.preventDefault();
      this.commitCandidate(candidate);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      if (this.dropdownOpen()) {
        this.closeDropdown();
      } else {
        this.searchInput()?.nativeElement.blur();
        if (!this.query().trim() && !this.committedCandidate()) {
          this.state.set('idle');
        } else if (this.committedCandidate()) {
          this.state.set('committed');
        }
        this.resumePlaceholderIfIdle();
      }
      return;
    }

    if (event.key === 'Backspace' && !this.query().trim() && this.committedCandidate()) {
      this.clearSearch();
    }
  }

  onClearClick(): void {
    this.clearSearch();
    this.focusSearch();
  }

  onCandidateSelected(candidate: SearchCandidate): void {
    this.commitCandidate(candidate);
  }

  optionIdFor(index: number): string {
    return `search-option-${index}`;
  }

  sectionId(family: string): string {
    return `search-section-${family}`;
  }

  sectionTitle(section: SearchSection): string {
    switch (section.family) {
      case 'db-address':
        return this.t('map.searchBar.section.fromDb', 'From your data');
      case 'geocoder':
        return this.t('map.searchBar.section.fromInternet', 'From internet');
      case 'db-content':
        return this.t('map.searchBar.section.projects', 'Projects');
      case 'recent':
        return this.t('map.searchBar.section.recentSearches', 'Recent searches');
      case 'command':
        return this.t('map.searchBar.section.commands', 'Commands');
      default:
        return section.title;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.focusSearch();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.suppressNextDocumentClick) {
      this.suppressNextDocumentClick = false;
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (!this.hostElement.nativeElement.contains(target)) {
      this.closeDropdown();
    }
  }

  private applySearchResult(result: SearchResultSet): void {
    if (result.query !== this.query()) {
      return;
    }

    const dbAddressSection =
      result.sections.find((section) => section.family === 'db-address') ??
      this.createSection('db-address');
    const dbContentSection =
      result.sections.find((section) => section.family === 'db-content') ??
      this.createSection('db-content');
    const geocoderSection =
      result.sections.find((section) => section.family === 'geocoder') ??
      this.createSection('geocoder');
    const commandSection = result.sections.find((section) => section.family === 'command') ?? null;
    const operatorSection =
      result.sections.find((section) => section.family === 'operator-suggestion') ?? null;

    this.sections.set({
      dbAddress: dbAddressSection,
      dbContent: dbContentSection,
      geocoder: geocoderSection,
    });
    this.commandSection.set(commandSection);
    this.operatorSection.set(operatorSection);

    if (result.state === 'focused-empty') {
      const recentSection = result.sections.find((section) => section.family === 'recent');
      if (recentSection) {
        this.recentSearches.set(recentSection.items as SearchRecentCandidate[]);
      }
      this.state.set(this.dropdownOpen() ? 'focused-empty' : 'idle');
      return;
    }

    this.state.set(result.state);
    this.lastResolvedQuery.set(result.query.trim());

    if (result.state === 'results-complete') {
      const resultCount = this.selectableItems().length;
      const trimmedQuery = this.query().trim();
      this.liveRegionText.set(
        resultCount > 0
          ? this.t('map.searchBar.liveRegion.resultsAvailable', '{count} results available for {query}.')
              .replace('{count}', String(resultCount))
              .replace('{query}', trimmedQuery)
          : this.t('map.searchBar.liveRegion.noAddressFound', 'No address found for {query}.').replace(
              '{query}',
              trimmedQuery,
            ),
      );
    }
  }

  private moveActiveIndex(direction: 1 | -1): void {
    if (!this.dropdownOpen()) {
      this.dropdownOpen.set(true);
    }

    const items = this.selectableItems();
    if (items.length === 0) {
      this.activeIndex.set(-1);
      return;
    }

    const currentIndex = this.activeIndex();
    if (currentIndex === -1) {
      this.activeIndex.set(direction === 1 ? 0 : items.length - 1);
      return;
    }

    this.activeIndex.set((currentIndex + direction + items.length) % items.length);
  }

  onFilterChipRemove(chip: SearchFilterChip): void {
    const keyword = chip.providerId === 'projects' ? 'project' : chip.providerId;
    this.searchEngine.applySubtractiveOperator(
      parseSearchQuery(`-${keyword} ${chip.label}`),
      this.queryContext(),
    );
    this.syncFilterChips();
  }

  private commitCandidate(candidate: SearchCandidate): void {
    if (candidate.family === 'operator-suggestion') {
      const suggestion = candidate as SearchOperatorSuggestionCandidate;
      const nextQuery = `${suggestion.operator}${suggestion.keyword} `;
      this.query.set(nextQuery);
      this.invalidateResultsUnlessQueryMatches(nextQuery.trim());
      this.dropdownOpen.set(true);
      this.state.set('typing');
      this.activeIndex.set(-1);
      this.ghostText.set(this.searchBarService.queryGhostCompletion(nextQuery));
      return;
    }

    if (candidate.family === 'recent') {
      this.query.set(candidate.label);
      this.invalidateResultsUnlessQueryMatches(candidate.label.trim());
      this.dropdownOpen.set(true);
      this.state.set('typing');
      this.activeIndex.set(-1);
      this.ghostText.set(this.searchBarService.queryGhostCompletion(candidate.label));
      return;
    }

    const parsedQuery = parseSearchQuery(this.query());
    const commitQuery = this.query().trim() || candidate.label;
    const commitAction = this.searchEngine.commit(candidate, commitQuery, parsedQuery);

    if (commitAction.type === 'filter-chip-toggle') {
      this.syncFilterChips();
      this.query.set('');
      this.dropdownOpen.set(false);
      this.activeIndex.set(-1);
      this.state.set('focused-empty');
      this.ghostText.set(null);
      this.queryChanged.emit('');
      this.suppressNextDocumentClick = true;
      return;
    }

    this.committedCandidate.set(candidate);
    this.query.set(candidate.label);
    this.ghostText.set(null);
    this.dropdownOpen.set(false);
    this.activeIndex.set(-1);
    this.state.set('committed');
    this.clearResultSections();
    this.lastResolvedQuery.set(candidate.label.trim());
    this.addRecentSearch(candidate.label);
    this.suppressNextDocumentClick = true;

    switch (commitAction.type) {
      case 'map-center':
        this.mapCenterRequested.emit({
          lat: commitAction.lat,
          lng: commitAction.lng,
          label: candidate.label,
        });
        break;
      case 'open-content':
        if (candidate.family !== 'db-content') {
          break;
        }

        void this.router.navigate(['/media'], {
          queryParams: {
            search: commitAction.query,
            type: candidate.contentType,
            id: commitAction.contentId,
          },
        });
        break;
      case 'run-command':
        if (commitAction.command === 'go-to-location') {
          this.goToLocationRequested.emit();
        }

        if (commitAction.command === 'create-qr-invite') {
          this.qrInviteCommandRequested.emit();
        }
        break;
      case 'recent-selected':
        this.query.set(commitAction.label);
        this.invalidateResultsUnlessQueryMatches(commitAction.label.trim());
        this.state.set('typing');
        break;
    }
  }

  private clearSearch(): void {
    this.query.set('');
    this.state.set('focused-empty');
    this.dropdownOpen.set(false);
    this.activeIndex.set(-1);
    this.clearResultSections();
    this.liveRegionText.set('');
    this.ghostText.set(null);
    this.committedCandidate.set(null);
    this.lastResolvedQuery.set(null);
    this.queryChanged.emit('');
    this.clearRequested.emit();
    this.resumePlaceholderIfIdle();
  }

  private addRecentSearch(label: string): void {
    const nextRecentSearches = this.recentsProvider
      .addRecentSearch(label, this.queryContext().activeProjectId, this.recentSearches())
      .slice(0, MAX_RECENT_SEARCHES);
    this.recentSearches.set(nextRecentSearches);
  }

  private syncFilterChips(): void {
    const chips = this.searchEngine.getFilterChips();
    this.filterChips.set(chips);
    this.projectFilterIdsChanged.emit(
      chips.filter((chip) => chip.providerId === 'projects').map((chip) => chip.value),
    );
  }

  private createEmptySections(): SearchSectionsState {
    return {
      dbAddress: this.createSection('db-address'),
      dbContent: this.createSection('db-content'),
      geocoder: this.createSection('geocoder'),
    };
  }

  private createSection(family: SearchSection['family']): SearchSection {
    return { family, title: '', items: [] };
  }

  private normalizeLabel(value: string): string {
    return value.trim().toLowerCase();
  }

  private reverseGeocodeAndUpdateLabel(lat: number, lng: number): void {
    this.geocodingService.reverse(lat, lng).then((result) => {
      if (this.destroyed || !result) return;
      const committed = this.committedCandidate();
      if (!committed || committed.family !== 'geocoder') return;
      const coordLabel = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      if (committed.label === coordLabel) {
        this.committedCandidate.set({ ...committed, label: result.addressLabel });
        this.query.set(result.addressLabel);
        this.addRecentSearch(result.addressLabel);
      }
    });
  }

  private rebuildGhostTrie(): void {
    const entries: GhostTrieEntry[] = [];
    const activeProjectId = this.queryContext().activeProjectId;

    for (const recent of this.recentSearches()) {
      const isActiveProject = recent.projectId === activeProjectId;
      const sourcePriority = isActiveProject ? 100 : 80;
      const daysSince = recent.lastUsedAt
        ? (Date.now() - new Date(recent.lastUsedAt).getTime()) / 86400000
        : 0;
      const recencyDecay = 1 / (1 + daysSince * 0.1);
      const projectBoost = isActiveProject ? 2.0 : 1.0;
      entries.push({
        label: recent.label,
        weight: sourcePriority * projectBoost * recencyDecay,
      });
    }

    this.searchBarService.buildGhostTrie(entries);
  }

  private startPlaceholderRotation(): void {
    if (this.placeholderTimer) {
      return;
    }

    this.placeholderTimer = setInterval(() => {
      this.placeholderFading.set(true);
      this.placeholderFadeTimer = setTimeout(() => {
        if (this.destroyed) {
          return;
        }
        this.placeholderIndex = (this.placeholderIndex + 1) % PLACEHOLDER_EXAMPLES.length;
        this.placeholderText.set(PLACEHOLDER_EXAMPLES[this.placeholderIndex]);
        this.placeholderFading.set(false);
      }, PLACEHOLDER_FADE_MS);
    }, PLACEHOLDER_INTERVAL_MS);
  }

  private stopPlaceholderRotation(): void {
    if (this.placeholderTimer) {
      clearInterval(this.placeholderTimer);
      this.placeholderTimer = null;
    }
    if (this.placeholderFadeTimer) {
      clearTimeout(this.placeholderFadeTimer);
      this.placeholderFadeTimer = null;
    }
  }

  private resumePlaceholderIfIdle(): void {
    if (!this.dropdownOpen() && !this.query().trim() && !this.placeholderTimer) {
      this.startPlaceholderRotation();
    }
  }

  /** Close the panel only; keep result sections and search state when the query is still active. */
  private closeDropdown(): void {
    this.dropdownOpen.set(false);
    this.activeIndex.set(-1);
    if (this.committedCandidate()) {
      this.state.set('committed');
    } else if (!this.query().trim()) {
      this.state.set('idle');
    }
    this.resumePlaceholderIfIdle();
  }

  /** Re-open dropdown UI from cached sections / last search state (no new fetch). */
  private restoreDropdownStateOnOpen(): void {
    const trimmed = this.query().trim();
    if (!trimmed) {
      this.state.set('focused-empty');
      return;
    }

    if (this.hasResolvedResultsForCurrentQuery()) {
      this.state.set(this.geocoderLoading() ? 'results-partial' : 'results-complete');
      return;
    }

    this.refreshPendingSearch();
  }

  private hasResolvedResultsForCurrentQuery(): boolean {
    const trimmed = this.query().trim();
    return trimmed.length > 0 && this.lastResolvedQuery() === trimmed;
  }

  private invalidateResultsUnlessQueryMatches(trimmedQuery: string): void {
    if (!trimmedQuery || trimmedQuery === this.lastResolvedQuery()) {
      return;
    }
    this.clearResultSections();
    this.lastResolvedQuery.set(null);
  }

  private clearResultSections(): void {
    this.sections.set(this.createEmptySections());
    this.commandSection.set(null);
    this.operatorSection.set(null);
  }

  private setGeocoderLoading(loading: boolean): void {
    const sections = this.sections();
    this.sections.set({
      ...sections,
      geocoder: { ...sections.geocoder, loading },
    });
  }

  private refreshPendingSearch(): void {
    const trimmed = this.query().trim();
    if (!trimmed || this.hasResolvedResultsForCurrentQuery()) {
      return;
    }

    this.state.set('results-partial');
    this.setGeocoderLoading(true);
    this.subscription.add(
      this.searchEngine.searchOnce(trimmed, this.queryContext()).subscribe((result) => {
        this.applySearchResult(result);
        this.setGeocoderLoading(false);
      }),
    );
  }
}
