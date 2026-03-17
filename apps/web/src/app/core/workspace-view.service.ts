import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { FilterService } from './filter.service';
import { LocationResolverService } from './location-resolver.service';
import { PropertyRegistryService } from './property-registry.service';
import { PhotoLoadService } from './photo-load.service';
import type {
  WorkspaceImage,
  GroupedSection,
  SortConfig,
  PropertyRef,
  ThumbnailSizePreset,
} from './workspace-view.types';

const DEFAULT_SORTS: SortConfig[] = [{ key: 'date-captured', direction: 'desc' }];
const THUMBNAIL_SIZE_PRESET_STORAGE_KEY = 'sitesnap.settings.workspace.thumbnailSizePreset';
const THUMBNAIL_SIZE_PRESETS: readonly ThumbnailSizePreset[] = ['row', 'small', 'medium', 'large'];

@Injectable({ providedIn: 'root' })
export class WorkspaceViewService {
  private readonly supabase = inject(SupabaseService);
  private readonly filterService = inject(FilterService);
  private readonly locationResolver = inject(LocationResolverService);
  private readonly registry = inject(PropertyRegistryService);
  private readonly photoLoad = inject(PhotoLoadService);

  // ── Input signals ────────────────────────────────────────────────────────

  readonly rawImages = signal<WorkspaceImage[]>([]);
  readonly selectedProjectIds = signal<Set<string>>(new Set());
  readonly activeSorts = signal<SortConfig[]>(DEFAULT_SORTS);
  readonly activeGroupings = signal<PropertyRef[]>([]);
  readonly thumbnailSizePreset = signal<ThumbnailSizePreset>(this.readThumbnailSizePreset());
  readonly collapsedGroups = signal<Set<string>>(new Set());
  readonly isLoading = signal(false);
  /** True once a marker click triggers a load — distinguishes "no selection" from "empty result". */
  readonly selectionActive = signal(false);

  // ── Pipeline: computed signal chain ──────────────────────────────────────

  /**
   * Effective sort order: grouping keys prepended (in grouping order) before user sorts.
   * If a grouping key already exists in activeSorts, its direction is preserved and it is
   * moved to the grouping position. New grouping keys default to ascending.
   */
  readonly effectiveSorts = computed<SortConfig[]>(() => {
    const groupings = this.activeGroupings();
    const userSorts = this.activeSorts();

    if (groupings.length === 0) return userSorts;

    const userSortMap = new Map(userSorts.map((s) => [s.key, s]));
    const groupingIds = new Set(groupings.map((g) => g.id));

    // Grouping keys first, in grouping order, using existing direction if available
    const groupingSorts: SortConfig[] = groupings.map((g) => {
      const existing = userSortMap.get(g.id);
      return { key: g.id, direction: existing?.direction ?? 'asc' };
    });

    // Remaining user sorts that aren't grouping keys
    const remainingUserSorts = userSorts.filter((s) => !groupingIds.has(s.key));

    return [...groupingSorts, ...remainingUserSorts];
  });

  /** Step 1: Filter by project. Empty set = no filter (all projects). */
  private readonly projectFiltered = computed(() => {
    const images = this.rawImages();
    const projectIds = this.selectedProjectIds();
    if (projectIds.size === 0) return images;
    return images.filter((img) => {
      const ids = img.projectIds?.length ? img.projectIds : img.projectId ? [img.projectId] : [];
      return ids.some((id) => projectIds.has(id));
    });
  });

  /** Step 2: Apply filter rules from FilterService. */
  private readonly ruleFiltered = computed(() => {
    const images = this.projectFiltered();
    const rules = this.filterService.rules();
    if (rules.length === 0) return images;
    return images.filter((img) => this.filterService.matchesClientSide(img, rules));
  });

  /** Step 3: Sort (multi-key, using effectiveSorts which includes grouping keys). */
  private readonly sorted = computed(() => {
    const images = [...this.ruleFiltered()];
    const sorts = this.effectiveSorts();
    if (sorts.length === 0) return images;

    return images.sort((a, b) => {
      for (const sort of sorts) {
        const valA = this.getSortValue(a, sort.key);
        const valB = this.getSortValue(b, sort.key);
        if (valA == null && valB == null) continue;
        if (valA == null) return 1;
        if (valB == null) return -1;

        // Numeric comparison when both values are numbers
        let cmp: number;
        if (typeof valA === 'number' && typeof valB === 'number') {
          cmp = valA - valB;
        } else {
          const strA = String(valA).toLowerCase();
          const strB = String(valB).toLowerCase();
          cmp = strA < strB ? -1 : strA > strB ? 1 : 0;
        }
        if (cmp !== 0) return sort.direction === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  });

  /** Step 4: Group by active groupings (multi-level). */
  readonly groupedSections = computed<GroupedSection[]>(() => {
    const images = this.sorted();
    const groupings = this.activeGroupings();
    if (groupings.length === 0) {
      return [{ heading: '', headingLevel: 0, imageCount: images.length, images }];
    }
    return this.buildGroups(images, groupings, 0);
  });

  /** Total count after all filters applied. */
  readonly totalImageCount = computed(() => this.ruleFiltered().length);

  // ── Public API ───────────────────────────────────────────────────────────

  /** Monotonic counter to discard stale RPC responses on rapid marker clicks. */
  private clusterLoadId = 0;

  /** Load images for a cluster click via the cluster_images RPC. */
  async loadClusterImages(clusterLat: number, clusterLng: number, zoom: number): Promise<void> {
    return this.loadMultiClusterImages([{ lat: clusterLat, lng: clusterLng }], zoom);
  }

  /**
   * Load images from multiple grid-cell centres (when a client-side merge has combined
   * adjacent clusters into one marker). Calls cluster_images for each source cell in
   * parallel, deduplicates by image id, and sets rawImages atomically.
   */
  async loadMultiClusterImages(
    cells: Array<{ lat: number; lng: number }>,
    zoom: number,
  ): Promise<void> {
    const requestId = ++this.clusterLoadId;
    this.selectionActive.set(true);
    this.isLoading.set(true);
    try {
      const images = await this.fetchClusterImages(cells, zoom);
      if (requestId !== this.clusterLoadId) return;

      this.rawImages.set(images);
      if (images.length > 0) {
        this.resolveUnresolvedAddresses(images);
        void this.batchSignThumbnails(images);
        void this.loadImageMetadata(images);
      }
    } finally {
      if (requestId === this.clusterLoadId) {
        this.isLoading.set(false);
      }
    }
  }

  /**
   * Fetch images for one or more cluster cells and return a deduplicated list.
   * Used by marker-click loading and radius-based selections.
   */
  async fetchClusterImages(
    cells: Array<{ lat: number; lng: number }>,
    zoom: number,
  ): Promise<WorkspaceImage[]> {
    if (cells.length === 0) return [];

    if (cells.length > 1) {
      const { data, error } = await this.supabase.client.rpc('cluster_images_multi', {
        p_cells: cells,
        p_zoom: zoom,
      });

      if (!error && Array.isArray(data)) {
        const seen = new Set<string>();
        const images: WorkspaceImage[] = [];
        for (const row of data as RawClusterRow[]) {
          if (seen.has(row.image_id)) continue;
          seen.add(row.image_id);
          images.push(mapClusterRow(row));
        }
        return images;
      }
      // Fallback to per-cell RPCs if the batch RPC is unavailable.
    }

    const results = await Promise.all(
      cells.map((cell) =>
        this.supabase.client.rpc('cluster_images', {
          p_cluster_lat: cell.lat,
          p_cluster_lng: cell.lng,
          p_zoom: zoom,
        }),
      ),
    );

    const seen = new Set<string>();
    const images: WorkspaceImage[] = [];

    for (const { data, error } of results) {
      if (error || !Array.isArray(data)) continue;

      for (const row of data as RawClusterRow[]) {
        if (seen.has(row.image_id)) continue;
        seen.add(row.image_id);
        images.push(mapClusterRow(row));
      }
    }

    return images;
  }

  /** Set images directly (e.g. from a radius selection). */
  setActiveSelectionImages(images: WorkspaceImage[]): void {
    this.selectionActive.set(true);
    this.rawImages.set(images);
    this.resolveUnresolvedAddresses(images);
    void this.batchSignThumbnails(images);
    void this.loadImageMetadata(images);
  }

  /** Load and map images by explicit IDs while preserving the input order. */
  async loadImagesByIdsOrdered(imageIds: string[]): Promise<WorkspaceImage[]> {
    const uniqueIds = Array.from(new Set(imageIds.filter((id) => !!id)));
    if (uniqueIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase.client
      .from('images')
      .select(
        'id, latitude, longitude, thumbnail_path, storage_path, captured_at, created_at, project_id, direction, exif_latitude, exif_longitude, address_label, city, district, street, country, user_id',
      )
      .in('id', uniqueIds);

    if (error) {
      throw new Error(error.message);
    }

    const rows = Array.isArray(data) ? (data as RawSharedImageRow[]) : [];
    if (rows.length === 0) {
      return [];
    }

    const userIds = Array.from(
      new Set(rows.map((row) => row.user_id).filter((id): id is string => !!id)),
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

    const membershipByImageId = new Map<string, Array<{ id: string; name: string | null }>>();
    const { data: membershipsData, error: membershipsError } = await this.supabase.client
      .from('image_projects')
      .select('image_id, project_id, projects(name)')
      .in('image_id', uniqueIds);

    if (!membershipsError && Array.isArray(membershipsData)) {
      for (const row of membershipsData as RawImageProjectMembershipRow[]) {
        const bucket = membershipByImageId.get(row.image_id) ?? [];
        const relatedProject = Array.isArray(row.projects) ? row.projects[0] : row.projects;
        bucket.push({
          id: row.project_id,
          name: relatedProject?.name ?? null,
        });
        membershipByImageId.set(row.image_id, bucket);
      }
    }

    const fallbackProjectIds = Array.from(
      new Set(rows.map((row) => row.project_id).filter((id): id is string => !!id)),
    );
    const fallbackProjectNameById = new Map<string, string>();

    if (fallbackProjectIds.length > 0) {
      const { data: projectsData, error: projectsError } = await this.supabase.client
        .from('projects')
        .select('id, name')
        .in('id', fallbackProjectIds);

      if (!projectsError && Array.isArray(projectsData)) {
        for (const project of projectsData as Array<{ id: string; name: string }>) {
          fallbackProjectNameById.set(project.id, project.name);
        }
      }
    }

    const imageById = new Map<string, WorkspaceImage>();
    for (const row of rows) {
      if (
        typeof row.latitude !== 'number' ||
        !Number.isFinite(row.latitude) ||
        typeof row.longitude !== 'number' ||
        !Number.isFinite(row.longitude)
      ) {
        continue;
      }

      const memberships = membershipByImageId.get(row.id) ?? [];
      memberships.sort((a, b) => {
        const aName = (a.name ?? '').toLowerCase();
        const bName = (b.name ?? '').toLowerCase();
        return aName < bName ? -1 : aName > bName ? 1 : 0;
      });

      const projectIds = memberships.map((entry) => entry.id);
      const projectNames = memberships.map((entry) => entry.name ?? '').filter((name) => !!name);
      const fallbackProjectName = row.project_id
        ? (fallbackProjectNameById.get(row.project_id) ?? null)
        : null;
      const primaryProjectId = projectIds[0] ?? row.project_id;
      const primaryProjectName = projectNames[0] ?? fallbackProjectName;

      imageById.set(row.id, {
        id: row.id,
        latitude: row.latitude,
        longitude: row.longitude,
        thumbnailPath: row.thumbnail_path,
        storagePath: row.storage_path,
        capturedAt: row.captured_at,
        createdAt: row.created_at,
        projectId: primaryProjectId,
        projectName: primaryProjectName,
        projectIds,
        projectNames,
        direction: row.direction,
        exifLatitude: row.exif_latitude,
        exifLongitude: row.exif_longitude,
        addressLabel: row.address_label,
        city: row.city,
        district: row.district,
        street: row.street,
        country: row.country,
        userName: row.user_id ? (profileNameById.get(row.user_id) ?? null) : null,
      });
    }

    const ordered: WorkspaceImage[] = [];
    for (const id of imageIds) {
      const image = imageById.get(id);
      if (image) {
        ordered.push(image);
      }
    }

    return ordered;
  }

  /** Convenience: "select" state populated but holding zero rows (RPC returned nothing). */
  readonly emptySelection = computed(
    () => this.selectionActive() && !this.isLoading() && this.rawImages().length === 0,
  );

  /** Clear active selection data only — preserves toolbar settings (sort, filters, project, grouping). */
  clearActiveSelection(): void {
    this.rawImages.set([]);
    this.selectionActive.set(false);
    this.collapsedGroups.set(new Set());
  }

  /** Clear active selection AND reset all toolbar settings to defaults. */
  clearActiveSelectionAndSettings(): void {
    this.rawImages.set([]);
    this.selectionActive.set(false);
    this.selectedProjectIds.set(new Set());
    this.filterService.clearAll();
    this.activeSorts.set(DEFAULT_SORTS);
    this.activeGroupings.set([]);
    this.collapsedGroups.set(new Set());
  }

  toggleGroupCollapsed(groupKey: string): void {
    this.collapsedGroups.update((set) => {
      const next = new Set(set);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }

  setThumbnailSizePreset(preset: ThumbnailSizePreset): void {
    this.thumbnailSizePreset.set(preset);
    this.persistThumbnailSizePreset(preset);
  }

  /** Batch-sign thumbnail URLs for a set of images. */
  async batchSignThumbnails(images: WorkspaceImage[]): Promise<void> {
    const unsigned = images.filter((img) => !img.signedThumbnailUrl && !img.thumbnailUnavailable);
    if (unsigned.length === 0) return;

    // Mark images with no storage path and no thumbnail as 'no-photo'
    const noPhoto = unsigned.filter((img) => !img.storagePath && !img.thumbnailPath);
    for (const img of noPhoto) {
      this.photoLoad.markNoPhoto(img.id);
    }

    const items = unsigned
      .filter((img) => img.storagePath || img.thumbnailPath)
      .map((img) => ({
        id: img.id,
        storagePath: img.storagePath,
        thumbnailPath: img.thumbnailPath,
      }));

    const results = await this.photoLoad.batchSign(items, 'thumb');
    const attemptedIds = new Set(unsigned.map((img) => img.id));

    // Update signal: apply URLs or mark unavailable.
    this.rawImages.update((all) =>
      all.map((img) => {
        const result = results.get(img.id);
        if (result?.url) return { ...img, signedThumbnailUrl: result.url };
        if (attemptedIds.has(img.id) && !img.signedThumbnailUrl) {
          return { ...img, thumbnailUnavailable: true };
        }
        return img;
      }),
    );
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Delegate location resolution to LocationResolverService.
   * Resolved addresses are patched into the local signal for immediate UI update.
   */
  private async resolveUnresolvedAddresses(images: WorkspaceImage[]): Promise<void> {
    const results = await this.locationResolver.resolveOnDemand(images);
    if (results.size === 0) return;

    this.rawImages.update((all) =>
      all.map((existing) => {
        const resolved = results.get(existing.id);
        return resolved
          ? {
              ...existing,
              addressLabel: resolved.addressLabel,
              city: resolved.city,
              district: resolved.district,
              street: resolved.street,
              country: resolved.country,
            }
          : existing;
      }),
    );
  }

  /**
   * Load the organization's custom property definitions from the metadata_keys
   * table and register them in the PropertyRegistryService so they appear in
   * sort / group / filter dropdowns.
   */
  async loadCustomProperties(): Promise<void> {
    const { data, error } = await this.supabase.client.from('metadata_keys').select('id, key_name');

    if (error || !data || data.length === 0) return;

    this.registry.setCustomProperties(
      (data as Array<{ id: string; key_name: string }>).map((k) => ({
        id: k.id,
        key_name: k.key_name,
        key_type: 'text',
      })),
    );
  }

  private getSortValue(img: WorkspaceImage, key: string): string | number | null {
    return this.registry.getSortValue(img, key);
  }

  private getGroupValue(img: WorkspaceImage, propertyId: string): string {
    return this.registry.getGroupValue(img, propertyId);
  }

  /**
   * Load custom property values (image_metadata) for a batch of images.
   * Patches the metadata map onto each WorkspaceImage in the signal.
   */
  private async loadImageMetadata(images: WorkspaceImage[]): Promise<void> {
    const imageIds = images.map((img) => img.id);
    if (imageIds.length === 0) return;

    const { data, error } = await this.supabase.client
      .from('image_metadata')
      .select('image_id, metadata_key_id, value_text')
      .in('image_id', imageIds);

    if (error || !data || data.length === 0) return;

    // Build map: imageId → { metadataKeyId → value }
    const metadataMap = new Map<string, Record<string, string>>();
    for (const row of data as Array<{
      image_id: string;
      metadata_key_id: string;
      value_text: string;
    }>) {
      let entry = metadataMap.get(row.image_id);
      if (!entry) {
        entry = {};
        metadataMap.set(row.image_id, entry);
      }
      entry[row.metadata_key_id] = row.value_text;
    }

    // Patch metadata onto images
    this.rawImages.update((all) =>
      all.map((img) => {
        const meta = metadataMap.get(img.id);
        return meta ? { ...img, metadata: { ...img.metadata, ...meta } } : img;
      }),
    );
  }

  private buildGroups(
    images: WorkspaceImage[],
    groupings: PropertyRef[],
    level: number,
  ): GroupedSection[] {
    if (groupings.length === 0) {
      return [{ heading: '', headingLevel: level, imageCount: images.length, images }];
    }

    const [current, ...rest] = groupings;
    const buckets = new Map<string, WorkspaceImage[]>();

    for (const img of images) {
      const key = this.getGroupValue(img, current.id);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.push(img);
      } else {
        buckets.set(key, [img]);
      }
    }

    const sections: GroupedSection[] = [];
    for (const [heading, groupImages] of buckets) {
      const section: GroupedSection = {
        heading,
        headingLevel: level,
        imageCount: groupImages.length,
        images: rest.length === 0 ? groupImages : [],
      };
      if (rest.length > 0) {
        section.subGroups = this.buildGroups(groupImages, rest, level + 1);
        section.imageCount = groupImages.length;
      }
      sections.push(section);
    }

    return sections;
  }

  private readThumbnailSizePreset(): ThumbnailSizePreset {
    if (typeof window === 'undefined') return 'medium';
    const raw = window.localStorage.getItem(THUMBNAIL_SIZE_PRESET_STORAGE_KEY);
    if (!raw) return 'medium';
    if (raw === 'hero') return 'large';
    return THUMBNAIL_SIZE_PRESETS.includes(raw as ThumbnailSizePreset)
      ? (raw as ThumbnailSizePreset)
      : 'medium';
  }

  private persistThumbnailSizePreset(preset: ThumbnailSizePreset): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(THUMBNAIL_SIZE_PRESET_STORAGE_KEY, preset);
  }
}

// ── RPC row mapping ──────────────────────────────────────────────────────────

interface RawClusterRow {
  image_id: string;
  latitude: number;
  longitude: number;
  thumbnail_path: string | null;
  storage_path: string | null;
  captured_at: string | null;
  created_at: string;
  project_id: string | null;
  project_name: string | null;
  project_ids: string[] | null;
  project_names: string[] | null;
  direction: number | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
  address_label: string | null;
  city: string | null;
  district: string | null;
  street: string | null;
  country: string | null;
  user_name: string | null;
}

interface RawSharedImageRow {
  id: string;
  latitude: number | null;
  longitude: number | null;
  thumbnail_path: string | null;
  storage_path: string | null;
  captured_at: string | null;
  created_at: string;
  project_id: string | null;
  direction: number | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
  address_label: string | null;
  city: string | null;
  district: string | null;
  street: string | null;
  country: string | null;
  user_id: string | null;
}

interface RawImageProjectMembershipRow {
  image_id: string;
  project_id: string;
  projects: { name: string | null } | Array<{ name: string | null }> | null;
}

function mapClusterRow(row: RawClusterRow): WorkspaceImage {
  const membershipIds = Array.isArray(row.project_ids) ? row.project_ids : [];
  const membershipNames = Array.isArray(row.project_names) ? row.project_names : [];

  return {
    id: row.image_id,
    latitude: row.latitude,
    longitude: row.longitude,
    thumbnailPath: row.thumbnail_path,
    storagePath: row.storage_path,
    capturedAt: row.captured_at,
    createdAt: row.created_at,
    projectId: row.project_id,
    projectName: row.project_name,
    projectIds: membershipIds,
    projectNames: membershipNames,
    direction: row.direction,
    exifLatitude: row.exif_latitude,
    exifLongitude: row.exif_longitude,
    addressLabel: row.address_label,
    city: row.city,
    district: row.district,
    street: row.street,
    country: row.country,
    userName: row.user_name,
  };
}
