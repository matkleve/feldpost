import type { ActivatedRouteSnapshot } from '@angular/router';
import type { ShareRouteParams } from './share-link-restore.types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads share restore query params from a route snapshot. */
export function readShareRouteParams(snapshot: ActivatedRouteSnapshot): ShareRouteParams {
  const shareToken = snapshot.queryParamMap.get('share')?.trim() ?? '';
  const rawMedia = snapshot.queryParamMap.get('media')?.trim() ?? '';
  const mediaId = rawMedia && isValidMediaIdParam(rawMedia) ? rawMedia : null;
  return { shareToken, mediaId };
}

/** True when the value matches a UUID media id. */
export function isValidMediaIdParam(value: string): boolean {
  return UUID_RE.test(value);
}
