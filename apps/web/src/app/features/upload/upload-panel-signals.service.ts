import { Injectable, inject, computed, signal } from '@angular/core';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import type { UploadLane } from './upload-phase.helpers';
import { UploadPanelStateService } from './upload-panel-state.service';

/**
 * UploadPanelSignalsService — Expose all signal/computed properties in one place.
 * Reduces component boilerplate and centralizes reactive state mapping.
 */
@Injectable({ providedIn: 'root' })
export class UploadPanelSignalsService {
  private readonly uploadManager = inject(UploadManagerService);
  private readonly state = inject(UploadPanelStateService);

  // ── Manager state ──────────────────────────────────────────────────────────

  readonly jobs = this.uploadManager.jobs;
  readonly batches = this.uploadManager.batches;
  readonly activeBatch = this.uploadManager.activeBatch;
  readonly folderImportSupported = this.uploadManager.isFolderImportSupported;
  readonly isUploading = this.uploadManager.isBusy;

  // ── Delegated state ────────────────────────────────────────────────────────

  readonly laneCounts = this.state.laneCounts;
  readonly scanning = this.state.scanning;
  readonly scanningLabel = this.state.scanningLabel;
  readonly hasAwaitingPlacement = this.state.hasAwaitingPlacement;
  readonly showProgressBoard = this.state.showProgressBoard;

  // ── UI State (lane selection) ──────────────────────────────────────────────

  readonly selectedLane = signal<UploadLane>('uploading');

  // ── Computed (derived state) ───────────────────────────────────────────────

  readonly effectiveLane = computed<UploadLane>(() => this.selectedLane());
  readonly laneJobs = computed(() => this.state.laneBuckets()[this.selectedLane()]);
}
