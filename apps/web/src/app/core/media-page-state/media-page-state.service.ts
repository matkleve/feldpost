import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { MediaQueryService } from '../media-query/media-query.service';
import { ROUTE_SESSION_SHELL_KEYS } from '../route-session-cache/route-session-cache.keys';
import { RouteSessionCacheService } from '../route-session-cache/route-session-cache.service';
import type { RouteCacheEntry } from '../route-session-cache/route-session-cache.types';
import type { WorkspaceMedia } from '../workspace-view/workspace-view.types';
import { buildMediaGalleryQuerySignature } from './media-page-state.helpers';
import type {
  MediaGalleryQueryInputs,
  MediaPageCacheLookup,
} from './media-page-state.types';

@Injectable({ providedIn: 'root' })
export class MediaPageStateService {
  private readonly authService = inject(AuthService);
  private readonly mediaQueryService = inject(MediaQueryService);
  private readonly routeCache = inject(RouteSessionCacheService);

  readonly revalidating = this.routeCache.revalidating;

  constructor() {
    this.routeCache.registerRevalidateHandler(ROUTE_SESSION_SHELL_KEYS.MEDIA, (signature) =>
      this.runRevalidate(signature),
    );
    this.routeCache.registerDeletePatchHandler(ROUTE_SESSION_SHELL_KEYS.MEDIA, (ids, entry) =>
      this.patchDelete(ids, entry as RouteCacheEntry<WorkspaceMedia[]>),
    );
  }

  lookup(inputs: MediaGalleryQueryInputs): MediaPageCacheLookup {
    const signature = buildMediaGalleryQuerySignature(inputs);
    const mediaItems = this.routeCache.restore<WorkspaceMedia[]>(
      ROUTE_SESSION_SHELL_KEYS.MEDIA,
      signature,
    );

    if (!mediaItems) {
      return { hit: false, mediaItems: [] };
    }

    return { hit: true, mediaItems };
  }

  writeCache(inputs: MediaGalleryQueryInputs, mediaItems: WorkspaceMedia[]): void {
    const signature = buildMediaGalleryQuerySignature(inputs);
    this.routeCache.save(ROUTE_SESSION_SHELL_KEYS.MEDIA, signature, [...mediaItems]);
  }

  invalidateActiveCache(): void {
    this.routeCache.invalidate(ROUTE_SESSION_SHELL_KEYS.MEDIA);
  }

  scheduleRevalidate(inputs: MediaGalleryQueryInputs): void {
    const signature = buildMediaGalleryQuerySignature(inputs);
    this.routeCache.scheduleRevalidate(ROUTE_SESSION_SHELL_KEYS.MEDIA, signature);
  }

  private async runRevalidate(signature: string): Promise<void> {
    if (!this.authService.user()) {
      return;
    }

    const rows = await this.mediaQueryService.loadAllCurrentUserWorkspaceMedia();
    const entry = this.routeCache.getEntry(ROUTE_SESSION_SHELL_KEYS.MEDIA);

    if (entry?.querySignature === signature) {
      this.routeCache.save(ROUTE_SESSION_SHELL_KEYS.MEDIA, signature, rows);
    }
  }

  private patchDelete(mediaItemIds: string[], entry: RouteCacheEntry<WorkspaceMedia[]>): void {
    const deleted = new Set(mediaItemIds);
    const next = entry.data.filter((item) => !deleted.has(item.id));
    this.routeCache.save(ROUTE_SESSION_SHELL_KEYS.MEDIA, entry.querySignature, next);
  }
}
