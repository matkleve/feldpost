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
  ],
  templateUrl: './upload-panel-item.component.html',
  styleUrl: './upload-panel-item.component.scss',
})
export class UploadPanelItemComponent {
  private readonly i18nService = inject(I18nService);

  readonly job = input.required<UploadJob>();
  readonly interactive = input<boolean>(false);
  readonly documentFallbackLabel = input<string | null>(null);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  readonly requestPlacement = output<{ jobId: string; phase: UploadPhase; event: MouseEvent }>();
  readonly dismissFile = output<string>();
  readonly rowMainClick = output<UploadJob>();
  readonly rowMainKeydown = output<{ job: UploadJob; event: KeyboardEvent }>();

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
    const extension = this.fileExtension(file.name);
    const type = file.type.toLowerCase();

    if (type.startsWith('image/')) return this.imageBadge(extension);
    if (type.startsWith('video/')) return this.videoBadge(extension);

    switch (type) {
      case 'application/pdf':
        return 'PDF';
      case 'application/msword':
        return 'DOC';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'DOCX';
      case 'application/vnd.oasis.opendocument.text':
        return 'ODT';
      case 'application/vnd.oasis.opendocument.graphics':
        return 'ODG';
      case 'application/vnd.ms-excel':
        return 'XLS';
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return 'XLSX';
      case 'application/vnd.oasis.opendocument.spreadsheet':
        return 'ODS';
      case 'application/vnd.ms-powerpoint':
        return 'PPT';
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return 'PPTX';
      case 'application/vnd.oasis.opendocument.presentation':
        return 'ODP';
      default:
        break;
    }

    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'JPEG';
      case 'png':
        return 'PNG';
      case 'heic':
        return 'HEIC';
      case 'heif':
        return 'HEIF';
      case 'webp':
        return 'WebP';
      case 'mp4':
        return 'MP4';
      case 'mov':
        return 'MOV';
      case 'webm':
        return 'WebM';
      case 'pdf':
        return 'PDF';
      case 'doc':
        return 'DOC';
      case 'docx':
        return 'DOCX';
      case 'odt':
        return 'ODT';
      case 'odg':
        return 'ODG';
      case 'xls':
        return 'XLS';
      case 'xlsx':
        return 'XLSX';
      case 'ods':
        return 'ODS';
      case 'ppt':
        return 'PPT';
      case 'pptx':
        return 'PPTX';
      case 'odp':
        return 'ODP';
      default:
        return null;
    }
  }

  fileTypeChipVariant(): ChipVariant {
    const file = this.job().file;
    const extension = this.fileExtension(file.name);
    const type = file.type.toLowerCase();

    if (type.startsWith('image/')) return 'filetype-image';
    if (type.startsWith('video/')) return 'filetype-video';
    if (type === 'application/pdf') return 'filetype-document';
    if (
      type === 'application/msword' ||
      type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      type === 'application/vnd.oasis.opendocument.text' ||
      type === 'application/vnd.oasis.opendocument.graphics'
    ) {
      return 'filetype-document';
    }
    if (
      type === 'application/vnd.ms-excel' ||
      type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      type === 'application/vnd.oasis.opendocument.spreadsheet'
    ) {
      return 'filetype-spreadsheet';
    }
    if (
      type === 'application/vnd.ms-powerpoint' ||
      type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      type === 'application/vnd.oasis.opendocument.presentation'
    ) {
      return 'filetype-presentation';
    }

    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'heic':
      case 'heif':
      case 'webp':
        return 'filetype-image';
      case 'mp4':
      case 'mov':
      case 'webm':
        return 'filetype-video';
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'odt':
      case 'odg':
        return 'filetype-document';
      case 'xls':
      case 'xlsx':
      case 'ods':
        return 'filetype-spreadsheet';
      case 'ppt':
      case 'pptx':
      case 'odp':
        return 'filetype-presentation';
      default:
        return 'default';
    }
  }

  fileTypeIcon(): string {
    const variant = this.fileTypeChipVariant();
    switch (variant) {
      case 'filetype-image':
        return 'image';
      case 'filetype-video':
        return 'videocam';
      case 'filetype-spreadsheet':
        return 'table_chart';
      case 'filetype-presentation':
        return 'slideshow';
      case 'filetype-document':
      default:
        return 'description';
    }
  }

  private fileExtension(fileName: string): string {
    const parts = fileName.toLowerCase().split('.');
    return parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  }

  private imageBadge(extension: string): string {
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'JPEG';
      case 'png':
        return 'PNG';
      case 'heic':
        return 'HEIC';
      case 'heif':
        return 'HEIF';
      case 'webp':
        return 'WebP';
      default:
        return 'IMG';
    }
  }

  private videoBadge(extension: string): string {
    switch (extension) {
      case 'mp4':
        return 'MP4';
      case 'mov':
        return 'MOV';
      case 'webm':
        return 'WebM';
      default:
        return 'VID';
    }
  }
}
