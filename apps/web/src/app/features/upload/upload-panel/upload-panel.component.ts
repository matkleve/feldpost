/**
 * UploadPanelComponent — drag-and-drop / file-picker upload UI.
 *
 * Ground rules:
 *  - Thin UI layer — all queue management and upload orchestration
 *    are delegated to UploadManagerService.
 *  - Signals for all local UI state; no BehaviorSubject.
 *  - Errors are shown inline per-file; the panel never navigates.
 *  - Missing-data files (no GPS + no address) are reported to the parent
 *    so MapShellComponent can enter placement mode.
 *  - The panel reads upload state from uploadManager.jobs() —
 *    it does not maintain its own queue.
 */

import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExifCoords } from '../../../core/upload.service';
import { WorkspaceViewService } from '../../../core/workspace-view.service';
import {
  UploadManagerService,
  UploadJob,
  UploadPhase,
  UploadBatch,
  ImageUploadedEvent as ManagerImageUploadedEvent,
} from '../../../core/upload-manager.service';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Emitted to the parent after a successful upload with valid GPS coordinates. */
export interface ImageUploadedEvent {
  id: string;
  lat: number;
  lng: number;
  /** Camera compass direction (0–360°), if available from EXIF. */
  direction?: number;
  /** Object URL used for marker thumbnail previews on the map. */
  thumbnailUrl?: string;
}

export interface ZoomToLocationEvent {
  imageId: string;
  lat: number;
  lng: number;
}

type UploadLane = 'uploading' | 'uploaded' | 'issues';

// ── Component ──────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-upload-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-panel.component.html',
  styleUrl: './upload-panel.component.scss',
})
export class UploadPanelComponent {
  private readonly uploadManager = inject(UploadManagerService);
  private readonly workspaceView = inject(WorkspaceViewService);

  // ── Inputs / outputs ───────────────────────────────────────────────────────

  /** Whether the panel is visible. Controlled by the parent MapShellComponent. */
  readonly visible = input<boolean>(false);

  /**
   * Emitted after each file is successfully uploaded and has GPS coordinates.
   * The parent adds a Leaflet marker at (lat, lng).
   */
  readonly imageUploaded = output<ImageUploadedEvent>();

  /**
   * Emitted when a file has no GPS and no address and enters `missing_data`.
   * The parent (MapShellComponent) should enter placement mode so the next
   * map click supplies coordinates for this file.
   */
  readonly placementRequested = output<string>();

  /**
   * Emitted when users click an uploaded row that already has map coordinates.
   * The parent can fly/zoom the map to this photo location.
   */
  readonly zoomToLocationRequested = output<ZoomToLocationEvent>();

  // ── State (read from UploadManagerService) ─────────────────────────────────

  /** All upload jobs from the manager. */
  readonly jobs = this.uploadManager.jobs;
  readonly batches = this.uploadManager.batches;
  readonly activeBatch = this.uploadManager.activeBatch;
  readonly folderImportSupported = this.uploadManager.isFolderImportSupported;

  readonly isDragging = signal(false);

  /** True when at least one upload is in progress. */
  readonly isUploading = this.uploadManager.isBusy;

  /** True when any file is waiting for manual placement. */
  readonly hasAwaitingPlacement = computed(() =>
    this.uploadManager.jobs().some((j) => j.phase === 'missing_data'),
  );

  /** True while the manager scans a selected directory. */
  readonly scanning = computed(() => this.activeBatch()?.status === 'scanning');

  /** Live scan label shown during folder traversal. */
  readonly scanningLabel = computed(() => {
    const batch = this.activeBatch();
    if (!batch || batch.status !== 'scanning') return null;
    return `Scanning... ${batch.totalFiles} file${batch.totalFiles === 1 ? '' : 's'} found`;
  });

  readonly selectedLane = signal<UploadLane>('uploading');

  readonly laneCounts = computed(() => {
    const jobs = this.jobs();
    return {
      uploading: jobs.filter((job) => this.getLaneForJob(job) === 'uploading').length,
      uploaded: jobs.filter((job) => this.getLaneForJob(job) === 'uploaded').length,
      issues: jobs.filter((job) => this.getLaneForJob(job) === 'issues').length,
    };
  });

  readonly effectiveLane = computed<UploadLane>(() => {
    const lane = this.selectedLane();
    const counts = this.laneCounts();
    const total = counts.uploading + counts.uploaded + counts.issues;
    if (total === 0) return lane;
    if (counts[lane] > 0) return lane;
    if (counts.uploading > 0) return 'uploading';
    if (counts.issues > 0) return 'issues';
    return 'uploaded';
  });

  readonly laneJobs = computed(() => {
    const lane = this.effectiveLane();
    return this.jobs().filter((job) => this.getLaneForJob(job) === lane);
  });

  readonly dotItems = computed(() => {
    return this.jobs().map((job) => ({
      id: job.id,
      lane: this.getLaneForJob(job),
      statusClass: this.getDotStatusClass(job),
    }));
  });

  readonly lastCompletedBatch = computed<UploadBatch | null>(() => {
    const completeBatches = this.batches().filter((batch) => batch.status === 'complete');
    if (completeBatches.length === 0) return null;
    return completeBatches[completeBatches.length - 1] ?? null;
  });

  readonly showLastUpload = computed(() => this.jobs().length === 0 && !!this.lastCompletedBatch());

  readonly showProgressBoard = computed(() => this.jobs().length > 0);

  readonly lastUploadLabel = computed(() => {
    const batch = this.lastCompletedBatch();
    if (!batch) return null;
    if (batch.totalFiles <= 1) {
      return batch.label;
    }
    return `Batch · ${batch.totalFiles} files`;
  });

  constructor() {
    // React to manager events and bridge them to component outputs.
    effect(() => {
      // Re-read jobs signal to track changes.
      const jobs = this.uploadManager.jobs();
      // (Event bridging is handled by Observable subscriptions below.)
      void jobs;
    });

    // Bridge imageUploaded$ events from the manager to the component output.
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
  }

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

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

  // ── File input ─────────────────────────────────────────────────────────────

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadManager.submit(Array.from(input.files), { projectId: this.activeProjectId() });
      // Reset so the same file can be re-selected if needed
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

  setSelectedLane(lane: UploadLane): void {
    this.selectedLane.set(lane);
  }

  onDotClick(jobId: string): void {
    const job = this.jobs().find((entry) => entry.id === jobId);
    if (!job) return;
    this.selectedLane.set(this.getLaneForJob(job));
  }

  requestPlacement(jobId: string, phase: UploadPhase, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (phase !== 'missing_data') return;
    this.placementRequested.emit(jobId);
  }

  canZoomToJob(job: UploadJob): boolean {
    return (
      this.getLaneForJob(job) === 'uploaded' &&
      !!job.imageId &&
      typeof job.coords?.lat === 'number' &&
      typeof job.coords?.lng === 'number'
    );
  }

  onRowMainClick(job: UploadJob): void {
    if (!this.canZoomToJob(job)) return;
    this.zoomToLocationRequested.emit({
      imageId: job.imageId!,
      lat: job.coords!.lat,
      lng: job.coords!.lng,
    });
  }

  onRowMainKeydown(job: UploadJob, event: KeyboardEvent): void {
    if (!this.canZoomToJob(job)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.onRowMainClick(job);
  }

  async onSelectFolder(event: MouseEvent, folderInput: HTMLInputElement): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const picker = (
      window as Window & {
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
      }
    ).showDirectoryPicker;

    if (!picker) {
      folderInput.click();
      return;
    }

    try {
      const dirHandle = await picker.call(window);
      await this.uploadManager.submitFolder(dirHandle, { projectId: this.activeProjectId() });
    } catch {
      // User cancel and permission errors are non-fatal for panel state.
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

  // ── Manual placement ───────────────────────────────────────────────────────

  /**
   * Called by the parent MapShellComponent after the user clicks the map to
   * place an image that had no GPS data and no address in the filename.
   * Delegates to the manager's placeJob method.
   */
  placeFile(key: string, coords: ExifCoords): void {
    this.uploadManager.placeJob(key, coords);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Remove a completed, errored, or missing_data job from the list. */
  dismissFile(jobId: string): void {
    this.uploadManager.dismissJob(jobId);
  }

  /** Retry a failed job. */
  retryFile(jobId: string): void {
    this.uploadManager.retryJob(jobId);
  }

  /** Map UploadPhase to a CSS-friendly status class name. */
  phaseToStatusClass(phase: UploadPhase): string {
    switch (phase) {
      case 'queued':
        return 'pending';
      case 'validating':
      case 'parsing_exif':
      case 'hashing':
      case 'dedup_check':
      case 'extracting_title':
      case 'conflict_check':
        return 'parsing';
      case 'awaiting_conflict_resolution':
        return 'awaiting_placement';
      case 'uploading':
      case 'saving_record':
      case 'replacing_record':
        return 'uploading';
      case 'resolving_address':
      case 'resolving_coordinates':
        return 'uploading';
      case 'complete':
        return 'complete';
      case 'skipped':
        return 'skipped';
      case 'error':
        return 'error';
      case 'missing_data':
        return 'awaiting_placement';
    }
  }

  /** TrackBy function used in the template. */
  trackByJobId(_idx: number, job: UploadJob): string {
    return job.id;
  }

  documentFallbackLabel(job: UploadJob): string | null {
    const type = job.file.type;
    if (!type) {
      const ext = this.fileExtension(job.file.name);
      return this.extensionToBadge(ext);
    }

    if (type === 'application/pdf') return 'PDF';
    if (type === 'application/msword') return 'DOC';
    if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return 'DOCX';
    }
    if (type === 'application/vnd.ms-excel') return 'XLS';
    if (type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return 'XLSX';
    }
    if (type === 'application/vnd.ms-powerpoint') return 'PPT';
    if (type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      return 'PPTX';
    }

    return null;
  }

  private getLaneForJob(job: UploadJob): UploadLane {
    if (job.phase === 'complete' || job.phase === 'skipped') return 'uploaded';
    if (job.phase === 'error' || job.phase === 'missing_data') return 'issues';
    return 'uploading';
  }

  private getDotStatusClass(job: UploadJob): string {
    if (job.phase === 'complete' || job.phase === 'skipped') return 'complete';
    if (job.phase === 'error' || job.phase === 'missing_data') return 'issue';
    if (
      job.phase === 'uploading' ||
      job.phase === 'saving_record' ||
      job.phase === 'replacing_record' ||
      job.phase === 'resolving_address' ||
      job.phase === 'resolving_coordinates'
    ) {
      return 'uploading';
    }
    return 'queued';
  }

  private fileExtension(fileName: string): string {
    const parts = fileName.toLowerCase().split('.');
    return parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  }

  private extensionToBadge(extension: string): string | null {
    switch (extension) {
      case 'pdf':
        return 'PDF';
      case 'doc':
        return 'DOC';
      case 'docx':
        return 'DOCX';
      case 'xls':
        return 'XLS';
      case 'xlsx':
        return 'XLSX';
      case 'ppt':
        return 'PPT';
      case 'pptx':
        return 'PPTX';
      default:
        return null;
    }
  }
}
