import { Component, computed, inject, input, output } from '@angular/core';
import type { ProjectListItem } from '../../../core/projects/projects.types';
import { I18nService } from '../../../core/i18n/i18n.service';
import { colorTokenFor } from '../page/projects-page.logic';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';

@Component({
  selector: 'app-projects-sidebar',
  standalone: true,
  imports: [...HLM_BUTTON_IMPORTS],
  templateUrl: './projects-sidebar.component.html',
  styleUrl: './projects-sidebar.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-col',
  },
})
export class ProjectsSidebarComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);
  readonly projects = input<ProjectListItem[]>([]);
  readonly selectedProjectId = input<string | null>(null);
  readonly showArchived = input(false);
  readonly dashboardActive = input(false);
  readonly loading = input(false);

  readonly dashboardSelected = output<void>();
  readonly projectSelected = output<string>();
  readonly archiveToggled = output<void>();
  readonly newProject = output<void>();

  readonly visibleProjects = computed(() => {
    const archived = this.showArchived();
    return this.projects().filter((project) =>
      archived ? project.status === 'archived' : project.status === 'active',
    );
  });

  colorFor(project: ProjectListItem): string {
    return colorTokenFor(project.colorKey);
  }

  onProjectClick(projectId: string): void {
    this.projectSelected.emit(projectId);
  }
}
