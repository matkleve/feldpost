import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase/supabase.service';
import type { ImageRecord } from '../features/map/workspace-pane/image-detail-view.types';

interface MediaItemRow {
  id: string;
  organization_id: string;
  primary_project_id: string | null;
  created_by: string | null;
  storage_path: string | null;
  thumbnail_path: string | null;
  latitude: number | null;
  longitude: number | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
  captured_at: string | null;
  created_at: string;
  location_status: 'gps' | 'no_gps' | 'unresolved' | null;
}

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
        .from('media_items')
        .select('id', { count: 'exact', head: true });

      totalCount = countError ? null : (count ?? null);
    }

    const { data, error } = await this.supabase.client
      .from('media_items')
      .select(
        'id, organization_id, primary_project_id, created_by, storage_path, thumbnail_path, latitude, longitude, exif_latitude, exif_longitude, captured_at, created_at, location_status',
      )
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const items = Array.isArray(data)
      ? (data as MediaItemRow[]).map((row) => this.toImageRecord(row))
      : [];
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

  private toImageRecord(row: MediaItemRow): ImageRecord {
    return {
      id: row.id,
      user_id: row.created_by ?? '',
      organization_id: row.organization_id,
      project_id: row.primary_project_id,
      storage_path: row.storage_path,
      thumbnail_path: row.thumbnail_path,
      latitude: row.latitude,
      longitude: row.longitude,
      exif_latitude: row.exif_latitude,
      exif_longitude: row.exif_longitude,
      captured_at: row.captured_at,
      has_time: row.captured_at !== null,
      created_at: row.created_at,
      address_label: null,
      street: null,
      city: null,
      district: null,
      country: null,
      direction: null,
      location_unresolved: row.location_status === 'unresolved',
    };
  }
}
