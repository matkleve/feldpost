import { Injectable, computed, inject, signal } from '@angular/core';
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
  private readonly trayOrchestrator = inject(UploadResolverTrayOrchestratorService);

  private placementPanel: UploadPanelComponent | null = null;

  // Was `readonly uploadPanelPinned = signal(false)` — a `readonly` class field
  // only stops *reassignment*, not `.set()`/`.update()`; any external caller
  // with a reference to this service could mutate panel-open state directly,
  // bypassing toggleUploadPanel()/closeUploadPanel()/openUploadPanel() below.
  // The other 171 @Injectable services in this app all follow the
  // private-signal + public-.asReadonly() pattern already visible one line
  // down for `uploadPanelOpen` itself — this was the one field that didn't.
  // @see docs/audits/2026-09-10-spartan-and-state.md § State
  private readonly _uploadPanelPinned = signal(false);
  readonly uploadPanelOpen = this._uploadPanelPinned.asReadonly();

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
  readonly uploadHasIssues = computed(() =>
    this.uploadManager.jobs().some((job) => getLaneForJob(job) === 'issues'),
  );

  toggleUploadPanel(): void {
    this._uploadPanelPinned.update((open) => !open);
  }

  closeUploadPanel(): void {
    this._uploadPanelPinned.set(false);
  }

  openUploadPanel(): void {
    this._uploadPanelPinned.set(true);
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
