import { WritableSignal } from '@angular/core';
import { ImageDetailProjectMembershipHelper } from './image-detail-project-membership.helper';
import { PhotoLoadService } from '../../../core/photo-load.service';
import { SupabaseService } from '../../../core/supabase.service';
import { ImageRecord, MetadataEntry, SelectOption } from './image-detail-view.types';
import {
  isImageLikeMedia,
  mapImageMetadataRows,
  resolvePreviewThumbnailPath,
} from './image-detail-view.utils';

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
  };
}

export class ImageDetailDataFacade {
  constructor(private readonly deps: ImageDetailDataFacadeDeps) {}

  async loadImage(id: string, abortSignal: AbortSignal): Promise<void> {
    this.deps.signals.loading.set(true);
    this.deps.signals.error.set(null);
    this.deps.signals.fullResPreloaded.set(false);
    this.deps.signals.fullResUrl.set(null);
    this.deps.signals.thumbnailUrl.set(null);

    const [imageResult, metaResult] = await Promise.all([
      this.deps.services.supabase.client.from('images').select('*').eq('id', id).single(),
      this.deps.services.supabase.client
        .from('image_metadata')
        .select('metadata_key_id, value_text, metadata_keys(key_name)')
        .eq('image_id', id),
    ]);

    if (abortSignal.aborted) return;

    if (imageResult.error) {
      this.deps.signals.error.set(imageResult.error.message);
      this.deps.signals.loading.set(false);
      return;
    }

    const image = imageResult.data as ImageRecord;
    this.deps.signals.image.set(image);
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

    if (isImageAsset && fullResult.url) {
      const preloaded = await this.deps.services.photoLoad.preload(fullResult.url);
      if (!abortSignal.aborted) {
        this.deps.signals.fullResPreloaded.set(preloaded);
      }
    }
  }

  async loadProjects(organizationId: string): Promise<void> {
    const { data } = await this.deps.services.supabase.client
      .from('projects')
      .select('id, name')
      .eq('organization_id', organizationId)
      .order('name');

    if (data) {
      this.deps.signals.projectOptions.set(data.map((p: any) => ({ id: p.id, label: p.name })));
    }
  }

  async loadMetadataKeys(organizationId: string): Promise<void> {
    const { data } = await this.deps.services.supabase.client
      .from('metadata_keys')
      .select('key_name')
      .eq('organization_id', organizationId)
      .order('key_name');

    if (data) {
      this.deps.signals.allMetadataKeyNames.set(data.map((k: any) => k.key_name as string));
    }
  }
}
