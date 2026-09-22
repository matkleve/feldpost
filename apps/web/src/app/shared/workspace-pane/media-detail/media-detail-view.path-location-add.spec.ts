/**
 * MediaDetailViewComponent — *Add as location* on the Original folder / file name rows.
 * Shared setup: media-detail-view.spec-setup.ts
 *
 * @see docs/specs/system/deferred-location-resolution.md § Actions — Single item
 * @see docs/specs/ui/media-detail/media-detail-inline-section.md#path--location-fsm
 */

import { TestBed } from '@angular/core/testing';
import { setup, MOCK_MEDIA } from './media-detail-view.spec-setup';
import { BulkResolutionService } from '../../../core/media-location-bulk/bulk-resolution.service';
import type { BulkResolutionPlan } from '../../../core/media-location-bulk/bulk-resolution.planner';
import type { BulkResolutionReport } from '../../../core/media-location-bulk/bulk-resolution.runner';

/** An unlocated item that carries the folder evidence the rows read. */
function unlocatedMedia() {
  return {
    ...MOCK_MEDIA,
    location_status: 'pending',
    relative_path: 'Wien/1010/Thalistraße 4/a.jpg',
  };
}

function planWith(overrides: Partial<BulkResolutionPlan> = {}): BulkResolutionPlan {
  return {
    groups: [
      {
        addressKey: 'folder|wien|1010|thalistrase|4',
        addressLabel: 'Thalistraße 4, 1010 Wien',
        mediaIds: [MOCK_MEDIA.id],
        coords: null,
      },
    ],
    skipped: [],
    eligibleCount: 1,
    geocodeCount: 1,
    ...overrides,
  };
}

function reportWith(overrides: Partial<BulkResolutionReport> = {}): BulkResolutionReport {
  return {
    outcomes: [{ mediaId: MOCK_MEDIA.id, status: 'resolved' }],
    resolved: 1,
    skipped: 0,
    failed: 0,
    geocodesPerformed: 1,
    completed: true,
    ...overrides,
  };
}

/**
 * Spies on the *injected instance*, not on the module. `vi.mock` binds per module registry under
 * the Angular unit-test builder and fails silently — see TRAP-022.
 */
function spyOnEngine(plan: BulkResolutionPlan, report: BulkResolutionReport) {
  const engine = TestBed.inject(BulkResolutionService);
  const planSpy = vi.spyOn(engine, 'plan').mockResolvedValue(plan);
  const runSpy = vi.spyOn(engine, 'run').mockResolvedValue(report);
  return { planSpy, runSpy };
}

describe('MediaDetailViewComponent – add as location from a path row', () => {
  it('runs the shared bulk engine on a selection of one, with the row’s own source', async () => {
    // The whole point of row 7/8: one item is the bulk engine with N=1, not a second write path.
    const { component } = setup();
    // Captured before the call: a successful run reloads `media()`, so asserting against the
    // signal afterwards would compare the plan input to the post-write record.
    const record = unlocatedMedia();
    component.media.set(record);
    const { planSpy, runSpy } = spyOnEngine(planWith(), reportWith());

    await component.onPathToLocationRequested('folder');

    expect(planSpy).toHaveBeenCalledWith([record], { source: 'folder' });
    expect(runSpy).toHaveBeenCalledTimes(1);
  });

  it('passes the filename source through unchanged', async () => {
    const { component } = setup();
    component.media.set(unlocatedMedia());
    const { planSpy } = spyOnEngine(planWith(), reportWith());

    await component.onPathToLocationRequested('filename');

    expect(planSpy.mock.calls[0][1]).toEqual({ source: 'filename' });
  });

  it('writes nothing when the planner finds no address in the source', async () => {
    const { component } = setup();
    component.media.set(unlocatedMedia());
    const { runSpy } = spyOnEngine(
      planWith({
        groups: [],
        eligibleCount: 0,
        geocodeCount: 0,
        skipped: [{ mediaId: MOCK_MEDIA.id, reason: 'no_address_in_source' }],
      }),
      reportWith(),
    );

    await component.onPathToLocationRequested('folder');

    expect(runSpy).not.toHaveBeenCalled();
  });

  it('ignores a second click while a run is in flight', async () => {
    // resolving → resolving is not a legal edge; without the guard one item gets two runs.
    const { component } = setup();
    component.media.set(unlocatedMedia());
    const engine = TestBed.inject(BulkResolutionService);
    let releasePlan!: (plan: BulkResolutionPlan) => void;
    const planSpy = vi
      .spyOn(engine, 'plan')
      .mockReturnValue(new Promise<BulkResolutionPlan>((resolve) => (releasePlan = resolve)));
    vi.spyOn(engine, 'run').mockResolvedValue(reportWith());

    const first = component.onPathToLocationRequested('folder');
    await component.onPathToLocationRequested('filename');

    expect(planSpy).toHaveBeenCalledTimes(1);

    releasePlan(planWith());
    await first;
  });

  it('clears the resolving flag even when the engine throws', async () => {
    // A stranded `resolving` row can never be clicked again — the failure would be permanent.
    const { component } = setup();
    component.media.set(unlocatedMedia());
    const engine = TestBed.inject(BulkResolutionService);
    vi.spyOn(engine, 'plan').mockRejectedValue(new Error('geocode exploded'));

    await expect(component.onPathToLocationRequested('folder')).rejects.toThrow('geocode exploded');

    expect(component.folderLocationAddState()).toBe('idle');
    expect(component.saving()).toBe(false);
  });
});
