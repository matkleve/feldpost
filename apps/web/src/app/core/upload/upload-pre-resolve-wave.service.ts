/**
 * Tracks pre-resolve job count per batch; fires scanIdle when the wave completes.
 * @see docs/specs/service/media-upload-service/address-resolution-model.md
 */

import { Injectable, inject } from '@angular/core';
import { UploadResolverTrayOrchestratorService } from '../upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.service';
import { USE_TRAY_ORCHESTRATOR } from '../upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.types';
import { uploadTraceDecision, uploadTraceEnter } from './upload-address-resolution.debug';

@Injectable({ providedIn: 'root' })
export class UploadPreResolveWaveService {
  private readonly trayOrchestrator = inject(UploadResolverTrayOrchestratorService);
  private readonly pendingByBatch = new Map<string, number>();
  /** Batches that already received early tray presentation (first disambiguation). */
  private readonly earlyTrayPresented = new Set<string>();

  /** Call after classifyBatch with the number of jobs that will pre-resolve. */
  resetWave(batchId: string, jobCount: number): void {
    uploadTraceEnter('wave', 'resetWave', { batchId, jobCount });
    this.earlyTrayPresented.delete(batchId);
    if (jobCount <= 0) {
      this.pendingByBatch.delete(batchId);
      return;
    }
    this.pendingByBatch.set(batchId, jobCount);
  }

  /**
   * Early scanIdle — first disambiguation may present before the pre-resolve wave ends.
   * @see docs/specs/service/media-upload-service/upload-resolver-tray-orchestrator.md § Early vs final notifyScanIdle
   */
  notifyFirstTrayReady(batchId: string, detail?: Record<string, unknown>): void {
    if (!USE_TRAY_ORCHESTRATOR || this.earlyTrayPresented.has(batchId)) {
      return;
    }
    this.earlyTrayPresented.add(batchId);
    uploadTraceDecision('wave', 'early tray — first disambiguation registered', {
      batchId,
      ...detail,
    });
    this.trayOrchestrator.notifyScanIdle(batchId);
  }

  /**
   * Final scanIdle when the pre-resolve wave counter reaches zero (idempotent if early scanIdle already ran).
   * @see docs/specs/service/media-upload-service/upload-resolver-tray-orchestrator.md § Early vs final notifyScanIdle
   */
  completeJob(batchId: string): void {
    const pending = this.pendingByBatch.get(batchId);
    if (pending === undefined) {
      return;
    }
    const next = pending - 1;
    if (next <= 0) {
      this.pendingByBatch.delete(batchId);
      uploadTraceDecision('wave', 'scanIdle — pre-resolve wave complete', { batchId });
      if (USE_TRAY_ORCHESTRATOR) {
        this.trayOrchestrator.notifyScanIdle(batchId);
      }
      return;
    }
    this.pendingByBatch.set(batchId, next);
  }
}
