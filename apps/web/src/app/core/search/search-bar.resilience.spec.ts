import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GeocodingService } from '../geocoding/geocoding.service';
import { MediaClusterService } from '../geocoding/media-cluster.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SearchBarService } from './search-bar.service';
import { provideOrgSearchTuningTestDouble } from './search-test.providers';

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

describe('SearchBarService resilience', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty results and emits one structured db-address error event for REST 400', async () => {
    window.localStorage.setItem('feldpost-search-debug', '1');

    const failingLinksBuilder = createQueryBuilder({
      data: [],
      error: {
        code: 'PGRST204',
        message: "Could not find the 'postcode' column of 'media_items' in the schema cache",
        details: null,
        hint: null,
        status: 400,
      },
    });

    const fallbackBuilder = createQueryBuilder({ data: [], error: null });
    const supabaseMock = {
      client: {
        from: vi.fn((table: string) =>
          table === 'media_item_location_links' ? failingLinksBuilder : fallbackBuilder,
        ),
      },
    };

    const geocodingMock = {
      search: vi.fn().mockResolvedValue([]),
      reverse: vi.fn().mockResolvedValue(null),
    };

    const emptyClusters = signal([]).asReadonly();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        SearchBarService,
        provideOrgSearchTuningTestDouble(),
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: GeocodingService, useValue: geocodingMock },
        {
          provide: MediaClusterService,
          useValue: {
            ensureLoaded: vi.fn().mockResolvedValue(undefined),
            clusters: emptyClusters,
          },
        },
      ],
    });

    const service = TestBed.inject(SearchBarService);
    const results = await firstValueFrom(service.resolveDbAddresses('wilhe', {}));

    expect(results).toEqual([]);

    const logRaw = window.localStorage.getItem('feldpost-search-debug-log');
    expect(logRaw).toBeTruthy();
    const entries = JSON.parse(logRaw ?? '[]') as Array<{ kind: string; payload: unknown }>;
    const dbAddressErrors = entries.filter((entry) => entry.kind === 'db-address-error');
    expect(dbAddressErrors.length).toBe(1);
    expect(dbAddressErrors[0]?.payload).toMatchObject({
      query: 'wilhe',
      error: {
        code: 'PGRST204',
        status: 400,
      },
    });
  });
});
