import { describe, expect, it } from 'vitest';
import {
  EXIF_LOCATION_ADD_TRANSITIONS,
  canTransitionExifLocationAdd,
  goToExifLocationAdd,
} from './media-detail-exif-location-add.state';

describe('EXIF_LOCATION_ADD_TRANSITIONS', () => {
  it('allows hidden → idle and idle → resolving → idle', () => {
    expect(canTransitionExifLocationAdd('hidden', 'idle')).toBe(true);
    expect(canTransitionExifLocationAdd('idle', 'resolving')).toBe(true);
    expect(canTransitionExifLocationAdd('resolving', 'idle')).toBe(true);
  });

  it('rejects idle → hidden and resolving → resolving', () => {
    expect(canTransitionExifLocationAdd('idle', 'hidden')).toBe(false);
    expect(canTransitionExifLocationAdd('resolving', 'resolving')).toBe(false);
  });

  it('documents every edge in the transition map', () => {
    for (const [from, targets] of Object.entries(EXIF_LOCATION_ADD_TRANSITIONS)) {
      for (const to of targets) {
        expect(goToExifLocationAdd(from as keyof typeof EXIF_LOCATION_ADD_TRANSITIONS, to)).toBe(to);
      }
    }
  });
});
