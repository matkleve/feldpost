import { Injectable, inject, signal } from '@angular/core';
import {
  UploadManagerService,
  type ImageUploadedEvent as ManagerImageUploadedEvent,
} from '../../core/upload/upload-manager.service';
import type { ImageUploadedEvent } from './upload-panel.component';

/**
 * UploadPanelLifecycleService — Manage panel lifecycle subscriptions & issue attention pulse.
 *
 * @see docs/specs/ui/upload/upload-panel-system.md — event bridge and host callbacks vs manager-owned streams.
 *
 * Encapsulates:
 * - Event bridging from UploadManagerService (imageUploaded$, jobPhaseChanged$)
 * - Issue attention pulse animation trigger (UI feedback on new issues)
 * - **AUTO-SWITCH CALLBACK** (SPEC VIOLATION — see Action 8g in upload-manager-pipeline.md)
 *
 * ⚠️ VIOLATION: setAutoSwitchCallback() is registered by upload-panel-setup.service.ts (line 51)
 * and executed when jobPhaseChanged$ reports error/missing_data phase. Spec requires lane
 * stability; never auto-switch after resolution actions. TODO: Remove auto-switch callback
 * and rely on explicit user lane selection.
 */
@Injectable({ providedIn: 'root' })
export class UploadPanelLifecycleService {
  private static readonly ISSUE_ATTENTION_RESET_MS = 1500;

  private readonly uploadManager = inject(UploadManagerService);

  // ── Issue attention pulse ──────────────────────────────────────────────────

  readonly issueAttentionPulse = signal(false);
  private issueAttentionTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptionsInitialized = false;

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
    // ⚠️ SPEC VIOLATION: This callback is used to implement auto-switch on error.
    // Registered in upload-panel-setup.service.ts (line 51) to trigger lane='issues' on phase error.
    // Violates spec Action 8g: "Keep currently selected lane stable after resolution actions."
    // TODO: Remove this method and callback execution; rely on manual user lane selection only.
    this.autoSwitchCallback = cb;
  }

  // ── Initialize subscriptions ───────────────────────────────────────────────

  initializeSubscriptions(): void {
    if (this.subscriptionsInitialized) {
      return;
    }
    this.subscriptionsInitialized = true;

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
