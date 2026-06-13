import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SearchBarComponent } from './search-bar.component';
import { SearchDropdownItemComponent } from './search-dropdown-item.component';
import { SearchFilterChipsComponent } from './search-filter-chips.component';
import { provideOrgSearchTuningTestDouble } from '../../../core/search/search-test.providers';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { GeocodingService } from '../../../core/geocoding/geocoding.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MediaClusterService } from '../../../core/geocoding/media-cluster.service';
import { signal } from '@angular/core';

function createQueryBuilder(result: { data: unknown[]; error: unknown }) {
  const builder = {
    select: vi.fn(),
    ilike: vi.fn(),
    not: vi.fn(),
    limit: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.ilike.mockReturnValue(builder);
  builder.not.mockReturnValue(builder);
  builder.limit.mockResolvedValue(result);
  builder.eq.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);

  return builder;
}

async function typeSearchQuery(
  fixture: {
    nativeElement: HTMLElement;
    detectChanges: () => void;
    componentInstance: SearchBarComponent;
  },
  query: string,
): Promise<HTMLInputElement> {
  const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  input.value = query;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  TestBed.flushEffects();

  await vi.advanceTimersByTimeAsync(300);
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();

  return input;
}

function clickOutsideSearch(fixture: { detectChanges: () => void }): void {
  document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  fixture.detectChanges();
}

describe('SearchBarComponent', () => {
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.useFakeTimers();
    localStorage.clear();
    router = { navigate: vi.fn().mockResolvedValue(true) };

    const linksBuilder = createQueryBuilder({
      data: [
        {
          address_label: 'Burgstrasse 7, Zurich',
          street: 'Burgstrasse',
          house_number: '7',
          city: 'Zurich',
          latitude: 47.3769,
          longitude: 8.5417,
          media_item_location_links: {
            media_item_id: 'img-1',
            media_items: {
              created_at: new Date().toISOString(),
              organization_id: 'org-1',
              project_id: null,
            },
          },
        },
      ],
      error: null,
    });
    const projectsBuilder = createQueryBuilder({
      data: [{ id: 'project-1', name: 'Burg Renovation' }],
      error: null,
    });

    TestBed.configureTestingModule({
      imports: [SearchBarComponent, SearchDropdownItemComponent, SearchFilterChipsComponent],
      providers: [
        provideOrgSearchTuningTestDouble(),
        {
          provide: Router,
          useValue: router,
        },
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: vi.fn((table: string) => {
                if (table === 'locations') return linksBuilder;
                if (table === 'projects') return projectsBuilder;
                return createQueryBuilder({ data: [], error: null });
              }),
            },
          },
        },
        {
          provide: MediaClusterService,
          useValue: {
            ensureLoaded: vi.fn().mockResolvedValue(undefined),
            clusters: signal([]).asReadonly(),
          },
        },
        {
          provide: GeocodingService,
          useValue: {
            ensureGeocodeAvailable: vi.fn().mockResolvedValue(true),
            isGeocodeBlocked: vi.fn().mockReturnValue(false),
            search: vi.fn().mockResolvedValue([
              {
                lat: 46.948,
                lng: 7.4474,
                displayName: 'Burgstrasse 7, Bern, Switzerland',
                address: {
                  road: 'Burgstrasse',
                  house_number: '7',
                  city: 'Bern',
                  postcode: '3000',
                  country: 'Switzerland',
                },
              },
            ]),
          },
        },
        {
          provide: I18nService,
          useValue: {
            t: (_key: string, fallback: string) => fallback,
          },
        },
      ],
    });

    TestBed.overrideComponent(SearchDropdownItemComponent, {
      set: { template: '', styleUrl: undefined, styles: [] },
    });
    TestBed.overrideComponent(SearchFilterChipsComponent, {
      set: { template: '' },
    });

    await TestBed.compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens recent searches on focus', async () => {
    localStorage.setItem(
      'feldpost-recent-searches',
      JSON.stringify([
        {
          label: 'Burgstrasse 7, Zurich',
          lastUsedAt: new Date().toISOString(),
        },
      ]),
    );

    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.dropdownOpen()).toBe(true);
    expect(fixture.componentInstance.recentSearches().length).toBeGreaterThan(0);
    expect(fixture.componentInstance.recentSearches()[0]?.label).toContain('Burgstrasse');
  });

  it('focuses the input on Ctrl+K', () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.focus();
    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    expect(document.activeElement).toBe(input);
    expect(fixture.componentInstance.dropdownOpen()).toBe(true);
  });

  it('shows grouped DB and geocoder results after debounced input', async () => {
    const geocodingService = TestBed.inject(GeocodingService);
    (geocodingService.search as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        lat: 46.948,
        lng: 7.4474,
        displayName: 'Burgstrasse 7, Bern, Switzerland',
        address: {
          road: 'Burgstrasse',
          house_number: '7',
          city: 'Bern',
          postcode: '3000',
          country: 'Switzerland',
        },
      },
    ]);

    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'burg';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    TestBed.flushEffects();

    await vi.advanceTimersByTimeAsync(300);
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('From your data');
    expect(fixture.nativeElement.textContent).toContain('Projects');
    expect(fixture.nativeElement.textContent).toContain('From internet');
  });

  it('commits the highlighted item with Enter and emits map-center for addresses', async () => {
    const geocodingService = TestBed.inject(GeocodingService);
    (geocodingService.search as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const fixture = TestBed.createComponent(SearchBarComponent);
    const mapCenterSpy = vi.fn();
    fixture.componentInstance.mapCenterRequested.subscribe(mapCenterSpy);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'burg';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    TestBed.flushEffects();

    await vi.advanceTimersByTimeAsync(300);
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(mapCenterSpy).toHaveBeenCalled();
    const payload = mapCenterSpy.mock.calls[0]?.[0];
    expect(payload?.lat).toBeCloseTo(47.3769, 3);
    expect(payload?.lng).toBeCloseTo(8.5417, 3);
    expect(payload?.label).toContain('Burgstrasse');
  });

  it('navigates to media route for project content commits', async () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.onCandidateSelected({
      id: 'project-1',
      family: 'db-content',
      label: 'Burg Renovation',
      contentType: 'project',
      contentId: 'project-1',
      subtitle: 'Project',
    });

    expect(router.navigate).toHaveBeenCalledWith(['/media'], {
      queryParams: {
        search: 'Burg Renovation',
        type: 'project',
        id: 'project-1',
      },
    });
  });

  it('clears ghost completion overlay when a result is committed', () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.query.set('Denisgasse 46');
    component.ghostText.set('30-34');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.search-bar__ghost-suffix')).not.toBeNull();

    component.onCandidateSelected({
      id: 'db-1',
      family: 'db-address',
      label: 'Denisgasse 30-34, Vienna',
      lat: 48.2,
      lng: 16.3,
    });
    fixture.detectChanges();

    expect(component.ghostText()).toBeNull();
    expect(fixture.nativeElement.querySelector('.search-bar__ghost-text')).toBeNull();
  });

  it('shows secondary locality line when an address candidate is committed', () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();

    fixture.componentInstance.onCandidateSelected({
      id: 'geo-1',
      family: 'geocoder',
      label: 'Dreikreuzstraße',
      secondaryLabel: '3071 Böheimkirchen · Austria',
      lat: 48.0,
      lng: 15.7,
    });
    fixture.detectChanges();

    const secondary = fixture.nativeElement.querySelector('.search-bar__input-secondary');
    expect(secondary?.textContent).toContain('3071 Böheimkirchen · Austria');
    expect(
      fixture.nativeElement.querySelector('.search-bar__input-row--address-committed'),
    ).not.toBeNull();
  });

  it('commits a stored recent with coordinates immediately', () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    const mapCenterSpy = vi.fn();
    fixture.componentInstance.mapCenterRequested.subscribe(mapCenterSpy);
    fixture.detectChanges();

    fixture.componentInstance.onCandidateSelected({
      id: 'recent-dreikreuzstraße',
      family: 'recent',
      label: 'Dreikreuzstraße',
      secondaryLabel: '3071 Böheimkirchen · Austria',
      lat: 48.1,
      lng: 15.6,
      lastUsedAt: new Date().toISOString(),
    });
    fixture.detectChanges();

    expect(mapCenterSpy).toHaveBeenCalled();
    expect(fixture.componentInstance.state()).toBe('committed');
    expect(fixture.nativeElement.querySelector('.search-bar__input-secondary')?.textContent).toContain(
      '3071 Böheimkirchen · Austria',
    );
  });

  it('shows ghost secondary for the Enter commit target while typing', () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();

    fixture.componentInstance.query.set('Drei');
    fixture.componentInstance.dropdownOpen.set(true);
    fixture.componentInstance.sections.set({
      dbAddress: { family: 'db-address', title: '', items: [] },
      dbContent: { family: 'db-content', title: '', items: [] },
      geocoder: {
        family: 'geocoder',
        title: 'From internet',
        items: [
          {
            id: 'geo-1',
            family: 'geocoder',
            label: 'Dreikreuzstraße',
            secondaryLabel: '3071 Böheimkirchen · Austria',
            lat: 48.0,
            lng: 15.7,
          },
        ],
      },
    });
    fixture.componentInstance.state.set('results-complete');
    fixture.detectChanges();

    const ghostSecondary = fixture.nativeElement.querySelector(
      '.search-bar__input-secondary--ghost',
    );
    expect(ghostSecondary?.textContent).toContain('3071 Böheimkirchen · Austria');
  });

  it('shows the clear button while typing and clears the query when clicked', async () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();

    await typeSearchQuery(fixture, 'zur');

    const clearButton = fixture.nativeElement.querySelector(
      '.search-bar__clear',
    ) as HTMLButtonElement;
    expect(clearButton).not.toBeNull();

    clearButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.query()).toBe('');
    expect(fixture.componentInstance.committedCandidate()).toBeNull();
  });

  it('shows the clear button after a committed candidate and clears state when clicked', () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    const clearSpy = vi.fn();
    fixture.componentInstance.clearRequested.subscribe(clearSpy);
    fixture.detectChanges();

    fixture.componentInstance.onCandidateSelected({
      id: 'db-1',
      family: 'db-address',
      label: 'Burgstrasse 7, Zurich',
      lat: 47.3769,
      lng: 8.5417,
    });
    fixture.detectChanges();

    const clearButton = fixture.nativeElement.querySelector(
      '.search-bar__clear',
    ) as HTMLButtonElement;
    expect(clearButton).not.toBeNull();

    clearButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.query()).toBe('');
    expect(fixture.componentInstance.committedCandidate()).toBeNull();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('shows the empty state when no results are found', async () => {
    const geocodingService = TestBed.inject(GeocodingService);
    (geocodingService.search as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();

    const supabaseService = TestBed.inject(SupabaseService) as unknown as {
      client: { from: ReturnType<typeof vi.fn> };
    };
    supabaseService.client.from = vi.fn(() =>
      createQueryBuilder({ data: [], error: null }),
    ) as never;

    await typeSearchQuery(fixture, 'nowhere');

    expect(fixture.nativeElement.textContent).toContain('No address found for nowhere');
    expect(fixture.nativeElement.textContent).toContain('Try a different address or search term.');
    expect(fixture.nativeElement.querySelector('.search-bar__ghost-action')).toBeNull();
  });

  it('preserves results-complete on blur and restores empty state on refocus', async () => {
    const geocodingService = TestBed.inject(GeocodingService);
    (geocodingService.search as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();

    const supabaseService = TestBed.inject(SupabaseService) as unknown as {
      client: { from: ReturnType<typeof vi.fn> };
    };
    supabaseService.client.from = vi.fn(() =>
      createQueryBuilder({ data: [], error: null }),
    ) as never;

    const input = await typeSearchQuery(fixture, 'nowhere');

    expect(fixture.nativeElement.querySelector('.search-bar__empty-state')).not.toBeNull();

    clickOutsideSearch(fixture);

    expect(fixture.componentInstance.dropdownOpen()).toBe(false);
    expect(fixture.componentInstance.query()).toBe('nowhere');
    expect(fixture.componentInstance.state()).toBe('results-complete');

    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fixture.componentInstance.showDropdownPanel()).toBe(true);
    expect(fixture.componentInstance.state()).toBe('results-complete');
    expect(fixture.nativeElement.querySelector('.search-bar__empty-state')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No address found for nowhere');
  });

  it('restores cached result rows after blur and refocus', async () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();

    const input = await typeSearchQuery(fixture, 'burg');

    expect(fixture.nativeElement.querySelectorAll('ss-search-dropdown-item').length).toBeGreaterThan(
      0,
    );

    clickOutsideSearch(fixture);
    expect(fixture.componentInstance.state()).toBe('results-complete');

    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    expect(fixture.componentInstance.showDropdownPanel()).toBe(true);
    expect(fixture.componentInstance.state()).toBe('results-complete');
    expect(fixture.nativeElement.querySelectorAll('ss-search-dropdown-item').length).toBeGreaterThan(
      0,
    );
  });

  it('preserves search state when Escape closes the dropdown', async () => {
    const geocodingService = TestBed.inject(GeocodingService);
    (geocodingService.search as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();

    const supabaseService = TestBed.inject(SupabaseService) as unknown as {
      client: { from: ReturnType<typeof vi.fn> };
    };
    supabaseService.client.from = vi.fn(() =>
      createQueryBuilder({ data: [], error: null }),
    ) as never;

    const input = await typeSearchQuery(fixture, 'nowhere');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.dropdownOpen()).toBe(false);
    expect(fixture.componentInstance.state()).toBe('results-complete');
  });

  it('refreshes pending search after blur before debounce completes', async () => {
    const geocodingService = TestBed.inject(GeocodingService);
    (geocodingService.search as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();

    const supabaseService = TestBed.inject(SupabaseService) as unknown as {
      client: { from: ReturnType<typeof vi.fn> };
    };
    supabaseService.client.from = vi.fn(() =>
      createQueryBuilder({ data: [], error: null }),
    ) as never;

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'nowhere';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    clickOutsideSearch(fixture);
    expect(fixture.componentInstance.state()).toBe('typing');

    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    await vi.runAllTimersAsync();
    for (let i = 0; i < 8; i++) {
      await Promise.resolve();
    }
    fixture.detectChanges();

    expect(fixture.componentInstance.showDropdownPanel()).toBe(true);
    expect(fixture.componentInstance.state()).toBe('results-complete');
    expect(fixture.nativeElement.querySelector('.search-bar__empty-state')).not.toBeNull();
  });

  it('clears stale sections when the query changes before debounce completes', async () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();

    await typeSearchQuery(fixture, 'burg');
    const initialCount = fixture.nativeElement.querySelectorAll('ss-search-dropdown-item').length;
    expect(initialCount).toBeGreaterThan(0);

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'burgx';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.sections().dbAddress.items.length).toBe(0);
    expect(fixture.componentInstance.sections().geocoder.items.length).toBe(0);
    expect(fixture.nativeElement.querySelector('.search-bar__dropdown')).toBeNull();
  });

  it('restores cached result rows after commit blur and refocus', async () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();

    const input = await typeSearchQuery(fixture, 'burg');

    expect(fixture.nativeElement.querySelectorAll('ss-search-dropdown-item').length).toBeGreaterThan(
      0,
    );

    fixture.componentInstance.onCandidateSelected({
      id: 'db-1',
      family: 'db-address',
      label: 'Burgstrasse 7, Zurich',
      lat: 47.3769,
      lng: 8.5417,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.dropdownOpen()).toBe(false);
    expect(fixture.componentInstance.committedCandidate()).not.toBeNull();

    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    expect(fixture.componentInstance.showDropdownPanel()).toBe(true);
    expect(fixture.componentInstance.state()).toBe('results-complete');
    expect(fixture.nativeElement.querySelectorAll('ss-search-dropdown-item').length).toBeGreaterThan(
      0,
    );
  });

  it('keeps fixed input-row track sizing in component styles', () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    fixture.detectChanges();

    const styleText = Array.from(document.querySelectorAll('style'))
      .map((node) => node.textContent ?? '')
      .join('\n');

    expect(styleText).toContain('display: flex');
    expect(styleText).toContain('flex-direction: column');
    expect(styleText).toContain('height: var(--search-bar-row-height);');
    expect(fixture.nativeElement.querySelector('.search-bar__dropdown')).toBeNull();
  });
});
