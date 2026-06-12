import { Injectable, inject } from '@angular/core';
import {
  MAP_VIEWPORT_SIGNATURE,
  ROUTE_SESSION_SHELL_KEYS,
} from '../route-session-cache/route-session-cache.keys';
import { RouteSessionCacheService } from '../route-session-cache/route-session-cache.service';
import type { MapSessionSnapshot } from './map-session-cache.types';

@Injectable({ providedIn: 'root' })
export class MapSessionCacheService {
  private readonly routeCache = inject(RouteSessionCacheService);

  read(): MapSessionSnapshot | null {
    return this.routeCache.restore<MapSessionSnapshot>(
      ROUTE_SESSION_SHELL_KEYS.MAP,
      MAP_VIEWPORT_SIGNATURE,
    );
  }

  write(snapshot: MapSessionSnapshot): void {
    this.routeCache.save(ROUTE_SESSION_SHELL_KEYS.MAP, MAP_VIEWPORT_SIGNATURE, snapshot);
  }

  invalidate(): void {
    this.routeCache.invalidate(ROUTE_SESSION_SHELL_KEYS.MAP);
  }
}
