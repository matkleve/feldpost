#!/usr/bin/env node

/**
 * split-upload-panel-phase2.cjs
 *
 * Phase 2: Extract remaining signal/computed management and lifecycle hooks
 * from upload-panel.component.ts into dedicated services.
 *
 * Services to extract:
 * 1. upload-panel-signals.service.ts — All signal/computed property exposure
 * 2. upload-panel-lifecycle.service.ts — Constructor subscriptions & issue pulse
 *
 * Execution:
 *   node scripts/split-upload-panel-phase2.cjs
 */

const fs = require('fs');
const path = require('path');

const COMPONENT_PATH = path.join(__dirname, '../src/app/features/upload/upload-panel.component.ts');
const UPLOAD_DIR = path.dirname(COMPONENT_PATH);

// Read the component
const componentContent = fs.readFileSync(COMPONENT_PATH, 'utf-8');

// ────────────────────────────────────────────────────────────────────────────
// Phase 2a: Extract all signal/computed properties into upload-panel-signals.service.ts
// ────────────────────────────────────────────────────────────────────────────

const signalsServiceContent = `import { Injectable, inject, computed, signal } from '@angular/core';
import type { UploadJob, UploadPhase } from '../../core/upload/upload-manager.service';
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
  readonly dotItems = this.state.dotItems;
  readonly scanning = this.state.scanning;
  readonly scanningLabel = this.state.scanningLabel;
  readonly hasAwaitingPlacement = this.state.hasAwaitingPlacement;
  readonly showProgressBoard = this.state.showProgressBoard;
  readonly showLastUpload = this.state.showLastUpload;
  readonly lastUploadLabel = this.state.lastUploadLabel;

  // ── UI State (lane selection) ──────────────────────────────────────────────

  readonly selectedLane = signal<UploadLane>('uploading');

  // ── Computed (derived state) ───────────────────────────────────────────────

  readonly effectiveLane = computed<UploadLane>(() => this.selectedLane());
  readonly laneJobs = computed(() => this.state.laneBuckets()[this.selectedLane()]);
}
`;

const signalsServicePath = path.join(UPLOAD_DIR, 'upload-panel-signals.service.ts');
fs.writeFileSync(signalsServicePath, signalsServiceContent, 'utf-8');
console.log('✅ Created: upload-panel-signals.service.ts');

// ────────────────────────────────────────────────────────────────────────────
// Phase 2b: Extract constructor logic into upload-panel-lifecycle.service.ts
// ────────────────────────────────────────────────────────────────────────────

const lifecycleServiceContent = `import { Injectable, inject, signal } from '@angular/core';
import {
  UploadManagerService,
  type ImageUploadedEvent as ManagerImageUploadedEvent,
} from '../../core/upload/upload-manager.service';
import type { ImageUploadedEvent } from './upload-panel.component';

/**
 * UploadPanelLifecycleService — Manage constructor subscriptions & issue attention pulse.
 * Encapsulates event bridging and state transitions triggered by UploadManagerService.
 */
@Injectable({ providedIn: 'root' })
export class UploadPanelLifecycleService {
  private static readonly ISSUE_ATTENTION_RESET_MS = 1500;

  private readonly uploadManager = inject(UploadManagerService);

  // ── Issue attention pulse ──────────────────────────────────────────────────

  readonly issueAttentionPulse = signal(false);
  private issueAttentionTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Public API callback for component to emit events ─────────────────────

  private imageUploadedCallback?: (event: ImageUploadedEvent) => void;
  private placementRequestedCallback?: (jobId: string) => void;

  setImageUploadedCallback(cb: (event: ImageUploadedEvent) => void): void {
    this.imageUploadedCallback = cb;
  }

  setPlacementRequestedCallback(cb: (jobId: string) => void): void {
    this.placementRequestedCallback = cb;
  }

  // ── Initialize subscriptions ───────────────────────────────────────────────

  initializeSubscriptions(): void {
    this.uploadManager.imageUploaded$.subscribe((event: ManagerImageUploadedEvent) => {
      if (event.coords && this.imageUploadedCallback) {
        this.imageUploadedCallback({
          id: event.imageId,
          lat: event.coords.lat,
          lng: event.coords.lng,
          direction: event.direction,
          thumbnailUrl: event.thumbnailUrl,
        });
      }
    });

    this.uploadManager.jobPhaseChanged$.subscribe((event) => {
      const becameIssue =
        (event.currentPhase === 'error' || event.currentPhase === 'missing_data') &&
        event.previousPhase !== 'error' &&
        event.previousPhase !== 'missing_data';
      if (becameIssue) {
        this.triggerIssueAttentionPulse();
      }
    });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private triggerIssueAttentionPulse(): void {
    this.issueAttentionPulse.set(true);
    if (this.issueAttentionTimer) {
      clearTimeout(this.issueAttentionTimer);
    }
    this.issueAttentionTimer = setTimeout(() => {
      this.issueAttentionPulse.set(false);
      this.issueAttentionTimer = null;
    }, UploadPanelLifecycleService.ISSUE_ATTENTION_RESET_MS);
  }
}
`;

const lifecycleServicePath = path.join(UPLOAD_DIR, 'upload-panel-lifecycle.service.ts');
fs.writeFileSync(lifecycleServicePath, lifecycleServiceContent, 'utf-8');
console.log('✅ Created: upload-panel-lifecycle.service.ts');

console.log(`\n✨ Phase 2 extraction complete!`);
console.log(`\nServices created:
  - upload-panel-signals.service.ts (all signal/computed property exposure)
  - upload-panel-lifecycle.service.ts (constructor subscriptions + issue pulse)
`);
