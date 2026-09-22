/**
 * Figure → plan → confirm → run → recount (#232 + #219).
 *
 * The flow that makes a badge actionable, and the one place where R7 is enforced in behaviour
 * rather than in a template: `open()` must never write, only `confirm()` may.
 *
 * @see docs/specs/page/files-page.deferred-improvement.supplement.md
 */

import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BulkResolutionService } from './bulk-resolution.service';
import { DeferredLocationBulkFlowService } from './deferred-location-bulk-flow.service';
import { DeferredLocationCountService } from './deferred-location-count.service';
import { DeferredLocationFetchService } from './deferred-location-fetch.service';
import type { BulkResolutionPlan } from './bulk-resolution.planner';
import type { MediaRecord } from '../media-query/media-query.types';

const ROWS = [
  { id: 'm-1', location_status: 'partial', relative_path: 'Archiv/Wien/1010/IMG_0090.jpg' },
  { id: 'm-2', location_status: 'partial', relative_path: 'Archiv/Wien/1010/IMG_0091.jpg' },
] as unknown as MediaRecord[];

const PLAN: BulkResolutionPlan = {
  groups: [
    {
      addressKey: 'at|wien|1010',
      addressLabel: '1010 Wien',
      mediaIds: ['m-1', 'm-2'],
      coords: { lat: 48.2082, lng: 16.3738 },
    },
  ],
  skipped: [],
  eligibleCount: 2,
  geocodeCount: 1,
};

const REPORT = {
  outcomes: [],
  resolved: 2,
  skipped: 0,
  failed: 0,
  geocodesPerformed: 1,
  completed: true,
};

function setup(options: { loadFails?: boolean; planFails?: boolean } = {}) {
  const loadBucket = vi.fn(async () => {
    if (options.loadFails) throw new Error('offline');
    return ROWS;
  });
  const plan = vi.fn(async () => {
    if (options.planFails) throw new Error('no geo data');
    return PLAN;
  });
  const run = vi.fn(async (_plan: BulkResolutionPlan, opts?: { onProgress?: (d: number, t: number) => void }) => {
    opts?.onProgress?.(1, 2);
    opts?.onProgress?.(2, 2);
    return REPORT;
  });
  const refresh = vi.fn(async () => undefined);

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: DeferredLocationFetchService, useValue: { loadBucket } },
      { provide: BulkResolutionService, useValue: { plan, run } },
      { provide: DeferredLocationCountService, useValue: { refresh } },
    ],
  });

  return {
    service: TestBed.inject(DeferredLocationBulkFlowService),
    loadBucket,
    plan,
    run,
    refresh,
  };
}

describe('DeferredLocationBulkFlowService — R7, nothing before confirmation', () => {
  it('is closed until a figure is clicked', () => {
    const { service } = setup();

    expect(service.plan()).toBeNull();
    expect(service.open()).toBe(false);
  });

  it('opening plans and writes nothing', async () => {
    const { service, loadBucket, plan, run } = setup();

    await service.openBucket('improvable');

    expect(loadBucket).toHaveBeenCalledWith('improvable');
    expect(plan).toHaveBeenCalledTimes(1);
    expect(run).not.toHaveBeenCalled();
    expect(service.plan()).toEqual(PLAN);
    expect(service.open()).toBe(true);
  });

  it('cancelling writes nothing and closes', async () => {
    const { service, run } = setup();
    await service.openBucket('improvable');

    service.cancel();

    expect(run).not.toHaveBeenCalled();
    expect(service.open()).toBe(false);
    expect(service.plan()).toBeNull();
  });

  it('confirming runs the plan that was shown, not a freshly fetched one', async () => {
    const { service, run, loadBucket } = setup();
    await service.openBucket('improvable');

    await service.confirm();

    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0]).toEqual(PLAN);
    // R1: the set is frozen at open. Confirming must not re-query and widen it.
    expect(loadBucket).toHaveBeenCalledTimes(1);
  });

});

describe('DeferredLocationBulkFlowService — running and recounting', () => {
  it('reports progress as the run makes it', async () => {
    const { service } = setup();
    await service.openBucket('improvable');

    await service.confirm();

    expect(service.progress()).toEqual({ done: 2, total: 2 });
  });

  it('keeps the report and recounts the backlog once the run finishes', async () => {
    const { service, refresh } = setup();
    await service.openBucket('improvable');

    await service.confirm();

    expect(service.report()).toEqual(REPORT);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('cannot be confirmed twice — a double click writes once', async () => {
    const { service, run } = setup();
    await service.openBucket('improvable');

    await Promise.all([service.confirm(), service.confirm()]);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('confirming without an open plan does nothing at all', async () => {
    const { service, run } = setup();

    await service.confirm();

    expect(run).not.toHaveBeenCalled();
  });
});

describe('DeferredLocationBulkFlowService — failures', () => {
  it('a failed fetch opens an error, never an empty plan the user could confirm', async () => {
    const { service, plan } = setup({ loadFails: true });

    await service.openBucket('improvable');

    expect(service.error()).toContain('offline');
    expect(service.plan()).toBeNull();
    expect(plan).not.toHaveBeenCalled();
  });

  it('a failed plan leaves nothing confirmable', async () => {
    const { service, run } = setup({ planFails: true });

    await service.openBucket('no_location');
    await service.confirm();

    expect(service.error()).toContain('no geo data');
    expect(run).not.toHaveBeenCalled();
  });

  it('clears a previous error when the next open succeeds', async () => {
    const failing = setup({ loadFails: true });
    await failing.service.openBucket('improvable');
    expect(failing.service.error()).not.toBeNull();

    const working = setup();
    await working.service.openBucket('improvable');

    expect(working.service.error()).toBeNull();
  });
});
