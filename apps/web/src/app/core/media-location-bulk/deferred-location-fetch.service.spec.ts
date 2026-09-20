/**
 * #232 → #219 — turning a badge figure into the explicit set a bulk run writes.
 *
 * R1: a bulk apply targets an explicit, displayed set of media ids, never "the folder" as a live
 * query. The set is frozen when the user clicks the figure, so an upload landing during the
 * confirmation cannot widen what gets written.
 *
 * @see docs/specs/page/files-page.bulk-resolution.supplement.md
 * @see docs/specs/page/files-page.deferred-improvement.supplement.md
 */

import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DeferredLocationCountAdapter } from './deferred-location-count.adapter';
import { DeferredLocationFetchService } from './deferred-location-fetch.service';

interface Row {
  id: string;
  location_status: string | null;
  relative_path: string | null;
  original_filename: string | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
}

function row(id: string, status: string | null, relativePath: string | null = null): Row {
  return {
    id,
    location_status: status,
    relative_path: relativePath,
    original_filename: relativePath?.split('/').pop() ?? `${id}.jpg`,
    exif_latitude: null,
    exif_longitude: null,
  };
}

function setup(rows: Row[], fail = false) {
  const listCandidateRows = vi.fn(async () => {
    if (fail) throw new Error('offline');
    return rows;
  });

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: DeferredLocationCountAdapter, useValue: { listCandidateRows } }],
  });

  return { service: TestBed.inject(DeferredLocationFetchService), listCandidateRows };
}

const LIBRARY = [
  row('m-1', 'resolved', 'Baustelle Nord/Wien/1010/Thalistraße 4/DSC_0001.jpg'),
  row('m-2', 'pending', 'Archiv/2019/IMG_4471.jpg'),
  row('m-3', 'partial', 'Archiv/Wien/1010/IMG_0090.jpg'),
  row('m-4', 'unresolvable', null),
  row('m-5', 'partial', 'Archiv/Wien/1010/IMG_0091.jpg'),
];

describe('DeferredLocationFetchService', () => {
  it('returns exactly the items the improvable figure counted', async () => {
    const { service } = setup(LIBRARY);

    const rows = await service.loadBucket('improvable');

    expect(rows.map((r) => r.id)).toEqual(['m-3', 'm-5']);
  });

  it('returns exactly the items the no-location figure counted', async () => {
    const { service } = setup(LIBRARY);

    const rows = await service.loadBucket('no_location');

    expect(rows.map((r) => r.id)).toEqual(['m-2', 'm-4']);
  });

  it('never returns a located item, whatever the query hands back', async () => {
    // The adapter filters server-side; this re-filters client-side with the same predicate, so a
    // query that drifts cannot widen the write set past what the badge promised.
    const { service } = setup(LIBRARY);

    const rows = await service.loadBucket('no_location');

    expect(rows.some((r) => r.id === 'm-1')).toBe(false);
  });

  it('carries the fields the planner reads, so no second round trip is needed', async () => {
    const { service } = setup(LIBRARY);

    const [first] = await service.loadBucket('improvable');

    expect(first).toMatchObject({
      id: 'm-3',
      relative_path: 'Archiv/Wien/1010/IMG_0090.jpg',
      original_filename: 'IMG_0090.jpg',
      location_status: 'partial',
    });
    expect(first).toHaveProperty('exif_latitude');
    expect(first).toHaveProperty('exif_longitude');
  });

  it('propagates a failure instead of returning an empty set', async () => {
    // An empty set plans to "0 items" and reads as "nothing to do". A throw reaches the dialog.
    const { service } = setup(LIBRARY, true);

    await expect(service.loadBucket('improvable')).rejects.toThrow('offline');
  });
});
