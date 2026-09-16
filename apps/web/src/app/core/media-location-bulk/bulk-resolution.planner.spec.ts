import { describe, expect, it } from 'vitest';
import { planBulkResolution } from './bulk-resolution.planner';
import type { BulkResolutionCandidate } from './bulk-resolution.planner';

/**
 * The planning half of bulk resolution: which items are eligible, how many geocodes the run costs,
 * and what the confirmation summary states.
 * @see docs/specs/page/files-page.bulk-resolution.supplement.md
 * @see docs/specs/system/deferred-location-resolution.batch.supplement.md
 */

const GEO = {
  states: [{ n: 'Wien', a: [] }],
  municipalities: [
    { n: 'Wien', b: 'Wien', a: [] },
    { n: 'Graz', b: 'Steiermark', a: [] },
  ],
};

function item(
  mediaId: string,
  relativePath: string | null,
  overrides: Partial<BulkResolutionCandidate> = {},
): BulkResolutionCandidate {
  return {
    mediaId,
    relativePath,
    originalFilename: relativePath?.split('/').pop() ?? null,
    hasLocation: false,
    exifCoords: null,
    ...overrides,
  };
}

describe('planBulkResolution', () => {
  it('R5: one geocode per distinct address, not per file', () => {
    const items = Array.from({ length: 50 }, (_, i) =>
      item(`m-${i}`, `Wien/Thalistraße 4/IMG_${i}.jpg`),
    );

    const plan = planBulkResolution(items, { source: 'folder', geo: GEO });

    expect(plan.groups).toHaveLength(1);
    expect(plan.geocodeCount).toBe(1);
    expect(plan.groups[0].mediaIds).toHaveLength(50);
  });

  it('R5: distinct addresses stay distinct', () => {
    const plan = planBulkResolution(
      [
        item('m-1', 'Wien/Thalistraße 4/a.jpg'),
        item('m-2', 'Wien/Thalistraße 6/b.jpg'),
        item('m-3', 'Wien/Thalistraße 4/c.jpg'),
      ],
      { source: 'folder', geo: GEO },
    );

    expect(plan.geocodeCount).toBe(2);
  });

  it('R2/B3: items that already have a location are skipped by default', () => {
    const plan = planBulkResolution(
      [
        item('m-1', 'Wien/Thalistraße 4/a.jpg'),
        item('m-2', 'Wien/Thalistraße 4/b.jpg', { hasLocation: true }),
      ],
      { source: 'folder', geo: GEO },
    );

    expect(plan.eligibleCount).toBe(1);
    expect(plan.skipped).toEqual([{ mediaId: 'm-2', reason: 'already_resolved' }]);
  });

  it('R2/B3: overwrite mode includes them, and must be asked for explicitly', () => {
    const items = [
      item('m-1', 'Wien/Thalistraße 4/a.jpg'),
      item('m-2', 'Wien/Thalistraße 4/b.jpg', { hasLocation: true }),
    ];

    const plan = planBulkResolution(items, {
      source: 'folder',
      geo: GEO,
      overwriteExisting: true,
    });

    expect(plan.eligibleCount).toBe(2);
    expect(plan.skipped).toEqual([]);
  });

  it('an item whose source carries no address is skipped, not guessed at', () => {
    const plan = planBulkResolution(
      [item('m-1', 'Fotos/Sonstiges/IMG_1.jpg'), item('m-2', 'Wien/Thalistraße 4/b.jpg')],
      { source: 'folder', geo: GEO },
    );

    expect(plan.skipped).toEqual([{ mediaId: 'm-1', reason: 'no_address_in_source' }]);
    expect(plan.eligibleCount).toBe(1);
  });

  it('B2: the source is honoured — filename and folder can disagree', () => {
    const items = [
      item('m-1', 'Wien/Thalistraße 4/Graz Annenstraße 10.jpg', {
        originalFilename: 'Graz Annenstraße 10.jpg',
      }),
    ];

    const fromFolder = planBulkResolution(items, { source: 'folder', geo: GEO });
    const fromFilename = planBulkResolution(items, { source: 'filename', geo: GEO });

    expect(fromFolder.groups[0]?.addressLabel).not.toBe(fromFilename.groups[0]?.addressLabel);
  });

  it('B2 (exif): identical coordinates share one reverse geocode', () => {
    const coords = { lat: 48.2081, lng: 16.3738 };
    const plan = planBulkResolution(
      [
        item('m-1', null, { exifCoords: coords }),
        item('m-2', null, { exifCoords: coords }),
        item('m-3', null, { exifCoords: { lat: 47.0707, lng: 15.4395 } }),
      ],
      { source: 'exif', geo: GEO },
    );

    expect(plan.geocodeCount).toBe(2);
  });

  it('B2 (exif): an item without coordinates is skipped', () => {
    const plan = planBulkResolution([item('m-1', 'Wien/Thalistraße 4/a.jpg')], {
      source: 'exif',
      geo: GEO,
    });

    expect(plan.skipped).toEqual([{ mediaId: 'm-1', reason: 'no_address_in_source' }]);
  });

  it('R1: the plan is built from the passed set only, and reports its own totals', () => {
    const plan = planBulkResolution(
      [item('m-1', 'Wien/Thalistraße 4/a.jpg'), item('m-2', 'Fotos/x/IMG_2.jpg')],
      { source: 'folder', geo: GEO },
    );

    expect(plan.eligibleCount + plan.skipped.length).toBe(2);
  });

  it('R7: the summary states the exact count and address for each group', () => {
    const plan = planBulkResolution(
      [item('m-1', 'Wien/Thalistraße 4/a.jpg'), item('m-2', 'Wien/Thalistraße 4/b.jpg')],
      { source: 'folder', geo: GEO },
    );

    expect(plan.groups[0].addressLabel).toContain('Thalistraße 4');
    expect(plan.groups[0].mediaIds).toEqual(['m-1', 'm-2']);
  });

  it('an empty selection plans nothing rather than throwing', () => {
    const plan = planBulkResolution([], { source: 'folder', geo: GEO });

    expect(plan.groups).toEqual([]);
    expect(plan.eligibleCount).toBe(0);
    expect(plan.geocodeCount).toBe(0);
  });
});
