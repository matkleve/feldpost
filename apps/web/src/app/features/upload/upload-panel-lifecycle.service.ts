import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  UploadManagerService,
  type ImageUploadedEvent as ManagerImageUploadedEvent,
} from '../../core/upload/upload-manager.service';
import type { ImageUploadedEvent } from './upload-panel.component';

/**
 * UploadPanelLifecycleService — Manage panel lifecycle subscriptions & issue attention pulse.
 *
 * @see docs/specs/ui/upload/upload-panel-system.md — event bridge and host callbacks vs manager-owned streams.
 * @see docs/specs/component/upload/upload-panel.feedback-triage.md — lane stability after resolution (do not auto-switch lanes here).
 *
 * Encapsulates:
 * - Event bridging from UploadManagerService (imageUploaded$, jobPhaseChanged$)
 * - Issue attention pulse when a job newly enters error or missing_data (UI-only; does not change manager phase)
 * - Optional setAutoSwitchCallback (legacy hook; not invoked from initializeSubscriptions — prefer explicit lane UX per feedback-triage)
 */
@Injectable({ providedIn: 'root' })
export class UploadPanelLifecycleService {
  private static readonly ISSUE_ATTENTION_RESET_MS = 1500;

  private readonly uploadManager = inject(UploadManagerService);

  // ── Issue attention pulse ──────────────────────────────────────────────────

  private readonly _issueAttentionPulse = signal(false);
  readonly issueAttentionPulse = this._issueAttentionPulse.asReadonly();

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
    // Legacy hook: nothing in this service invokes the callback today; avoid wiring lane auto-switch here.
    // @see docs/specs/component/upload/upload-panel.feedback-triage.md
    this.autoSwitchCallback = cb;
  }

  /** Panel destroyed — stop emitting to torn-down @Output() refs. */
  clearHostCallbacks(): void {
    this.imageUploadedCallback = undefined;
    this.placementRequestedCallback = undefined;
  }

  // ── Initialize subscriptions ───────────────────────────────────────────────

  /**
   * Scoped to the hosting panel — torn down when the panel is destroyed (avoids NG0953 on outputs).
   * @see docs/specs/ui/upload/upload-panel-system.md
   */
  initializeSubscriptions(destroyRef: DestroyRef): void {
    this.uploadManager.imageUploaded$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((event: ManagerImageUploadedEvent) => {
        if (event.coords && this.imageUploadedCallback) {
          this.imageUploadedCallback({
            id: event.mediaId,
            lat: event.coords.lat,
            lng: event.coords.lng,
            direction: event.direction,
            thumbnailUrl: event.thumbnailUrl,
          });
        }
      });

    this.uploadManager.jobPhaseChanged$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((event) => {
        // Stable state: pulse only when a job newly enters issue-class phases (not on every phase tick).
        // @see docs/specs/ui/upload/upload-panel-system.md — State / Panel UI transition choreography
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
    this._issueAttentionPulse.set(true);
    if (this.issueAttentionTimer) {
      clearTimeout(this.issueAttentionTimer);
    }
    this.issueAttentionTimer = setTimeout(() => {
      this._issueAttentionPulse.set(false);
      this.issueAttentionTimer = null;
    }, UploadPanelLifecycleService.ISSUE_ATTENTION_RESET_MS);
  }
}
