import type { WritableSignal } from '@angular/core';
import type { ImageDetailProjectMembershipHelper } from '../../shared/workspace-pane/media-detail/media-detail-project-membership.helper';
import type { MediaTier } from '../media/media-renderer.types';
import type { MediaDownloadService } from '../media-download/media-download.service';
import type { SupabaseService } from '../supabase/supabase.service';
import type { MetadataService } from '../metadata/metadata.service';
import type { AddressFieldMeta } from '../address-field-suggest/address-field-suggest.types';
import type {
  ImageRecord,
  MetadataEntry,
  MetadataKeyDefinitionView,
  SelectOption,
} from '../../shared/workspace-pane/media-detail/media-detail-view.types';
import {
  isImageLikeMedia,
  resolvePreviewThumbnailPath,
} from '../../shared/workspace-pane/media-detail/media-detail-view.utils';
import {
  MEDIA_ITEM_DETAIL_SELECT_BASE,
  MEDIA_ITEM_DETAIL_SELECT_WITH_META,
  MEDIA_ITEM_LOCATION_SELECT_BASE,
  MEDIA_ITEM_LOCATION_SELECT_WITH_META,
  isMissingAddressFieldMetaColumn,
} from './media-detail-data.helpers';

interface MediaDetailRow {
  id: string;
  source_image_id: string | null;
  organization_id: string | null;
  created_by: string | null;
  storage_path: string | null;
  thumbnail_path: string | null;
  original_filename: string | null;
  latitude: number | null;
  longitude: number | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
  captured_at: string | null;
  created_at: string;
  mime_type: string | null;
  gps_assignment_allowed: boolean | null;
  location_status:
    | 'pending'
    | 'resolved'
    | 'unresolvable'
    | 'gps'
    | 'no_gps'
    | 'unresolved'
    | null;
  address_label: string | null;
  street: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  address_field_meta: AddressFieldMeta | null;
}

interface ProjectRow {
  id: string;
  name: string;
}

interface MediaDetailDataFacadeDeps {
  services: {
    supabase: SupabaseService;
    metadata: MetadataService;
    mediaDownloadService: MediaDownloadService;
    projectMemberships: ImageDetailProjectMembershipHelper;
  };
  signals: {
    media: WritableSignal<ImageRecord | null>;
    metadata: WritableSignal<MetadataEntry[]>;
    loading: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    fullResPreloaded: WritableSignal<boolean>;
    fullResUrl: WritableSignal<string | null>;
    thumbnailUrl: WritableSignal<string | null>;
    projectOptions: WritableSignal<SelectOption[]>;
    metadataKeyDefinitions: WritableSignal<MetadataKeyDefinitionView[]>;
  };
  computed: {
    mediaType: () => string | null;
    mediaMimeType: () => string | null;
    detailTier: () => MediaTier;
  };
}

export class MediaDetailDataFacade {
  constructor(private readonly deps: MediaDetailDataFacadeDeps) {}

  /**
   * Merges location/address columns into the current detail media row without full-pane reload.
   * Does not touch loading state, metadata, URLs, or projects.
   */
  async refreshMediaLocationFields(
    id: string,
    abortSignal: AbortSignal,
  ): Promise<{ applied: boolean; locationStatus: string | null }> {
    const media = await this.loadLocationRow(id);
    if (abortSignal.aborted || !media) {
      return { applied: false, locationStatus: null };
    }

    const legacyImageId = media.source_image_id ?? media.id;
    const patch = this.toImageRecord(media, legacyImageId);
    const current = this.deps.signals.media();
    const matchesCurrent =
      !!current &&
      (current.id === legacyImageId ||
        current.id === media.id ||
        current.id === id ||
        id === legacyImageId ||
        id === media.id);
    if (!matchesCurrent) {
      return { applied: false, locationStatus: null };
    }

    this.deps.signals.media.set({
      ...current,
      latitude: patch.latitude,
      longitude: patch.longitude,
      address_label: patch.address_label,
      street: patch.street,
      city: patch.city,
      district: patch.district,
      country: patch.country,
      location_unresolved: patch.location_unresolved,
      gps_assignment_allowed: patch.gps_assignment_allowed,
      address_field_meta: patch.address_field_meta ?? current.address_field_meta,
    });

    return { applied: true, locationStatus: media.location_status };
  }

  async loadMedia(id: string, abortSignal: AbortSignal): Promise<void> {
    this.resetLoadState();

    const mediaRow = await this.loadMediaRow(id);
    if (abortSignal.aborted) return;
    if (!mediaRow) return;

    const legacyImageId = mediaRow.source_image_id ?? mediaRow.id;
    const record = this.toImageRecord(mediaRow, legacyImageId);
    const metadataEntries = await this.deps.services.metadata.loadMetadataEntriesForMediaItem(
      mediaRow.id,
    );

    this.deps.signals.media.set(record);
    this.deps.signals.error.set(null);
    this.deps.signals.loading.set(false);
    this.deps.signals.metadata.set(metadataEntries);

    if (record.storage_path) {
      void this.loadSignedUrls(record, abortSignal);
    } else {
      this.deps.services.mediaDownloadService.markNoMedia(record.id);
    }

    await this.deps.services.projectMemberships.loadProjectMemberships(id, record.project_id);

    if (record.organization_id) {
      void this.loadProjects(record.organization_id);
      void this.loadMetadataKeyDefinitions(record.organization_id);
    }
  }

  async loadSignedUrls(img: ImageRecord, abortSignal: AbortSignal): Promise<void> {
    if (!img.storage_path) return;

    const isImageAsset = isImageLikeMedia(
      this.deps.computed.mediaType(),
      this.deps.computed.mediaMimeType(),
      img.storage_path,
    );
    const thumbPath = resolvePreviewThumbnailPath(img.thumbnail_path, img.storage_path);
    const fullPath = isImageAsset ? img.storage_path : null;

    const [thumbResult, fullResult] = await Promise.all([
      thumbPath
        ? this.deps.services.mediaDownloadService.getSignedUrl(thumbPath, 'thumb', img.id)
        : Promise.resolve({ url: null }),
      fullPath
        ? this.deps.services.mediaDownloadService.getSignedUrl(fullPath, 'full', img.id)
        : Promise.resolve({ url: null }),
    ]);

    if (abortSignal.aborted) return;

    this.deps.signals.thumbnailUrl.set(thumbResult.url);
    this.deps.signals.fullResUrl.set(fullResult.url);

    const shouldPreloadFull = this.shouldPreloadFull(this.deps.computed.detailTier());
    if (isImageAsset && fullResult.url && shouldPreloadFull) {
      const preloaded = await this.deps.services.mediaDownloadService.preload(fullResult.url);
      if (!abortSignal.aborted) {
        this.deps.signals.fullResPreloaded.set(preloaded);
      }
    } else {
      this.deps.signals.fullResPreloaded.set(false);
    }
  }

  private shouldPreloadFull(tier: MediaTier): boolean {
    return tier === 'large' || tier === 'full';
  }

  async loadProjects(organizationId: string): Promise<void> {
    const { data } = await this.deps.services.supabase.client
      .from('projects')
      .select('id, name')
      .eq('organization_id', organizationId)
      .order('name');

    if (data) {
      this.deps.signals.projectOptions.set(
        (data as ProjectRow[]).map((project) => ({ id: project.id, label: project.name })),
      );
    }
  }

  async loadMetadataKeyDefinitions(organizationId: string): Promise<void> {
    const definitions =
      await this.deps.services.metadata.listMetadataKeyDefinitionsForOrganization(organizationId);
    this.deps.signals.metadataKeyDefinitions.set(definitions);
  }

  private resetLoadState(): void {
    this.deps.signals.loading.set(true);
    this.deps.signals.error.set(null);
    this.deps.signals.fullResPreloaded.set(false);
    this.deps.signals.fullResUrl.set(null);
    this.deps.signals.thumbnailUrl.set(null);
  }

  private async loadLocationRow(id: string): Promise<MediaDetailRow | null> {
    const fetchRow = (columns: string) =>
      this.deps.services.supabase.client
        .from('media_items')
        .select(columns)
        .or(`id.eq.${id},source_image_id.eq.${id}`)
        .limit(1)
        .maybeSingle();

    let mediaResult = await fetchRow(MEDIA_ITEM_LOCATION_SELECT_WITH_META);
    if (mediaResult.error && isMissingAddressFieldMetaColumn(mediaResult.error.message)) {
      mediaResult = await fetchRow(MEDIA_ITEM_LOCATION_SELECT_BASE);
    }

    if (mediaResult.error || !mediaResult.data) {
      return null;
    }

    const row = mediaResult.data as unknown as MediaDetailRow;
    return {
      ...row,
      address_field_meta: row.address_field_meta ?? null,
    };
  }

  private async loadMediaRow(id: string): Promise<MediaDetailRow | null> {
    const fetchRow = (columns: string) =>
      this.deps.services.supabase.client
        .from('media_items')
        .select(columns)
        .or(`id.eq.${id},source_image_id.eq.${id}`)
        .limit(1)
        .maybeSingle();

    let mediaResult = await fetchRow(MEDIA_ITEM_DETAIL_SELECT_WITH_META);

    if (mediaResult.error && isMissingAddressFieldMetaColumn(mediaResult.error.message)) {
      mediaResult = await fetchRow(MEDIA_ITEM_DETAIL_SELECT_BASE);
    }

    if (mediaResult.error || !mediaResult.data) {
      this.deps.signals.error.set(mediaResult.error?.message ?? 'Media not found');
      this.deps.signals.loading.set(false);
      return null;
    }

    const row = mediaResult.data as unknown as MediaDetailRow;

    return {
      ...row,
      address_field_meta: row.address_field_meta ?? null,
    };
  }

  private toImageRecord(media: MediaDetailRow, legacyImageId: string): ImageRecord {
    const unresolved = media.location_status === 'pending' || media.location_status === 'no_gps';

    return {
      id: legacyImageId,
      user_id: media.created_by ?? '',
      organization_id: media.organization_id,
      project_id: null,
      storage_path: media.storage_path,
      thumbnail_path: media.thumbnail_path,
      original_filename: media.original_filename,
      latitude: media.latitude,
      longitude: media.longitude,
      exif_latitude: media.exif_latitude,
      exif_longitude: media.exif_longitude,
      captured_at: media.captured_at,
      has_time: media.captured_at !== null,
      created_at: media.created_at,
      address_label: media.address_label,
      street: media.street,
      city: media.city,
      district: media.district,
      country: media.country,
      direction: null,
      location_unresolved: unresolved,
      gps_assignment_allowed: media.gps_assignment_allowed ?? true,
      address_field_meta: media.address_field_meta ?? null,
    };
  }
}
