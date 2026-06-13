import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SearchBarComponent } from './search-bar.component';
import { SearchDropdownItemComponent } from './search-dropdown-item.component';
import { SearchFilterChipsComponent } from './search-filter-chips.component';
import { provideOrgSearchTuningTestDouble } from '../../../core/search/search-test.providers';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { GeocodingService } from '../../../core/geocoding/geocoding.service';
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

    await vi.advanceTimersByTimeAsync(300);
    await Promise.resolve();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('From DB');
    expect(fixture.nativeElement.textContent).toContain('Projects');
    expect(fixture.nativeElement.textContent).toContain('From Internet');
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

    await vi.advanceTimersByTimeAsync(300);
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

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'nowhere';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    await vi.advanceTimersByTimeAsync(300);
    await Promise.resolve();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No address found for nowhere');
    expect(fixture.nativeElement.textContent).toContain('Try a different address or search term.');
    expect(fixture.nativeElement.querySelector('.search-bar__ghost-action')).toBeNull();
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
