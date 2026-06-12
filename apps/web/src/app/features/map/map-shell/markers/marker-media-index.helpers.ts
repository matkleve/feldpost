/** Multi-pin index: one media item may own several marker keys. */
export type MarkersByMediaIdMap = Map<string, string[]>;

export function getMarkerKeysForMedia(map: MarkersByMediaIdMap, mediaId: string): readonly string[] {
  return map.get(mediaId) ?? [];
}

export function getFirstMarkerKeyForMedia(map: MarkersByMediaIdMap, mediaId: string): string | undefined {
  return map.get(mediaId)?.[0];
}

export function registerMarkerKeyForMedia(
  map: MarkersByMediaIdMap,
  mediaId: string,
  markerKey: string,
): void {
  const existing = map.get(mediaId) ?? [];
  if (existing.includes(markerKey)) {
    return;
  }
  map.set(mediaId, [...existing, markerKey]);
}

export function unregisterMarkerKeyForMedia(
  map: MarkersByMediaIdMap,
  mediaId: string,
  markerKey: string,
): void {
  const existing = map.get(mediaId);
  if (!existing) {
    return;
  }
  const next = existing.filter((key) => key !== markerKey);
  if (next.length === 0) {
    map.delete(mediaId);
  } else {
    map.set(mediaId, next);
  }
}

export function clearMarkerKeysForMedia(map: MarkersByMediaIdMap, mediaId: string): void {
  map.delete(mediaId);
}
