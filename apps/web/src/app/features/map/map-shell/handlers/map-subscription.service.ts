import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouteSessionCacheService } from '../../../../core/route-session-cache/route-session-cache.service';
import {
  UploadManagerService,
  ImageReplacedEvent,
  ImageAttachedEvent,
} from '../../../../core/upload/upload-manager.service';
import { PhotoMarkerLifecycleService } from '../markers/photo-marker-lifecycle.service';
import { MapViewportCoordinatorService } from '../markers/map-viewport-coordinator.service';
import { ROUTE_SESSION_SHELL_KEYS } from '../../../../core/route-session-cache/route-session-cache.keys';
import { MapShellInstanceService } from '../component/map-shell-instance.service';

@Injectable({ providedIn: 'root' })
export class MapSubscriptionService {
  private readonly routeSessionCache = inject(RouteSessionCacheService);
  private readonly uploadManagerService = inject(UploadManagerService);
  private readonly photoMarkerLifecycleService = inject(PhotoMarkerLifecycleService);
  private readonly mapViewportCoordinatorService = inject(MapViewportCoordinatorService);
  private readonly instance = inject(MapShellInstanceService);

  subscribe(destroyRef: DestroyRef): void {
    this.routeSessionCache.shellInvalidated$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((shellKey) => {
        if (shellKey !== ROUTE_SESSION_SHELL_KEYS.MAP || !this.instance.map) return;
        void this.mapViewportCoordinatorService.queryViewportMarkers();
      });

    this.uploadManagerService.imageReplaced$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((event: ImageReplacedEvent) => {
        this.photoMarkerLifecycleService.handleImageReplaced(event);
      });

    this.uploadManagerService.imageAttached$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((event: ImageAttachedEvent) => {
        this.photoMarkerLifecycleService.handleImageAttached(event);
      });
  }
}
