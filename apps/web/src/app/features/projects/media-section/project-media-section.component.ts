import { Component, inject, input } from '@angular/core';
import type { ProjectMediaListItem } from '../../../core/projects/projects.types';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-project-media-section',
  standalone: true,
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
}
