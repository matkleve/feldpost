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
      >
        List
      </button>
      <button
        type="button"
        class="projects-view-toggle__button"
        [class.projects-view-toggle__button--active]="viewMode() === 'cards'"
        (click)="viewModeChange.emit('cards')"
      >
        Cards
      </button>
    </div>
  `,
  styles: [
    `
      .projects-view-toggle {
        display: inline-flex;
        border: 1px solid var(--color-border);
        border-radius: var(--container-radius-pill);
        overflow: hidden;
      }

      .projects-view-toggle__button {
        min-height: 2.75rem;
        min-width: 4.75rem;
        border: 0;
        background: var(--color-bg-surface);
        color: var(--color-text-secondary);
        padding-inline: var(--spacing-4);
        font-size: 0.875rem;
        cursor: pointer;
        transition:
          background-color 120ms ease,
          color 120ms ease;
      }

      .projects-view-toggle__button--active {
        background: color-mix(in srgb, var(--color-clay) 14%, var(--color-bg-surface));
        color: var(--color-text-primary);
      }
    `,
  ],
})
export class ProjectsViewToggleComponent {
  readonly viewMode = input.required<ProjectsViewMode>();
  readonly viewModeChange = output<ProjectsViewMode>();
}
