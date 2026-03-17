import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EffectRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  effect,
  input,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';
import { SearchDropdownItemComponent } from './search-dropdown-item.component';
import { SearchOrchestratorService } from '../../../core/search/search-orchestrator.service';
import { SearchBarService, GhostTrieEntry } from '../../../core/search/search-bar.service';
import { GeocodingService } from '../../../core/geocoding.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import {
  SearchCandidate,
  SearchQueryContext,
  SearchRecentCandidate,
  SearchResultSet,
  SearchSection,
  SearchState,
} from '../../../core/search/search.models';

const MAX_RECENT_SEARCHES = 8;
const MAX_RECENT_MATCHES_WHILE_TYPING = 2;

const PLACEHOLDER_EXAMPLES: ReadonlyArray<{ key: string; fallback: string }> = [
  { key: 'map.searchBar.placeholder.search', fallback: 'Search address, project, group…' },
  { key: 'map.searchBar.placeholder.example.denishgasse', fallback: 'Denisgasse 46, Vienna' },
  { key: 'map.searchBar.placeholder.example.coordsDecimal', fallback: '48.2082, 16.3738' },
  { key: 'map.searchBar.placeholder.example.mapsUrl', fallback: 'maps.google.com/…' },
  { key: 'map.searchBar.placeholder.example.project', fallback: 'Project Alpha' },
  {
    key: 'map.searchBar.placeholder.example.schoenbrunnerAllee',
    fallback: 'Schönbrunner Allee 6',
  },
  {
    key: 'map.searchBar.placeholder.example.coordsDms',
    fallback: '48°12\'30"N 16°22\'23"E',
  },
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
  imports: [CommonModule, SearchDropdownItemComponent],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
  host: {
    class: 'search-bar-host',
    '[class.search-bar-host--projects]': "mode() === 'projects'",
  },
})
export class SearchBarComponent implements OnInit, OnDestroy {
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly searchBarService = inject(SearchBarService);
  private readonly searchOrchestrator = inject(SearchOrchestratorService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly i18nService = inject(I18nService);

  readonly t = this.i18nService.t.bind(this.i18nService);

  private readonly queryChanges = new BehaviorSubject<string>('');
  private readonly contextChanges = new BehaviorSubject<SearchQueryContext>({});
  private readonly subscription = new Subscription();
  private suppressNextDocumentClick = false;
  private placeholderTimer: ReturnType<typeof setInterval> | null = null;
  private placeholderIndex = 0;

  readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');
  readonly queryContext = input<SearchQueryContext>({});
  readonly mode = input<'map' | 'projects'>('map');

  readonly mapCenterRequested = output<{ lat: number; lng: number; label: string }>();
  readonly clearRequested = output<void>();
  readonly dropPinRequested = output<void>();
  readonly qrInviteCommandRequested = output<void>();
  readonly queryChanged = output<string>();

  readonly state = signal<SearchState>('idle');
  readonly query = signal('');
  readonly dropdownOpen = signal(false);
  readonly placeholderText = signal(
    this.t(PLACEHOLDER_EXAMPLES[0].key, PLACEHOLDER_EXAMPLES[0].fallback),
  );
  readonly placeholderFading = signal(false);
  readonly activeIndex = signal(-1);
  readonly sections = signal<SearchSectionsState>(this.createEmptySections());
  readonly recentSearches = signal<SearchRecentCandidate[]>([]);
  readonly committedCandidate = signal<SearchCandidate | null>(null);
  readonly commandSection = signal<SearchSection | null>(null);
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
      !this.geocoderLoading() &&
      this.allEmpty(),
  );
  readonly isProjectsMode = computed(() => this.mode() === 'projects');
  readonly showClearButton = computed(() =>
    this.isProjectsMode() ? this.query().trim().length > 0 : this.committedCandidate() !== null,
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
      ...this.matchingRecents(),
      ...sections.dbAddress.items,
      ...sections.dbContent.items,
      ...(this.commandSection()?.items ?? []),
      ...sections.geocoder.items,
    ];
  });

  private readonly contextSyncEffect: EffectRef = effect(() => {
    const nextContext = this.queryContext();
    this.contextChanges.next(nextContext);
    this.rebuildGhostTrie();
  });

  private readonly languageSyncEffect: EffectRef = effect(() => {
    this.i18nService.language();
    this.syncLocalizedSearchUiText();
  });

  ngOnInit(): void {
    this.recentSearches.set(
      this.searchBarService.loadRecentSearches().slice(0, MAX_RECENT_SEARCHES),
    );
    if (!this.isProjectsMode()) {
      this.configureSearchSources();
      this.rebuildGhostTrie();
    }
    this.startPlaceholderRotation();

    if (!this.isProjectsMode()) {
      this.subscription.add(
        this.searchOrchestrator
          .searchInput(this.queryChanges.asObservable(), this.contextChanges.asObservable())
          .subscribe((result) => this.applySearchResult(result)),
      );
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.contextSyncEffect.destroy();
    this.languageSyncEffect.destroy();
    this.stopPlaceholderRotation();
  }

  focusSearch(): void {
    const input = this.searchInput().nativeElement;
    input.focus();
    input.select();
    this.dropdownOpen.set(true);
    this.state.set(this.query().trim() ? 'typing' : 'focused-empty');
    this.activeIndex.set(-1);
  }

  onFocus(): void {
    this.recentSearches.set(
      this.searchBarService.loadRecentSearches().slice(0, MAX_RECENT_SEARCHES),
    );
    this.dropdownOpen.set(!this.isProjectsMode());
    this.activeIndex.set(-1);
    this.state.set(this.query().trim() ? this.state() : 'focused-empty');
  }

  onInput(event: Event): void {
    const nextQuery = (event.target as HTMLInputElement).value;
    this.query.set(nextQuery);
    this.dropdownOpen.set(!this.isProjectsMode());
    this.activeIndex.set(-1);
    this.queryChanged.emit(nextQuery);

    if (this.isProjectsMode()) {
      if (!nextQuery.trim()) {
        this.state.set('focused-empty');
      } else {
        this.state.set('typing');
      }
      this.queryChanges.next(nextQuery);
      return;
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
      this.sections.set(this.createEmptySections());
      this.commandSection.set(null);
      this.liveRegionText.set('');
      this.ghostText.set(null);
    } else {
      // Coordinate/URL detection (UC-5)
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
      // Ghost completion (UC-8)
      this.ghostText.set(this.searchBarService.queryGhostCompletion(nextQuery));
    }

    this.queryChanges.next(nextQuery);
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (this.isProjectsMode()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.searchInput().nativeElement.blur();
        this.state.set(this.query().trim().length > 0 ? 'typing' : 'idle');
      }
      return;
    }

    if (event.key === 'Tab' && this.ghostText()) {
      event.preventDefault();
      const fullQuery = this.query() + this.ghostText();
      this.query.set(fullQuery);
      this.searchInput().nativeElement.value = fullQuery;
      this.ghostText.set(null);
      this.state.set('typing');
      this.queryChanges.next(fullQuery);
      // Recompute ghost for new query
      this.ghostText.set(this.searchBarService.queryGhostCompletion(fullQuery));
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
        this.dropdownOpen.set(false);
        this.activeIndex.set(-1);
        this.state.set(this.committedCandidate() ? 'committed' : 'idle');
      } else {
        this.searchInput().nativeElement.blur();
        this.state.set(this.committedCandidate() ? 'committed' : 'idle');
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

  onDropPinClick(): void {
    this.dropdownOpen.set(false);
    this.activeIndex.set(-1);
    this.state.set('idle');
    this.dropPinRequested.emit();
  }

  onCandidateSelected(candidate: SearchCandidate): void {
    this.commitCandidate(candidate);
  }

  optionIdFor(index: number): string {
    return `search-option-${index}`;
  }

  addressOptionIndex(index: number): number {
    return this.matchingRecents().length + index;
  }

  contentOptionIndex(index: number): number {
    return this.matchingRecents().length + this.sections().dbAddress.items.length + index;
  }

  geocoderOptionIndex(index: number): number {
    return (
      this.matchingRecents().length +
      this.sections().dbAddress.items.length +
      this.sections().dbContent.items.length +
      (this.commandSection()?.items.length ?? 0) +
      index
    );
  }

  commandOptionIndex(index: number): number {
    return (
      this.matchingRecents().length +
      this.sections().dbAddress.items.length +
      this.sections().dbContent.items.length +
      index
    );
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
      this.dropdownOpen.set(false);
      this.activeIndex.set(-1);
      this.state.set(
        this.isProjectsMode()
          ? this.query().trim().length > 0
            ? 'typing'
            : 'idle'
          : this.committedCandidate()
            ? 'committed'
            : 'idle',
      );
    }
  }

  private applySearchResult(result: SearchResultSet): void {
    if (result.query !== this.query()) {
      return;
    }

    const dbAddressSection =
      result.sections.find((section) => section.family === 'db-address') ??
      this.createSection('db-address', this.t('map.searchBar.section.addresses', 'Addresses'));
    const dbContentSection =
      result.sections.find((section) => section.family === 'db-content') ??
      this.createSection(
        'db-content',
        this.t('map.searchBar.section.projectsAndGroups', 'Projects & Groups'),
      );
    const geocoderSection =
      result.sections.find((section) => section.family === 'geocoder') ??
      this.createSection('geocoder', this.t('map.searchBar.section.places', 'Places'));
    const commandSection = result.sections.find((section) => section.family === 'command') ?? null;

    this.sections.set({
      dbAddress: dbAddressSection,
      dbContent: dbContentSection,
      geocoder: geocoderSection,
    });
    this.commandSection.set(commandSection);

    if (result.state === 'focused-empty') {
      this.state.set(this.dropdownOpen() ? 'focused-empty' : 'idle');
      return;
    }

    this.state.set(result.state);

    if (result.state === 'results-complete') {
      const resultCount = this.selectableItems().length;
      const query = this.query().trim();
      this.liveRegionText.set(
        resultCount > 0
          ? this.formatPlaceholders(
              this.t(
                'map.searchBar.liveRegion.resultsAvailable',
                `${resultCount} results available for ${query}.`,
              ),
              {
                count: resultCount,
                query,
              },
            )
          : this.formatPlaceholders(
              this.t('map.searchBar.liveRegion.noAddressFound', `No address found for ${query}.`),
              {
                query,
              },
            ),
      );
    }
  }

  noAddressFoundText(): string {
    return this.formatPlaceholders(
      this.t('map.searchBar.empty.noAddressFound', 'No address found for {query}'),
      {
        query: this.query().trim(),
      },
    );
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

  private commitCandidate(candidate: SearchCandidate): void {
    if (candidate.family === 'recent') {
      this.query.set(candidate.label);
      this.dropdownOpen.set(true);
      this.state.set('typing');
      this.activeIndex.set(-1);
      this.queryChanges.next(candidate.label);
      return;
    }

    this.committedCandidate.set(candidate);
    this.query.set(candidate.label);
    this.dropdownOpen.set(false);
    this.activeIndex.set(-1);
    this.state.set('committed');
    this.addRecentSearch(candidate.label);
    this.suppressNextDocumentClick = true;

    const commitAction = this.searchOrchestrator.commit(candidate, candidate.label);
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

        void this.router.navigate([candidate.contentType === 'group' ? '/groups' : '/photos'], {
          queryParams: {
            search: commitAction.query,
            type: candidate.contentType,
            id: commitAction.contentId,
          },
        });
        break;
      case 'run-command':
        if (commitAction.command === 'go-to-location') {
          this.dropPinRequested.emit();
        }

        if (commitAction.command === 'create-qr-invite') {
          this.qrInviteCommandRequested.emit();
        }
        break;
      case 'recent-selected':
        this.queryChanges.next(commitAction.label);
        break;
    }
  }

  private clearSearch(): void {
    this.query.set('');
    this.state.set('focused-empty');
    this.dropdownOpen.set(false);
    this.activeIndex.set(-1);
    this.sections.set(this.createEmptySections());
    this.commandSection.set(null);
    this.liveRegionText.set('');
    this.committedCandidate.set(null);
    this.queryChanges.next('');
    this.queryChanged.emit('');
    this.clearRequested.emit();
  }

  private configureSearchSources(): void {
    this.searchOrchestrator.configureSources({
      dbAddressResolver: (query, ctx) =>
        this.searchBarService.resolveDbAddressCandidates(query, ctx),
      dbContentResolver: (query, ctx) =>
        this.searchBarService.resolveDbContentCandidates(query, ctx),
      geocoderResolver: (query, ctx) => this.searchBarService.resolveGeocoderCandidates(query, ctx),
    });
  }

  private addRecentSearch(label: string): void {
    const nextRecentSearches = this.searchBarService
      .addRecentSearch(label, this.contextChanges.value.activeProjectId, this.recentSearches())
      .slice(0, MAX_RECENT_SEARCHES);
    this.recentSearches.set(nextRecentSearches);
    this.searchOrchestrator.addRecentSearch(label);
  }

  private createEmptySections(): SearchSectionsState {
    return {
      dbAddress: this.createSection(
        'db-address',
        this.t('map.searchBar.section.addresses', 'Addresses'),
      ),
      dbContent: this.createSection(
        'db-content',
        this.t('map.searchBar.section.projectsAndGroups', 'Projects & Groups'),
      ),
      geocoder: this.createSection('geocoder', this.t('map.searchBar.section.places', 'Places')),
    };
  }

  private createSection(family: SearchSection['family'], title: string): SearchSection {
    return { family, title, items: [] };
  }

  private syncLocalizedSearchUiText(): void {
    const placeholder = PLACEHOLDER_EXAMPLES[this.placeholderIndex] ?? PLACEHOLDER_EXAMPLES[0];
    this.placeholderText.set(this.t(placeholder.key, placeholder.fallback));

    const localizedSections: SearchSectionsState = {
      dbAddress: {
        ...this.sections().dbAddress,
        title: this.t('map.searchBar.section.addresses', 'Addresses'),
      },
      dbContent: {
        ...this.sections().dbContent,
        title: this.t('map.searchBar.section.projectsAndGroups', 'Projects & Groups'),
      },
      geocoder: {
        ...this.sections().geocoder,
        title: this.t('map.searchBar.section.places', 'Places'),
      },
    };
    this.sections.set(localizedSections);

    const commandSection = this.commandSection();
    if (commandSection) {
      this.commandSection.set({
        ...commandSection,
        title: this.t('map.searchBar.section.commands', 'Commands'),
      });
    }
  }

  private normalizeLabel(value: string): string {
    return value.trim().toLowerCase();
  }

  private formatPlaceholders(
    text: string,
    values: Record<string, string | number | null | undefined>,
  ): string {
    return text.replace(/\{(\w+)\}/g, (_, token: string) => {
      const value = values[token];
      return value === undefined || value === null ? '' : String(value);
    });
  }

  private reverseGeocodeAndUpdateLabel(lat: number, lng: number): void {
    this.geocodingService.reverse(lat, lng).then((result) => {
      if (!result) return;
      const committed = this.committedCandidate();
      if (!committed || committed.family !== 'geocoder') return;
      // Update label if still committed to these coords
      const coordLabel = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      if (committed.label === coordLabel) {
        this.committedCandidate.set({ ...committed, label: result.addressLabel });
        this.query.set(result.addressLabel);
        this.addRecentSearch(result.addressLabel);
      }
    });
  }

  private rebuildGhostTrie(): void {
    if (this.isProjectsMode()) {
      return;
    }

    const entries: GhostTrieEntry[] = [];
    const activeProjectId = this.contextChanges.value.activeProjectId;

    // Priority 1+2: Recent searches
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
    this.placeholderTimer = setInterval(() => {
      this.placeholderFading.set(true);
      setTimeout(() => {
        this.placeholderIndex = (this.placeholderIndex + 1) % PLACEHOLDER_EXAMPLES.length;
        const placeholder = PLACEHOLDER_EXAMPLES[this.placeholderIndex];
        this.placeholderText.set(this.t(placeholder.key, placeholder.fallback));
        this.placeholderFading.set(false);
      }, PLACEHOLDER_FADE_MS);
    }, PLACEHOLDER_INTERVAL_MS);
  }

  private stopPlaceholderRotation(): void {
    if (this.placeholderTimer) {
      clearInterval(this.placeholderTimer);
      this.placeholderTimer = null;
    }
  }
}
