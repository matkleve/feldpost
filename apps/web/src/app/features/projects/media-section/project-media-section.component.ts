import { Component, computed, inject, input, output } from '@angular/core';
import type { ProjectMediaListItem } from '../../../core/projects/projects.types';
import { projectMediaListItemToMediaRecord } from '../../../core/projects/projects.helpers';
import { I18nService } from '../../../core/i18n/i18n.service';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { ItemGridComponent } from '../../../shared/item-grid/item-grid.component';
import { MediaItemComponent } from '../../../shared/media-item/media-item.component';

@Component({
  selector: 'app-project-media-section',
  standalone: true,
  imports: [...HLM_BUTTON_IMPORTS, ItemGridComponent, MediaItemComponent],
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

  readonly mediaRemoved = output<string>();

  readonly exclusiveRecords = computed(() =>
    this.exclusive().map(projectMediaListItemToMediaRecord),
  );
  readonly sharedRecords = computed(() => this.shared().map(projectMediaListItemToMediaRecord));

  onRemoveMedia(mediaId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.mediaRemoved.emit(mediaId);
  }
}
