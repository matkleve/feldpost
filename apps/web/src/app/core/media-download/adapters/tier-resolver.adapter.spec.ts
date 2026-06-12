import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { tierToMediaSize } from '../media-download.helpers';
import { TierResolverAdapter } from './tier-resolver.adapter';

describe('TierResolverAdapter', () => {
  const adapter = (): TierResolverAdapter =>
    TestBed.configureTestingModule({ providers: [TierResolverAdapter] }).inject(
      TierResolverAdapter,
    );

  it('detail pane ~428×298 at 2× DPR resolves to large (detail signing)', () => {
    const resolved = adapter().selectRequestedTierForSlot({
      requestedTier: 'full',
      slotWidthPx: 428,
      slotHeightPx: 298,
      devicePixelRatio: 2,
      context: 'detail',
      allowFull: false,
    });

    expect(resolved).toBe('large');
    expect(tierToMediaSize(resolved)).toBe('detail');
  });

  it('explicit allowFull returns full original', () => {
    const resolved = adapter().selectRequestedTierForSlot({
      requestedTier: 'full',
      slotWidthPx: 428,
      slotHeightPx: 298,
      devicePixelRatio: 2,
      allowFull: true,
    });

    expect(resolved).toBe('full');
  });

  it('3-column tile ~160×160 at 2× DPR resolves to large (detail signing)', () => {
    const resolved = adapter().selectRequestedTierForSlot({
      requestedTier: 'small',
      slotWidthPx: 160,
      slotHeightPx: 160,
      devicePixelRatio: 2,
      context: 'grid',
    });

    expect(resolved).toBe('large');
  });

  it('medium grid ~215×215 at 1× DPR resolves to large (detail signing)', () => {
    const resolved = adapter().selectRequestedTierForSlot({
      requestedTier: 'small',
      slotWidthPx: 215,
      slotHeightPx: 215,
      devicePixelRatio: 1,
      context: 'grid',
    });

    expect(resolved).toBe('large');
  });

  it('small grid tile ~128×128 at 1× DPR resolves to small (thumb signing)', () => {
    const resolved = adapter().selectRequestedTierForSlot({
      requestedTier: 'small',
      slotWidthPx: 128,
      slotHeightPx: 128,
      devicePixelRatio: 1,
      context: 'grid',
    });

    expect(resolved).toBe('small');
  });

  it('maps large media tier to detail signing size (1280px), full tier to original', () => {
    expect(tierToMediaSize('large')).toBe('detail');
    expect(tierToMediaSize('full')).toBe('full');
    expect(tierToMediaSize('mid')).toBe('thumb');
  });
});
