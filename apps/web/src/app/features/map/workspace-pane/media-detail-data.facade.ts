import type { WritableSignal } from '@angular/core';
import type { ImageDetailProjectMembershipHelper } from './media-detail-project-membership.helper';
import type { MediaTier } from '../../../core/media/media-renderer.types';
import type { PhotoLoadService } from '../../../core/photo-load.service';
import type { SupabaseService } from '../../../core/supabase/supabase.service';
import type { ImageRecord, MetadataEntry, SelectOption } from './media-detail-view.types';
import {
  isImageLikeMedia,
  mapImageMetadataRows,
  resolvePreviewThumbnailPath,
} from './media-detail-view.utils';

interface MediaDetailRow {
  id: string;
  source_image_id: string | null;
  organization_id: string | null;
  created_by: string | null;
  storage_path: string | null;
  thumbnail_path: string | null;
  latitude: number | null;
  longitude: number | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
  captured_at: string | null;
  created_at: string;
  mime_type: string | null;
  location_status: 'gps' | 'no_gps' | 'unresolved' | null;
  address_label: string | null;
  street: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
}

interface ProjectRow {
  id: string;
  name: string;
}

interface MetadataKeyRow {
  key_name: string;
}

interface ImageDetailDataFacadeDeps {
  services: {
    supabase: SupabaseService;
    photoLoad: PhotoLoadService;
    projectMemberships: ImageDetailProjectMembershipHelper;
  };
  signals: {
    image: WritableSignal<ImageRecord | null>;
    metadata: WritableSignal<MetadataEntry[]>;
    loading: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    fullResPreloaded: WritableSignal<boolean>;
    fullResUrl: WritableSignal<string | null>;
    thumbnailUrl: WritableSignal<string | null>;
    projectOptions: WritableSignal<SelectOption[]>;
    allMetadataKeyNames: WritableSignal<string[]>;
  };
  computed: {
    mediaType: () => string | null;
    mediaMimeType: () => string | null;
    detailTier: () => MediaTier;
  };
}

export class ImageDetailDataFacade {
  constructor(private readonly deps: ImageDetailDataFacadeDeps) {}

  async loadImage(id: string, abortSignal: AbortSignal): Promise<void> {
    this.resetLoadState();

    const media = await this.loadMediaRow(id);
    if (abortSignal.aborted) return;
    if (!media) return;

    const legacyImageId = media.source_image_id ?? media.id;
    const image = this.toImageRecord(media, legacyImageId);

    const metaResult = await this.deps.services.supabase.client
      .from('media_metadata')
      .select('metadata_key_id, value_text, metadata_keys(key_name)')
      .eq('media_item_id', media.id);

    this.deps.signals.image.set(image);
    this.deps.signals.error.set(null);
    this.deps.signals.loading.set(false);
    this.deps.signals.metadata.set(mapImageMetadataRows(metaResult.data ?? []));

    if (image.storage_path) {
      void this.loadSignedUrls(image, abortSignal);
    } else {
      this.deps.services.photoLoad.markNoPhoto(image.id);
    }

    await this.deps.services.projectMemberships.loadProjectMemberships(id, image.project_id);

    if (image.organization_id) {
      void this.loadProjects(image.organization_id);
      void this.loadMetadataKeys(image.organization_id);
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
        ? this.deps.services.photoLoad.getSignedUrl(thumbPath, 'thumb', img.id)
        : Promise.resolve({ url: null }),
      fullPath
        ? this.deps.services.photoLoad.getSignedUrl(fullPath, 'full', img.id)
        : Promise.resolve({ url: null }),
    ]);

    if (abortSignal.aborted) return;

    this.deps.signals.thumbnailUrl.set(thumbResult.url);
    this.deps.signals.fullResUrl.set(fullResult.url);

    const shouldPreloadFull = this.shouldPreloadFull(this.deps.computed.detailTier());
    if (isImageAsset && fullResult.url && shouldPreloadFull) {
      const preloaded = await this.deps.services.photoLoad.preload(fullResult.url);
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

  async loadMetadataKeys(organizationId: string): Promise<void> {
    const { data } = await this.deps.services.supabase.client
      .from('metadata_keys')
      .select('key_name')
      .eq('organization_id', organizationId)
      .order('key_name');

    if (data) {
      this.deps.signals.allMetadataKeyNames.set(
        (data as MetadataKeyRow[]).map((metadataKey) => metadataKey.key_name),
      );
    }
  }

  private resetLoadState(): void {
    this.deps.signals.loading.set(true);
    this.deps.signals.error.set(null);
    this.deps.signals.fullResPreloaded.set(false);
    this.deps.signals.fullResUrl.set(null);
    this.deps.signals.thumbnailUrl.set(null);
  }

  private async loadMediaRow(id: string): Promise<MediaDetailRow | null> {
    const mediaResult = await this.deps.services.supabase.client
      .from('media_items')
      .select(
        'id,source_image_id,organization_id,created_by,storage_path,thumbnail_path,latitude,longitude,exif_latitude,exif_longitude,captured_at,created_at,mime_type,location_status,address_label,street,city,district,country',
      )
      .or(`id.eq.${id},source_image_id.eq.${id}`)
      .limit(1)
      .maybeSingle();

    if (mediaResult.error || !mediaResult.data) {
      this.deps.signals.error.set(mediaResult.error?.message ?? 'Media not found');
      this.deps.signals.loading.set(false);
      return null;
    }

    return mediaResult.data as MediaDetailRow;
  }

  private toImageRecord(media: MediaDetailRow, legacyImageId: string): ImageRecord {
    return {
      id: legacyImageId,
      user_id: media.created_by ?? '',
      organization_id: media.organization_id,
      project_id: null,
      storage_path: media.storage_path,
      thumbnail_path: media.thumbnail_path,
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
      location_unresolved: media.location_status === 'unresolved',
    };
  }
}
