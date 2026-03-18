import { WritableSignal } from '@angular/core';
import { UploadService } from '../../../core/upload.service';
import {
  UploadFailedEvent,
  UploadManagerService,
} from '../../../core/upload-manager.service';
import { ImageRecord } from './image-detail-view.types';

interface ImageDetailUploadHelperDeps {
  services: {
    uploadService: UploadService;
    uploadManager: UploadManagerService;
  };
  signals: {
    image: WritableSignal<ImageRecord | null>;
    replaceError: WritableSignal<string | null>;
    activeJobId: WritableSignal<string | null>;
  };
  callbacks: {
    findJobForFailure: (event: UploadFailedEvent) => boolean;
  };
}

export class ImageDetailUploadHelper {
  constructor(private readonly deps: ImageDetailUploadHelperDeps) {}

  onFileSelected(event: Event | File): void {
    const file =
      event instanceof File
        ? event
        : ((event.target as HTMLInputElement | null)?.files?.[0] ?? null);
    if (!file) return;

    const image = this.deps.signals.image();
    if (!image) return;

    const validation = this.deps.services.uploadService.validateFile(file);
    if (!validation.valid) {
      this.deps.signals.replaceError.set(validation.error!);
      return;
    }

    this.deps.signals.replaceError.set(null);
    const jobId = image.storage_path
      ? this.deps.services.uploadManager.replaceFile(image.id, file)
      : this.deps.services.uploadManager.attachFile(image.id, file);
    this.deps.signals.activeJobId.set(jobId);
  }

  shouldHandleUploadFailure(event: UploadFailedEvent): boolean {
    return this.deps.callbacks.findJobForFailure(event);
  }

  handleUploadFailed(event: UploadFailedEvent): string {
    this.deps.signals.replaceError.set(event.error);
    this.deps.signals.activeJobId.set(null);
    return event.error;
  }
}
