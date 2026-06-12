import { Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { ProjectColorKey } from '../../../core/projects/projects.types';
import type { ProjectGroupedSection } from '../page/projects-page.config';
import { ProjectCardComponent } from '../cards/project-card.component';
import { toProjectSummary } from '../logic/projects-formatters.logic';

@Component({
  selector: 'app-projects-grid-view',
  standalone: true,
  imports: [ProjectCardComponent],
  templateUrl: './projects-grid-view.component.html',
  styleUrl: './projects-grid-view.component.scss',
})
export class ProjectsGridViewComponent {
  private readonly i18nService = inject(I18nService);

  readonly section = input.required<ProjectGroupedSection>();
  readonly t = (key: string, fallback = ''): string => {
    const value = this.i18nService.t(key, fallback);
    if (typeof value === 'string' && value.trim().length > 0) return value;
    if (fallback.trim().length > 0) return fallback;
    return key;
  };

  readonly colorSelected = output<{ projectId: string; colorKey: ProjectColorKey }>();
  readonly dangerAction = output<{ projectId: string; action: 'archive' | 'restore' | 'delete' }>();

  // Maps ProjectListItem → ProjectSummary for ProjectCardComponent
  // @see docs/specs/component/project/project-card.md § Call-site Pattern
  readonly summaries = computed(() => this.section().projects.map(toProjectSummary));

  onColorSelected(projectId: string, colorKey: ProjectColorKey): void {
    this.colorSelected.emit({ projectId, colorKey });
  }

  onDangerAction(projectId: string, action: 'archive' | 'restore' | 'delete'): void {
    this.dangerAction.emit({ projectId, action });
  }
}
