/**
 * Tracks pre-resolve job count per batch; fires scanIdle when the wave completes.
 * @see docs/specs/service/media-upload-service/address-resolution-model.md
 */

import { Injectable, inject } from '@angular/core';
import { UploadResolverTrayOrchestratorService } from '../upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.service';
import { USE_TRAY_ORCHESTRATOR } from '../upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.types';

@Injectable({ providedIn: 'root' })
export class UploadPreResolveWaveService {
  private readonly trayOrchestrator = inject(UploadResolverTrayOrchestratorService);
  private readonly pendingByBatch = new Map<string, number>();

  /** Call after classifyBatch with the number of jobs that will pre-resolve. */
  resetWave(batchId: string, jobCount: number): void {
    if (jobCount <= 0) {
      this.pendingByBatch.delete(batchId);
      return;
    }
    this.pendingByBatch.set(batchId, jobCount);
  }

  /** One job finished pre-resolve (any outcome). */
  completeJob(batchId: string): void {
    const pending = this.pendingByBatch.get(batchId);
    if (pending === undefined) {
      return;
    }
    const next = pending - 1;
    if (next <= 0) {
      this.pendingByBatch.delete(batchId);
      if (USE_TRAY_ORCHESTRATOR) {
        this.trayOrchestrator.notifyScanIdle(batchId);
      }
      return;
    }
    this.pendingByBatch.set(batchId, next);
  }
}
