import { describe, expect, it, vi } from 'vitest';
import { runBulkResolution } from './bulk-resolution.runner';
import type { BulkResolutionPlan } from './bulk-resolution.planner';

/**
 * The executing half: one geocode per group, per-item outcomes, and a partial failure that keeps
 * what already succeeded.
 * @see docs/specs/page/files-page.bulk-resolution.supplement.md
 */

function plan(groups: Array<{ label: string; ids: string[] }>): BulkResolutionPlan {
  const built = groups.map((g) => ({
    addressKey: `k|${g.label}`,
    addressLabel: g.label,
    mediaIds: g.ids,
    coords: null,
  }));
  return {
    groups: built,
    skipped: [],
    eligibleCount: built.reduce((n, g) => n + g.mediaIds.length, 0),
    geocodeCount: built.length,
  };
}

const OK_GEOCODE = vi.fn(async (label: string) => ({ addressLabel: label, lat: 48.2, lng: 16.3 }));

describe('runBulkResolution', () => {
  it('R5: geocodes once per group regardless of how many items it holds', async () => {
    const geocode = vi.fn(OK_GEOCODE);
    const applyToItem = vi.fn(async () => ({ ok: true }));

    const report = await runBulkResolution(
      plan([{ label: 'Thalistraße 4, Wien', ids: Array.from({ length: 1000 }, (_, i) => `m-${i}`) }]),
      { geocode, applyToItem },
    );

    expect(geocode).toHaveBeenCalledTimes(1);
    expect(applyToItem).toHaveBeenCalledTimes(1000);
    expect(report.resolved).toBe(1000);
    expect(report.geocodesPerformed).toBe(1);
  });

  it('a group whose geocode fails applies nothing, and says so per item', async () => {
    const geocode = vi.fn(async () => null);
    const applyToItem = vi.fn(async () => ({ ok: true }));

    const report = await runBulkResolution(plan([{ label: 'Nowhere', ids: ['m-1', 'm-2'] }]), {
      geocode,
      applyToItem,
    });

    expect(applyToItem).not.toHaveBeenCalled();
    expect(report.failed).toBe(2);
    expect(report.outcomes.every((o) => o.status === 'failed')).toBe(true);
    expect(report.outcomes[0].reason).toMatch(/geocode/i);
  });

  it('R6: a mid-run item failure keeps the successes and names the failure', async () => {
    const applyToItem = vi.fn(async (mediaId: string) =>
      mediaId === 'm-2' ? { ok: false, error: 'rls denied' } : { ok: true },
    );

    const report = await runBulkResolution(
      plan([{ label: 'Thalistraße 4, Wien', ids: ['m-1', 'm-2', 'm-3'] }]),
      { geocode: vi.fn(OK_GEOCODE), applyToItem },
    );

    expect(report.resolved).toBe(2);
    expect(report.failed).toBe(1);
    expect(report.outcomes.find((o) => o.mediaId === 'm-2')?.reason).toBe('rls denied');
    // The run did not abort on the first failure.
    expect(applyToItem).toHaveBeenCalledTimes(3);
  });

  it('one failing group does not stop the next one', async () => {
    const geocode = vi.fn(async (label: string) =>
      label === 'Bad' ? null : { addressLabel: label, lat: 1, lng: 2 },
    );
    const applyToItem = vi.fn(async () => ({ ok: true }));

    const report = await runBulkResolution(
      plan([
        { label: 'Bad', ids: ['m-1'] },
        { label: 'Good', ids: ['m-2'] },
      ]),
      { geocode, applyToItem },
    );

    expect(report.failed).toBe(1);
    expect(report.resolved).toBe(1);
  });

  it('R6: yields between chunks so a large run does not block the main thread', async () => {
    const yieldToEventLoop = vi.fn(async () => {});

    await runBulkResolution(
      plan([{ label: 'A', ids: Array.from({ length: 250 }, (_, i) => `m-${i}`) }]),
      {
        geocode: vi.fn(OK_GEOCODE),
        applyToItem: vi.fn(async () => ({ ok: true })),
        chunkSize: 50,
        yieldToEventLoop,
      },
    );

    expect(yieldToEventLoop).toHaveBeenCalled();
  });

  it('carries the plan’s skipped items into the report', async () => {
    const base = plan([{ label: 'A', ids: ['m-1'] }]);
    const withSkips: BulkResolutionPlan = {
      ...base,
      skipped: [{ mediaId: 'm-9', reason: 'already_resolved' }],
    };

    const report = await runBulkResolution(withSkips, {
      geocode: vi.fn(OK_GEOCODE),
      applyToItem: vi.fn(async () => ({ ok: true })),
    });

    expect(report.skipped).toBe(1);
    expect(report.outcomes.find((o) => o.mediaId === 'm-9')?.status).toBe('skipped');
  });

  it('reports progress as it goes, not only at the end', async () => {
    const onProgress = vi.fn();

    await runBulkResolution(plan([{ label: 'A', ids: ['m-1', 'm-2', 'm-3'] }]), {
      geocode: vi.fn(OK_GEOCODE),
      applyToItem: vi.fn(async () => ({ ok: true })),
      onProgress,
    });

    expect(onProgress).toHaveBeenCalled();
    const [done, total] = onProgress.mock.calls.at(-1) ?? [];
    expect(done).toBe(3);
    expect(total).toBe(3);
  });

  it('an empty plan is a completed run with nothing done', async () => {
    const report = await runBulkResolution(plan([]), {
      geocode: vi.fn(OK_GEOCODE),
      applyToItem: vi.fn(async () => ({ ok: true })),
    });

    expect(report.resolved).toBe(0);
    expect(report.completed).toBe(true);
  });
});
