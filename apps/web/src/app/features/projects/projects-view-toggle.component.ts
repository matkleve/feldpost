import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ProjectsViewMode } from '../../core/projects/projects.types';

@Component({
  selector: 'app-projects-view-toggle',
  standalone: true,
  template: `
    <div
      class="projects-view-toggle"
      role="group"
      [attr.aria-label]="t('projects.viewToggle.aria.group', 'View mode')"
    >
      <button
        type="button"
        class="projects-view-toggle__button"
        [class.projects-view-toggle__button--active]="viewMode() === 'list'"
        (click)="viewModeChange.emit('list')"
        [attr.aria-label]="t('projects.viewToggle.list.aria', 'List view')"
        [attr.title]="t('projects.viewToggle.list.title', 'List view')"
      >
        <span class="material-icons" aria-hidden="true">view_list</span>
      </button>
      <button
        type="button"
        class="projects-view-toggle__button"
        [class.projects-view-toggle__button--active]="viewMode() === 'cards'"
        (click)="viewModeChange.emit('cards')"
        [attr.aria-label]="t('projects.viewToggle.cards.aria', 'Card view')"
        [attr.title]="t('projects.viewToggle.cards.title', 'Card view')"
      >
        <span class="material-icons" aria-hidden="true">grid_view</span>
      </button>
    </div>
  `,
  styles: [
    `
      .projects-view-toggle {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-1);
      }

      .projects-view-toggle__button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2.5rem;
        min-width: 2.5rem;
        border: 0;
        border-radius: var(--container-radius-control);
        background: transparent;
        color: var(--color-text-secondary);
        padding-inline: var(--spacing-2);
        cursor: pointer;
        transition:
          background-color 120ms ease,
          color 120ms ease;
      }

      .projects-view-toggle__button .material-icons {
        font-size: 1rem;
      }

      .projects-view-toggle__button:hover {
        background: color-mix(in srgb, var(--color-clay) 12%, transparent);
        color: var(--color-clay);
      }

      .projects-view-toggle__button--active {
        background: color-mix(in srgb, var(--color-clay) 14%, transparent);
        color: var(--color-clay);
      }
    `,
  ],
})
export class ProjectsViewToggleComponent {
  private readonly i18nService = inject(I18nService);

  readonly viewMode = input.required<ProjectsViewMode>();
  readonly viewModeChange = output<ProjectsViewMode>();
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);
}
