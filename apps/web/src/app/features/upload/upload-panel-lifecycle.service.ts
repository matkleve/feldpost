import { Injectable, inject, signal } from '@angular/core';
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
  private autoSwitchCallback?: () => void;

  setImageUploadedCallback(cb: (event: ImageUploadedEvent) => void): void {
    this.imageUploadedCallback = cb;
  }

  setPlacementRequestedCallback(cb: (jobId: string) => void): void {
    this.placementRequestedCallback = cb;
  }

  setAutoSwitchCallback(cb: () => void): void {
    this.autoSwitchCallback = cb;
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
        // Auto-switch to issues lane when error occurs (no alert/modal)
        if (this.autoSwitchCallback) {
          this.autoSwitchCallback();
        }
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
