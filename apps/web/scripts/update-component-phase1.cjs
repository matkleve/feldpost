#!/usr/bin/env node
/**
 * update-component-phase1.cjs
 *
 * Refactor upload-panel.component.ts to use injected services.
 */

const fs = require('fs');
const path = require('path');

const componentPath = path.join(__dirname, '../src/app/features/upload/upload-panel.component.ts');

const newContent = `/**
 * UploadPanelComponent — drag-and-drop / file-picker upload UI.
 *
 * Ground rules:
 *  - Thin UI coordinator that delegates to injected services.
 *  - Services handle state management, input handling, lane navigation, row interaction.
 *  - Signals for local UI state (visibility).
 *  - Event bridging to parent components.
 */

import { Component, effect, inject, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadPanelItemComponent } from './upload-panel-item.component';
import type { ExifCoords } from '../../core/upload/upload.service';
import { UploadManagerService, type UploadJob, type UploadPhase, type ImageUploadedEvent as ManagerImageUploadedEvent } from '../../core/upload/upload-manager.service';
import type { UploadLane } from './upload-phase.helpers';
import { UploadPanelStateService } from './upload-panel-state.service';
import { UploadPanelInputHandlersService } from './upload-panel-input-handlers';
import { UploadPanelLaneHandlersService } from './upload-panel-lane-handlers';
import { UploadPanelRowHandlersService, type ZoomToLocationEvent } from './upload-panel-row-handlers';
import { documentFallbackLabel, trackByJobId } from './upload-panel-utils';
import { UiButtonDirective, UiTabDirective, UiTabListDirective } from '../../shared/ui-primitives/ui-primitives.directive';

export interface ImageUploadedEvent {
  id: string;
  lat: number;
  lng: number;
  direction?: number;
  thumbnailUrl?: string;
}

@Component({
  selector: 'app-upload-panel',
  standalone: true,
  imports: [CommonModule, UploadPanelItemComponent, UiTabListDirective, UiTabDirective, UiButtonDirective],
  templateUrl: './upload-panel.component.html',
  styleUrl: './upload-panel.component.scss',
})
export class UploadPanelComponent {
  private static readonly ISSUE_ATTENTION_RESET_MS = 1500;

  // Services
  private readonly uploadManager = inject(UploadManagerService);
  private readonly state = inject(UploadPanelStateService);
  private readonly inputs = inject(UploadPanelInputHandlersService);
  private readonly lanes = inject(UploadPanelLaneHandlersService);
  private readonly rows = inject(UploadPanelRowHandlersService);

  // Component I/O
  readonly visible = input<boolean>(false);
  readonly imageUploaded = output<ImageUploadedEvent>();
  readonly placementRequested = output<string>();
  readonly zoomToLocationRequested = output<ZoomToLocationEvent>();

  // Manager state
  readonly jobs = this.uploadManager.jobs;
  readonly batches = this.uploadManager.batches;
  readonly activeBatch = this.uploadManager.activeBatch;
  readonly folderImportSupported = this.uploadManager.isFolderImportSupported;
  readonly isUploading = this.uploadManager.isBusy;

  // Delegated state
  readonly laneCounts = this.state.laneCounts;
  readonly dotItems = this.state.dotItems;
  readonly scanning = this.state.scanning;
  readonly scanningLabel = this.state.scanningLabel;
  readonly hasAwaitingPlacement = this.state.hasAwaitingPlacement;
  readonly showProgressBoard = this.state.showProgressBoard;
  readonly showLastUpload = this.state.showLastUpload;
  readonly lastUploadLabel = this.state.lastUploadLabel;

  // UI state
  readonly isDragging = this.inputs.isDragging;
  readonly selectedLane = this.lanes.selectedLane;

  // Computed
  readonly effectiveLane = computed<UploadLane>(() => this.selectedLane());
  readonly laneJobs = computed(() => this.state.laneBuckets()[this.selectedLane()]);

  // Private
  private issueAttentionPulse = signal(false);
  private issueAttentionTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const jobs = this.uploadManager.jobs();
      void jobs; // Track reactivity
    });

    this.uploadManager.imageUploaded$.subscribe((event: ManagerImageUploadedEvent) => {
      if (event.coords) {
        this.imageUploaded.emit({
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

  // ── Delegated input handlers ───────────────────────────────────────────────

  onDragOver(event: DragEvent): void {
    this.inputs.onDragOver(event);
  }

  onDragLeave(event: DragEvent): void {
    this.inputs.onDragLeave(event);
  }

  onDrop(event: DragEvent): void {
    this.inputs.onDrop(event);
    this.selectedLane.set('uploading');
  }

  onFileInputChange(event: Event): void {
    this.inputs.onFileInputChange(event);
    this.selectedLane.set('uploading');
  }

  onCaptureInputChange(event: Event): void {
    this.inputs.onCaptureInputChange(event);
    this.selectedLane.set('uploading');
  }

  openFilePicker(input: HTMLInputElement): void {
    this.inputs.openFilePicker(input);
  }

  openCapturePicker(event: MouseEvent, input: HTMLInputElement): void {
    this.inputs.openCapturePicker(event, input);
  }

  onDropZoneKeydown(event: KeyboardEvent, input: HTMLInputElement): void {
    this.inputs.onDropZoneKeydown(event, input);
  }

  async onSelectFolder(event: MouseEvent, folderInput: HTMLInputElement): Promise<void> {
    await this.inputs.onSelectFolder(event, folderInput);
  }

  onFolderInputChange(event: Event): void {
    this.inputs.onFolderInputChange(event);
    this.selectedLane.set('uploading');
  }

  // ── Delegated lane handlers ────────────────────────────────────────────────

  setSelectedLane(lane: UploadLane): void {
    this.lanes.setSelectedLane(lane);
  }

  onDotClick(jobId: string): void {
    this.lanes.onDotClick(jobId);
  }

  // ── Delegated row handlers ─────────────────────────────────────────────────

  requestPlacement(jobId: string, phase: UploadPhase, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const job = this.uploadManager.jobs().find((entry) => entry.id === jobId);
    if (!job || job.phase !== 'missing_data') return;
    this.placementRequested.emit(jobId);
  }

  canZoomToJob(job: UploadJob): boolean {
    return this.rows.canZoomToJob(job);
  }

  isRowInteractive(job: UploadJob): boolean {
    return this.rows.isRowInteractive(job);
  }

  onRowMainClick(job: UploadJob): void {
    if (job.phase === 'missing_data') {
      this.placementRequested.emit(job.id);
      return;
    }
    if (!this.canZoomToJob(job)) return;
    this.zoomToLocationRequested.emit({
      imageId: job.imageId!,
      lat: job.coords!.lat,
      lng: job.coords!.lng,
    });
  }

  onRowMainKeydown(job: UploadJob, event: KeyboardEvent): void {
    if (!this.isRowInteractive(job)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.onRowMainClick(job);
  }

  placeFile(key: string, coords: ExifCoords): void {
    this.rows.placeFile(key, coords);
    this.selectedLane.set('uploading');
  }

  dismissFile(jobId: string): void {
    this.rows.dismissFile(jobId);
  }

  retryFile(jobId: string): void {
    this.rows.retryFile(jobId);
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  documentFallbackLabel(job: UploadJob): string | null {
    return documentFallbackLabel(job);
  }

  trackByJobId(idx: number, job: UploadJob): string {
    return trackByJobId(idx, job);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private triggerIssueAttentionPulse(): void {
    this.issueAttentionPulse.set(true);
    if (this.issueAttentionTimer) {
      clearTimeout(this.issueAttentionTimer);
    }
    this.issueAttentionTimer = setTimeout(() => {
      this.issueAttentionPulse.set(false);
      this.issueAttentionTimer = null;
    }, UploadPanelComponent.ISSUE_ATTENTION_RESET_MS);
  }
}
`;

fs.writeFileSync(componentPath, newContent, 'utf-8');
console.log('✅ Updated: upload-panel.component.ts (refactored to thin coordinator)');
