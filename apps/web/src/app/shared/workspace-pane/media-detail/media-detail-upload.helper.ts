import type { WritableSignal } from '@angular/core';
import type { UploadService } from '../../../core/upload/upload.service';
import type {
  UploadFailedEvent,
  UploadManagerService,
} from '../../../core/upload/upload-manager.service';
import {
  formatUploadFailureMessage,
  uploadFailureMessageToToastText,
} from '../../../core/upload/upload-error-messages.util';
import type { ImageRecord } from './media-detail-view.types';

interface MediaDetailUploadHelperDeps {
  services: {
    uploadService: UploadService;
    uploadManager: UploadManagerService;
  };
  signals: {
    media: WritableSignal<ImageRecord | null>;
    replaceError: WritableSignal<string | null>;
    activeJobId: WritableSignal<string | null>;
  };
  callbacks: {
    findJobForFailure: (event: UploadFailedEvent) => boolean;
  };
}

export class MediaDetailUploadHelper {
  constructor(private readonly deps: MediaDetailUploadHelperDeps) {}

  onFileSelected(event: Event | File): void {
    const file =
      event instanceof File
        ? event
        : ((event.target as HTMLInputElement | null)?.files?.[0] ?? null);
    if (!file) return;

    const media = this.deps.signals.media();
    if (!media) return;

    const validation = this.deps.services.uploadService.validateFile(file);
    if (!validation.valid) {
      this.deps.signals.replaceError.set(validation.error!);
      return;
    }

    this.deps.signals.replaceError.set(null);
    const jobId = media.storage_path
      ? this.deps.services.uploadManager.replaceFile(media.id, file)
      : this.deps.services.uploadManager.attachFile(media.id, file);
    this.deps.signals.activeJobId.set(jobId);
  }

  shouldHandleUploadFailure(event: UploadFailedEvent): boolean {
    return this.deps.callbacks.findJobForFailure(event);
  }

  handleUploadFailed(event: UploadFailedEvent): string {
    const message = uploadFailureMessageToToastText(formatUploadFailureMessage(event.error));
    this.deps.signals.replaceError.set(message);
    this.deps.signals.activeJobId.set(null);
    return message;
  }
}
