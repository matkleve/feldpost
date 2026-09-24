/** Reads a duration token such as `300ms` from the document element. */
export function readMotionDurationMs(tokenName: string, fallbackMs: number): number {
  if (typeof document === 'undefined') return fallbackMs;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallbackMs;
}

/**
 * Invalidate immediately, on the next macrotask, and after the track transition.
 * @see docs/specs/ui/shell/grid-shell.md
 */
export function scheduleMapInvalidation(invalidate: () => void): void {
  if (typeof window === 'undefined') return;
  const transitionMs = readMotionDurationMs('--motion-duration-entrance', 300);
  invalidate();
  window.setTimeout(invalidate, 0);
  window.setTimeout(invalidate, transitionMs);
}
