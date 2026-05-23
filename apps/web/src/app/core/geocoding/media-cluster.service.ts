/**
 * Project-scoped geographic clusters for bounded Nominatim viewboxes (Geocoder Phase 3).
 * @see docs/specs/service/location-resolver/search-algorithm-addresses-and-places.md §2.7
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { OrgSearchTuningService } from '../search/org-search-tuning.service';
import { SupabaseService } from '../supabase/supabase.service';
import { WorkspaceViewService } from '../workspace-view/workspace-view.service';

export interface MediaCluster {
  clusterId: number;
  /** Nominatim viewbox: lon_min,lat_max,lon_max,lat_min */
  viewbox: string;
  mediaCount: number;
}

interface GetMediaClustersRow {
  cluster_id: number;
  lon_min: number;
  lat_min: number;
  lon_max: number;
  lat_max: number;
  media_count: number;
}

@Injectable({ providedIn: 'root' })
export class MediaClusterService {
  private readonly supabase = inject(SupabaseService);
  private readonly orgSearchTuning = inject(OrgSearchTuningService);
  private readonly workspaceView = inject(WorkspaceViewService);

  private readonly loadedCacheKey = signal<string | null>(null);
  private readonly clusterRows = signal<MediaCluster[]>([]);
  private loadInFlight: Promise<void> | null = null;

  readonly clusters = this.clusterRows.asReadonly();

  readonly activeProjectId = computed(() => {
    const ids = this.workspaceView.selectedProjectIds();
    if (ids.size === 0) return undefined;
    return Array.from(ids)[0];
  });

  readonly radiusKm = computed(
    () => this.orgSearchTuning.orgSearchConfig().resolver.contextDistanceMaxMeters / 1000,
  );

  private cacheKey(): string | null {
    const projectId = this.activeProjectId();
    if (!projectId) return null;
    return `${projectId}|${this.radiusKm()}`;
  }

  /** Load clusters once per (projectId, radiusKm) per session. */
  async ensureLoaded(): Promise<void> {
    const key = this.cacheKey();
    if (!key) {
      this.clusterRows.set([]);
      this.loadedCacheKey.set(null);
      return;
    }
    if (this.loadedCacheKey() === key) {
      return;
    }
    if (!this.loadInFlight) {
      this.loadInFlight = this.fetchClusters(key);
    }
    try {
      await this.loadInFlight;
    } finally {
      this.loadInFlight = null;
    }
    if (this.loadedCacheKey() !== key) {
      await this.ensureLoaded();
    }
  }

  private async fetchClusters(key: string): Promise<void> {
    const projectId = this.activeProjectId();
    if (!projectId) {
      this.clusterRows.set([]);
      this.loadedCacheKey.set(null);
      return;
    }

    const { data, error } = await this.supabase.client.rpc('get_media_clusters', {
      p_project_id: projectId,
      p_radius_km: this.radiusKm(),
    });

    if (error) {
      console.warn('[MediaClusterService] get_media_clusters failed', error.message);
      this.clusterRows.set([]);
      this.loadedCacheKey.set(key);
      return;
    }

    const rows = (data ?? []) as GetMediaClustersRow[];
    this.clusterRows.set(
      rows.map((row) => ({
        clusterId: row.cluster_id,
        viewbox: `${row.lon_min},${row.lat_max},${row.lon_max},${row.lat_min}`,
        mediaCount: row.media_count,
      })),
    );
    this.loadedCacheKey.set(key);
  }
}
