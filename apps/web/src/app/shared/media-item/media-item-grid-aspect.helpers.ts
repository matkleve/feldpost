/**
 * Initial grid slot aspect ratio and guards against media-display handoff flicker.
 * @see docs/specs/component/media/media-item.md#file-type-aspect-ratio-policy
 */

/** CSS `aspect-ratio` value for a grid tile before or after media-display handoff. */
export function resolveInitialGridAspectRatioCss(
  cachedRatio: number | null,
  registryHint: number | null,
  usesNativeSlotAspect: boolean,
): string {
  if (cachedRatio != null && cachedRatio > 0) {
    return String(cachedRatio);
  }

  if (!usesNativeSlotAspect && registryHint != null && registryHint > 0) {
    return String(registryHint);
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
