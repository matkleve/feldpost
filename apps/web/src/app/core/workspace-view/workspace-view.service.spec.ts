/**
 * WorkspaceViewService â€” address resolution tests.
 *
 * Strategy:
 *  - SupabaseService, GeocodingService, and FilterService are faked.
 *  - Tests verify the resolveUnresolvedAddresses flow: filtering, dedup,
 *    DB update, and local signal patching.
 *  - No real HTTP or DB calls.
 */

import { TestBed } from '@angular/core/testing';
import { WorkspaceViewService } from './workspace-view.service';
import { SupabaseService } from '../supabase/supabase.service';
import { FilterService } from '../filter/filter.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { MetadataService } from '../metadata/metadata.service';
import type { WorkspaceImage } from './workspace-view.types';

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function makeImage(overrides: Partial<WorkspaceImage> = {}): WorkspaceImage {
  return {
    id: crypto.randomUUID(),
    latitude: 47.3769,
    longitude: 8.5417,
    thumbnailPath: null,
    storagePath: 'org/user/photo.jpg',
    capturedAt: '2025-06-01T12:00:00Z',
    createdAt: '2025-06-01T12:00:00Z',
    projectId: null,
    projectName: null,
    direction: null,
    exifLatitude: 47.3769,
    exifLongitude: 8.5417,
    addressLabel: null,
    city: null,
    district: null,
    street: null,
    country: null,
    userName: null,
    ...overrides,
  };
}

const ZURICH_RESULT = {
  addressLabel: 'BurgstraÃŸe 7, 8001 ZÃ¼rich, Switzerland',
  city: 'ZÃ¼rich',
  district: 'Altstadt',
  street: 'BurgstraÃŸe 7',
  country: 'Switzerland',
};

function buildFakeSupabase() {
  return {
    client: {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ error: null }),
        }),
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      rpc: vi.fn().mockResolvedValue({ data: 0, error: null }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrls: vi.fn().mockResolvedValue({ data: [], error: null }),
          createSignedUrl: vi
            .fn()
            .mockResolvedValue({ data: { signedUrl: 'https://fake.url' }, error: null }),
        }),
      },
    },
  };
}

function buildFakeGeocoding(result = ZURICH_RESULT) {
  return {
    reverse: vi.fn().mockResolvedValue(result),
  };
}

function buildFakeFilterService() {
  return {
    rules: vi.fn().mockReturnValue([]),
    activeCount: 0,
    clearAll: vi.fn(),
    matchesClientSide: vi.fn().mockReturnValue(true),
  };
}

function setup(geocodingResult = ZURICH_RESULT) {
  const fakeSupabase = buildFakeSupabase();
  const fakeGeocoding = buildFakeGeocoding(geocodingResult);
  const fakeFilter = buildFakeFilterService();

  TestBed.configureTestingModule({
    providers: [
      WorkspaceViewService,
      MetadataService,
      { provide: SupabaseService, useValue: fakeSupabase },
      { provide: GeocodingService, useValue: fakeGeocoding },
      { provide: FilterService, useValue: fakeFilter },
    ],
  });

  const service = TestBed.inject(WorkspaceViewService);
  return { service, fakeSupabase, fakeGeocoding };
}

// â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('WorkspaceViewService â€” address resolution', () => {
  it('resolves images with coordinates but no addressLabel', async () => {
    const { service, fakeGeocoding } = setup();

    const img = makeImage({ addressLabel: null });
    service.setActiveSelectionImages([img]);

    // Wait for the async resolution.
    await vi.waitFor(() => expect(fakeGeocoding.reverse).toHaveBeenCalled());

    expect(fakeGeocoding.reverse).toHaveBeenCalledWith(47.3769, 8.5417);
  });

  it('skips images that already have addressLabel', async () => {
    const { service, fakeGeocoding } = setup();

    const img = makeImage({
      addressLabel: 'Already resolved',
      city: 'Zurich',
      district: 'Altstadt',
      street: 'Burgstrasse 7',
      country: 'Switzerland',
    });
    service.setActiveSelectionImages([img]);

    await new Promise((r) => setTimeout(r, 50));

    expect(fakeGeocoding.reverse).not.toHaveBeenCalled();
  });

  it('skips images with no coordinates', async () => {
    const { service, fakeGeocoding } = setup();

    const img = makeImage({
      latitude: null as unknown as number,
      longitude: null as unknown as number,
      addressLabel: null,
    });
    service.setActiveSelectionImages([img]);

    await new Promise((r) => setTimeout(r, 50));

    expect(fakeGeocoding.reverse).not.toHaveBeenCalled();
  });

  it('deduplicates â€” one geocode call per unique lat/lng pair', async () => {
    const { service, fakeGeocoding } = setup();

    const images = [
      makeImage({ id: 'a', latitude: 47.3769, longitude: 8.5417, addressLabel: null }),
      makeImage({ id: 'b', latitude: 47.3769, longitude: 8.5417, addressLabel: null }),
      makeImage({ id: 'c', latitude: 46.948, longitude: 7.4474, addressLabel: null }),
    ];
    service.setActiveSelectionImages(images);

    await vi.waitFor(() => expect(fakeGeocoding.reverse).toHaveBeenCalledTimes(2));

    // Two unique coordinates â†’ two calls.
    expect(fakeGeocoding.reverse).toHaveBeenCalledWith(47.3769, 8.5417);
    expect(fakeGeocoding.reverse).toHaveBeenCalledWith(46.948, 7.4474);
  });

  it('uses exact coordinates for dedup â€” no rounding', async () => {
    const { service, fakeGeocoding } = setup();

    // These differ by 0.0001 â€” should be two separate geocode calls.
    const images = [
      makeImage({ id: 'a', latitude: 47.3769, longitude: 8.5417, addressLabel: null }),
      makeImage({ id: 'b', latitude: 47.377, longitude: 8.5417, addressLabel: null }),
    ];
    service.setActiveSelectionImages(images);

    await vi.waitFor(() => expect(fakeGeocoding.reverse).toHaveBeenCalledTimes(2));
  });

  it('updates the DB via RPC for all images at the same coordinates', async () => {
    const { service, fakeSupabase, fakeGeocoding } = setup();

    const images = [
      makeImage({ id: 'img-1', latitude: 47.3769, longitude: 8.5417, addressLabel: null }),
      makeImage({ id: 'img-2', latitude: 47.3769, longitude: 8.5417, addressLabel: null }),
    ];
    service.setActiveSelectionImages(images);

    await vi.waitFor(() => expect(fakeGeocoding.reverse).toHaveBeenCalled());
    // Allow the RPC call to fire.
    await vi.waitFor(() => {
      const rpcCalls = fakeSupabase.client.rpc.mock.calls.filter(
        (c: string[]) => c[0] === 'bulk_update_media_addresses',
      );
      expect(rpcCalls.length).toBeGreaterThan(0);
    });

    const rpcCall = fakeSupabase.client.rpc.mock.calls.find(
      (c: string[]) => c[0] === 'bulk_update_media_addresses',
    )!;
    expect(rpcCall[1].p_media_item_ids).toEqual(expect.arrayContaining(['img-1', 'img-2']));
    expect(rpcCall[1].p_address_label).toBe(ZURICH_RESULT.addressLabel);
  });

  it('patches the local rawImages signal with resolved address', async () => {
    const { service, fakeGeocoding } = setup();

    const img = makeImage({ id: 'img-1', addressLabel: null });
    service.setActiveSelectionImages([img]);

    await vi.waitFor(() => expect(fakeGeocoding.reverse).toHaveBeenCalled());
    // Allow signal update to propagate.
    await vi.waitFor(() => {
      const updated = service.rawImages().find((i) => i.id === 'img-1');
      expect(updated?.addressLabel).toBe('BurgstraÃŸe 7, 8001 ZÃ¼rich, Switzerland');
    });

    const updated = service.rawImages().find((i) => i.id === 'img-1')!;
    expect(updated.city).toBe('ZÃ¼rich');
    expect(updated.district).toBe('Altstadt');
    expect(updated.street).toBe('BurgstraÃŸe 7');
    expect(updated.country).toBe('Switzerland');
  });

  it('does not retry an image that is already being geocoded', async () => {
    const { service, fakeGeocoding } = setup();

    const img = makeImage({ id: 'img-1', addressLabel: null });

    // Trigger resolution twice quickly.
    service.setActiveSelectionImages([img]);
    service.setActiveSelectionImages([{ ...img }]);

    await vi.waitFor(() => expect(fakeGeocoding.reverse).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));

    // Should only geocode once despite two setActiveSelectionImages calls.
    expect(fakeGeocoding.reverse).toHaveBeenCalledTimes(1);
  });

  it('continues resolving other groups when one geocode fails', async () => {
    const { service, fakeGeocoding } = setup();
    fakeGeocoding.reverse
      .mockResolvedValueOnce(null) // First coordinate fails
      .mockResolvedValueOnce(ZURICH_RESULT); // Second succeeds

    const images = [
      makeImage({ id: 'a', latitude: 10, longitude: 20, addressLabel: null }),
      makeImage({ id: 'b', latitude: 30, longitude: 40, addressLabel: null }),
    ];
    service.setActiveSelectionImages(images);

    await vi.waitFor(() => expect(fakeGeocoding.reverse).toHaveBeenCalledTimes(2));

    // Image 'b' should still get resolved even though 'a' failed.
    await vi.waitFor(() => {
      const updated = service.rawImages().find((i) => i.id === 'b');
      expect(updated?.addressLabel).toBe('BurgstraÃŸe 7, 8001 ZÃ¼rich, Switzerland');
    });

    // Image 'a' should remain unresolved.
    const a = service.rawImages().find((i) => i.id === 'a');
    expect(a?.addressLabel).toBeNull();
  });
});

describe('WorkspaceViewService â€” grouping with addresses', () => {
  it('groups by district using resolved address data', async () => {
    const { service } = setup();

    const images = [
      makeImage({ id: 'a', district: 'Altstadt' }),
      makeImage({ id: 'b', district: 'Altstadt' }),
      makeImage({ id: 'c', district: 'Seefeld' }),
    ];
    service.setActiveSelectionImages(images);
    service.setActiveGroupings([{ id: 'district', label: 'District', icon: '' }]);

    const sections = service.groupedSections();
    expect(sections.length).toBe(2);

    const headings = sections.map((s) => s.heading);
    expect(headings).toContain('Altstadt');
    expect(headings).toContain('Seefeld');
  });

  it('shows "Unknown district" for images without district', () => {
    const { service } = setup();

    const images = [makeImage({ id: 'a', district: null })];
    service.setActiveSelectionImages(images);
    service.setActiveGroupings([{ id: 'district', label: 'District', icon: '' }]);

    const sections = service.groupedSections();
    expect(sections[0].heading).toBe('Unknown district');
  });

  it('groups by city using resolved address data', () => {
    const { service } = setup();

    const images = [makeImage({ id: 'a', city: 'ZÃ¼rich' }), makeImage({ id: 'b', city: 'Bern' })];
    service.setActiveSelectionImages(images);
    service.setActiveGroupings([{ id: 'city', label: 'City', icon: '' }]);

    const sections = service.groupedSections();
    expect(sections.length).toBe(2);
    expect(sections.map((s) => s.heading)).toContain('ZÃ¼rich');
    expect(sections.map((s) => s.heading)).toContain('Bern');
  });
});

// â”€â”€ Sort + Grouping Sync (WV-3b) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('WorkspaceViewService â€” sort + grouping sync', () => {
  function setupSortGrouping() {
    const { service } = setup();

    // Seed images with diverse cities, projects, and dates for meaningful sorting.
    const images = [
      makeImage({
        id: 'z1',
        city: 'ZÃ¼rich',
        projectName: 'Alpha',
        capturedAt: '2026-01-01T00:00:00Z',
      }),
      makeImage({
        id: 'b1',
        city: 'Berlin',
        projectName: 'Beta',
        capturedAt: '2026-03-01T00:00:00Z',
      }),
      makeImage({
        id: 'w1',
        city: 'Wien',
        projectName: 'Alpha',
        capturedAt: '2026-02-01T00:00:00Z',
      }),
      makeImage({
        id: 'b2',
        city: 'Berlin',
        projectName: 'Alpha',
        capturedAt: '2026-01-15T00:00:00Z',
      }),
      makeImage({
        id: 'z2',
        city: 'ZÃ¼rich',
        projectName: 'Beta',
        capturedAt: '2026-02-15T00:00:00Z',
      }),
    ];
    service.setActiveSelectionImages(images);
    return service;
  }

  it('auto-prepends grouping keys to effectiveSorts', () => {
    const service = setupSortGrouping();

    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);

    const effective = service.effectiveSorts();
    expect(effective[0]).toEqual({ key: 'city', direction: 'asc' });
    // Default user sort should follow
    expect(effective[1]).toEqual({ key: 'date-captured', direction: 'desc' });
  });

  it('groups are sorted alphabetically when grouping direction is asc', () => {
    const service = setupSortGrouping();

    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);

    const sections = service.groupedSections();
    const headings = sections.map((s) => s.heading);
    expect(headings).toEqual(['Berlin', 'Wien', 'ZÃ¼rich']);
  });

  it('groups are sorted reverse-alphabetically when grouping direction is desc', () => {
    const service = setupSortGrouping();

    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);
    // Change city sort direction to descending
    service.setActiveSorts([
      { key: 'city', direction: 'desc' },
      { key: 'date-captured', direction: 'desc' },
    ]);

    const sections = service.groupedSections();
    const headings = sections.map((s) => s.heading);
    expect(headings).toEqual(['ZÃ¼rich', 'Wien', 'Berlin']);
  });

  it('multi-level grouping respects sort directions for both levels', () => {
    const service = setupSortGrouping();

    service.setActiveGroupings([
      { id: 'city', label: 'City', icon: 'location_city' },
      { id: 'project', label: 'Project', icon: 'folder' },
    ]);

    const sections = service.groupedSections();
    // Top level should be city Aâ†’Z (default asc)
    expect(sections.map((s) => s.heading)).toEqual(['Berlin', 'Wien', 'ZÃ¼rich']);

    // Berlin subgroups: Alpha, Beta (Aâ†’Z)
    const berlinSubs = sections[0].subGroups!;
    expect(berlinSubs.map((s) => s.heading)).toEqual(['Alpha', 'Beta']);
  });

  it('retains user sort direction when a property is added as grouping', () => {
    const service = setupSortGrouping();

    // User first activates city sort as descending
    service.setActiveSorts([
      { key: 'date-captured', direction: 'desc' },
      { key: 'city', direction: 'desc' },
    ]);

    // Then city is added as a grouping
    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);

    const effective = service.effectiveSorts();
    // City should be first (grouping position) and retain desc direction
    expect(effective[0]).toEqual({ key: 'city', direction: 'desc' });
  });

  it('removes grouping-only sort key when grouping is removed', () => {
    const service = setupSortGrouping();

    // Activate grouping â€” city gets auto-added to sorts
    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);
    expect(service.effectiveSorts().some((s) => s.key === 'city')).toBe(true);

    // Remove the grouping
    service.setActiveGroupings([]);

    const effective = service.effectiveSorts();
    // City was grouping-only â€” should be gone
    expect(effective.some((s) => s.key === 'city')).toBe(false);
    // Default sort remains
    expect(effective).toEqual([{ key: 'date-captured', direction: 'desc' }]);
  });

  it('keeps user-defined sort when grouping of same key is removed', () => {
    const service = setupSortGrouping();

    // User explicitly adds city sort first
    service.setActiveSorts([
      { key: 'date-captured', direction: 'desc' },
      { key: 'city', direction: 'asc' },
    ]);

    // Then grouping is added for city
    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);

    // Then grouping is removed
    service.setActiveGroupings([]);

    const effective = service.effectiveSorts();
    // City was in user sorts before grouping â€” should remain
    expect(effective.some((s) => s.key === 'city')).toBe(true);
  });

  it('effectiveSorts deduplicates grouping keys already in user sorts', () => {
    const service = setupSortGrouping();

    // User has city in their sorts
    service.setActiveSorts([
      { key: 'date-captured', direction: 'desc' },
      { key: 'city', direction: 'desc' },
    ]);

    // Add city as grouping
    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);

    const effective = service.effectiveSorts();
    // City should appear exactly once (at grouping position)
    const cityEntries = effective.filter((s) => s.key === 'city');
    expect(cityEntries.length).toBe(1);
    expect(effective[0].key).toBe('city');
  });

  it('images within a group are sorted by remaining sort keys', () => {
    const service = setupSortGrouping();

    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);
    // Default: date-captured desc â€” within Berlin group, b1 (March) should come before b2 (Jan)

    const sections = service.groupedSections();
    const berlin = sections.find((s) => s.heading === 'Berlin')!;
    expect(berlin.images[0].id).toBe('b1'); // March â€” newest first
    expect(berlin.images[1].id).toBe('b2'); // January
  });

  it('changing sort direction on grouped property reorders groups', () => {
    const service = setupSortGrouping();

    service.setActiveGroupings([{ id: 'city', label: 'City', icon: 'location_city' }]);

    // Verify initial Aâ†’Z order
    let sections = service.groupedSections();
    expect(sections[0].heading).toBe('Berlin');

    // Change city to descending
    service.setActiveSorts([
      { key: 'city', direction: 'desc' },
      { key: 'date-captured', direction: 'desc' },
    ]);

    sections = service.groupedSections();
    expect(sections[0].heading).toBe('ZÃ¼rich');
    expect(sections[2].heading).toBe('Berlin');
  });
});

// â”€â”€ Numeric sorting (custom number properties) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('WorkspaceViewService â€” numeric sorting', () => {
  it('sorts number-type metadata fields numerically, not lexicographically', () => {
    const { service } = setup();
    const registry = TestBed.inject(MetadataService);

    registry.setMetadataFieldsFromKeys([{ id: 'fang', key_name: 'Fang', key_type: 'number' }]);

    const images = [
      makeImage({ id: 'a', metadata: { fang: '100' } }),
      makeImage({ id: 'b', metadata: { fang: '5' } }),
      makeImage({ id: 'c', metadata: { fang: '12' } }),
      makeImage({ id: 'd', metadata: { fang: '1' } }),
    ];
    service.setActiveSelectionImages(images);
    service.setActiveSorts([{ key: 'fang', direction: 'asc' }]);

    const sorted = service.groupedSections()[0].images;
    // Numeric order: 1, 5, 12, 100 (not lexicographic "1", "100", "12", "5")
    expect(sorted.map((i) => i.id)).toEqual(['d', 'b', 'c', 'a']);
  });

  it('sorts number-type metadata fields descending', () => {
    const { service } = setup();
    const registry = TestBed.inject(MetadataService);

    registry.setMetadataFieldsFromKeys([{ id: 'fang', key_name: 'Fang', key_type: 'number' }]);

    const images = [
      makeImage({ id: 'a', metadata: { fang: '1' } }),
      makeImage({ id: 'b', metadata: { fang: '100' } }),
      makeImage({ id: 'c', metadata: { fang: '12' } }),
    ];
    service.setActiveSelectionImages(images);
    service.setActiveSorts([{ key: 'fang', direction: 'desc' }]);

    const sorted = service.groupedSections()[0].images;
    expect(sorted.map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('pushes null metadata values to the end during numeric sort', () => {
    const { service } = setup();
    const registry = TestBed.inject(MetadataService);

    registry.setMetadataFieldsFromKeys([{ id: 'fang', key_name: 'Fang', key_type: 'number' }]);

    const images = [
      makeImage({ id: 'a', metadata: { fang: '5' } }),
      makeImage({ id: 'b' }), // no metadata
      makeImage({ id: 'c', metadata: { fang: '1' } }),
    ];
    service.setActiveSelectionImages(images);
    service.setActiveSorts([{ key: 'fang', direction: 'asc' }]);

    const sorted = service.groupedSections()[0].images;
    expect(sorted[0].id).toBe('c'); // 1
    expect(sorted[1].id).toBe('a'); // 5
    expect(sorted[2].id).toBe('b'); // null â†’ end
  });

  it('groups by number-type metadata field', () => {
    const { service } = setup();
    const registry = TestBed.inject(MetadataService);

    registry.setMetadataFieldsFromKeys([{ id: 'floor', key_name: 'Floor', key_type: 'number' }]);

    const images = [
      makeImage({ id: 'a', metadata: { floor: '1' } }),
      makeImage({ id: 'b', metadata: { floor: '2' } }),
      makeImage({ id: 'c', metadata: { floor: '1' } }),
    ];
    service.setActiveSelectionImages(images);
    service.setActiveGroupings([{ id: 'floor', label: 'Floor', icon: 'numbers' }]);

    const sections = service.groupedSections();
    expect(sections.length).toBe(2);
    const headings = sections.map((s) => s.heading);
    expect(headings).toContain('Floor 1');
    expect(headings).toContain('Floor 2');
  });
});

// â”€â”€ Integration: loadCustomProperties â†’ registry â†’ dropdown signals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('WorkspaceViewService â€” loadCustomProperties integration', () => {
  it('loads metadata_keys from Supabase and registers them in MetadataService', async () => {
    const fakeMetadataKeys = [
      { id: 'uuid-bauphase', key_name: 'Bauphase' },
      { id: 'uuid-fang', key_name: 'Fang' },
    ];
    const fakeSupabase = buildFakeSupabase();
    // Override the from('metadata_keys') chain to return our fake data
    fakeSupabase.client.from.mockImplementation((table: string) => {
      if (table === 'metadata_keys') {
        return {
          select: vi.fn().mockResolvedValue({ data: fakeMetadataKeys, error: null }),
        };
      }
      // Default for other tables (media_metadata, images, etc.)
      return {
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ error: null }),
        }),
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    TestBed.configureTestingModule({
      providers: [
        WorkspaceViewService,
        MetadataService,
        { provide: SupabaseService, useValue: fakeSupabase },
        { provide: GeocodingService, useValue: buildFakeGeocoding() },
        { provide: FilterService, useValue: buildFakeFilterService() },
      ],
    });

    const service = TestBed.inject(WorkspaceViewService);
    const registry = TestBed.inject(MetadataService);

    // Before loading: only built-in properties
    const builtInCount = registry.allMetadataFields().length;
    expect(registry.allMetadataFields().every((p) => p.builtIn)).toBe(true);

    // Load metadata fields (the method under test)
    await service.loadMetadataFields();

    // After loading: metadata fields appear in the registry
    expect(registry.allMetadataFields().length).toBe(builtInCount + 2);
    expect(registry.allMetadataFields().some((p) => p.label === 'Bauphase')).toBe(true);
    expect(registry.allMetadataFields().some((p) => p.label === 'Fang')).toBe(true);

    // Metadata fields show up in all dropdown lists
    expect(registry.sortableMetadataFields().some((p) => p.label === 'Bauphase')).toBe(true);
    expect(registry.groupableMetadataFields().some((p) => p.label === 'Fang')).toBe(true);
    expect(registry.filterableMetadataFields().some((p) => p.label === 'Bauphase')).toBe(true);
  });

  it('metadata fields are not marked as builtIn after loading', async () => {
    const fakeMetadataKeys = [{ id: 'uuid-floor', key_name: 'Floor' }];
    const fakeSupabase = buildFakeSupabase();
    fakeSupabase.client.from.mockImplementation((table: string) => {
      if (table === 'metadata_keys') {
        return {
          select: vi.fn().mockResolvedValue({ data: fakeMetadataKeys, error: null }),
        };
      }
      return {
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ error: null }),
        }),
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    TestBed.configureTestingModule({
      providers: [
        WorkspaceViewService,
        MetadataService,
        { provide: SupabaseService, useValue: fakeSupabase },
        { provide: GeocodingService, useValue: buildFakeGeocoding() },
        { provide: FilterService, useValue: buildFakeFilterService() },
      ],
    });

    const service = TestBed.inject(WorkspaceViewService);
    const registry = TestBed.inject(MetadataService);

    await service.loadMetadataFields();

    const floorProp = registry.getMetadataField('uuid-floor');
    expect(floorProp).toBeDefined();
    expect(floorProp!.builtIn).toBe(false);
    expect(floorProp!.label).toBe('Floor');
  });

  it('handles empty metadata_keys gracefully', async () => {
    const fakeSupabase = buildFakeSupabase();
    fakeSupabase.client.from.mockImplementation((table: string) => {
      if (table === 'metadata_keys') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ error: null }),
        }),
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    TestBed.configureTestingModule({
      providers: [
        WorkspaceViewService,
        MetadataService,
        { provide: SupabaseService, useValue: fakeSupabase },
        { provide: GeocodingService, useValue: buildFakeGeocoding() },
        { provide: FilterService, useValue: buildFakeFilterService() },
      ],
    });

    const service = TestBed.inject(WorkspaceViewService);
    const registry = TestBed.inject(MetadataService);
    const before = registry.allMetadataFields().length;

    await service.loadMetadataFields();

    expect(registry.allMetadataFields().length).toBe(before);
  });

  it('end-to-end: load metadata field â†’ add metadata to image â†’ group by it', async () => {
    const fakeMetadataKeys = [{ id: 'uuid-bauphase', key_name: 'Bauphase' }];
    const fakeSupabase = buildFakeSupabase();
    fakeSupabase.client.from.mockImplementation((table: string) => {
      if (table === 'metadata_keys') {
        return {
          select: vi.fn().mockResolvedValue({ data: fakeMetadataKeys, error: null }),
        };
      }
      return {
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ error: null }),
        }),
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    TestBed.configureTestingModule({
      providers: [
        WorkspaceViewService,
        MetadataService,
        { provide: SupabaseService, useValue: fakeSupabase },
        { provide: GeocodingService, useValue: buildFakeGeocoding() },
        { provide: FilterService, useValue: buildFakeFilterService() },
      ],
    });

    const service = TestBed.inject(WorkspaceViewService);
    const registry = TestBed.inject(MetadataService);

    // Step 1: Load metadata fields from DB
    await service.loadMetadataFields();
    expect(registry.groupableMetadataFields().some((p) => p.label === 'Bauphase')).toBe(true);

    // Step 2: Add images with metadata values
    const images = [
      makeImage({ id: 'a', metadata: { 'uuid-bauphase': 'Rohbau' } }),
      makeImage({ id: 'b', metadata: { 'uuid-bauphase': 'Innenausbau' } }),
      makeImage({ id: 'c', metadata: { 'uuid-bauphase': 'Rohbau' } }),
      makeImage({ id: 'd' }), // no Bauphase
    ];
    service.setActiveSelectionImages(images);

    // Step 3: Group by Bauphase
    service.setActiveGroupings([{ id: 'uuid-bauphase', label: 'Bauphase', icon: 'tag' }]);

    // Step 4: Verify groups
    const sections = service.groupedSections();
    const headings = sections.map((s) => s.heading);
    expect(headings).toContain('Bauphase Rohbau');
    expect(headings).toContain('Bauphase Innenausbau');
    expect(headings).toContain('No Bauphase');

    const rohbau = sections.find((s) => s.heading === 'Bauphase Rohbau')!;
    expect(rohbau.images.length).toBe(2);
  });

  it('end-to-end: load metadata field â†’ add metadata â†’ sort numerically', async () => {
    const fakeMetadataKeys = [{ id: 'uuid-fang', key_name: 'Fang' }];
    const fakeSupabase = buildFakeSupabase();
    fakeSupabase.client.from.mockImplementation((table: string) => {
      if (table === 'metadata_keys') {
        return {
          select: vi.fn().mockResolvedValue({ data: fakeMetadataKeys, error: null }),
        };
      }
      return {
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ error: null }),
        }),
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    TestBed.configureTestingModule({
      providers: [
        WorkspaceViewService,
        MetadataService,
        { provide: SupabaseService, useValue: fakeSupabase },
        { provide: GeocodingService, useValue: buildFakeGeocoding() },
        { provide: FilterService, useValue: buildFakeFilterService() },
      ],
    });

    const service = TestBed.inject(WorkspaceViewService);
    const registry = TestBed.inject(MetadataService);

    // Step 1: Load metadata fields â€” Fang defaults to 'text' type from DB
    await service.loadMetadataFields();
    expect(registry.sortableMetadataFields().some((p) => p.label === 'Fang')).toBe(true);

    // Step 2: Add images with numeric metadata
    const images = [
      makeImage({ id: 'a', metadata: { 'uuid-fang': '100' } }),
      makeImage({ id: 'b', metadata: { 'uuid-fang': '5' } }),
      makeImage({ id: 'c', metadata: { 'uuid-fang': '12' } }),
    ];
    service.setActiveSelectionImages(images);

    // Step 3: Sort by Fang ascending
    service.setActiveSorts([{ key: 'uuid-fang', direction: 'asc' }]);

    // Step 4: Verify text-type sort (since DB has no key_type, defaults to text)
    // Text sort ascending: '100' < '12' < '5' (lexicographic)
    const sorted = service.groupedSections()[0].images;
    expect(sorted.map((i) => i.id)).toEqual(['a', 'c', 'b']);
  });

  it('end-to-end: load metadata field â†’ add metadata â†’ filter by it', async () => {
    const fakeMetadataKeys = [{ id: 'uuid-bauphase', key_name: 'Bauphase' }];
    const fakeSupabase = buildFakeSupabase();
    fakeSupabase.client.from.mockImplementation((table: string) => {
      if (table === 'metadata_keys') {
        return {
          select: vi.fn().mockResolvedValue({ data: fakeMetadataKeys, error: null }),
        };
      }
      return {
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ error: null }),
        }),
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    // Use real FilterService for the integration test
    TestBed.configureTestingModule({
      providers: [
        WorkspaceViewService,
        MetadataService,
        FilterService,
        { provide: SupabaseService, useValue: fakeSupabase },
        { provide: GeocodingService, useValue: buildFakeGeocoding() },
      ],
    });

    const service = TestBed.inject(WorkspaceViewService);
    const registry = TestBed.inject(MetadataService);
    const filterService = TestBed.inject(FilterService);

    // Step 1: Load metadata fields
    await service.loadMetadataFields();
    expect(registry.filterableMetadataFields().some((p) => p.label === 'Bauphase')).toBe(true);

    // Step 2: Add images with metadata
    const images = [
      makeImage({ id: 'a', metadata: { 'uuid-bauphase': 'Rohbau' } }),
      makeImage({ id: 'b', metadata: { 'uuid-bauphase': 'Innenausbau' } }),
      makeImage({ id: 'c', metadata: { 'uuid-bauphase': 'Rohbau' } }),
    ];
    service.setActiveSelectionImages(images);

    // Step 3: Add a filter rule for Bauphase = "Rohbau"
    filterService.addRule();
    const ruleId = filterService.rules()[0].id;
    filterService.updateRule(ruleId, {
      property: 'uuid-bauphase',
      operator: 'is',
      value: 'Rohbau',
    });

    // Step 4: Verify filtered results
    const sections = service.groupedSections();
    const allImages = sections.flatMap((s) => s.images);
    expect(allImages.length).toBe(2);
    expect(allImages.every((img) => img.metadata?.['uuid-bauphase'] === 'Rohbau')).toBe(true);
  });
});
