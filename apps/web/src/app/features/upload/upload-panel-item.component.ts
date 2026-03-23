import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { UploadJob, UploadPhase } from '../../core/upload/upload-manager.service';
import { UiIconButtonGhostDirective } from '../../shared/ui-primitives.directive';

@Component({
  selector: 'app-upload-panel-item',
  standalone: true,
  imports: [CommonModule, UiIconButtonGhostDirective],
  templateUrl: './upload-panel-item.component.html',
  styleUrl: './upload-panel-item.component.scss',
})
export class UploadPanelItemComponent {
  private static readonly PHASE_TO_STATUS_CLASS: Record<UploadPhase, string> = {
    queued: 'pending',
    validating: 'parsing',
    parsing_exif: 'parsing',
    converting_format: 'parsing',
    hashing: 'parsing',
    dedup_check: 'parsing',
    extracting_title: 'parsing',
    conflict_check: 'parsing',
    awaiting_conflict_resolution: 'awaiting_placement',
    uploading: 'uploading',
    saving_record: 'uploading',
    replacing_record: 'uploading',
    resolving_address: 'uploading',
    resolving_coordinates: 'uploading',
    complete: 'complete',
    skipped: 'complete',
    error: 'error',
    missing_data: 'awaiting_placement',
  };

  readonly job = input.required<UploadJob>();
  readonly interactive = input<boolean>(false);
  readonly documentFallbackLabel = input<string | null>(null);

  readonly requestPlacement = output<{ jobId: string; phase: UploadPhase; event: MouseEvent }>();
  readonly dismissFile = output<string>();
  readonly rowMainClick = output<UploadJob>();
  readonly rowMainKeydown = output<{ job: UploadJob; event: KeyboardEvent }>();

  phaseToStatusClass(phase: UploadPhase): string {
    return UploadPanelItemComponent.PHASE_TO_STATUS_CLASS[phase];
  }

  canZoomToJob(): boolean {
    const j = this.job();
    return (
      (j.phase === 'complete' || j.phase === 'skipped' ? 'uploaded' : '') === 'uploaded' &&
      !!j.imageId &&
      typeof j.coords?.lat === 'number' &&
      typeof j.coords?.lng === 'number'
    );
  }

  onRequestPlacement(event: MouseEvent): void {
    this.requestPlacement.emit({ jobId: this.job().id, phase: this.job().phase, event });
  }
}
