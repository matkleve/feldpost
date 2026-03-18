import { Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ProjectsViewMode } from '../../core/projects/projects.types';
import {
  SnapSizeSliderComponent,
  type SnapSizeSliderOption,
} from '../../shared/snap-size-slider/snap-size-slider.component';

@Component({
  selector: 'app-projects-view-toggle',
  standalone: true,
  imports: [SnapSizeSliderComponent],
  template: `
    <app-snap-size-slider
      class="projects-view-toggle"
      [label]="t('projects.viewToggle.aria.group', 'View mode')"
      [options]="viewOptions()"
      [value]="viewMode()"
      (valueChange)="onViewModeSelected($event)"
    />
  `,
  styles: [
    `
      .projects-view-toggle {
        --snap-option-count: 2;
        min-inline-size: auto;
      }
    `,
  ],
})
export class ProjectsViewToggleComponent {
  private readonly i18nService = inject(I18nService);

  readonly viewMode = input.required<ProjectsViewMode>();
  readonly viewModeChange = output<ProjectsViewMode>();
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);
  readonly viewOptions = computed<ReadonlyArray<SnapSizeSliderOption>>(() => [
    {
      value: 'list',
      label: this.t('projects.viewToggle.list.aria', 'List view'),
      icon: 'view_headline',
    },
    {
      value: 'cards',
      label: this.t('projects.viewToggle.cards.aria', 'Card view'),
      icon: 'grid_view',
    },
  ]);

  onViewModeSelected(value: string): void {
    if (value === 'list' || value === 'cards') {
      this.viewModeChange.emit(value);
    }
  }
}
