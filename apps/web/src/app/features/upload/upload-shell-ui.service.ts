import { Injectable, computed, inject, signal } from '@angular/core';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import type { ExifCoords } from '../../core/upload/upload.types';
import { UPLOAD_DEV_FLAGS } from './upload-dev-flags';
import { getLaneForJob } from './upload-phase.helpers';
import type { UploadPanelComponent } from './upload-panel.component';

/** Global upload shell open state + placement bridge (map shell, all authenticated routes). */
@Injectable()
export class UploadShellUiService {
  private readonly uploadManager = inject(UploadManagerService);

  private placementPanel: UploadPanelComponent | null = null;

  readonly uploadPanelPinned = signal(false);
  readonly uploadPanelOpen = this.uploadPanelPinned.asReadonly();

  readonly uploadBatch = this.uploadManager.activeBatch;
  readonly uploadBatchProgress = computed(() => this.uploadBatch()?.overallProgress ?? 0);
  readonly uploadBatchActive = computed(() => {
    const batch = this.uploadBatch();
    return !!batch && (batch.status === 'uploading' || batch.status === 'scanning');
  });
  readonly uploadResolverPending = computed(
    () => this.uploadBatch()?.pendingDisambiguationCount ?? 0,
  );
  readonly showUploadDock = computed(
    () =>
      UPLOAD_DEV_FLAGS.dockAlwaysVisible ||
      this.uploadPanelOpen() ||
      this.uploadResolverPending() > 0,
  );
  readonly uploadResolverTrayActive = computed(
    () => UPLOAD_DEV_FLAGS.dockAlwaysVisible || this.uploadResolverPending() > 0,
  );
  readonly uploadHasIssues = computed(() =>
    this.uploadManager.jobs().some((job) => getLaneForJob(job) === 'issues'),
  );

  toggleUploadPanel(): void {
    this.uploadPanelPinned.update((open) => !open);
  }

  closeUploadPanel(): void {
    this.uploadPanelPinned.set(false);
  }

  openUploadPanel(): void {
    this.uploadPanelPinned.set(true);
  }

  bindUploadPanel(panel: UploadPanelComponent | undefined): void {
    this.placementPanel = panel ?? null;
  }

  placeFile(key: string, coords: ExifCoords): void {
    this.placementPanel?.placeFile(key, coords);
  }
}
