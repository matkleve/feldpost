import { Component, computed, inject, input, output } from '@angular/core';
import { BrnToggleGroupImports, type ToggleValue } from '@spartan-ng/brain/toggle-group';
import { HLM_TOGGLE_GROUP_IMPORTS } from '../ui/toggle-group';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ProjectsViewMode } from '../../core/projects/projects.types';
import type { ToggleGroupOption } from '../ui/toggle-group/toggle-group-option.types';
import { toggleSingleStringValue } from '../ui/toggle-group/toggle-group-option.helpers';

// @see docs/specs/component/project/projects-view-toggle.md
// @see docs/specs/page/projects-page.md § View Mode State
const VALID_VIEW_MODES = new Set<ProjectsViewMode>(['list', 'grid', 'map', 'board']);

@Component({
  selector: 'app-projects-view-toggle',
  standalone: true,
  imports: [...BrnToggleGroupImports, ...HLM_TOGGLE_GROUP_IMPORTS],
  templateUrl: './projects-view-toggle.component.html',
  styleUrl: './projects-view-toggle.component.scss',
})
export class ProjectsViewToggleComponent {
  private readonly i18nService = inject(I18nService);

  readonly viewMode = input.required<ProjectsViewMode>();
  readonly viewModeChange = output<ProjectsViewMode>();
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  // Icon order: list, grid, map, board — @see docs/specs/page/projects-page.md § View Mode State
  readonly viewOptions = computed<ReadonlyArray<ToggleGroupOption>>(() => [
    {
      id: 'list',
      type: 'icon-only',
      label: this.t('projects.viewToggle.list.aria', 'List view'),
      icon: 'view_headline',
      title: this.t('projects.viewToggle.list.title', 'List view'),
      ariaLabel: this.t('projects.viewToggle.list.aria', 'List view'),
    },
    {
      id: 'grid',
      type: 'icon-only',
      label: this.t('projects.viewToggle.grid.aria', 'Grid view'),
      icon: 'grid_view',
      title: this.t('projects.viewToggle.grid.title', 'Grid view'),
      ariaLabel: this.t('projects.viewToggle.grid.aria', 'Grid view'),
    },
    {
      id: 'map',
      type: 'icon-only',
      label: this.t('projects.viewToggle.map.aria', 'Map view'),
      icon: 'map',
      title: this.t('projects.viewToggle.map.title', 'Map view'),
      ariaLabel: this.t('projects.viewToggle.map.aria', 'Map view'),
    },
    {
      id: 'board',
      type: 'icon-only',
      label: this.t('projects.viewToggle.board.aria', 'Board view'),
      icon: 'view_kanban',
      title: this.t('projects.viewToggle.board.title', 'Board view'),
      ariaLabel: this.t('projects.viewToggle.board.aria', 'Board view'),
    },
  ]);

  onViewModeToggleChange(raw: ToggleValue<string>): void {
    const value = toggleSingleStringValue(raw);
    if (value && VALID_VIEW_MODES.has(value as ProjectsViewMode)) {
      this.viewModeChange.emit(value as ProjectsViewMode);
    }
  }
}
