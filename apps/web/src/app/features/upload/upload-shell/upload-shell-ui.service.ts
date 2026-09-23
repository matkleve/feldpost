import { Injectable, computed, inject } from '@angular/core';
import { ShellLayoutService } from '../../../core/shell-layout/shell-layout.service';
import { UploadResolverTrayOrchestratorService } from '../../../core/upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.service';
import { UploadManagerService } from '../../../core/upload/upload-manager.service';
import type { ExifCoords } from '../../../core/upload/upload.types';
import { UPLOAD_DEV_FLAGS } from '../upload-dev-flags';
import { getLaneForJob } from '../upload-phase.helpers';
import type { UploadPanelComponent } from '../upload-panel/upload-panel.component';

/** Global upload shell open state + placement bridge (map shell, all authenticated routes). */
@Injectable({ providedIn: 'root' })
export class UploadShellUiService {
  private readonly uploadManager = inject(UploadManagerService);
  private readonly shellLayout = inject(ShellLayoutService);
  private readonly trayOrchestrator = inject(UploadResolverTrayOrchestratorService);

  private placementPanel: UploadPanelComponent | null = null;

  readonly uploadPanelOpen = computed(() => this.shellLayout.isOpen('upload'));

  readonly uploadBatch = this.uploadManager.activeBatch;
  readonly uploadBatchProgress = computed(() => this.uploadBatch()?.overallProgress ?? 0);
  readonly uploadBatchActive = computed(() => {
    const batch = this.uploadBatch();
    return !!batch && (batch.status === 'uploading' || batch.status === 'scanning');
  });
  readonly uploadResolverPending = computed(
    () => this.uploadBatch()?.pendingDisambiguationCount ?? 0,
  );
  /**
   * Dock stays visible while the orchestrator still has inbox/collecting/pending bundles.
   * @see docs/specs/component/upload/upload-resolver-tray.md — Visual modes
   */
  readonly showUploadDock = computed(
    () =>
      UPLOAD_DEV_FLAGS.dockAlwaysVisible ||
      this.uploadPanelOpen() ||
      this.uploadResolverPending() > 0 ||
      this.trayOrchestrator.hasActivePresentation() ||
      this.trayOrchestrator.hasPresentationBacklog(),
  );
  readonly uploadResolverTrayActive = computed(
    () =>
      UPLOAD_DEV_FLAGS.dockAlwaysVisible ||
      this.uploadResolverPending() > 0 ||
      this.trayOrchestrator.hasActivePresentation() ||
      this.trayOrchestrator.hasPresentationBacklog(),
  );
  readonly uploadHasClarifications = computed(() =>
    this.uploadManager.jobs().some((job) => getLaneForJob(job) === 'clarifications'),
  );

  toggleUploadPanel(): void {
    this.shellLayout.setOpen('upload', !this.shellLayout.isOpen('upload'));
  }

  closeUploadPanel(): void {
    this.shellLayout.close('upload');
  }

  openUploadPanel(): void {
    this.shellLayout.open('upload');
  }

  bindUploadPanel(panel: UploadPanelComponent | undefined): void {
    this.placementPanel = panel ?? null;
  }

  placeFile(key: string, coords: ExifCoords): void {
    this.placementPanel?.placeFile(key, coords);
  }

  /** Clears upload-panel row state after map location-pick is cancelled. */
  clearPendingLocationMapPick(mediaId?: string): void {
    this.placementPanel?.clearPendingLocationMapPick(mediaId);
  }
}
