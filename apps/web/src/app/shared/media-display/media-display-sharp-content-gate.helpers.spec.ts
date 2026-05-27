import { describe, expect, it } from 'vitest';
import {
  isContentRevealFsmState,
  shouldMountSharpContentLayer,
} from './media-display-sharp-content-gate.helpers';

describe('shouldMountSharpContentLayer', () => {
  it('returns false when resolvedUrl is empty', () => {
    expect(
      shouldMountSharpContentLayer({
        resolvedUrl: '',
        isGridIntrinsicSlot: true,
        gridSlotAspectSettled: true,
      }),
    ).toBe(false);
  });

  it('returns false for grid intrinsic when slot aspect is not settled', () => {
    expect(
      shouldMountSharpContentLayer({
        resolvedUrl: 'https://example.com/thumb.jpg',
        isGridIntrinsicSlot: true,
        gridSlotAspectSettled: false,
      }),
    ).toBe(false);
  });

  it('returns true for grid intrinsic when url and slot gate are ready', () => {
    expect(
      shouldMountSharpContentLayer({
        resolvedUrl: 'https://example.com/thumb.jpg',
        isGridIntrinsicSlot: true,
        gridSlotAspectSettled: true,
      }),
    ).toBe(true);
  });

  it('returns true for fill slot when url is present', () => {
    expect(
      shouldMountSharpContentLayer({
        resolvedUrl: 'https://example.com/thumb.jpg',
        isGridIntrinsicSlot: false,
        gridSlotAspectSettled: false,
      }),
    ).toBe(true);
  });
});

describe('isContentRevealFsmState', () => {
  it('matches content reveal states only', () => {
    expect(isContentRevealFsmState('content-visible')).toBe(true);
    expect(isContentRevealFsmState('content-fade-in')).toBe(true);
    expect(isContentRevealFsmState('media-ready')).toBe(false);
  });
});
