import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import type { UploadLocationRequirementMode } from '../../core/upload/upload-manager.types';
import { UploadLocationResolutionService } from '../../core/upload/location/upload-location-resolution.service';
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
  private readonly locationResolution = inject(UploadLocationResolutionService);
  private readonly i18n = inject(I18nService);

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

  /** Merges batch progress + pending disambiguation count for map tray passive line (G12). */
  readonly passiveStatusLine = computed(() => {
    const t = this.i18n.t.bind(this.i18n);
    const pendingGroups = this.locationResolution.pendingGroupCount();
    if (pendingGroups > 0) {
      return pendingGroups === 1
        ? t('upload.resolver.passive.oneAddress', '1 address needs your choice')
        : t('upload.resolver.passive.addresses', '{count} addresses need your choice').replace(
            '{count}',
            String(pendingGroups),
          );
    }

    const batch = this.activeBatch();
    if (!batch || batch.status === 'complete' || batch.status === 'cancelled') {
      return null;
    }

    const progress = batch.overallProgress ?? 0;
    if (batch.status === 'scanning') {
      return this.scanningLabel() || t('upload.resolver.passive.preparing', 'Preparing upload…');
    }

    return t('upload.resolver.passive.uploading', 'Uploading… {percent}%').replace(
      '{percent}',
      String(progress),
    );
  });

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
