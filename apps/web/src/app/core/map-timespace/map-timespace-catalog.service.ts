import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import {
  isTimeRangeActive,
  matchesTimeRange,
  type TimeRange,
} from '../workspace-view/timespace.helpers';

export interface TimespaceCatalogEntry {
  id: string;
  capturedAt: string | null;
  createdAt: string;
  projectIds: string[];
}

/**
 * Org-scoped media timestamps for the map Timespace histogram.
 * Workspace `rawImages` is selection-scoped; this catalog loads all accessible media dates.
 */
@Injectable({ providedIn: 'root' })
export class MapTimespaceCatalogService {
  private static readonly PAGE_SIZE = 500;
  private static readonly MEMBERSHIP_CHUNK = 120;

  private readonly supabase = inject(SupabaseService);

  private readonly _entries = signal<readonly TimespaceCatalogEntry[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadError = signal(false);
  private loadPromise: Promise<void> | null = null;

  readonly entries = this._entries.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadError = this._loadError.asReadonly();

  ensureLoaded(): void {
    if (this.loadPromise) {
      return;
    }
    this.loadPromise = this.load();
  }

  private async load(): Promise<void> {
    this._loading.set(true);
    this._loadError.set(false);

    try {
      const {
        data: { user },
      } = await this.supabase.client.auth.getUser();
      if (!user) {
        this._entries.set([]);
        return;
      }

      type TimestampRow = { id: string; captured_at: string | null; created_at: string };
      const accum: TimestampRow[] = [];
      let offset = 0;

      while (true) {
        const { data, error } = await this.supabase.client
          .from('media_items')
          .select('id, captured_at, created_at')
          .order('created_at', { ascending: true })
          .range(offset, offset + MapTimespaceCatalogService.PAGE_SIZE - 1);

        if (error) {
          throw new Error(error.message);
        }

        const rows = Array.isArray(data) ? (data as TimestampRow[]) : [];
        accum.push(...rows);

        if (rows.length < MapTimespaceCatalogService.PAGE_SIZE) {
          break;
        }
        offset += MapTimespaceCatalogService.PAGE_SIZE;
      }

      const projectIdsByMediaId = await this.loadProjectIdsByMediaId(accum.map((row) => row.id));

      this._entries.set(
        accum.map((row) => ({
          id: row.id,
          capturedAt: row.captured_at,
          createdAt: row.created_at,
          projectIds: projectIdsByMediaId.get(row.id) ?? [],
        })),
      );
    } catch {
      this._loadError.set(true);
      this._entries.set([]);
    } finally {
      this._loading.set(false);
    }
  }

  private async loadProjectIdsByMediaId(
    mediaItemIds: readonly string[],
  ): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (mediaItemIds.length === 0) {
      return result;
    }

    for (let i = 0; i < mediaItemIds.length; i += MapTimespaceCatalogService.MEMBERSHIP_CHUNK) {
      const chunk = mediaItemIds.slice(i, i + MapTimespaceCatalogService.MEMBERSHIP_CHUNK);
      const { data, error } = await this.supabase.client
        .from('media_projects')
        .select('media_item_id, project_id')
        .in('media_item_id', chunk);

      if (error || !Array.isArray(data)) {
        continue;
      }

      for (const row of data as Array<{ media_item_id: string; project_id: string }>) {
        const bucket = result.get(row.media_item_id) ?? [];
        bucket.push(row.project_id);
        result.set(row.media_item_id, bucket);
      }
    }

    return result;
  }

  /** Media ids matching project + time filters — used when the map has no workspace selection loaded. */
  idsMatchingFilters(projectIds: ReadonlySet<string>, timeRange: TimeRange | null): Set<string> {
    let entries = this._entries();
    if (projectIds.size > 0) {
      entries = entries.filter((entry) => entry.projectIds.some((id) => projectIds.has(id)));
    }
    if (isTimeRangeActive(timeRange)) {
      entries = entries.filter((entry) => matchesTimeRange(entry, timeRange));
    }
    return new Set(entries.map((entry) => entry.id));
  }
}
