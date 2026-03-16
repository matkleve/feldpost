import { Component, input, output } from '@angular/core';
import type { ProjectsViewMode } from '../../core/projects/projects.types';

@Component({
  selector: 'app-projects-view-toggle',
  standalone: true,
  template: `
    <div class="projects-view-toggle" role="group" aria-label="View mode">
      <button
        type="button"
        class="projects-view-toggle__button"
        [class.projects-view-toggle__button--active]="viewMode() === 'list'"
        (click)="viewModeChange.emit('list')"
        aria-label="List view"
        title="List view"
      >
        <span class="material-icons" aria-hidden="true">view_list</span>
      </button>
      <button
        type="button"
        class="projects-view-toggle__button"
        [class.projects-view-toggle__button--active]="viewMode() === 'cards'"
        (click)="viewModeChange.emit('cards')"
        aria-label="Card view"
        title="Card view"
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
  readonly viewMode = input.required<ProjectsViewMode>();
  readonly viewModeChange = output<ProjectsViewMode>();
}
