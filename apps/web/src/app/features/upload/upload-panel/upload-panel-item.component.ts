import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadJob, UploadPhase } from '../../../core/upload/upload-manager.service';
import { UiIconButtonGhostDirective } from '../../../shared/ui-primitives.directive';

@Component({
  selector: 'app-upload-panel-item',
  standalone: true,
  imports: [CommonModule, UiIconButtonGhostDirective],
  templateUrl: './upload-panel-item.component.html',
  styleUrl: './upload-panel-item.component.scss',
})
export class UploadPanelItemComponent {
  job = input.required<UploadJob>();
  interactive = input<boolean>(false);
  documentFallbackLabel = input<string | null>(null);

  requestPlacement = output<{ jobId: string; phase: UploadPhase; event: MouseEvent }>();
  dismissFile = output<string>();
  rowMainClick = output<UploadJob>();
  rowMainKeydown = output<{ job: UploadJob; event: KeyboardEvent }>();

  phaseToStatusClass(phase: UploadPhase): string {
    switch (phase) {
      case 'queued':
        return 'pending';
      case 'validating':
      case 'parsing_exif':
      case 'converting_format':
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
      default:
        return 'pending';
    }
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

  onRequestPlacement(event: MouseEvent) {
    this.requestPlacement.emit({ jobId: this.job().id, phase: this.job().phase, event });
  }
}
