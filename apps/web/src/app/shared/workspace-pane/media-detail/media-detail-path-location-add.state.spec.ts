import { describe, expect, it } from 'vitest';
import {
  PATH_LOCATION_ADD_TRANSITIONS,
  canTransitionPathLocationAdd,
  goToPathLocationAdd,
  pathLocationAddStateFor,
} from './media-detail-path-location-add.state';

/** @see docs/specs/system/deferred-location-resolution.md § Actions — Single item */

describe('PATH_LOCATION_ADD_TRANSITIONS', () => {
  it('mirrors the EXIF row FSM — hidden → idle → resolving → idle', () => {
    expect(canTransitionPathLocationAdd('hidden', 'idle')).toBe(true);
    expect(canTransitionPathLocationAdd('idle', 'resolving')).toBe(true);
    expect(canTransitionPathLocationAdd('resolving', 'idle')).toBe(true);
  });

  it('rejects idle → hidden and resolving → resolving', () => {
    // resolving → resolving would let a second click start a second run on one item.
    expect(canTransitionPathLocationAdd('idle', 'hidden')).toBe(false);
    expect(canTransitionPathLocationAdd('resolving', 'resolving')).toBe(false);
  });

  it('documents every edge in the transition map', () => {
    for (const [from, targets] of Object.entries(PATH_LOCATION_ADD_TRANSITIONS)) {
      for (const to of targets) {
        expect(goToPathLocationAdd(from as keyof typeof PATH_LOCATION_ADD_TRANSITIONS, to)).toBe(to);
      }
    }
  });

  it('holds its current state on an illegal transition rather than throwing', () => {
    expect(goToPathLocationAdd('resolving', 'hidden')).toBe('resolving');
  });
});

describe('pathLocationAddStateFor', () => {
  const unlocated = { evidenceLabel: 'Wien/1010/Thalistraße 4', locationStatus: 'pending' };

  it('offers the action on an item with no location and evidence on the row', () => {
    expect(pathLocationAddStateFor({ ...unlocated, resolving: false })).toBe('idle');
  });

  it('hides the action when the item already has a location (row 6, no silent overwrite)', () => {
    expect(
      pathLocationAddStateFor({ ...unlocated, locationStatus: 'resolved', resolving: false }),
    ).toBe('hidden');
    expect(pathLocationAddStateFor({ ...unlocated, locationStatus: 'gps', resolving: false })).toBe(
      'hidden',
    );
  });

  it('treats unresolvable and partial as still offerable — the pipeline gave up, a human has not', () => {
    expect(
      pathLocationAddStateFor({ ...unlocated, locationStatus: 'unresolvable', resolving: false }),
    ).toBe('idle');
    expect(
      pathLocationAddStateFor({ ...unlocated, locationStatus: 'partial', resolving: false }),
    ).toBe('idle');
  });

  it('hides the action when the row has nothing to feed the pipeline', () => {
    expect(pathLocationAddStateFor({ ...unlocated, evidenceLabel: null, resolving: false })).toBe(
      'hidden',
    );
    expect(pathLocationAddStateFor({ ...unlocated, evidenceLabel: '   ', resolving: false })).toBe(
      'hidden',
    );
  });

  it('reports resolving while a run is in flight, so the row cannot start a second one', () => {
    expect(pathLocationAddStateFor({ ...unlocated, resolving: true })).toBe('resolving');
  });

  it('stays hidden while resolving if the item gained a location mid-run', () => {
    // The run writes the location, then the row refreshes: "resolving" must not resurrect a row
    // that row 6 says should be gone, or the next click overwrites what the run just wrote.
    expect(
      pathLocationAddStateFor({ ...unlocated, locationStatus: 'resolved', resolving: true }),
    ).toBe('hidden');
  });
});
