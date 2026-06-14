import { Component, inject, input, output } from '@angular/core';
import type { ProjectColorKey, ProjectListItem } from '../../../core/projects/projects.types';
import { I18nService } from '../../../core/i18n/i18n.service';
import {
  colorTokenFor,
  formatRelativeDate,
  projectStatusLabel,
} from '../page/projects-page.logic';
import { ProjectColorPickerComponent } from '../cards/project-color-picker.component';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';

@Component({
  selector: 'app-project-details-panel',
  standalone: true,
  imports: [ProjectColorPickerComponent, ...HLM_BUTTON_IMPORTS],
  templateUrl: './project-details-panel.component.html',
  styleUrl: './project-details-panel.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-col',
  },
})
export class ProjectDetailsPanelComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly project = input.required<ProjectListItem>();
  readonly colorPickerOpen = input(false);

  readonly colorSelected = output<ProjectColorKey>();
  readonly colorPickerToggled = output<void>();
  readonly archiveRequested = output<void>();
  readonly restoreRequested = output<void>();
  readonly deleteRequested = output<void>();
  readonly closed = output<void>();

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
