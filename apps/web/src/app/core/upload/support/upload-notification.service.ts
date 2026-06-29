import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from '../../toast/toast.service';
import { buildUploadFailureToast } from './upload-error-messages.util';
import { buildBatchSummaryToast } from './upload-batch-summary.util';
import { UploadManagerService, type UploadFailedEvent } from '../upload-manager.service';

@Injectable({ providedIn: 'root' })
export class UploadNotificationService {
  private readonly uploadManager = inject(UploadManagerService);
  private readonly toast = inject(ToastService);

  constructor() {
    this.uploadManager.uploadFailed$
      .pipe(takeUntilDestroyed())
      .subscribe((event: UploadFailedEvent) => {
        this.toast.show(
          buildUploadFailureToast(event.error, {
            file: 'upload-notification.service.ts',
            fn: 'uploadFailed$',
          }),
        );
      });

    // Calm one-line recap when a batch finishes with dedup/merge/failures.
    this.uploadManager.batchComplete$.pipe(takeUntilDestroyed()).subscribe((event) => {
      const summary = buildBatchSummaryToast(event);
      if (summary) {
        this.toast.show(summary);
      }
    });
  }
}
