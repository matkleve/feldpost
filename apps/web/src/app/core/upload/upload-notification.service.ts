import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../toast/toast.service';
import { UploadManagerService, type UploadFailedEvent } from './upload-manager.service';

@Injectable({ providedIn: 'root' })
export class UploadNotificationService {
  private readonly uploadManager = inject(UploadManagerService);
  private readonly toast = inject(ToastService);

  constructor() {
    this.uploadManager.uploadFailed$
      .pipe(takeUntilDestroyed())
      .subscribe((event: UploadFailedEvent) => {
        this.toast.show({
          message: this.toFailureMessage(event),
          type: 'error',
          dedupe: true,
        });
      });
  }

  private toFailureMessage(event: UploadFailedEvent): string {
    const message = event.error?.trim();
    if (message) {
      return `Upload failed: ${message}`;
    }
    return 'Upload failed. Please try again.';
  }
}
