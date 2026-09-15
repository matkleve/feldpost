/**
 * Tracks pre-resolve job count per batch; fires scanIdle when the wave completes.
 * @see docs/specs/service/media-upload-service/address-resolution-model.md
 */

import { Injectable, inject } from '@angular/core';
import { UploadResolverTrayOrchestratorService } from '../../upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.service';
import { uploadTraceDecision, uploadTraceEnter } from '../address-resolution/upload-address-resolution.debug';

@Injectable({ providedIn: 'root' })
export class UploadPreResolveWaveService {
  private readonly trayOrchestrator = inject(UploadResolverTrayOrchestratorService);
  private readonly pendingByBatch = new Map<string, number>();
  /** Batches that already received early tray presentation (first disambiguation). */
  private readonly earlyTrayPresented = new Set<string>();
  /** Batches still being classified in chunks — tray presentation is held until they finish. */
  private readonly classifying = new Set<string>();
  /** Batches that wanted to present a tray while classification was still running. */
  private readonly trayHeldWhileClassifying = new Set<string>();

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
    if (this.earlyTrayPresented.has(batchId)) {
      return;
    }
    // G4: while the batch is still being classified in chunks, a group can still gain members.
    // Presenting now would let the user answer a question whose remaining files have not arrived,
    // and those files would then open a second, identical tray.
    // @see docs/specs/service/media-upload-service/upload-manager-pipeline.chunked-classification.supplement.md
    if (this.classifying.has(batchId)) {
      this.trayHeldWhileClassifying.add(batchId);
      uploadTraceDecision('wave', 'tray held — batch still classifying', { batchId, ...detail });
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
   * Mark a batch as being classified in chunks. Tray presentation is held until
   * {@link endClassification} runs (G4).
   */
  beginClassification(batchId: string): void {
    this.classifying.add(batchId);
    this.trayHeldWhileClassifying.delete(batchId);
  }

  /**
   * Classification of the whole batch is done. Release any tray presentation that was held, so a
   * question the user could not safely be asked mid-classification is asked now.
   */
  endClassification(batchId: string): void {
    if (!this.classifying.delete(batchId)) {
      return;
    }
    if (this.trayHeldWhileClassifying.delete(batchId)) {
      this.notifyFirstTrayReady(batchId, { released: 'after classification' });
    }
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
      uploadTraceDecision('wave', 'scanIdle — pre-resolve wave complete', {
        batchId,
        skippedFinalScanIdle: this.earlyTrayPresented.has(batchId),
      });
      // Early tray already closed the collecting window — avoid presenting the same bundle twice.
      // @see docs/specs/service/media-upload-service/upload-resolver-tray-orchestrator.md § Early vs final notifyScanIdle
      if (!this.earlyTrayPresented.has(batchId)) {
        this.trayOrchestrator.notifyScanIdle(batchId);
      }
      return;
    }
    this.pendingByBatch.set(batchId, next);
  }
}
