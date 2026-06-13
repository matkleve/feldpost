import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it, beforeEach } from 'vitest';
import { DbAddressProvider } from './db-address.provider';
import { SupabaseService } from '../../supabase/supabase.service';
import { provideOrgSearchTuningTestDouble } from '../search-test.providers';
import { SEARCH_TUNING_SYSTEM_DEFAULTS } from '../search-tuning.defaults';

function createQueryBuilder(result: { data: unknown[]; error: unknown }) {
  const builder = {
    select: vi.fn(),
    ilike: vi.fn(),
    not: vi.fn(),
    limit: vi.fn(),
    eq: vi.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.ilike.mockReturnValue(builder);
  builder.not.mockReturnValue(builder);
  builder.limit.mockResolvedValue(result);
  builder.eq.mockReturnValue(builder);

  return builder;
}

function addressRow(options: {
  mediaItemId: string;
  addressLabel: string;
  street: string;
  houseNumber: string;
  city: string;
  lat: number;
  lng: number;
  projectId?: string | null;
  createdAt?: string;
}) {
  return {
    address_label: options.addressLabel,
    street: options.street,
    house_number: options.houseNumber,
    city: options.city,
    latitude: options.lat,
    longitude: options.lng,
    media_item_location_links: {
      media_item_id: options.mediaItemId,
    media_items: {
      created_at: options.createdAt ?? new Date().toISOString(),
      organization_id: 'org-1',
      media_projects: options.projectId ? [{ project_id: options.projectId }] : [],
    },
    },
  };
}

describe('DbAddressProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty list for empty query', async () => {
    TestBed.configureTestingModule({
      providers: [
        DbAddressProvider,
        provideOrgSearchTuningTestDouble(),
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: vi.fn(() => createQueryBuilder({ data: [], error: null })),
            },
          },
        },
      ],
    });

    const provider = TestBed.inject(DbAddressProvider);
    const results = await firstValueFrom(provider.search('   ', {}));
    expect(results).toEqual([]);
  });

  it('returns empty results and logs a structured db-address error on Supabase failure', async () => {
    localStorage.setItem('feldpost-search-debug', '1');

    const failingBuilder = createQueryBuilder({
      data: [],
      error: {
        code: 'PGRST204',
        message: 'schema cache miss',
        details: null,
        hint: null,
        status: 400,
      },
    });

    TestBed.configureTestingModule({
      providers: [
        DbAddressProvider,
        provideOrgSearchTuningTestDouble(),
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: vi.fn(() => failingBuilder),
            },
          },
        },
      ],
    });

    const provider = TestBed.inject(DbAddressProvider);
    const results = await firstValueFrom(provider.search('wilhe', {}));

    expect(results).toEqual([]);

    const logRaw = localStorage.getItem('feldpost-search-debug-log');
    const entries = JSON.parse(logRaw ?? '[]') as Array<{ kind: string; payload: unknown }>;
    const dbAddressErrors = entries.filter((entry) => entry.kind === 'db-address-error');
    expect(dbAddressErrors.length).toBe(1);
    expect(dbAddressErrors[0]?.payload).toMatchObject({
      query: 'wilhe',
      error: { code: 'PGRST204', status: 400 },
    });
  });

  it('groups addresses by label and ranks by score', async () => {
    const linksBuilder = createQueryBuilder({
      data: [
        addressRow({
          mediaItemId: 'img-1',
          addressLabel: 'Burgstrasse 7, Zurich',
          street: 'Burgstrasse',
          houseNumber: '7',
          city: 'Zurich',
          lat: 47.3769,
          lng: 8.5417,
        }),
        addressRow({
          mediaItemId: 'img-2',
          addressLabel: 'Burgstrasse 7, Zurich',
          street: 'Burgstrasse',
          houseNumber: '7',
          city: 'Zurich',
          lat: 47.377,
          lng: 8.542,
        }),
        addressRow({
          mediaItemId: 'img-3',
          addressLabel: 'Limmatquai 1, Zurich',
          street: 'Limmatquai',
          houseNumber: '1',
          city: 'Zurich',
          lat: 47.371,
          lng: 8.543,
        }),
      ],
      error: null,
    });

    TestBed.configureTestingModule({
      providers: [
        DbAddressProvider,
        provideOrgSearchTuningTestDouble(),
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: vi.fn(() => linksBuilder),
            },
          },
        },
      ],
    });

    const provider = TestBed.inject(DbAddressProvider);
    const results = await firstValueFrom(provider.search('burg', {}));

    expect(results).toHaveLength(2);
    expect(results[0]?.family).toBe('db-address');
    expect(results[0]?.imageCount).toBe(2);
    expect(results[0]?.label).toContain('Burgstrasse');
    expect((results[0]?.score ?? 0)).toBeGreaterThan(results[1]?.score ?? 0);
  });

  it('boosts ranking when project_id matches activeProjectId', async () => {
    const linksBuilder = createQueryBuilder({
      data: [
        addressRow({
          mediaItemId: 'img-other',
          addressLabel: 'Other Street 1, Zurich',
          street: 'Other Street',
          houseNumber: '1',
          city: 'Zurich',
          lat: 47.37,
          lng: 8.54,
          projectId: 'project-other',
        }),
        addressRow({
          mediaItemId: 'img-active',
          addressLabel: 'Active Project St 2, Zurich',
          street: 'Active Project St',
          houseNumber: '2',
          city: 'Zurich',
          lat: 47.371,
          lng: 8.541,
          projectId: 'project-active',
        }),
      ],
      error: null,
    });

    TestBed.configureTestingModule({
      providers: [
        DbAddressProvider,
        provideOrgSearchTuningTestDouble(),
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: vi.fn(() => linksBuilder),
            },
          },
        },
      ],
    });

    const provider = TestBed.inject(DbAddressProvider);
    const results = await firstValueFrom(
      provider.search('zurich', { activeProjectId: 'project-active' }),
    );

    expect(results[0]?.id).toBe('img-active');
    expect((results[0]?.score ?? 0)).toBeGreaterThan(results[1]?.score ?? 0);
  });

  it('respects maxDbAddressResults from org tuning', async () => {
    const linksBuilder = createQueryBuilder({
      data: [
        addressRow({
          mediaItemId: 'img-1',
          addressLabel: 'Alpha St 1, Zurich',
          street: 'Alpha St',
          houseNumber: '1',
          city: 'Zurich',
          lat: 47.37,
          lng: 8.54,
        }),
        addressRow({
          mediaItemId: 'img-2',
          addressLabel: 'Beta St 2, Zurich',
          street: 'Beta St',
          houseNumber: '2',
          city: 'Zurich',
          lat: 47.371,
          lng: 8.541,
        }),
        addressRow({
          mediaItemId: 'img-3',
          addressLabel: 'Gamma St 3, Zurich',
          street: 'Gamma St',
          houseNumber: '3',
          city: 'Zurich',
          lat: 47.372,
          lng: 8.542,
        }),
      ],
      error: null,
    });

    const tuningDouble = provideOrgSearchTuningTestDouble();
    tuningDouble.useValue.orgSearchConfig = signal({
      ...SEARCH_TUNING_SYSTEM_DEFAULTS,
      resolver: {
        ...SEARCH_TUNING_SYSTEM_DEFAULTS.resolver,
        maxDbAddressResults: 1,
      },
    });

    TestBed.configureTestingModule({
      providers: [
        DbAddressProvider,
        tuningDouble,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: vi.fn(() => linksBuilder),
            },
          },
        },
      ],
    });

    const provider = TestBed.inject(DbAddressProvider);
    const results = await firstValueFrom(provider.search('zurich', {}));

    expect(results).toHaveLength(1);
  });
});
