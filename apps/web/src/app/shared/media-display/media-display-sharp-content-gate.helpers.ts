/**
 * DOM mount gate for the sharp content `<img>` (independent of FSM opacity).
 * @see docs/migration/reports/media-grid-warm-revisit-regression-2026-05-27.md
 */

export function shouldMountSharpContentLayer(input: {
  readonly resolvedUrl: string;
  readonly isGridIntrinsicSlot: boolean;
  readonly gridSlotAspectSettled: boolean;
}): boolean {
  if (!input.resolvedUrl.trim()) {
    return false;
  }

  if (!input.isGridIntrinsicSlot) {
    return true;
  }

  return input.gridSlotAspectSettled;
}

export function isContentRevealFsmState(state: string): boolean {
  return state === 'content-fade-in' || state === 'content-visible';
}
