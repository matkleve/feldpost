import { Injectable, inject } from '@angular/core';
import { loadLocationSummaryByMediaIds } from '../media-locations/media-locations-batch.helpers';
import { SupabaseService } from '../supabase/supabase.service';
import { MetadataService } from '../metadata/metadata.service';
import type { WorkspaceMedia } from '../workspace-view/workspace-view.types';
import { normalizePreviewGenerationStatus } from '../media/preview-generation-status.types';
import type { ImageRecord } from './media-query.types';

interface MediaItemRow {
  id: string;
  organization_id: string;
  created_by: string | null;
  storage_path: string | null;
  thumbnail_path: string | null;
  original_filename?: string | null;
  latitude: number | null;
  longitude: number | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
  captured_at: string | null;
  created_at: string;
  location_status:
    | 'pending'
    | 'resolved'
    | 'unresolvable'
    | 'gps'
    | 'no_gps'
    | 'unresolved'
    | null;
}

interface MediaGalleryDbRow {
  id: string;
  organization_id: string;
  created_by: string | null;
  storage_path: string | null;
  thumbnail_path: string | null;
  original_filename?: string | null;
  preview_generation_status?: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
  captured_at: string | null;
  created_at: string;
  location_status:
    | 'pending'
    | 'resolved'
    | 'unresolvable'
    | 'gps'
    | 'no_gps'
    | 'unresolved'
    | null;
  source_image_id: string | null;
  address_label: string | null;
  street: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
}

interface RawMediaProjectMembershipRow {
  media_item_id: string;
  project_id: string;
  projects: { name: string | null } | Array<{ name: string | null }> | null;
}

interface MediaItemLookupRow {
  id: string;
  source_image_id: string | null;
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

export interface MediaMutationResult {
  ok: boolean;
  errorMessage: string | null;
}

@Injectable({ providedIn: 'root' })
export class MediaQueryService {
  private static readonly GALLERY_PAGE_SIZE = 500;
  private static readonly MEMBERSHIP_QUERY_CHUNK = 120;

  private readonly supabase = inject(SupabaseService);
  private readonly metadata = inject(MetadataService);

  /**
   * Loads all media items for the signed-in user as WorkspaceMedia rows (projects + metadata),
   * intended for the /media gallery pipeline (client-side sort/filter/group like the workspace).
   */
  async loadAllCurrentUserWorkspaceMedia(): Promise<WorkspaceMedia[]> {
    const {
      data: { user },
    } = await this.supabase.client.auth.getUser();

    if (!user) {
      return [];
    }

    const accum: MediaGalleryDbRow[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await this.supabase.client
        .from('media_items')
        .select(
          'id, organization_id, created_by, storage_path, thumbnail_path, original_filename, preview_generation_status, exif_latitude, exif_longitude, captured_at, created_at, location_status, source_image_id',
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + MediaQueryService.GALLERY_PAGE_SIZE - 1);

      if (error) {
        throw new Error(error.message);
      }

      const rows = Array.isArray(data) ? (data as MediaGalleryDbRow[]) : [];
      accum.push(...rows);

      if (rows.length < MediaQueryService.GALLERY_PAGE_SIZE) {
        break;
      }

      offset += MediaQueryService.GALLERY_PAGE_SIZE;
    }

    if (accum.length === 0) {
      return [];
    }

    const membershipByMediaId = new Map<string, Array<{ id: string; name: string | null }>>();
    const mediaItemIds = accum.map((row) => row.id);

    for (let i = 0; i < mediaItemIds.length; i += MediaQueryService.MEMBERSHIP_QUERY_CHUNK) {
      const chunk = mediaItemIds.slice(i, i + MediaQueryService.MEMBERSHIP_QUERY_CHUNK);
      const { data: membershipsData, error: membershipsError } = await this.supabase.client
        .from('media_projects')
        .select('media_item_id, project_id, projects(name)')
        .in('media_item_id', chunk);

      if (membershipsError || !Array.isArray(membershipsData)) {
        continue;
      }

      for (const row of membershipsData as RawMediaProjectMembershipRow[]) {
        const bucket = membershipByMediaId.get(row.media_item_id) ?? [];
        const relatedProject = Array.isArray(row.projects) ? row.projects[0] : row.projects;
        bucket.push({
          id: row.project_id,
          name: relatedProject?.name ?? null,
        });
        membershipByMediaId.set(row.media_item_id, bucket);
      }
    }

    for (const memberships of membershipByMediaId.values()) {
      memberships.sort((a, b) => {
        const aName = (a.name ?? '').toLowerCase();
        const bName = (b.name ?? '').toLowerCase();
        return aName < bName ? -1 : aName > bName ? 1 : 0;
      });
    }

    const userIds = Array.from(
      new Set(accum.map((row) => row.created_by).filter((id): id is string => !!id)),
    );
    const profileNameById = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await this.supabase.client
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (!profilesError && Array.isArray(profilesData)) {
        for (const profile of profilesData as Array<{ id: string; full_name: string | null }>) {
          if (profile.full_name) {
            profileNameById.set(profile.id, profile.full_name);
          }
        }
      }
    }

    const { zoomableCountByMediaId } = await loadLocationSummaryByMediaIds(
      this.supabase.client,
      mediaItemIds,
      MediaQueryService.MEMBERSHIP_QUERY_CHUNK,
    );

    const images: WorkspaceMedia[] = accum.map((row) =>
      mapGalleryRowToWorkspaceMedia(
        row,
        membershipByMediaId.get(row.id) ?? [],
        row.created_by ? (profileNameById.get(row.created_by) ?? null) : null,
        zoomableCountByMediaId.get(row.id) ?? 0,
      ),
    );

    const metadataMap = await this.loadMetadataValuesChunked(mediaItemIds);
    if (metadataMap.size === 0) {
      return images;
    }

    return images.map((img) => {
      const values = metadataMap.get(img.id);
      return values ? { ...img, metadata: { ...(img.metadata ?? {}), ...values } } : img;
    });
  }

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
        'id, organization_id, created_by, storage_path, thumbnail_path, original_filename, exif_latitude, exif_longitude, captured_at, created_at, location_status',
      )
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const items = Array.isArray(data)
      ? (data as MediaItemRow[]).map((row) => this.toImageRecord(row))
      : [];
    return { items, totalCount, projectNameById: new Map<string, string>() };
  }

  async resolveMediaItemIdsByLookupIds(lookupIds: readonly string[]): Promise<string[]> {
    const uniqueLookupIds = this.normalizeIds(lookupIds);
    if (uniqueLookupIds.length === 0) {
      return [];
    }

    const idList = uniqueLookupIds.join(',');
    const { data, error } = await this.supabase.client
      .from('media_items')
      .select('id,source_image_id')
      .or(`id.in.(${idList}),source_image_id.in.(${idList})`);

    if (error || !Array.isArray(data)) {
      return [];
    }

    return Array.from(
      new Set(
        (data as MediaItemLookupRow[])
          .map((row) => (typeof row.id === 'string' ? row.id : null))
          .filter((id): id is string => !!id),
      ),
    );
  }

  async deleteMediaItems(mediaItemIds: readonly string[]): Promise<MediaMutationResult> {
    const uniqueMediaItemIds = this.normalizeIds(mediaItemIds);
    if (uniqueMediaItemIds.length === 0) {
      return { ok: true, errorMessage: null };
    }

    const { error } = await this.supabase.client
      .from('media_items')
      .delete()
      .in('id', uniqueMediaItemIds);

    if (error) {
      return { ok: false, errorMessage: error.message };
    }

    return { ok: true, errorMessage: null };
  }

  private toImageRecord(row: MediaItemRow): ImageRecord {
    const unresolved = row.location_status === 'pending' || row.location_status === 'no_gps';

    return {
      id: row.id,
      user_id: row.created_by ?? '',
      organization_id: row.organization_id,
      project_id: null,
      storage_path: row.storage_path,
      thumbnail_path: row.thumbnail_path,
      original_filename: row.original_filename ?? null,
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
      location_unresolved: unresolved,
    };
  }

  private normalizeIds(ids: readonly string[]): string[] {
    return Array.from(new Set(ids.filter((id) => typeof id === 'string' && id.length > 0)));
  }

  private async loadMetadataValuesChunked(
    mediaItemIds: readonly string[],
  ): Promise<Map<string, NonNullable<WorkspaceMedia['metadata']>>> {
    const merged = new Map<string, NonNullable<WorkspaceMedia['metadata']>>();
    const chunkSize = 400;

    for (let i = 0; i < mediaItemIds.length; i += chunkSize) {
      const chunk = mediaItemIds.slice(i, i + chunkSize);
      const map = await this.metadata.loadMetadataValuesByLookupIds(chunk);
      for (const [id, values] of map.entries()) {
        merged.set(id, { ...(merged.get(id) ?? {}), ...values });
      }
    }

    return merged;
  }

}

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapGalleryRowToWorkspaceMedia(
  row: MediaGalleryDbRow,
  memberships: Array<{ id: string; name: string | null }>,
  userName: string | null,
  zoomableLocationCount: number,
): WorkspaceMedia {
  const projectIds = memberships.map((m) => m.id);
  const projectNames = memberships.map((m) => m.name ?? '').filter((name) => !!name);

  return {
    id: row.id,
    latitude: 0,
    longitude: 0,
    zoomableLocationCount,
    thumbnailPath: row.thumbnail_path,
    previewGenerationStatus: normalizePreviewGenerationStatus(row.preview_generation_status),
    storagePath: row.storage_path,
    fileMetadata: row.original_filename
      ? { originalFilename: row.original_filename }
      : null,
    capturedAt: row.captured_at,
    createdAt: row.created_at,
    projectId: projectIds[0] ?? null,
    projectName: projectNames[0] ?? null,
    projectIds,
    projectNames,
    direction: null,
    exifLatitude: row.exif_latitude,
    exifLongitude: row.exif_longitude,
    addressLabel: row.address_label,
    city: row.city,
    district: row.district,
    street: row.street,
    streetNumber: null,
    zip: null,
    country: row.country,
    userName,
  };
}
