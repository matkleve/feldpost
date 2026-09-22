/**
 * STUDY-009 idea C (#232) — the two jobs behind "158 items could be located more precisely".
 *
 * @see docs/specs/page/files-page.deferred-improvement.supplement.md
 */

import { describe, expect, it } from 'vitest';
import type { MediaRecord } from '../media-query/media-query.types';
import { isBulkEligibleStatus } from './bulk-resolution.selection';
import {
  DEFERRED_LOCATION_STATUS_FILTERS,
  countDeferredLocations,
  deferredLocationBucket,
  selectDeferredLocationIds,
} from './deferred-location.selection';

function row(id: string, locationStatus: string | null) {
  return { id, location_status: locationStatus };
}

describe('deferredLocationBucket', () => {
  it('leaves a located item alone — there is no work to offer on it', () => {
    expect(deferredLocationBucket(row('a', 'resolved'))).toBe('located');
    expect(deferredLocationBucket(row('b', 'gps'))).toBe('located');
  });

  it('calls `partial` improvable — an address was established, coordinates were not', () => {
    // Archiv/Wien/1010/ resolves to a city-precision address with no pin (D-10, area-only).
    // The job is not "where is this" but "which street, which house number".
    expect(deferredLocationBucket(row('c', 'partial'))).toBe('improvable');
  });

  it('calls everything else with no address "no location"', () => {
    expect(deferredLocationBucket(row('d', 'pending'))).toBe('no_location');
    expect(deferredLocationBucket(row('e', 'unresolvable'))).toBe('no_location');
    expect(deferredLocationBucket(row('f', 'no_gps'))).toBe('no_location');
    expect(deferredLocationBucket(row('g', 'unresolved'))).toBe('no_location');
    expect(deferredLocationBucket(row('h', null))).toBe('no_location');
  });

  it('offers the work on a status it does not recognise, rather than hiding it', () => {
    // Same direction isBulkEligibleStatus takes: an unwanted offer is visible, a skip is not.
    expect(deferredLocationBucket(row('i', 'something_new'))).toBe('no_location');
  });

  it('agrees with isBulkEligibleStatus on every status, so the badge and the run cannot drift', () => {
    const statuses = [
      'resolved',
      'gps',
      'pending',
      'partial',
      'unresolvable',
      'no_gps',
      'unresolved',
      null,
      'something_new',
    ];

    for (const status of statuses) {
      expect(deferredLocationBucket(row('x', status)) === 'located').toBe(
        !isBulkEligibleStatus(status),
      );
    }
  });

  it('reads only the persisted row — no upload session, no issueKind, no batch', () => {
    // An item suppressed by the budget (#233) and one deferred by archive import mode leave the
    // same trace: a bulk-eligible location_status. A counter that had to be told which mechanism
    // deferred an item would silently miss the one it was not built for — TRAP-021's shape.
    expect(deferredLocationBucket(row('archive', 'pending'))).toBe('no_location');
    expect(deferredLocationBucket(row('budget', 'pending'))).toBe('no_location');
  });

  it('accepts a MediaRecord as-is, so the badge and the gallery read one shape', () => {
    const record = { id: 'm', location_status: 'partial' } as Partial<MediaRecord> as MediaRecord;

    expect(deferredLocationBucket(record)).toBe('improvable');
  });
});

describe('countDeferredLocations', () => {
  it('reports the two jobs separately and never merges them into one unactionable number', () => {
    const records = [
      row('1', 'resolved'),
      row('2', 'pending'),
      row('3', 'unresolvable'),
      row('4', 'partial'),
      row('5', 'partial'),
    ];

    expect(countDeferredLocations(records)).toEqual({
      noLocation: 2,
      improvable: 2,
      located: 1,
      total: 4,
    });
  });

  it('counts nothing on an empty set rather than reporting a number nobody can act on', () => {
    expect(countDeferredLocations([])).toEqual({
      noLocation: 0,
      improvable: 0,
      located: 0,
      total: 0,
    });
  });

  it('leaves located items out of the total — the badge offers work, not an inventory', () => {
    const records = [row('1', 'resolved'), row('2', 'gps'), row('3', 'pending')];

    expect(countDeferredLocations(records)).toMatchObject({ located: 2, total: 1 });
  });
});

describe('selectDeferredLocationIds', () => {
  it('hands a bulk run exactly the items its badge counted', () => {
    const records = [row('1', 'resolved'), row('2', 'pending'), row('3', 'partial'), row('4', 'pending')];

    expect(selectDeferredLocationIds(records, 'no_location')).toEqual(['2', '4']);
    expect(selectDeferredLocationIds(records, 'improvable')).toEqual(['3']);
  });

  it('keeps count and selection in step — the property that makes the number actionable', () => {
    const records = [
      row('1', 'resolved'),
      row('2', 'pending'),
      row('3', 'partial'),
      row('4', 'unresolvable'),
      row('5', 'partial'),
    ];
    const counts = countDeferredLocations(records);

    expect(selectDeferredLocationIds(records, 'no_location')).toHaveLength(counts.noLocation);
    expect(selectDeferredLocationIds(records, 'improvable')).toHaveLength(counts.improvable);
  });
});

describe('DEFERRED_LOCATION_STATUS_FILTERS', () => {
  it('describes each bucket as a status set, so a count query and the classifier cannot disagree', () => {
    // A library of 40 000 items must not be counted by fetching 40 000 rows. The query filters by
    // status; these are the sets it filters on, and the classifier is derived from them.
    expect(DEFERRED_LOCATION_STATUS_FILTERS.improvable).toEqual(['partial']);
    expect(DEFERRED_LOCATION_STATUS_FILTERS.located).toEqual(['resolved', 'gps']);
  });

  it('classifies every named status into the bucket its filter claims', () => {
    for (const status of DEFERRED_LOCATION_STATUS_FILTERS.improvable) {
      expect(deferredLocationBucket(row('q', status))).toBe('improvable');
    }
    for (const status of DEFERRED_LOCATION_STATUS_FILTERS.located) {
      expect(deferredLocationBucket(row('q', status))).toBe('located');
    }
  });
});
