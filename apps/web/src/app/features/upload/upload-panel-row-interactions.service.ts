/**
 * UploadPanelRowInteractionsService — Keyboard + pointer interactions on file rows.
 *
 * Handles:
 *  - Row click/keyboard: Trigger placement request (open location picker)
 *  - Zoom button click: Emit zoom to location on map
 *  - Selection via checkbox: Toggle in selectedUploadJobIds
 *
 * Ground rules:
 *  - Placement only available for jobs with/without coords (location change mode)
 *  - Zoom filtered by canZoomToJob() (coords + media exists)
 *  - Keyboard accessibility: Enter/Space for placement, F key for zoom (custom shortcut)
 */

import { Injectable, inject } from '@angular/core';
import {
  UploadManagerService,
  type UploadJob,
  type UploadPhase,
} from '../../core/upload/upload-manager.service';
import {
  UploadPanelRowHandlersService,
  type ZoomToLocationEvent,
} from './upload-panel-row-handlers';

export interface UploadPanelRowInteractionsRegisterOptions {
  placementRequested: (jobId: string) => void;
  zoomToLocationRequested: (event: ZoomToLocationEvent) => void;
}

@Injectable()
export class UploadPanelRowInteractionsService {
  private readonly uploadManager = inject(UploadManagerService);
  private readonly rows = inject(UploadPanelRowHandlersService);

  private options: UploadPanelRowInteractionsRegisterOptions | null = null;

  register(options: UploadPanelRowInteractionsRegisterOptions): void {
    this.options = options;
  }

  private get ctx(): UploadPanelRowInteractionsRegisterOptions {
    if (!this.options) {
      throw new Error('UploadPanelRowInteractionsService not registered.');
    }
    return this.options;
  }

  requestPlacement(jobId: string, _phase: UploadPhase, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const job = this.uploadManager.jobs().find((entry) => entry.id === jobId);
    if (!job || job.phase !== 'missing_data') return;
    this.ctx.placementRequested(jobId);
  }

  onRowMainClick(job: UploadJob): void {
    if (job.phase === 'missing_data') {
      this.ctx.placementRequested(job.id);
      return;
    }
    if (!this.rows.canZoomToJob(job)) return;
    this.ctx.zoomToLocationRequested({
      mediaId: job.imageId!,
      lat: job.coords!.lat,
      lng: job.coords!.lng,
    });
  }

  onRowMainKeydown(job: UploadJob, event: KeyboardEvent): void {
    if (!this.rows.isRowInteractive(job)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.onRowMainClick(job);
  }
}
