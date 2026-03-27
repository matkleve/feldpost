import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { UploadJob, UploadPhase } from '../../core/upload/upload-manager.service';
import {
  UiButtonDirective,
  UiButtonGhostDirective,
  UiButtonIconOnlyDirective,
  UiButtonPrimaryDirective,
  UiButtonSizeSmDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';
import { ChipComponent, type ChipVariant } from '../../shared/components/chip/chip.component';
import { getLaneForJob, phaseToStatusClass } from './upload-phase.helpers';
import { I18nService } from '../../core/i18n/i18n.service';
import { MediaOrchestratorService } from '../../core/media/media-orchestrator.service';
import { UniversalMediaComponent } from '../../shared/media/universal-media.component';
import type { MediaRenderState } from '../../core/media/media-renderer.types';

@Component({
  selector: 'app-upload-panel-item',
  standalone: true,
  imports: [
    CommonModule,
    UiButtonDirective,
    UiButtonSizeSmDirective,
    UiButtonIconOnlyDirective,
    UiButtonPrimaryDirective,
    UiButtonGhostDirective,
    ChipComponent,
    UniversalMediaComponent,
  ],
  templateUrl: './upload-panel-item.component.html',
  styleUrl: './upload-panel-item.component.scss',
})
export class UploadPanelItemComponent {
  private readonly i18nService = inject(I18nService);
  private readonly mediaOrchestrator = inject(MediaOrchestratorService);

  readonly job = input.required<UploadJob>();
  readonly interactive = input<boolean>(false);
  readonly documentFallbackLabel = input<string | null>(null);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  readonly requestPlacement = output<{ jobId: string; phase: UploadPhase; event: MouseEvent }>();
  readonly dismissFile = output<string>();
  readonly rowMainClick = output<UploadJob>();
  readonly rowMainKeydown = output<{ job: UploadJob; event: KeyboardEvent }>();

  // Media renderer state
  readonly fileIdentity = () => ({
    mimeType: this.job().file.type,
    fileName: this.job().file.name,
  });

  readonly mediaRenderState = (): MediaRenderState => {
    const j = this.job();
    if (j.thumbnailUrl) {
      return {
        status: 'loaded',
        url: j.thumbnailUrl,
        resolvedTier: 'inline',
      };
    } else if (
      j.phase === 'converting_format' ||
      j.phase === 'uploading' ||
      j.phase === 'validating' ||
      j.phase === 'parsing_exif'
    ) {
      return { status: 'loading' };
    } else {
      return { status: 'placeholder' };
    }
  };

  phaseToStatusClass(phase: UploadPhase): string {
    return phaseToStatusClass(phase);
  }

  canZoomToJob(): boolean {
    const j = this.job();
    return (
      getLaneForJob(j) === 'uploaded' &&
      !!j.imageId &&
      typeof j.coords?.lat === 'number' &&
      typeof j.coords?.lng === 'number'
    );
  }

  onRequestPlacement(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.requestPlacement.emit({ jobId: this.job().id, phase: this.job().phase, event });
  }

  onDismissClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dismissFile.emit(this.job().id);
  }

  fileTypeBadge(): string | null {
    const file = this.job().file;
    return this.mediaOrchestrator.resolveBadge({
      mimeType: file.type,
      fileName: file.name,
    });
  }

  fileTypeChipVariant(): ChipVariant {
    const file = this.job().file;
    const definition = this.mediaOrchestrator.resolveFileType({
      mimeType: file.type,
      fileName: file.name,
    });

    switch (definition.category) {
      case 'image':
        return 'filetype-image';
      case 'video':
        return 'filetype-video';
      case 'spreadsheet':
        return 'filetype-spreadsheet';
      case 'presentation':
        return 'filetype-presentation';
      case 'document':
        return 'filetype-document';
      default:
        return 'default';
    }
  }

  fileTypeIcon(): string {
    const file = this.job().file;
    return this.mediaOrchestrator.resolveIcon({
      mimeType: file.type,
      fileName: file.name,
    });
  }
}
