/**
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
