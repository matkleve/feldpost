import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import type { UploadLocationRequirementMode } from '../../core/upload/upload-manager.types';
import { WorkspaceViewService } from '../../core/workspace-view/workspace-view.service';
import type { UploadLane } from './upload-phase.helpers';
import { UploadPanelStateService } from './upload-panel-state.service';

/**
 * UploadPanelSignalsService — Expose all signals and computed properties in one place.
 *
 * Purpose: Centralize reactive state mapping and reduce component boilerplate.
 * Aggregates signals from:
 *  - UploadManagerService: jobs, batches, activeBatch, isUploading
 *  - UploadPanelStateService: laneCounts, laneJobs, effectiveLane
 *  - UploadPanelLifecycleService: issueAttentionPulse
 *
 * Ground rules:
 *  - All signals are public readonly; no manual updates here
 *  - Delegated signals propagate changes from source services
 *  - Computed signals cache results until dependencies change
 */
@Injectable({ providedIn: 'root' })
export class UploadPanelSignalsService {
  private readonly uploadManager = inject(UploadManagerService);
  private readonly state = inject(UploadPanelStateService);
  private readonly workspaceView = inject(WorkspaceViewService);

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

  private readonly _selectedLane = signal<UploadLane>('uploading');
  readonly selectedLane = this._selectedLane.asReadonly();

  private readonly _locationRequirementMode = signal<UploadLocationRequirementMode>('required');
  readonly locationRequirementMode = this._locationRequirementMode.asReadonly();

  private readonly sessionLocationModeOverrides = signal<
    Map<string, UploadLocationRequirementMode>
  >(new Map());

  // ── Computed (derived state) ───────────────────────────────────────────────

  readonly effectiveLane = computed<UploadLane>(() => this._selectedLane());
  readonly laneJobs = computed(() => this.state.laneBuckets()[this._selectedLane()]);

  private readonly activeProjectId = computed<string | undefined>(() => {
    const selected = this.workspaceView.selectedProjectIds();
    return selected.size > 0 ? (Array.from(selected.values())[0] ?? undefined) : undefined;
  });

  constructor() {
    effect(() => {
      const activeProjectId = this.activeProjectId();
      const overrides = this.sessionLocationModeOverrides();

      if (!activeProjectId) {
        return;
      }

      const overridden = overrides.get(activeProjectId);
      this._locationRequirementMode.set(overridden ?? 'required');
    });
  }

  setSelectedLane(lane: UploadLane): void {
    this._selectedLane.set(lane);
  }

  setLocationRequirementMode(mode: UploadLocationRequirementMode): void {
    const activeProjectId = this.activeProjectId();
    if (activeProjectId) {
      this.sessionLocationModeOverrides.update((current) => {
        const next = new Map(current);
        next.set(activeProjectId, mode);
        return next;
      });
    }

    this._locationRequirementMode.set(mode);
  }
}
