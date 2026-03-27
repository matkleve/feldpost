import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  ProjectColorKey,
  ProjectListItem,
  ProjectSearchCounts,
  ProjectStatusFilter,
  ProjectScopedWorkspaceImage,
} from './projects.types';

interface ProjectRow {
  id: string;
  name: string | null;
  color_key?: string | null;
  archived_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ProjectActivityRow {
  project_id: string | null;
  captured_at: string | null;
  created_at: string | null;
  city: string | null;
  district: string | null;
  street: string | null;
  country: string | null;
}

interface MediaActivityJoinRow {
  project_id: string | null;
  media_items:
    | {
        captured_at: string | null;
        created_at: string | null;
      }
    | Array<{
        captured_at: string | null;
        created_at: string | null;
      }>
    | null;
}

interface MediaWorkspaceJoinRow {
  project_id: string;
  media_items:
    | {
        id: string;
        latitude: number | null;
        longitude: number | null;
        thumbnail_path: string | null;
        storage_path: string | null;
        captured_at: string | null;
        created_at: string;
        exif_latitude: number | null;
        exif_longitude: number | null;
      }
    | Array<{
        id: string;
        latitude: number | null;
        longitude: number | null;
        thumbnail_path: string | null;
        storage_path: string | null;
        captured_at: string | null;
        created_at: string;
        exif_latitude: number | null;
        exif_longitude: number | null;
      }>
    | null;
}

interface MediaSearchJoinRow {
  project_id: string | null;
  media_item_id: string;
  media_items:
    | {
        source_image_id: string | null;
      }
    | Array<{
        source_image_id: string | null;
      }>
    | null;
}

interface MediaProjectMembershipRow {
  media_item_id?: string;
  project_id: string;
}

interface ProfileOrgRow {
  organization_id: string | null;
}

interface ProjectInsertContext {
  userId: string;
  organizationId: string;
}

const DEFAULT_PROJECT_COLOR: ProjectColorKey = 'clay';
const PROJECTS_CACHE_TTL_MS = 60_000;
const SEARCH_COUNTS_CACHE_TTL_MS = 15_000;
const PROJECT_WORKSPACE_CACHE_TTL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly supabase = inject(SupabaseService);
  private projectsCache: { value: ProjectListItem[]; expiresAt: number } | null = null;
  private projectsLoadPromise: Promise<ProjectListItem[]> | null = null;
  private readonly groupedSearchCountsCache = new Map<
    string,
    { value: ProjectSearchCounts; expiresAt: number }
  >();
  private readonly projectWorkspaceImagesCache = new Map<
    string,
    { value: ProjectScopedWorkspaceImage[]; expiresAt: number }
  >();
  private projectInsertContextCache: ProjectInsertContext | null = null;

  async loadProjects(): Promise<ProjectListItem[]> {
    const now = Date.now();
    const cached = this.projectsCache;
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    if (this.projectsLoadPromise) {
      return this.projectsLoadPromise;
    }

    this.projectsLoadPromise = this.loadProjectsFresh();
    try {
      return await this.projectsLoadPromise;
    } finally {
      this.projectsLoadPromise = null;
    }
  }

  private async loadProjectsFresh(): Promise<ProjectListItem[]> {
    const projectRows = await this.fetchProjects();
    const activityRows = await this.loadProjectActivityRows();

    const counts = new Map<string, number>();
    const lastActivity = new Map<string, string>();
    const cityCounts = new Map<string, Map<string, number>>();
    const districtCounts = new Map<string, Map<string, number>>();
    const streetCounts = new Map<string, Map<string, number>>();
    const countryCounts = new Map<string, Map<string, number>>();

    for (const row of activityRows) {
      if (!row.project_id) continue;
      counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
      this.bumpValueCount(cityCounts, row.project_id, row.city);
      this.bumpValueCount(districtCounts, row.project_id, row.district);
      this.bumpValueCount(streetCounts, row.project_id, row.street);
      this.bumpValueCount(countryCounts, row.project_id, row.country);

      const ts = row.captured_at ?? row.created_at;
      if (!ts) continue;

      const existing = lastActivity.get(row.project_id);
      if (!existing || new Date(ts).getTime() > new Date(existing).getTime()) {
        lastActivity.set(row.project_id, ts);
      }
    }

    const projects: ProjectListItem[] = projectRows.map((row) => {
      const archivedAt = row.archived_at ?? null;
      const totalImageCount = counts.get(row.id) ?? 0;

      return {
        id: row.id,
        name: row.name?.trim() || 'Untitled project',
        colorKey: this.normalizeColorKey(row.color_key),
        archivedAt,
        createdAt: row.created_at ?? new Date().toISOString(),
        updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
        status: archivedAt ? ('archived' as const) : ('active' as const),
        totalImageCount,
        matchingImageCount: totalImageCount,
        lastActivity: lastActivity.get(row.id) ?? null,
        city: this.pickMostFrequent(cityCounts, row.id),
        district: this.pickMostFrequent(districtCounts, row.id),
        street: this.pickMostFrequent(streetCounts, row.id),
        country: this.pickMostFrequent(countryCounts, row.id),
      };
    });

    this.projectsCache = {
      value: projects,
      expiresAt: Date.now() + PROJECTS_CACHE_TTL_MS,
    };

    return projects;
  }

  async loadGroupedSearchCounts(
    searchTerm: string,
    statusFilter: ProjectStatusFilter,
  ): Promise<ProjectSearchCounts> {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      return {};
    }

    const cacheKey = `${statusFilter}|${trimmed.toLowerCase()}`;
    const now = Date.now();
    const cached = this.groupedSearchCountsCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const imageIdsByProject = new Map<string, Set<string>>();

    await this.collectTitleAndAddressMatches(trimmed, imageIdsByProject);
    await this.collectMetadataMatches(trimmed, imageIdsByProject);

    const statusByProject = await this.loadStatusByProjectId();
    const result: ProjectSearchCounts = {};

    for (const [projectId, imageIds] of imageIdsByProject) {
      const isArchived = statusByProject.get(projectId) ?? false;
      if (statusFilter === 'active' && isArchived) continue;
      if (statusFilter === 'archived' && !isArchived) continue;
      result[projectId] = imageIds.size;
    }

    this.groupedSearchCountsCache.set(cacheKey, {
      value: result,
      expiresAt: now + SEARCH_COUNTS_CACHE_TTL_MS,
    });

    return result;
  }

  async createDraftProject(): Promise<ProjectListItem | null> {
    const row = await this.tryCreateDraftProjectRow();
    if (!row) {
      return null;
    }

    this.invalidateProjectsReadCaches();

    return this.mapProjectRowToListItem(row);
  }

  async renameProject(projectId: string, name: string): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) {
      return false;
    }

    const { error } = await this.supabase.client
      .from('projects')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', projectId);

    const ok = !error;
    if (ok) {
      this.invalidateProjectsReadCaches();
      this.invalidateProjectWorkspaceCache(projectId);
    }

    return ok;
  }

  async archiveProject(projectId: string): Promise<boolean> {
    const preferred = await this.supabase.client
      .from('projects')
      .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .select('id');

    const ok = !preferred.error && Array.isArray(preferred.data) && preferred.data.length > 0;
    if (ok) {
      this.invalidateProjectsReadCaches();
      this.invalidateProjectWorkspaceCache(projectId);
    }

    return ok;
  }

  async restoreProject(projectId: string): Promise<boolean> {
    const preferred = await this.supabase.client
      .from('projects')
      .update({ archived_at: null, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .select('id');

    const ok = !preferred.error && Array.isArray(preferred.data) && preferred.data.length > 0;
    if (ok) {
      this.invalidateProjectsReadCaches();
      this.invalidateProjectWorkspaceCache(projectId);
    }

    return ok;
  }

  async deleteProject(projectId: string): Promise<boolean> {
    const { data, error } = await this.supabase.client
      .from('projects')
      .delete()
      .eq('id', projectId)
      .not('archived_at', 'is', null)
      .select('id');

    const ok = !error && Array.isArray(data) && data.length > 0;
    if (ok) {
      this.invalidateProjectsReadCaches();
      this.invalidateProjectWorkspaceCache(projectId);
    }

    return ok;
  }

  async setProjectColor(projectId: string, colorKey: ProjectColorKey): Promise<boolean> {
    const { data, error } = await this.supabase.client
      .from('projects')
      .update({ color_key: colorKey, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .select('id')
      .maybeSingle();

    const ok = !error && !!data;
    if (ok) {
      this.invalidateProjectsReadCaches();
      this.invalidateProjectWorkspaceCache(projectId);
    }

    return ok;
  }

  async loadProjectWorkspaceImages(projectId: string): Promise<ProjectScopedWorkspaceImage[]> {
    const now = Date.now();
    const cached = this.projectWorkspaceImagesCache.get(projectId);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const preferred = await this.supabase.client
      .from('media_projects')
      .select(
        'project_id,media_items!inner(id,latitude,longitude,thumbnail_path,storage_path,captured_at,created_at,exif_latitude,exif_longitude)',
      )
      .eq('project_id', projectId)
      .order('created_at', { foreignTable: 'media_items', ascending: false });

    if (!preferred.error && Array.isArray(preferred.data)) {
      const mappedPreferred: ProjectScopedWorkspaceImage[] = [];
      for (const row of preferred.data as MediaWorkspaceJoinRow[]) {
        const media = Array.isArray(row.media_items) ? row.media_items[0] : row.media_items;
        if (!media) continue;
        if (typeof media.latitude !== 'number' || !Number.isFinite(media.latitude)) continue;
        if (typeof media.longitude !== 'number' || !Number.isFinite(media.longitude)) continue;

        mappedPreferred.push({
          id: media.id,
          projectId: row.project_id,
          projectName: null,
          latitude: media.latitude,
          longitude: media.longitude,
          thumbnailPath: media.thumbnail_path,
          storagePath: media.storage_path,
          capturedAt: media.captured_at,
          createdAt: media.created_at,
          direction: null,
          exifLatitude: media.exif_latitude,
          exifLongitude: media.exif_longitude,
          addressLabel: null,
          city: null,
          district: null,
          street: null,
          country: null,
          userName: null,
        });
      }

      this.projectWorkspaceImagesCache.set(projectId, {
        value: mappedPreferred,
        expiresAt: now + PROJECT_WORKSPACE_CACHE_TTL_MS,
      });

      return mappedPreferred;
    }

    return [];
  }

  async loadMediaProjectMemberships(mediaItemId: string): Promise<string[]> {
    const { data, error } = await this.supabase.client
      .from('media_projects')
      .select('project_id')
      .eq('media_item_id', mediaItemId);

    if (error || !Array.isArray(data)) {
      return [];
    }

    return (data as MediaProjectMembershipRow[])
      .map((row) => row.project_id)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
  }

  async addMediaToProject(mediaItemId: string, projectId: string): Promise<boolean> {
    const { error } = await this.supabase.client.from('media_projects').insert({
      media_item_id: mediaItemId,
      project_id: projectId,
    });

    const ok = !error;
    if (ok) {
      this.invalidateProjectsReadCaches();
      this.projectWorkspaceImagesCache.clear();
    }

    return ok;
  }

  async removeMediaFromProject(mediaItemId: string, projectId: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('media_projects')
      .delete()
      .eq('media_item_id', mediaItemId)
      .eq('project_id', projectId);

    const ok = !error;
    if (ok) {
      this.invalidateProjectsReadCaches();
      this.projectWorkspaceImagesCache.clear();
    }

    return ok;
  }

  // No "primary project" concept — memberships only via media_projects.

  private invalidateProjectsReadCaches(): void {
    this.projectsCache = null;
    this.groupedSearchCountsCache.clear();
  }

  private invalidateProjectWorkspaceCache(projectId: string): void {
    this.projectWorkspaceImagesCache.delete(projectId);
  }

  private async fetchProjects(): Promise<ProjectRow[]> {
    const preferredResponse = await this.supabase.client
      .from('projects')
      .select('id,name,color_key,archived_at,created_at,updated_at')
      .order('updated_at', { ascending: false });

    if (!preferredResponse.error && Array.isArray(preferredResponse.data)) {
      return preferredResponse.data as ProjectRow[];
    }

    const fallbackResponse = await this.supabase.client
      .from('projects')
      .select('id,name,created_at,updated_at')
      .order('updated_at', { ascending: false });

    if (fallbackResponse.error || !Array.isArray(fallbackResponse.data)) {
      return [];
    }

    return (
      fallbackResponse.data as Array<Pick<ProjectRow, 'id' | 'name' | 'created_at' | 'updated_at'>>
    ).map((row) => ({
      ...row,
      color_key: DEFAULT_PROJECT_COLOR,
      archived_at: null,
    }));
  }

  private normalizeColorKey(value: string | null | undefined): ProjectColorKey {
    if (value === 'accent' || value === 'success' || value === 'warning' || value === 'clay') {
      return value;
    }

    const brandHueMatch = value?.match(/^brand-hue-(\d{1,3})$/);
    if (brandHueMatch) {
      const hue = Number.parseInt(brandHueMatch[1], 10);
      if (Number.isFinite(hue) && hue >= 0 && hue <= 359) {
        return `brand-hue-${hue}`;
      }
    }

    return DEFAULT_PROJECT_COLOR;
  }

  private mapProjectRowToListItem(row: ProjectRow): ProjectListItem {
    return {
      id: row.id,
      name: row.name?.trim() || 'Untitled project',
      colorKey: this.normalizeColorKey(row.color_key),
      archivedAt: row.archived_at ?? null,
      createdAt: row.created_at ?? new Date().toISOString(),
      updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
      status: row.archived_at ? 'archived' : 'active',
      totalImageCount: 0,
      matchingImageCount: 0,
      lastActivity: null,
      city: null,
      district: null,
      street: null,
      country: null,
    };
  }

  private bumpValueCount(
    buckets: Map<string, Map<string, number>>,
    projectId: string,
    value: string | null,
  ): void {
    const normalized = value?.trim();
    if (!normalized) return;

    const projectBucket = buckets.get(projectId) ?? new Map<string, number>();
    projectBucket.set(normalized, (projectBucket.get(normalized) ?? 0) + 1);
    buckets.set(projectId, projectBucket);
  }

  private pickMostFrequent(
    buckets: Map<string, Map<string, number>>,
    projectId: string,
  ): string | null {
    const projectBucket = buckets.get(projectId);
    if (!projectBucket || projectBucket.size === 0) {
      return null;
    }

    let winner: string | null = null;
    let winnerCount = -1;

    for (const [value, count] of projectBucket) {
      if (count > winnerCount || (count === winnerCount && (winner ? value < winner : true))) {
        winner = value;
        winnerCount = count;
      }
    }

    return winner;
  }

  private async tryCreateDraftProjectRow(): Promise<ProjectRow | null> {
    const context = await this.resolveProjectInsertContext();
    if (!context) {
      return null;
    }

    const preferred = await this.supabase.client
      .from('projects')
      .insert({
        name: 'Untitled project',
        color_key: DEFAULT_PROJECT_COLOR,
        organization_id: context.organizationId,
        created_by: context.userId,
      })
      .select('id,name,color_key,archived_at,created_at,updated_at')
      .single();

    if (!preferred.error && preferred.data) {
      return preferred.data as ProjectRow;
    }

    const fallback = await this.supabase.client
      .from('projects')
      .insert({
        name: 'Untitled project',
        organization_id: context.organizationId,
        created_by: context.userId,
      })
      .select('id,name,created_at,updated_at')
      .single();

    if (fallback.error || !fallback.data) {
      return null;
    }

    const row = fallback.data as Pick<ProjectRow, 'id' | 'name' | 'created_at' | 'updated_at'>;
    return {
      ...row,
      color_key: DEFAULT_PROJECT_COLOR,
      archived_at: null,
    };
  }

  private async resolveProjectInsertContext(): Promise<ProjectInsertContext | null> {
    const { data: authData, error: authError } = await this.supabase.client.auth.getUser();
    const userId = authData.user?.id ?? null;
    if (authError || !userId) {
      return null;
    }

    const cached = this.projectInsertContextCache;
    if (cached && cached.userId === userId) {
      return cached;
    }

    const { data: profile, error: profileError } = await this.supabase.client
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .maybeSingle();

    const organizationId = (profile as ProfileOrgRow | null)?.organization_id ?? null;
    if (profileError || !organizationId) {
      return null;
    }

    const context = { userId, organizationId };
    this.projectInsertContextCache = context;
    return context;
  }

  private async collectTitleAndAddressMatches(
    searchTerm: string,
    imageIdsByProject: Map<string, Set<string>>,
  ): Promise<void> {
    const escaped = this.escapeIlike(searchTerm);

    const response = await this.supabase.client
      .from('media_projects')
      .select('project_id,media_item_id,media_items!inner(source_image_id)')
      .or(`file_name.ilike.%${escaped}%,storage_path.ilike.%${escaped}%`, {
        foreignTable: 'media_items',
      });

    if (response.error || !Array.isArray(response.data)) {
      return;
    }

    for (const row of response.data as MediaSearchJoinRow[]) {
      if (!row.project_id) continue;

      const media = Array.isArray(row.media_items) ? row.media_items[0] : row.media_items;
      const stableSearchId = media?.source_image_id ?? row.media_item_id;

      if (!stableSearchId) {
        continue;
      }

      const bucket = imageIdsByProject.get(row.project_id) ?? new Set<string>();
      bucket.add(stableSearchId);
      imageIdsByProject.set(row.project_id, bucket);
    }
  }

  private async collectMetadataMatches(
    searchTerm: string,
    imageIdsByProject: Map<string, Set<string>>,
  ): Promise<void> {
    const escaped = this.escapeIlike(searchTerm);

    const response = await this.supabase.client
      .from('media_metadata')
      .select('media_item_id,value_text')
      .ilike('value_text', `%${escaped}%`);

    if (response.error || !Array.isArray(response.data)) {
      return;
    }

    const matchedMediaItemIds = new Set<string>();

    for (const row of response.data as Array<{ media_item_id: string; value_text: string }>) {
      if (row.media_item_id) {
        matchedMediaItemIds.add(row.media_item_id);
      }
    }

    if (matchedMediaItemIds.size === 0) {
      return;
    }

    const mediaLinksResponse = await this.supabase.client
      .from('media_items')
      .select('id,source_image_id')
      .in('id', [...matchedMediaItemIds]);

    if (mediaLinksResponse.error || !Array.isArray(mediaLinksResponse.data)) {
      return;
    }

    const lookupIdByMediaItemId = new Map<string, string>();

    for (const row of mediaLinksResponse.data as Array<{
      id: string;
      source_image_id: string | null;
    }>) {
      lookupIdByMediaItemId.set(row.id, row.source_image_id ?? row.id);
    }

    const membershipsResponse = await this.supabase.client
      .from('media_projects')
      .select('media_item_id,project_id')
      .in('media_item_id', [...matchedMediaItemIds]);

    if (membershipsResponse.error || !Array.isArray(membershipsResponse.data)) {
      return;
    }

    for (const row of membershipsResponse.data as MediaProjectMembershipRow[]) {
      if (!row.media_item_id) continue;
      const lookupId = lookupIdByMediaItemId.get(row.media_item_id);
      if (!lookupId) continue;

      const bucket = imageIdsByProject.get(row.project_id) ?? new Set<string>();
      bucket.add(lookupId);
      imageIdsByProject.set(row.project_id, bucket);
    }
  }

  private async loadProjectActivityRows(): Promise<ProjectActivityRow[]> {
    const preferred = await this.supabase.client
      .from('media_projects')
      .select('project_id,media_items!inner(captured_at,created_at)');

    if (!preferred.error && Array.isArray(preferred.data)) {
      const rows: ProjectActivityRow[] = [];
      for (const row of preferred.data as MediaActivityJoinRow[]) {
        const media = Array.isArray(row.media_items) ? row.media_items[0] : row.media_items;
        if (!media || !row.project_id) continue;

        rows.push({
          project_id: row.project_id,
          captured_at: media.captured_at,
          created_at: media.created_at,
          city: null,
          district: null,
          street: null,
          country: null,
        });
      }

      return rows;
    }

    return [];
  }

  private async loadStatusByProjectId(): Promise<Map<string, boolean>> {
    const status = new Map<string, boolean>();

    const preferred = await this.supabase.client.from('projects').select('id,archived_at');
    if (!preferred.error && Array.isArray(preferred.data)) {
      for (const row of preferred.data as Array<{ id: string; archived_at: string | null }>) {
        status.set(row.id, !!row.archived_at);
      }
      return status;
    }

    const fallback = await this.supabase.client.from('projects').select('id');
    if (!fallback.error && Array.isArray(fallback.data)) {
      for (const row of fallback.data as Array<{ id: string }>) {
        status.set(row.id, false);
      }
    }

    return status;
  }

  private escapeIlike(value: string): string {
    return value.replace(/[%_]/g, (match) => `\\${match}`);
  }
}
