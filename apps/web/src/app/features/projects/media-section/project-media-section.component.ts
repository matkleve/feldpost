import { Component, inject, input, output, signal } from '@angular/core';
import type { ProjectMediaListItem } from '../../../core/projects/projects.types';
import { I18nService } from '../../../core/i18n/i18n.service';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { MediaPickerDialogComponent } from '../../../shared/media-picker-dialog/media-picker-dialog.component';

@Component({
  selector: 'app-project-media-section',
  standalone: true,
  imports: [...HLM_BUTTON_IMPORTS, MediaPickerDialogComponent],
  templateUrl: './project-media-section.component.html',
  styleUrl: './project-media-section.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col',
  },
})
export class ProjectMediaSectionComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly exclusive = input<ProjectMediaListItem[]>([]);
  readonly shared = input<ProjectMediaListItem[]>([]);
  readonly loading = input(false);

  readonly pickerOpen = signal(false);
  readonly mediaAdded = output<string[]>();

  openPicker(): void {
    this.pickerOpen.set(true);
  }

  onPickerConfirmed(mediaIds: string[]): void {
    this.pickerOpen.set(false);
    if (mediaIds.length > 0) {
      this.mediaAdded.emit(mediaIds);
    }
  }

  onPickerCancelled(): void {
    this.pickerOpen.set(false);
  }
}
