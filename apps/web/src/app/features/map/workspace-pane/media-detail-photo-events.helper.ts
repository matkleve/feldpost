import { WritableSignal } from '@angular/core';
import {
  ImageAttachedEvent,
  ImageReplacedEvent,
} from '../../../core/upload/upload-manager.service';
import { MediaDownloadService } from '../../../core/media-download/media-download.service';
import { ToastService } from '../../../core/toast/toast.service';
import { WorkspaceViewService } from '../../../core/workspace-view/workspace-view.service';
import { ImageRecord } from './media-detail-view.types';

type DetailTranslateFn = (key: string, fallback: string) => string;

interface ImageDetailPhotoEventsHelperDeps {
  services: {
    photoLoad: MediaDownloadService;
    workspaceView: WorkspaceViewService;
    toastService: ToastService;
  };
  signals: {
    image: WritableSignal<ImageRecord | null>;
    fullResPreloaded: WritableSignal<boolean>;
    activeJobId: WritableSignal<string | null>;
  };
  callbacks: {
    reloadSignedUrlsForCurrentMedia: () => Promise<void>;
    t: DetailTranslateFn;
  };
}

export class ImageDetailPhotoEventsHelper {
  constructor(private readonly deps: ImageDetailPhotoEventsHelperDeps) {}

  async handleImageReplaced(event: ImageReplacedEvent): Promise<void> {
    console.log('[detail-view] handleImageReplaced received:', event);

    this.deps.signals.image.update((prev) =>
      prev ? { ...prev, storage_path: event.newStoragePath, thumbnail_path: null } : prev,
    );
    this.deps.signals.fullResPreloaded.set(false);
    this.deps.signals.activeJobId.set(null);

    this.deps.services.photoLoad.invalidate(event.imageId);
    await this.deps.callbacks.reloadSignedUrlsForCurrentMedia();

    if (event.localObjectUrl) {
      URL.revokeObjectURL(event.localObjectUrl);
    }

    this.updateGridCache(event.imageId, event.newStoragePath);
    this.deps.services.toastService.show({
      message: this.deps.callbacks.t('workspace.imageDetail.toast.photoReplaced', 'Photo replaced'),
      type: 'success',
    });
  }

  async handleImageAttached(event: ImageAttachedEvent): Promise<void> {
    console.log('[detail-view] handleImageAttached received:', event);

    this.deps.signals.image.update((prev) => {
      console.log('[detail-view] updating image record: storage_path =', event.newStoragePath);
      return prev ? { ...prev, storage_path: event.newStoragePath, thumbnail_path: null } : prev;
    });
    this.deps.signals.fullResPreloaded.set(false);
    this.deps.signals.activeJobId.set(null);

    this.deps.services.photoLoad.invalidate(event.imageId);
    await this.deps.callbacks.reloadSignedUrlsForCurrentMedia();

    if (event.localObjectUrl) {
      URL.revokeObjectURL(event.localObjectUrl);
    }

    this.updateGridCache(event.imageId, event.newStoragePath);
    this.deps.services.toastService.show({
      message: this.deps.callbacks.t('workspace.imageDetail.toast.photoAttached', 'Photo attached'),
      type: 'success',
    });
  }

  private updateGridCache(imageId: string, newStoragePath: string): void {
    this.deps.services.workspaceView.rawImages.update((all) =>
      all.map((wi) =>
        wi.id === imageId
          ? {
              ...wi,
              storagePath: newStoragePath,
              thumbnailPath: null,
              signedThumbnailUrl: undefined,
              thumbnailUnavailable: false,
            }
          : wi,
      ),
    );
    const updated = this.deps.services.workspaceView.rawImages().filter((wi) => wi.id === imageId);
    if (updated.length > 0) {
      void this.deps.services.workspaceView.batchSignThumbnails(updated);
    }
  }
}
