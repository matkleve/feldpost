import { Component, inject, input, output } from '@angular/core';
import type {
  ProjectListItem,
  ProjectMediaListItem,
} from '../../../core/projects/projects.types';
import { I18nService } from '../../../core/i18n/i18n.service';
import {
  colorTokenFor,
  formatRelativeDate,
  projectStatusLabel,
} from '../page/projects-page.logic';
import { ProjectDetailsPanelComponent } from '../details-panel/project-details-panel.component';
import { ProjectMediaSectionComponent } from '../media-section/project-media-section.component';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import type { ProjectColorKey } from '../../../core/projects/projects.types';

@Component({
  selector: 'app-project-detail-view',
  standalone: true,
  imports: [ProjectDetailsPanelComponent, ProjectMediaSectionComponent, ...HLM_BUTTON_IMPORTS],
  templateUrl: './project-detail-view.component.html',
  styleUrl: './project-detail-view.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col',
  },
})
export class ProjectDetailViewComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly project = input.required<ProjectListItem>();
  readonly detailsPanelOpen = input(false);
  readonly colorPickerOpen = input(false);
  readonly exclusiveMedia = input<ProjectMediaListItem[]>([]);
  readonly sharedMedia = input<ProjectMediaListItem[]>([]);
  readonly mediaLoading = input(false);

  readonly detailsToggled = output<void>();
  readonly colorSelected = output<ProjectColorKey>();
  readonly colorPickerToggled = output<void>();
  readonly archiveRequested = output<void>();
  readonly restoreRequested = output<void>();
  readonly deleteRequested = output<void>();
  readonly detailsPanelClosed = output<void>();

  colorFor(key: ProjectColorKey): string {
    return colorTokenFor(key);
  }

  statusLabel(status: ProjectListItem['status']): string {
    return projectStatusLabel(status, this.t);
  }

  relativeDate(value: string | null): string {
    return formatRelativeDate(value, this.t);
  }

  locationLabel(project: ProjectListItem): string {
    return project.city ?? project.district ?? this.t('projects.detail.location.unknown', 'No location');
  }
}
