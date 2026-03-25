/**
 * UploadPanelComponent — drag-and-drop / file-picker upload UI.
 *
 * Ground rules:
 *  - Ultra-thin UI coordinator that delegates to injected services.
 *  - All signals & computed exposed via UploadPanelSignalsService
 *  - All subscriptions & lifecycle via UploadPanelLifecycleService
 *  - Component only bridges template events to services.
 */

import { Component, effect, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadPanelItemComponent } from './upload-panel-item.component';
import type { ExifCoords } from '../../core/upload/upload.service';
import {
  UploadManagerService,
  type UploadJob,
  type UploadPhase,
} from '../../core/upload/upload-manager.service';
import type { UploadLane } from './upload-phase.helpers';
import { UploadPanelSignalsService } from './upload-panel-signals.service';
import { UploadPanelLifecycleService } from './upload-panel-lifecycle.service';
import { UploadPanelInputHandlersService } from './upload-panel-input-handlers';
import { UploadPanelLaneHandlersService } from './upload-panel-lane-handlers';
import {
  UploadPanelRowHandlersService,
  type ZoomToLocationEvent,
} from './upload-panel-row-handlers';
import { documentFallbackLabel, trackByJobId } from './upload-panel-utils';
import {
  UiButtonDirective,
  UiTabDirective,
  UiTabListDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';
import { ChipComponent, type ChipVariant } from '../../shared/components/chip/chip.component';
import { I18nService } from '../../core/i18n/i18n.service';

export interface ImageUploadedEvent {
  id: string;
  lat: number;
  lng: number;
  direction?: number;
  thumbnailUrl?: string;
}

type UploadFileTypeChip = {
  type: string;
  icon: string;
  variant: ChipVariant;
  order: number;
};

const FILE_TYPE_LOOKUP: Record<string, UploadFileTypeChip> = {
  jpg: { type: 'JPEG', icon: 'image', variant: 'filetype-image', order: 1 },
  jpeg: { type: 'JPEG', icon: 'image', variant: 'filetype-image', order: 1 },
  png: { type: 'PNG', icon: 'image', variant: 'filetype-image', order: 2 },
  heic: { type: 'HEIC', icon: 'image', variant: 'filetype-image', order: 3 },
  heif: { type: 'HEIF', icon: 'image', variant: 'filetype-image', order: 4 },
  webp: { type: 'WebP', icon: 'image', variant: 'filetype-image', order: 5 },
  mp4: { type: 'MP4', icon: 'videocam', variant: 'filetype-video', order: 6 },
  mov: { type: 'MOV', icon: 'videocam', variant: 'filetype-video', order: 7 },
  webm: { type: 'WebM', icon: 'videocam', variant: 'filetype-video', order: 8 },
  pdf: { type: 'PDF', icon: 'description', variant: 'filetype-document', order: 9 },
  docx: { type: 'DOCX', icon: 'description', variant: 'filetype-document', order: 10 },
  odt: { type: 'ODT', icon: 'description', variant: 'filetype-document', order: 11 },
  odg: { type: 'ODG', icon: 'description', variant: 'filetype-document', order: 12 },
  xlsx: { type: 'XLSX', icon: 'table_chart', variant: 'filetype-spreadsheet', order: 13 },
  ods: { type: 'ODS', icon: 'table_chart', variant: 'filetype-spreadsheet', order: 14 },
  pptx: { type: 'PPTX', icon: 'bar_chart', variant: 'filetype-presentation', order: 15 },
  odp: { type: 'ODP', icon: 'bar_chart', variant: 'filetype-presentation', order: 16 },
};

const DEFAULT_FILE_TYPE_CHIPS: UploadFileTypeChip[] = [
  FILE_TYPE_LOOKUP['jpg'],
  FILE_TYPE_LOOKUP['png'],
  FILE_TYPE_LOOKUP['heic'],
  FILE_TYPE_LOOKUP['webp'],
  FILE_TYPE_LOOKUP['mp4'],
  FILE_TYPE_LOOKUP['mov'],
  FILE_TYPE_LOOKUP['webm'],
  FILE_TYPE_LOOKUP['pdf'],
  FILE_TYPE_LOOKUP['docx'],
  FILE_TYPE_LOOKUP['odt'],
  FILE_TYPE_LOOKUP['odg'],
  FILE_TYPE_LOOKUP['xlsx'],
  FILE_TYPE_LOOKUP['ods'],
  FILE_TYPE_LOOKUP['pptx'],
  FILE_TYPE_LOOKUP['odp'],
].filter((chip): chip is UploadFileTypeChip => !!chip);

@Component({
  selector: 'app-upload-panel',
  standalone: true,
  imports: [
    CommonModule,
    UploadPanelItemComponent,
    ChipComponent,
    UiTabListDirective,
    UiTabDirective,
    UiButtonDirective,
  ],
  templateUrl: './upload-panel.component.html',
  styleUrl: './upload-panel.component.scss',
})
export class UploadPanelComponent {
  // Services
  private readonly uploadManager = inject(UploadManagerService);
  private readonly i18nService = inject(I18nService);
  private readonly signals = inject(UploadPanelSignalsService);
  private readonly lifecycle = inject(UploadPanelLifecycleService);
  private readonly inputs = inject(UploadPanelInputHandlersService);
  private readonly lanes = inject(UploadPanelLaneHandlersService);
  private readonly rows = inject(UploadPanelRowHandlersService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  // Component I/O
  readonly visible = input<boolean>(false);
  readonly imageUploaded = output<ImageUploadedEvent>();
  readonly placementRequested = output<string>();
  readonly zoomToLocationRequested = output<ZoomToLocationEvent>();

  // Delegate all signals to signals service
  readonly jobs = this.signals.jobs;
  readonly batches = this.signals.batches;
  readonly activeBatch = this.signals.activeBatch;
  readonly folderImportSupported = this.signals.folderImportSupported;
  readonly isUploading = this.signals.isUploading;
  readonly laneCounts = this.signals.laneCounts;
  readonly dotItems = this.signals.dotItems;
  readonly scanning = this.signals.scanning;
  readonly scanningLabel = this.signals.scanningLabel;
  readonly hasAwaitingPlacement = this.signals.hasAwaitingPlacement;
  readonly showProgressBoard = this.signals.showProgressBoard;
  readonly showLastUpload = this.signals.showLastUpload;
  readonly lastUploadLabel = this.signals.lastUploadLabel;
  readonly isDragging = this.inputs.isDragging;
  readonly selectedLane = this.signals.selectedLane;
  readonly effectiveLane = this.signals.effectiveLane;
  readonly laneJobs = this.signals.laneJobs;
  readonly issueAttentionPulse = this.lifecycle.issueAttentionPulse;
  readonly fileTypeChips = DEFAULT_FILE_TYPE_CHIPS;

  constructor() {
    effect(() => {
      const jobs = this.uploadManager.jobs();
      void jobs; // Track reactivity
    });

    // Bridge component outputs to lifecycle service
    this.lifecycle.setImageUploadedCallback((event) => this.imageUploaded.emit(event));
    this.lifecycle.setPlacementRequestedCallback((jobId) => this.placementRequested.emit(jobId));
    this.lifecycle.setAutoSwitchCallback(() => this.lanes.setSelectedLane('issues'));
    this.lifecycle.initializeSubscriptions();
  }

  // ── Input handlers (delegated to inputs service) ────────────────────────

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

  // ── Lane handlers (delegated to lanes service) ──────────────────────────

  setSelectedLane(lane: UploadLane): void {
    this.lanes.setSelectedLane(lane);
  }
  onDotClick(jobId: string): void {
    this.lanes.onDotClick(jobId);
  }

  // ── Row handlers (delegated to rows service) ────────────────────────────

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

  // ── Template helpers ───────────────────────────────────────────────────

  documentFallbackLabel(job: UploadJob): string | null {
    return documentFallbackLabel(job);
  }
  trackByJobId(idx: number, job: UploadJob): string {
    return trackByJobId(idx, job);
  }
}
