/** Whether a newly created viewport marker should fade in on add. */
export function resolveMarkerFadeIn(
  spawnOrigin: { lat: number; lng: number } | null,
  suppressFadeIn: boolean,
): boolean {
  if (spawnOrigin) {
    return false;
  }

  return !suppressFadeIn;
}
