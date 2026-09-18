import { describe, expect, it, vi } from 'vitest';
import { createBulkResolutionDeps } from './bulk-resolution.adapter';

/**
 * The adapter is the only place bulk resolution touches real services. Its whole job is to hand the
 * engine effects that behave like the single-item path.
 * @see docs/specs/page/files-page.bulk-resolution.supplement.md
 */

const FULL_HIT = {
  lat: 48.2081,
  lng: 16.3738,
  addressLabel: 'Thalistraße 4, 1010 Wien',
  city: 'Wien',
  district: '01. Bezirk',
  street: 'Thalistraße',
  streetNumber: '4',
  zip: '1010',
  country: 'Austria',
};

function services(overrides: Record<string, unknown> = {}) {
  const geocoding = {
    forward: vi.fn(async () => FULL_HIT),
    reverse: vi.fn(async () => ({ ...FULL_HIT, addressLabel: 'reverse label' })),
  };
  const locationUpdate = {
    updateFromAddressSuggestion: vi.fn(async () => ({ ok: true })),
  };
  return { geocoding, locationUpdate, ...overrides } as never;
}

describe('createBulkResolutionDeps', () => {
  it('carries the whole geocode result through, not just the coordinates', async () => {
    const svc = services();
    const deps = createBulkResolutionDeps(svc);

    const suggestion = await deps.geocode('Thalistraße 4, Wien', null);
    await deps.applyToItem('media-1', suggestion!);

    // The regression this guards: a narrower suggestion type silently dropped street/city/zip,
    // and every bulk-resolved item would have been written with coordinates and no address.
    const [, passed] = (
      svc as unknown as {
        locationUpdate: { updateFromAddressSuggestion: { mock: { calls: unknown[][] } } };
      }
    ).locationUpdate.updateFromAddressSuggestion.mock.calls[0];
    expect(passed).toMatchObject({
      street: 'Thalistraße',
      streetNumber: '4',
      city: 'Wien',
      zip: '1010',
      country: 'Austria',
    });
  });

  it('forward-geocodes a text address, and reverse-geocodes a point', async () => {
    const svc = services();
    const deps = createBulkResolutionDeps(svc);

    await deps.geocode('Thalistraße 4, Wien', null);
    await deps.geocode('47.07,15.44', { lat: 47.07, lng: 15.44 });

    const g = (svc as unknown as { geocoding: { forward: { mock: { calls: unknown[][] } }; reverse: { mock: { calls: unknown[][] } } } }).geocoding;
    expect(g.forward).toHaveBeenCalledWith('Thalistraße 4, Wien');
    expect(g.reverse).toHaveBeenCalledWith(47.07, 15.44);
  });

  it('the reverse path keeps the photo\u2019s own coordinates, which the lookup does not return', async () => {
    const svc = services();
    const deps = createBulkResolutionDeps(svc);

    const suggestion = await deps.geocode('47.07,15.44', { lat: 47.07, lng: 15.44 });

    // ReverseGeocodeResult carries no lat/lng — it names a point rather than locating one. The
    // photo's GPS is the position; losing it here would place the item by the geocoder's idea of
    // the address instead of where the camera actually was.
    expect(suggestion).toMatchObject({ lat: 47.07, lng: 15.44, addressLabel: 'reverse label' });
  });

  it('a geocoder miss becomes null, so the engine defers the group rather than guessing', async () => {
    const svc = services({ geocoding: { forward: vi.fn(async () => null), reverse: vi.fn() } });
    const deps = createBulkResolutionDeps(svc);

    expect(await deps.geocode('nowhere at all', null)).toBeNull();
  });

  it('applies through the same service a single-item edit uses', async () => {
    const svc = services();
    const deps = createBulkResolutionDeps(svc);

    const result = await deps.applyToItem('media-1', FULL_HIT);

    expect(result).toEqual({ ok: true });
    expect(
      (svc as unknown as { locationUpdate: { updateFromAddressSuggestion: unknown } })
        .locationUpdate.updateFromAddressSuggestion,
    ).toHaveBeenCalledWith('media-1', FULL_HIT);
  });

  it('a failed write is reported, not thrown', async () => {
    const svc = services({
      locationUpdate: {
        updateFromAddressSuggestion: vi.fn(async () => ({ ok: false, error: 'rls denied' })),
      },
    });
    const deps = createBulkResolutionDeps(svc);

    await expect(deps.applyToItem('media-1', FULL_HIT)).resolves.toEqual({
      ok: false,
      error: 'rls denied',
    });
  });

  it('a thrown write becomes a reported failure, so one bad row cannot abort the run', async () => {
    const svc = services({
      locationUpdate: {
        updateFromAddressSuggestion: vi.fn(async () => {
          throw new Error('connection reset');
        }),
      },
    });
    const deps = createBulkResolutionDeps(svc);

    const result = await deps.applyToItem('media-1', FULL_HIT);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('connection reset');
  });

  it('a thrown geocode becomes null rather than escaping the run', async () => {
    const svc = services({
      geocoding: {
        forward: vi.fn(async () => {
          throw new Error('geocoder down');
        }),
        reverse: vi.fn(),
      },
    });
    const deps = createBulkResolutionDeps(svc);

    await expect(deps.geocode('anything', null)).resolves.toBeNull();
  });
});
