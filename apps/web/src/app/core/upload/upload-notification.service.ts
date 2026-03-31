/**
 * UploadNotificationService — toast notifications for upload failures.
 *
 * Subscribes to UploadManagerService.uploadFailed$ and displays user-facing
 * error messages via ToastService.
 * 
 * Ground rules:
 *  - Deduped toasts: Multiple identical failures show as single toast (dedupe=true)
 *  - Phase-specific messages: Different failure reasons → different toast text
 *  - User actions: Failures typically require user intervention (retry, place, adjust)
 * 
 * Message mapping:
 *  - 'validating' failure: File type not supported
 *  - 'hashing' failure: Could not read file
 *  - 'dedup_check' failure: Already uploaded (duplicate)
 *  - 'uploading' failure: Network or storage error
 *  - 'saving_record' failure: Database insert failed
 *  - 'resolving_address' failure: Geocoding service unavailable
 */
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
