import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { tierToMediaSize } from '../media-download.helpers';
import { TierResolverAdapter } from './tier-resolver.adapter';

describe('TierResolverAdapter', () => {
  const adapter = (): TierResolverAdapter =>
    TestBed.configureTestingModule({ providers: [TierResolverAdapter] }).inject(
      TierResolverAdapter,
    );

  it('caps detail context at large tier (detail transform, not full original)', () => {
    const resolved = adapter().selectRequestedTierForSlot({
      requestedTier: 'full',
      slotWidthRem: 40,
      slotHeightRem: 40,
      context: 'detail',
    });

    expect(resolved).toBe('large');
  });

  it('upgrades detail hero above thumb when slot is wide', () => {
    const resolved = adapter().selectRequestedTierForSlot({
      requestedTier: 'large',
      slotWidthRem: 22,
      slotHeightRem: 22,
      context: 'detail',
    });

    expect(resolved).toBe('large');
  });

  it('maps large media tier to detail signing size (1280px), full tier to original', () => {
    expect(tierToMediaSize('large')).toBe('detail');
    expect(tierToMediaSize('full')).toBe('full');
    expect(tierToMediaSize('mid')).toBe('thumb');
  });

  it('keeps grid context clamped below requested full on small slots', () => {
    const resolved = adapter().selectRequestedTierForSlot({
      requestedTier: 'full',
      slotWidthRem: 10,
      slotHeightRem: 10,
      context: 'grid',
    });

    expect(resolved).toBe('small');
  });
});
