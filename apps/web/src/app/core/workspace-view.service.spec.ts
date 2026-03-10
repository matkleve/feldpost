/**
 * WorkspaceViewService — address resolution tests.
 *
 * Strategy:
 *  - SupabaseService, GeocodingService, and FilterService are faked.
 *  - Tests verify the resolveUnresolvedAddresses flow: filtering, dedup,
 *    DB update, and local signal patching.
 *  - No real HTTP or DB calls.
 */

import { TestBed } from '@angular/core/testing';
import { WorkspaceViewService } from './workspace-view.service';
import { SupabaseService } from './supabase.service';
import { FilterService } from './filter.service';
import { GeocodingService } from './geocoding.service';
import { PropertyRegistryService } from './property-registry.service';
import type { WorkspaceImage } from './workspace-view.types';

// ── Helpers ────────────────────────────────────────────────────────────────────

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
  addressLabel: 'Burgstraße 7, 8001 Zürich, Switzerland',
  city: 'Zürich',
  district: 'Altstadt',
  street: 'Burgstraße 7',
  country: 'Switzerland',
};

function buildFakeSupabase() {
  return {
    client: {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ error: null }),
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
      PropertyRegistryService,
      { provide: SupabaseService, useValue: fakeSupabase },
      { provide: GeocodingService, useValue: fakeGeocoding },
      { provide: FilterService, useValue: fakeFilter },
    ],
  });

  const service = TestBed.inject(WorkspaceViewService);
  return { service, fakeSupabase, fakeGeocoding };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('WorkspaceViewService — address resolution', () => {
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

    const img = makeImage({ addressLabel: 'Already resolved' });
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

  it('deduplicates — one geocode call per unique lat/lng pair', async () => {
    const { service, fakeGeocoding } = setup();

    const images = [
      makeImage({ id: 'a', latitude: 47.3769, longitude: 8.5417, addressLabel: null }),
      makeImage({ id: 'b', latitude: 47.3769, longitude: 8.5417, addressLabel: null }),
      makeImage({ id: 'c', latitude: 46.948, longitude: 7.4474, addressLabel: null }),
    ];
    service.setActiveSelectionImages(images);

    await vi.waitFor(() => expect(fakeGeocoding.reverse).toHaveBeenCalledTimes(2));

    // Two unique coordinates → two calls.
    expect(fakeGeocoding.reverse).toHaveBeenCalledWith(47.3769, 8.5417);
    expect(fakeGeocoding.reverse).toHaveBeenCalledWith(46.948, 7.4474);
  });

  it('uses exact coordinates for dedup — no rounding', async () => {
    const { service, fakeGeocoding } = setup();

    // These differ by 0.0001 — should be two separate geocode calls.
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
        (c: string[]) => c[0] === 'bulk_update_image_addresses',
      );
      expect(rpcCalls.length).toBeGreaterThan(0);
    });

    const rpcCall = fakeSupabase.client.rpc.mock.calls.find(
      (c: string[]) => c[0] === 'bulk_update_image_addresses',
    )!;
    expect(rpcCall[1].p_image_ids).toEqual(expect.arrayContaining(['img-1', 'img-2']));
    expect(rpcCall[1].p_address_label).toBe('Burgstra\u00dfe 7, 8001 Z\u00fcrich, Switzerland');
  });

  it('patches the local rawImages signal with resolved address', async () => {
    const { service, fakeGeocoding } = setup();

    const img = makeImage({ id: 'img-1', addressLabel: null });
    service.setActiveSelectionImages([img]);

    await vi.waitFor(() => expect(fakeGeocoding.reverse).toHaveBeenCalled());
    // Allow signal update to propagate.
    await vi.waitFor(() => {
      const updated = service.rawImages().find((i) => i.id === 'img-1');
      expect(updated?.addressLabel).toBe('Burgstraße 7, 8001 Zürich, Switzerland');
    });

    const updated = service.rawImages().find((i) => i.id === 'img-1')!;
    expect(updated.city).toBe('Zürich');
    expect(updated.district).toBe('Altstadt');
    expect(updated.street).toBe('Burgstraße 7');
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
      expect(updated?.addressLabel).toBe('Burgstraße 7, 8001 Zürich, Switzerland');
    });

    // Image 'a' should remain unresolved.
    const a = service.rawImages().find((i) => i.id === 'a');
    expect(a?.addressLabel).toBeNull();
  });
});

describe('WorkspaceViewService — grouping with addresses', () => {
  it('groups by district using resolved address data', async () => {
    const { service } = setup();

    const images = [
      makeImage({ id: 'a', district: 'Altstadt' }),
      makeImage({ id: 'b', district: 'Altstadt' }),
      makeImage({ id: 'c', district: 'Seefeld' }),
    ];
    service.setActiveSelectionImages(images);
    service.activeGroupings.set([{ id: 'district', label: 'District', icon: '' }]);

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
    service.activeGroupings.set([{ id: 'district', label: 'District', icon: '' }]);

    const sections = service.groupedSections();
    expect(sections[0].heading).toBe('Unknown district');
  });

  it('groups by city using resolved address data', () => {
    const { service } = setup();

    const images = [makeImage({ id: 'a', city: 'Zürich' }), makeImage({ id: 'b', city: 'Bern' })];
    service.setActiveSelectionImages(images);
    service.activeGroupings.set([{ id: 'city', label: 'City', icon: '' }]);

    const sections = service.groupedSections();
    expect(sections.length).toBe(2);
    expect(sections.map((s) => s.heading)).toContain('Zürich');
    expect(sections.map((s) => s.heading)).toContain('Bern');
  });
});

// ── Sort + Grouping Sync (WV-3b) ──────────────────────────────────────────────

describe('WorkspaceViewService — sort + grouping sync', () => {
  function setupSortGrouping() {
    const { service } = setup();

    // Seed images with diverse cities, projects, and dates for meaningful sorting.
    const images = [
      makeImage({
        id: 'z1',
        city: 'Zürich',
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
        city: 'Zürich',
        projectName: 'Beta',
        capturedAt: '2026-02-15T00:00:00Z',
      }),
    ];
    service.setActiveSelectionImages(images);
    return service;
  }

  it('auto-prepends grouping keys to effectiveSorts', () => {
    const service = setupSortGrouping();

    service.activeGroupings.set([{ id: 'city', label: 'City', icon: 'location_city' }]);

    const effective = service.effectiveSorts();
    expect(effective[0]).toEqual({ key: 'city', direction: 'asc' });
    // Default user sort should follow
    expect(effective[1]).toEqual({ key: 'date-captured', direction: 'desc' });
  });

  it('groups are sorted alphabetically when grouping direction is asc', () => {
    const service = setupSortGrouping();

    service.activeGroupings.set([{ id: 'city', label: 'City', icon: 'location_city' }]);

    const sections = service.groupedSections();
    const headings = sections.map((s) => s.heading);
    expect(headings).toEqual(['Berlin', 'Wien', 'Zürich']);
  });

  it('groups are sorted reverse-alphabetically when grouping direction is desc', () => {
    const service = setupSortGrouping();

    service.activeGroupings.set([{ id: 'city', label: 'City', icon: 'location_city' }]);
    // Change city sort direction to descending
    service.activeSorts.set([
      { key: 'city', direction: 'desc' },
      { key: 'date-captured', direction: 'desc' },
    ]);

    const sections = service.groupedSections();
    const headings = sections.map((s) => s.heading);
    expect(headings).toEqual(['Zürich', 'Wien', 'Berlin']);
  });

  it('multi-level grouping respects sort directions for both levels', () => {
    const service = setupSortGrouping();

    service.activeGroupings.set([
      { id: 'city', label: 'City', icon: 'location_city' },
      { id: 'project', label: 'Project', icon: 'folder' },
    ]);

    const sections = service.groupedSections();
    // Top level should be city A→Z (default asc)
    expect(sections.map((s) => s.heading)).toEqual(['Berlin', 'Wien', 'Zürich']);

    // Berlin subgroups: Alpha, Beta (A→Z)
    const berlinSubs = sections[0].subGroups!;
    expect(berlinSubs.map((s) => s.heading)).toEqual(['Alpha', 'Beta']);
  });

  it('retains user sort direction when a property is added as grouping', () => {
    const service = setupSortGrouping();

    // User first activates city sort as descending
    service.activeSorts.set([
      { key: 'date-captured', direction: 'desc' },
      { key: 'city', direction: 'desc' },
    ]);

    // Then city is added as a grouping
    service.activeGroupings.set([{ id: 'city', label: 'City', icon: 'location_city' }]);

    const effective = service.effectiveSorts();
    // City should be first (grouping position) and retain desc direction
    expect(effective[0]).toEqual({ key: 'city', direction: 'desc' });
  });

  it('removes grouping-only sort key when grouping is removed', () => {
    const service = setupSortGrouping();

    // Activate grouping — city gets auto-added to sorts
    service.activeGroupings.set([{ id: 'city', label: 'City', icon: 'location_city' }]);
    expect(service.effectiveSorts().some((s) => s.key === 'city')).toBe(true);

    // Remove the grouping
    service.activeGroupings.set([]);

    const effective = service.effectiveSorts();
    // City was grouping-only — should be gone
    expect(effective.some((s) => s.key === 'city')).toBe(false);
    // Default sort remains
    expect(effective).toEqual([{ key: 'date-captured', direction: 'desc' }]);
  });

  it('keeps user-defined sort when grouping of same key is removed', () => {
    const service = setupSortGrouping();

    // User explicitly adds city sort first
    service.activeSorts.set([
      { key: 'date-captured', direction: 'desc' },
      { key: 'city', direction: 'asc' },
    ]);

    // Then grouping is added for city
    service.activeGroupings.set([{ id: 'city', label: 'City', icon: 'location_city' }]);

    // Then grouping is removed
    service.activeGroupings.set([]);

    const effective = service.effectiveSorts();
    // City was in user sorts before grouping — should remain
    expect(effective.some((s) => s.key === 'city')).toBe(true);
  });

  it('effectiveSorts deduplicates grouping keys already in user sorts', () => {
    const service = setupSortGrouping();

    // User has city in their sorts
    service.activeSorts.set([
      { key: 'date-captured', direction: 'desc' },
      { key: 'city', direction: 'desc' },
    ]);

    // Add city as grouping
    service.activeGroupings.set([{ id: 'city', label: 'City', icon: 'location_city' }]);

    const effective = service.effectiveSorts();
    // City should appear exactly once (at grouping position)
    const cityEntries = effective.filter((s) => s.key === 'city');
    expect(cityEntries.length).toBe(1);
    expect(effective[0].key).toBe('city');
  });

  it('images within a group are sorted by remaining sort keys', () => {
    const service = setupSortGrouping();

    service.activeGroupings.set([{ id: 'city', label: 'City', icon: 'location_city' }]);
    // Default: date-captured desc — within Berlin group, b1 (March) should come before b2 (Jan)

    const sections = service.groupedSections();
    const berlin = sections.find((s) => s.heading === 'Berlin')!;
    expect(berlin.images[0].id).toBe('b1'); // March — newest first
    expect(berlin.images[1].id).toBe('b2'); // January
  });

  it('changing sort direction on grouped property reorders groups', () => {
    const service = setupSortGrouping();

    service.activeGroupings.set([{ id: 'city', label: 'City', icon: 'location_city' }]);

    // Verify initial A→Z order
    let sections = service.groupedSections();
    expect(sections[0].heading).toBe('Berlin');

    // Change city to descending
    service.activeSorts.set([
      { key: 'city', direction: 'desc' },
      { key: 'date-captured', direction: 'desc' },
    ]);

    sections = service.groupedSections();
    expect(sections[0].heading).toBe('Zürich');
    expect(sections[2].heading).toBe('Berlin');
  });
});
