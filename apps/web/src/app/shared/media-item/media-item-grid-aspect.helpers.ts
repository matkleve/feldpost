/**
 * Initial grid slot aspect ratio and guards against media-display handoff flicker.
 * @see docs/specs/component/media/media-item.md#file-type-aspect-ratio-policy
 */

/** CSS `aspect-ratio` value for a grid tile: session cache or square until probe. */
export function resolveInitialGridAspectRatioCss(cachedRatio: number | null): string {
  if (cachedRatio != null && cachedRatio > 0) {
    return String(cachedRatio);
  }

  return '1';
}

/** Ignore media-display `resetState` emitting 1 when session cache already has the real ratio. */
export function shouldIgnoreGridAspectHandoffReset(
  ratio: number,
  cachedRatio: number | null,
): boolean {
  return ratio === 1 && cachedRatio != null && cachedRatio > 0;
}
