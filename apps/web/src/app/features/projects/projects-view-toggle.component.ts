import { Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ProjectsViewMode } from '../../core/projects/projects.types';
import {
  SegmentedSwitchComponent,
  type SegmentedSwitchOption,
} from '../../shared/segmented-switch/segmented-switch.component';

@Component({
  selector: 'app-projects-view-toggle',
  standalone: true,
  imports: [SegmentedSwitchComponent],
    templateUrl: './projects-view-toggle.component.html',
  styleUrl: './projects-view-toggle.component.scss',
})
export class ProjectsViewToggleComponent {
  private readonly i18nService = inject(I18nService);

  readonly viewMode = input.required<ProjectsViewMode>();
  readonly viewModeChange = output<ProjectsViewMode>();
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);
  readonly viewOptions = computed<ReadonlyArray<SegmentedSwitchOption>>(() => [
    {
      id: 'list',
      label: this.t('projects.viewToggle.list.aria', 'List view'),
      icon: 'view_headline',
      title: this.t('projects.viewToggle.list.title', 'List view'),
      ariaLabel: this.t('projects.viewToggle.list.aria', 'List view'),
    },
    {
      id: 'cards',
      label: this.t('projects.viewToggle.cards.aria', 'Card view'),
      icon: 'grid_view',
      title: this.t('projects.viewToggle.cards.title', 'Card view'),
      ariaLabel: this.t('projects.viewToggle.cards.aria', 'Card view'),
    },
  ]);

  onViewModeSelected(value: string | null): void {
    if (value === 'list' || value === 'cards') {
      this.viewModeChange.emit(value);
    }
  }
}
