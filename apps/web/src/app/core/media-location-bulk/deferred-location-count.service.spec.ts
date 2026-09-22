/**
 * STUDY-009 idea C (#232) — counting the deferred backlog without fetching it.
 *
 * @see docs/specs/page/files-page.deferred-improvement.supplement.md
 */

import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DeferredLocationCountAdapter } from './deferred-location-count.adapter';
import { DeferredLocationCountService } from './deferred-location-count.service';
import {
  DEFERRED_LOCATION_STATUS_FILTERS,
  countDeferredLocations,
} from './deferred-location.selection';

interface FakeCounts {
  all: number;
  byStatus: Record<string, number>;
}

function setup(counts: FakeCounts, failOn?: 'all' | 'status') {
  const countAll = vi.fn(async () => {
    if (failOn === 'all') throw new Error('offline');
    return counts.all;
  });
  const countWithStatusIn = vi.fn(async (statuses: readonly string[]) => {
    if (failOn === 'status') throw new Error('offline');
    return statuses.reduce((sum, status) => sum + (counts.byStatus[status] ?? 0), 0);
  });

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: DeferredLocationCountAdapter, useValue: { countAll, countWithStatusIn } },
    ],
  });

  return {
    service: TestBed.inject(DeferredLocationCountService),
    countAll,
    countWithStatusIn,
  };
}

/** 5 000 photos: 4 588 located, 254 with an address but no pin, 158 with nothing. */
const LIBRARY: FakeCounts = {
  all: 5000,
  byStatus: { resolved: 4500, gps: 88, partial: 254, pending: 120, unresolvable: 38 },
};

describe('DeferredLocationCountService', () => {
  it('starts with no number rather than a zero nobody measured', () => {
    const { service } = setup(LIBRARY);

    expect(service.counts()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('reports the two jobs separately — "158 have no location, 254 could be more precise"', async () => {
    const { service } = setup(LIBRARY);

    await service.refresh();

    expect(service.counts()).toEqual({
      noLocation: 158,
      improvable: 254,
      located: 4588,
      total: 412,
    });
  });

  it('counts without fetching rows — three aggregate queries, whatever the library size', async () => {
    const { service, countAll, countWithStatusIn } = setup(LIBRARY);

    await service.refresh();

    expect(countAll).toHaveBeenCalledTimes(1);
    expect(countWithStatusIn).toHaveBeenCalledTimes(2);
    expect(countWithStatusIn).toHaveBeenCalledWith(DEFERRED_LOCATION_STATUS_FILTERS.located);
    expect(countWithStatusIn).toHaveBeenCalledWith(DEFERRED_LOCATION_STATUS_FILTERS.improvable);
  });

  it('gives the same answer as classifying the rows one by one', async () => {
    // The query and the classifier are two implementations of one rule. This is the test that
    // stops them drifting: same population, counted both ways.
    const rows = [
      ...Array.from({ length: 4500 }, (_, i) => ({ id: `r${i}`, location_status: 'resolved' })),
      ...Array.from({ length: 88 }, (_, i) => ({ id: `g${i}`, location_status: 'gps' })),
      ...Array.from({ length: 254 }, (_, i) => ({ id: `p${i}`, location_status: 'partial' })),
      ...Array.from({ length: 120 }, (_, i) => ({ id: `n${i}`, location_status: 'pending' })),
      ...Array.from({ length: 38 }, (_, i) => ({ id: `u${i}`, location_status: 'unresolvable' })),
    ];
    const { service } = setup(LIBRARY);

    await service.refresh();

    expect(service.counts()).toEqual(countDeferredLocations(rows));
  });

});

describe('DeferredLocationCountService — when the numbers cannot be trusted', () => {
  it('never reports a negative count when the three queries disagree mid-write', async () => {
    // They are three statements, not one snapshot: an upload landing between them can make
    // located + improvable exceed all. A negative badge is worse than a stale one.
    const { service } = setup({ all: 100, byStatus: { resolved: 90, gps: 0, partial: 20 } });

    await service.refresh();

    expect(service.counts()).toMatchObject({ noLocation: 0, improvable: 20 });
  });

  it('reports a failure instead of a zero — a silent zero reads as "nothing to do"', async () => {
    const { service } = setup(LIBRARY, 'all');

    await service.refresh();

    expect(service.counts()).toBeNull();
    expect(service.error()).not.toBeNull();
    expect(service.loading()).toBe(false);
  });

  it('clears a previous error once a refresh succeeds', async () => {
    const { service } = setup(LIBRARY, 'status');
    await service.refresh();
    expect(service.error()).not.toBeNull();

    const fresh = setup(LIBRARY);
    await fresh.service.refresh();

    expect(fresh.service.error()).toBeNull();
  });

  it('does not start a second refresh while one is in flight', async () => {
    const { service, countAll } = setup(LIBRARY);

    await Promise.all([service.refresh(), service.refresh()]);

    expect(countAll).toHaveBeenCalledTimes(1);
  });
});
