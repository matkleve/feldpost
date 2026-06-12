#!/usr/bin/env node
/**
 * fix-split-phase1.cjs
 *
 * Overwrites the split service files with correct implementations.
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src/app/features/upload');

const files = {
  'upload-panel-state.service.ts': `/**
 * UploadPanelStateService — state signals and computed properties.
 */

import { Injectable, computed, inject } from '@angular/core';
import { UploadManagerService, type UploadBatch, type UploadJob } from '../../core/upload/upload-manager.service';
import { getLaneForJob as mapJobToLane, type UploadLane } from './upload-phase.helpers';

@Injectable({ providedIn: 'root' })
export class UploadPanelStateService {
  private readonly uploadManager = inject(UploadManagerService);

  readonly laneBuckets = computed(() => {
    const buckets: Record<UploadLane, UploadJob[]> = {
      uploading: [],
      uploaded: [],
      issues: [],
    };
    for (const job of this.uploadManager.jobs()) {
      buckets[this.getLaneForJob(job)].push(job);
    }
    return buckets;
  });

  readonly laneCounts = computed(() => {
    let uploading = 0, uploaded = 0, issues = 0;
    for (const job of this.uploadManager.jobs()) {
      const lane = this.getLaneForJob(job);
      if (lane === 'uploaded') uploaded++;
      else if (lane === 'issues') issues++;
      else uploading++;
    }
    return { uploading, uploaded, issues };
  });

  readonly laneJobs = computed(() => this.laneBuckets()['uploading']);

  readonly dotItems = computed(() =>
    this.uploadManager.jobs().map((job) => ({
      id: job.id,
      lane: this.getLaneForJob(job),
      statusClass: this.getDotStatusClass(job),
    }))
  );

  readonly lastCompletedBatch = computed<UploadBatch | null>(() => {
    const completeBatches = this.uploadManager.batches().filter((batch) => batch.status === 'complete');
    return completeBatches.length === 0 ? null : completeBatches[completeBatches.length - 1] ?? null;
  });

  readonly showLastUpload = computed(() => this.uploadManager.jobs().length === 0 && !!this.lastCompletedBatch());
  readonly showProgressBoard = computed(() => this.uploadManager.jobs().length > 0);

  readonly lastUploadLabel = computed(() => {
    const batch = this.lastCompletedBatch();
    if (!batch) return null;
    return batch.totalFiles <= 1 ? batch.label : 'Batch · ' + batch.totalFiles + ' files';
  });

  readonly scanning = computed(() => this.uploadManager.activeBatch()?.status === 'scanning');

  readonly scanningLabel = computed(() => {
    const batch = this.uploadManager.activeBatch();
    if (!batch || batch.status !== 'scanning') return null;
    return 'Scanning... ' + batch.totalFiles + ' file' + (batch.totalFiles === 1 ? '' : 's') + ' found';
  });

  readonly hasAwaitingPlacement = computed(() =>
    this.uploadManager.jobs().some((j) => j.phase === 'missing_data')
  );

  private getLaneForJob(job: UploadJob): UploadLane {
    return mapJobToLane(job);
  }

  private getDotStatusClass(job: UploadJob): string {
    if (job.phase === 'complete' || job.phase === 'skipped') return 'complete';
    if (job.phase === 'error' || job.phase === 'missing_data') return 'issue';
    if (['uploading', 'saving_record', 'replacing_record', 'resolving_address', 'resolving_coordinates'].includes(job.phase)) {
      return 'uploading';
    }
    return 'queued';
  }
}
`,

  'upload-panel-input-handlers.ts': `/**
 * UploadPanelInputHandlersService — file input and drag-and-drop.
 */

import { Injectable, inject, signal } from '@angular/core';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import { WorkspaceViewService } from '../../core/workspace-view.service';

@Injectable({ providedIn: 'root' })
export class UploadPanelInputHandlersService {
  private readonly uploadManager = inject(UploadManagerService);
  private readonly workspaceView = inject(WorkspaceViewService);

  readonly isDragging = signal(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.uploadManager.submit(Array.from(files), { projectId: this.activeProjectId() });
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadManager.submit(Array.from(input.files), { projectId: this.activeProjectId() });
      input.value = '';
    }
  }

  onCaptureInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadManager.submit([input.files[0]], { projectId: this.activeProjectId() });
      input.value = '';
    }
  }

  openFilePicker(input: HTMLInputElement): void {
    input.click();
  }

  openCapturePicker(event: MouseEvent, input: HTMLInputElement): void {
    event.preventDefault();
    event.stopPropagation();
    input.click();
  }

  onDropZoneKeydown(event: KeyboardEvent, input: HTMLInputElement): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  }

  async onSelectFolder(event: MouseEvent, folderInput: HTMLInputElement): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const picker = (window as any).showDirectoryPicker;
    if (!picker) {
      folderInput.click();
      return;
    }
    try {
      const dirHandle = await picker.call(window);
      await this.uploadManager.submitFolder(dirHandle, { projectId: this.activeProjectId() });
    } catch {
      // User cancel and permission errors are non-fatal
    }
  }

  onFolderInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadManager.submit(Array.from(input.files), { projectId: this.activeProjectId() });
      input.value = '';
    }
  }

  private activeProjectId(): string | undefined {
    const ids = this.workspaceView.selectedProjectIds();
    return ids.size > 0 ? (Array.from(ids.values())[0] ?? undefined) : undefined;
  }
}
`,

  'upload-panel-lane-handlers.ts': `/**
 * UploadPanelLaneHandlersService — lane navigation & selection.
 */

import { Injectable, inject, signal } from '@angular/core';
import { UploadManagerService, type UploadJob } from '../../core/upload/upload-manager.service';
import { getLaneForJob as mapJobToLane, type UploadLane } from './upload-phase.helpers';

@Injectable({ providedIn: 'root' })
export class UploadPanelLaneHandlersService {
  private readonly uploadManager = inject(UploadManagerService);

  readonly selectedLane = signal<UploadLane>('uploading');

  setSelectedLane(lane: UploadLane): void {
    this.selectedLane.set(lane);
  }

  onDotClick(jobId: string): void {
    const job = this.uploadManager.jobs().find((entry) => entry.id === jobId);
    if (!job) return;
    this.selectedLane.set(this.getLaneForJob(job));
  }

  private getLaneForJob(job: UploadJob): UploadLane {
    return mapJobToLane(job);
  }
}
`,

  'upload-panel-row-handlers.ts': `/**
 * UploadPanelRowHandlersService — row interaction & file management.
 */

import { Injectable, inject } from '@angular/core';
import { UploadManagerService, type UploadJob, type UploadPhase } from '../../core/upload/upload-manager.service';
import type { ExifCoords } from '../../core/upload/upload.service';
import { getLaneForJob as mapJobToLane, type UploadLane } from './upload-phase.helpers';

export interface ZoomToLocationEvent {
  imageId: string;
  lat: number;
  lng: number;
}

@Injectable({ providedIn: 'root' })
export class UploadPanelRowHandlersService {
  private readonly uploadManager = inject(UploadManagerService);

  requestPlacement(jobId: string, _phase: UploadPhase, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const job = this.uploadManager.jobs().find((entry) => entry.id === jobId);
    if (!job || job.phase !== 'missing_data') return;
  }

  canZoomToJob(job: UploadJob): boolean {
    return (
      this.getLaneForJob(job) === 'uploaded' &&
      !!job.imageId &&
      typeof job.coords?.lat === 'number' &&
      typeof job.coords?.lng === 'number'
    );
  }

  isRowInteractive(job: UploadJob): boolean {
    return this.canZoomToJob(job) || job.phase === 'missing_data';
  }

  onRowMainClick(job: UploadJob): void {
    if (!this.isRowInteractive(job)) return;
  }

  onRowMainKeydown(job: UploadJob, event: KeyboardEvent): void {
    if (!this.isRowInteractive(job)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
  }

  placeFile(key: string, coords: ExifCoords): void {
    this.uploadManager.placeJob(key, coords);
  }

  dismissFile(jobId: string): void {
    this.uploadManager.dismissJob(jobId);
  }

  retryFile(jobId: string): void {
    this.uploadManager.retryJob(jobId);
  }

  private getLaneForJob(job: UploadJob): UploadLane {
    return mapJobToLane(job);
  }
}
`,

  'upload-panel-utils.ts': `/**
 * UploadPanelUtils — file type mapping and utility functions.
 */

import { type UploadJob, type UploadPhase } from '../../core/upload/upload-manager.service';
import { phaseToStatusClass as mapPhaseToStatusClass } from './upload-phase.helpers';

export function documentFallbackLabel(job: UploadJob): string | null {
  const type = job.file.type;
  if (!type) {
    const ext = fileExtension(job.file.name);
    return extensionToBadge(ext);
  }
  if (type === 'application/pdf') return 'PDF';
  if (type === 'application/msword') return 'DOC';
  if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'DOCX';
  if (type === 'application/vnd.ms-excel') return 'XLS';
  if (type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'XLSX';
  if (type === 'application/vnd.ms-powerpoint') return 'PPT';
  if (type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'PPTX';
  return null;
}

export function phaseToStatusClass(phase: UploadPhase): string {
  return mapPhaseToStatusClass(phase);
}

export function trackByJobId(_idx: number, job: UploadJob): string {
  return job.id;
}

function fileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
}

function extensionToBadge(extension: string): string | null {
  switch (extension) {
    case 'pdf': return 'PDF';
    case 'doc': return 'DOC';
    case 'docx': return 'DOCX';
    case 'xls': return 'XLS';
    case 'xlsx': return 'XLSX';
    case 'ppt': return 'PPT';
    case 'pptx': return 'PPTX';
    default: return null;
  }
}
`,
};

Object.entries(files).forEach(([filename, content]) => {
  const filepath = path.join(srcDir, filename);
  fs.writeFileSync(filepath, content, 'utf-8');
  console.log(`✅ Fixed: ${filename}`);
});

console.log(`\n✨ All services fixed!\n`);
