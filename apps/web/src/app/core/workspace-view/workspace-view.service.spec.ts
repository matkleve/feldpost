/**
 * WorkspaceViewService — address resolution tests.
 *
 * Strategy:
 *  - SupabaseService, GeocodingService, and FilterService are faked.
 *  - Tests verify the resolveUnresolvedAddresses flow: filtering, dedup,
 *    DB update, and local signal patching.
 *  - No real HTTP or DB calls.
 *
 * Grouping:          workspace-view.grouping.spec.ts
 * Sort + sync:       workspace-view.sort-sync.spec.ts
 * Custom properties: workspace-view.custom-props.spec.ts
 * Shared setup:      workspace-view.spec-setup.ts
 */

import { setup, makeImage, ZURICH_RESULT } from './workspace-view.spec-setup';

describe('WorkspaceViewService â€" address resolution', () => {
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

  it('deduplicates â€" one geocode call per unique lat/lng pair', async () => {
    const { service, fakeGeocoding } = setup();

    const images = [
      makeImage({ id: 'a', latitude: 47.3769, longitude: 8.5417, addressLabel: null }),
      makeImage({ id: 'b', latitude: 47.3769, longitude: 8.5417, addressLabel: null }),
      makeImage({ id: 'c', latitude: 46.948, longitude: 7.4474, addressLabel: null }),
    ];
    service.setActiveSelectionImages(images);

    await vi.waitFor(() => expect(fakeGeocoding.reverse).toHaveBeenCalledTimes(2));

    // Two unique coordinates â†' two calls.
    expect(fakeGeocoding.reverse).toHaveBeenCalledWith(47.3769, 8.5417);
    expect(fakeGeocoding.reverse).toHaveBeenCalledWith(46.948, 7.4474);
  });

  it('uses exact coordinates for dedup â€" no rounding', async () => {
    const { service, fakeGeocoding } = setup();

    // These differ by 0.0001 â€" should be two separate geocode calls.
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
