import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase/supabase.service';
import type { ImageRecord } from '../features/map/workspace-pane/image-detail-view.types';

export interface MediaLoadResult {
  items: ImageRecord[];
  totalCount: number | null;
  projectNameById: ReadonlyMap<string, string>;
}

export interface MediaLoadOptions {
  offset?: number;
  limit?: number;
  includeCount?: boolean;
}

@Injectable({ providedIn: 'root' })
export class MediaQueryService {
  private readonly supabase = inject(SupabaseService);

  async loadCurrentUserMedia(options: MediaLoadOptions = {}): Promise<MediaLoadResult> {
    const offset = Math.max(0, options.offset ?? 0);
    const limit = Math.max(1, options.limit ?? 72);
    const includeCount = options.includeCount ?? false;

    const {
      data: { user },
    } = await this.supabase.client.auth.getUser();

    if (!user) {
      return { items: [], totalCount: 0, projectNameById: new Map<string, string>() };
    }

    let totalCount: number | null = null;
    if (includeCount) {
      const { count, error: countError } = await this.supabase.client
        .from('images')
        .select('id', { count: 'exact', head: true });

      totalCount = countError ? null : (count ?? null);
    }

    const { data, error } = await this.supabase.client
      .from('images')
      .select(
        'id, user_id, organization_id, project_id, storage_path, thumbnail_path, latitude, longitude, exif_latitude, exif_longitude, captured_at, has_time, created_at, address_label, street, city, district, country, direction, location_unresolved',
      )
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const items = Array.isArray(data) ? (data as ImageRecord[]) : [];
    const projectIds = Array.from(
      new Set(
        items
          .map((item) => item.project_id)
          .filter((projectId): projectId is string => !!projectId),
      ),
    );

    if (projectIds.length === 0) {
      return { items, totalCount, projectNameById: new Map<string, string>() };
    }

    const { data: projectsData, error: projectsError } = await this.supabase.client
      .from('projects')
      .select('id, name')
      .in('id', projectIds);

    if (projectsError) {
      return { items, totalCount, projectNameById: new Map<string, string>() };
    }

    const projectNameById = new Map<string, string>();
    if (Array.isArray(projectsData)) {
      for (const row of projectsData as Array<{ id: string; name: string | null }>) {
        if (row.name) {
          projectNameById.set(row.id, row.name);
        }
      }
    }

    return { items, totalCount, projectNameById };
  }
}
