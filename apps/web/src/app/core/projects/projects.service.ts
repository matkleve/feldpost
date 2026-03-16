import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase.service';
import type {
  ProjectColorKey,
  ProjectListItem,
  ProjectSearchCounts,
  ProjectStatusFilter,
  ProjectsImageMetadataRow,
  ProjectsImageRow,
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

    const { data: activityData, error: activityError } = await this.supabase.client
      .from('images')
      .select('project_id,captured_at,created_at,city,district,street,country')
      .not('project_id', 'is', null);

    const counts = new Map<string, number>();
    const lastActivity = new Map<string, string>();
    const cityCounts = new Map<string, Map<string, number>>();
    const districtCounts = new Map<string, Map<string, number>>();
    const streetCounts = new Map<string, Map<string, number>>();
    const countryCounts = new Map<string, Map<string, number>>();

    if (!activityError && Array.isArray(activityData)) {
      for (const row of activityData as ProjectActivityRow[]) {
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
      .eq('id', projectId);

    if (!preferred.error) {
      this.invalidateProjectsReadCaches();
      this.invalidateProjectWorkspaceCache(projectId);
      return true;
    }

    const fallback = await this.supabase.client
      .from('projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', projectId);

    const ok = !fallback.error;
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

    const { data, error } = await this.supabase.client
      .from('images')
      .select(
        'id,project_id,latitude,longitude,thumbnail_path,storage_path,captured_at,created_at,direction,exif_latitude,exif_longitude,address_label,city,district,street,country',
      )
      .eq('project_id', projectId)
      .order('captured_at', { ascending: false, nullsFirst: false });

    if (error || !Array.isArray(data)) {
      return [];
    }

    const mapped = (data as ProjectsImageRow[])
      .filter(
        (row) =>
          typeof row.latitude === 'number' &&
          Number.isFinite(row.latitude) &&
          typeof row.longitude === 'number' &&
          Number.isFinite(row.longitude),
      )
      .map((row) => ({
        id: row.id,
        projectId: row.project_id,
        projectName: null,
        latitude: row.latitude as number,
        longitude: row.longitude as number,
        thumbnailPath: row.thumbnail_path,
        storagePath: row.storage_path,
        capturedAt: row.captured_at,
        createdAt: row.created_at,
        direction: row.direction,
        exifLatitude: row.exif_latitude,
        exifLongitude: row.exif_longitude,
        addressLabel: row.address_label,
        city: row.city,
        district: row.district,
        street: row.street,
        country: row.country,
        userName: null,
      }));

    this.projectWorkspaceImagesCache.set(projectId, {
      value: mapped,
      expiresAt: now + PROJECT_WORKSPACE_CACHE_TTL_MS,
    });

    return mapped;
  }

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
    const preferred = await this.supabase.client
      .from('projects')
      .insert({ name: 'Untitled project', color_key: DEFAULT_PROJECT_COLOR })
      .select('id,name,color_key,archived_at,created_at,updated_at')
      .single();

    if (!preferred.error && preferred.data) {
      return preferred.data as ProjectRow;
    }

    const fallback = await this.supabase.client
      .from('projects')
      .insert({ name: 'Untitled project' })
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

  private async collectTitleAndAddressMatches(
    searchTerm: string,
    imageIdsByProject: Map<string, Set<string>>,
  ): Promise<void> {
    const escaped = this.escapeIlike(searchTerm);

    const preferred = await this.supabase.client
      .from('images')
      .select('id,project_id')
      .not('project_id', 'is', null)
      .or(`title.ilike.%${escaped}%,address_label.ilike.%${escaped}%`);

    const response = preferred.error
      ? await this.supabase.client
          .from('images')
          .select('id,project_id')
          .not('project_id', 'is', null)
          .ilike('address_label', `%${escaped}%`)
      : preferred;

    if (response.error || !Array.isArray(response.data)) {
      return;
    }

    for (const row of response.data as Array<{ id: string; project_id: string | null }>) {
      if (!row.project_id) continue;
      const bucket = imageIdsByProject.get(row.project_id) ?? new Set<string>();
      bucket.add(row.id);
      imageIdsByProject.set(row.project_id, bucket);
    }
  }

  private async collectMetadataMatches(
    searchTerm: string,
    imageIdsByProject: Map<string, Set<string>>,
  ): Promise<void> {
    const escaped = this.escapeIlike(searchTerm);

    const response = await this.supabase.client
      .from('image_metadata')
      .select('image_id,value_text,images!inner(project_id)')
      .ilike('value_text', `%${escaped}%`);

    if (response.error || !Array.isArray(response.data)) {
      return;
    }

    for (const row of response.data as ProjectsImageMetadataRow[]) {
      const relatedImage = Array.isArray(row.images) ? row.images[0] : row.images;
      const projectId = relatedImage?.project_id ?? null;
      if (!projectId) continue;

      const bucket = imageIdsByProject.get(projectId) ?? new Set<string>();
      bucket.add(row.image_id);
      imageIdsByProject.set(projectId, bucket);
    }
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
