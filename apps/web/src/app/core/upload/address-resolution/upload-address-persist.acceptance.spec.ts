/**
 * NF-40 acceptance tests — conditional reverse geocode + text-first persist.
 * @see docs/audits/upload-flow-review-2026-09-10/06-improvement-plan.md item 14
 */

import { describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { persistUploadFile } from '../support/upload-file-persist.util';
import type { UploadFilePersistDeps } from '../support/upload-file-persist.util';
import type { UploadAddressPersistContext } from './upload-address-persist-context.helpers';

function makeFile(): File {
  return new File([new Uint8Array(4)], 'photo.jpg', { type: 'image/jpeg' });
}

function buildDeps(fakeGeocoding: { reverse: ReturnType<typeof vi.fn> }): {
  deps: UploadFilePersistDeps;
  rpc: ReturnType<typeof vi.fn>;
} {
  const rpc = vi.fn().mockResolvedValue({ data: true, error: null });

  const profilesChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
  };

  const mediaItemsChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'media-vienna' }, error: null }),
  };

  const supabaseClient = {
    from: vi.fn((table: string) => (table === 'profiles' ? profilesChain : mediaItemsChain)),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'uploaded' }, error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
    rpc,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const deps: UploadFilePersistDeps = {
    getUser: () => ({ id: 'user-1' }) as User,
    validateFile: () => ({ valid: true }),
    resolveMimeType: () => 'image/jpeg',
    resolveMediaType: () => 'photo',
    parseExif: async () => ({}),
    withAbort: (builder) => builder,
    supabaseClient,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geocoding: fakeGeocoding as any,
  };

  return { deps, rpc };
}

const viennaCoords = { lat: 48.2082, lng: 16.3738 };

const viennaAddressContext: UploadAddressPersistContext = {
  hasEstablishedTextAddress: true,
  fields: {
    country: 'AT',
    state: null,
    postcode: null,
    city: 'Vienna',
    street: null,
    houseNumber: null,
  },
  precision: 'city',
  addressLabel: 'Vienna',
};

const streetFolderAddressContext: UploadAddressPersistContext = {
  hasEstablishedTextAddress: true,
  fields: {
    country: null,
    state: null,
    postcode: null,
    city: null,
    street: 'Street Name',
    houseNumber: '5',
  },
  precision: 'houseNumber',
  addressLabel: 'Street Name 5',
};

describe('NF-40 address persist acceptance', () => {
  it('city-only folder (Vienna/, no EXIF) does not end up with a street address', async () => {
    const reverse = vi.fn().mockResolvedValue({
      addressLabel: 'Fabricatedstraße 1, Wien',
      city: 'Wien',
      district: null,
      street: 'Fabricatedstraße 1',
      streetNumber: '1',
      zip: '1010',
      country: 'Austria',
      countryCode: 'at',
    });
    const { deps, rpc } = buildDeps({ reverse });

    await persistUploadFile({
      file: makeFile(),
      manualCoords: viennaCoords,
      addressContext: viennaAddressContext,
    }, deps);

    await vi.waitFor(() => expect(rpc).toHaveBeenCalled());

    expect(reverse).not.toHaveBeenCalled();

    const resolveCall = rpc.mock.calls.find((c) => c[0] === 'resolve_media_location');
    expect(resolveCall).toBeDefined();
    expect(resolveCall![1]).toMatchObject({
      p_media_item_id: 'media-vienna',
      p_latitude: viennaCoords.lat,
      p_longitude: viennaCoords.lng,
      p_city: 'Vienna',
      p_street: null,
      p_house_number: null,
      p_address_precision: 'city',
    });
    expect(resolveCall![1].p_street).toBeNull();
  });

  it('folder-derived address (Street Name 5) is persisted even when reverse geocode fails', async () => {
    const reverse = vi.fn().mockResolvedValue(null);
    const { deps, rpc } = buildDeps({ reverse });

    await persistUploadFile({
      file: makeFile(),
      manualCoords: { lat: 48.2, lng: 16.37 },
      addressContext: streetFolderAddressContext,
    }, deps);

    await vi.waitFor(() => expect(rpc).toHaveBeenCalled());

    expect(reverse).not.toHaveBeenCalled();

    const resolveCall = rpc.mock.calls.find((c) => c[0] === 'resolve_media_location');
    expect(resolveCall).toBeDefined();
    expect(resolveCall![1]).toMatchObject({
      p_street: 'Street Name',
      p_house_number: '5',
      p_address_precision: 'houseNumber',
      p_address_label: 'Street Name 5',
    });
    expect(resolveCall![1]).not.toMatchObject({
      p_location_status: 'unresolvable',
    });
  });

  it('coordinates-only case (EXIF GPS, no text address) still reverse-geocodes and persists', async () => {
    const reverseResult = {
      addressLabel: 'Burgstraße 7, 8001 Zürich, Switzerland',
      city: 'Zürich',
      district: 'Altstadt',
      street: 'Burgstraße 7',
      streetNumber: '7',
      zip: '8001',
      country: 'Switzerland',
      countryCode: 'ch',
    };
    const reverse = vi.fn().mockResolvedValue(reverseResult);
    const { deps, rpc } = buildDeps({ reverse });

    await persistUploadFile({
      file: makeFile(),
      manualCoords: { lat: 47.3769, lng: 8.5417 },
    }, deps);

    await vi.waitFor(() => expect(reverse).toHaveBeenCalled());
    expect(reverse).toHaveBeenCalledWith(47.3769, 8.5417);

    await vi.waitFor(() => {
      const resolveCall = rpc.mock.calls.find((c) => c[0] === 'resolve_media_location');
      expect(resolveCall?.[1]?.p_street).toBe('Burgstraße 7');
    });

    const resolveCall = rpc.mock.calls.find((c) => c[0] === 'resolve_media_location');
    expect(resolveCall![1]).toMatchObject({
      p_latitude: 47.3769,
      p_longitude: 8.5417,
      p_city: 'Zürich',
      p_street: 'Burgstraße 7',
      p_address_precision: 'houseNumber',
    });
  });
});
