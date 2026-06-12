import { describe, expect, it } from 'vitest';
import {
  mediaSizeForRequiredLongEdge,
  requiredLongEdgePxForSlot,
  signingSizeForSlot,
  tierForMeasuredSlot,
} from './media-slot-resolution.helpers';

describe('media-slot-resolution.helpers', () => {
  it('detail pane ~428×298 at 2× DPR needs detail signing, not full', () => {
    expect(signingSizeForSlot(428, 298, 2, false)).toBe('detail');
    expect(tierForMeasuredSlot({ slotWidthPx: 428, slotHeightPx: 298, devicePixelRatio: 2 })).toBe(
      'large',
    );
  });

  it('3-column tile ~160×160 at 2× DPR needs detail signing', () => {
    expect(signingSizeForSlot(160, 160, 2, false)).toBe('detail');
  });

  it('medium grid ~215×215 at 1× DPR needs detail signing (not tiny thumbnail_path)', () => {
    expect(signingSizeForSlot(215, 215, 1, false)).toBe('detail');
    expect(tierForMeasuredSlot({ slotWidthPx: 215, slotHeightPx: 215, devicePixelRatio: 1 })).toBe(
      'large',
    );
  });

  it('small grid tile ~128×128 at 1× DPR fits thumb bucket', () => {
    expect(signingSizeForSlot(128, 128, 1, false)).toBe('thumb');
  });

  it('map marker slot uses marker bucket', () => {
    expect(signingSizeForSlot(36, 36, 2, false)).toBe('marker');
  });

  it('never picks full for display slots unless allowFull', () => {
    expect(mediaSizeForRequiredLongEdge(4000, { allowFull: false })).toBe('detail');
    expect(mediaSizeForRequiredLongEdge(4000, { allowFull: true })).toBe('full');
  });

  it('required long edge includes DPR and headroom', () => {
    expect(requiredLongEdgePxForSlot(428, 298, 2)).toBe(942);
    expect(requiredLongEdgePxForSlot(100, 120, 1)).toBe(132);
    expect(requiredLongEdgePxForSlot(100, 200, 1)).toBe(257);
  });
});
