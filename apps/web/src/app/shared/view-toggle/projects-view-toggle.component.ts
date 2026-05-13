import { Component, computed, inject, input, output } from '@angular/core';
import { BrnToggleGroupImports, type ToggleValue } from '@spartan-ng/brain/toggle-group';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ProjectsViewMode } from '../../core/projects/projects.types';
import type { ToggleGroupOption } from '../ui/toggle-group/toggle-group-option.types';
import { toggleSingleStringValue } from '../ui/toggle-group/toggle-group-option.helpers';

@Component({
  selector: 'app-projects-view-toggle',
  standalone: true,
  imports: [...BrnToggleGroupImports],
  templateUrl: './projects-view-toggle.component.html',
  styleUrl: './projects-view-toggle.component.scss',
})
export class ProjectsViewToggleComponent {
  private readonly i18nService = inject(I18nService);

  readonly viewMode = input.required<ProjectsViewMode>();
  readonly viewModeChange = output<ProjectsViewMode>();
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);
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
      id: 'cards',
      type: 'icon-only',
      label: this.t('projects.viewToggle.cards.aria', 'Card view'),
      icon: 'grid_view',
      title: this.t('projects.viewToggle.cards.title', 'Card view'),
      ariaLabel: this.t('projects.viewToggle.cards.aria', 'Card view'),
    },
  ]);

  onViewModeToggleChange(raw: ToggleValue<string>): void {
    const value = toggleSingleStringValue(raw);
    if (value === 'list' || value === 'cards') {
      this.viewModeChange.emit(value);
    }
  }
}
