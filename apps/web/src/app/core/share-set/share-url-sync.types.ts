import type { ActivatedRouteSnapshot } from '@angular/router';

export type ShareUrlSyncStatus = 'idle' | 'resolvingShare' | 'applied' | 'error';

export interface ShareUrlSyncRequest {
  routeSnapshot: ActivatedRouteSnapshot;
  scopeMediaIds: string[];
  detailMediaId: string | null;
}
