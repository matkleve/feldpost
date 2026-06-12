import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import type { ProjectColorKey, ProjectListItem } from '../../../core/projects/projects.types';
import type { ProjectStatusFilter } from '../../../core/projects/projects.types';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ProjectCardComponent } from '../cards/project-card.component';
import { toProjectSummary } from '../logic/projects-formatters.logic';

// @see docs/specs/page/projects-page.md § Board view

@Component({
  selector: 'app-projects-board-view',
  standalone: true,
  imports: [ProjectCardComponent],
  templateUrl: './projects-board-view.component.html',
  styleUrl: './projects-board-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsBoardViewComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  // Pre-filtered, sorted project list from parent
  // @see docs/specs/page/projects-page.md § Board view
  readonly projects = input.required<ProjectListItem[]>();

  // Drives which columns are visible
  // @see docs/specs/page/projects-page.md § Board view
  readonly statusFilter = input.required<ProjectStatusFilter>();

  readonly colorSelected = output<{ projectId: string; colorKey: ProjectColorKey }>();
  readonly dangerAction = output<{ projectId: string; action: 'archive' | 'restore' | 'delete' }>();

  // Active column items — filtered to status 'active' and mapped to ProjectSummary
  // @see docs/specs/page/projects-page.md § Board view
  readonly activeProjects = computed(() =>
    this.projects()
      .filter((p) => p.status === 'active')
      .map(toProjectSummary),
  );

  // Archived column items — filtered to status 'archived' and mapped to ProjectSummary
  // @see docs/specs/page/projects-page.md § Board view
  readonly archivedProjects = computed(() =>
    this.projects()
      .filter((p) => p.status === 'archived')
      .map(toProjectSummary),
  );

  // Active column is visible when status filter does not restrict to archived-only
  // @see docs/specs/page/projects-page.md § Board view
  readonly showActive = computed(
    () => this.statusFilter() === 'all' || this.statusFilter() === 'active',
  );

  // Archived column is visible when status filter does not restrict to active-only
  // @see docs/specs/page/projects-page.md § Board view
  readonly showArchived = computed(
    () => this.statusFilter() === 'all' || this.statusFilter() === 'archived',
  );

  onColorSelected(projectId: string, colorKey: ProjectColorKey): void {
    this.colorSelected.emit({ projectId, colorKey });
  }

  onDangerAction(projectId: string, action: 'archive' | 'restore' | 'delete'): void {
    this.dangerAction.emit({ projectId, action });
  }
}
