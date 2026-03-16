import { Component, input, output } from '@angular/core';
import type { ProjectListItem } from '../../core/projects/projects.types';

@Component({
  selector: 'app-project-card',
  standalone: true,
  template: `
    <article class="project-card" (click)="open.emit(project().id)">
      <header class="project-card__header">
        <span class="project-card__chip" [style.background]="colorToken()"></span>
        <h3 class="project-card__title">{{ project().name }}</h3>
      </header>

      <p class="project-card__badge">
        @if (project().matchingImageCount > 0) {
          {{ project().matchingImageCount }} results
        } @else {
          0 results
        }
      </p>

      <p class="project-card__meta">
        {{ project().totalImageCount }} photos ·
        {{ project().status === 'archived' ? 'Archived' : 'Active' }}
      </p>

      <footer class="project-card__actions" (click)="$event.stopPropagation()">
        <button type="button" class="project-card__btn" (click)="open.emit(project().id)">
          Open in workspace
        </button>
        <button type="button" class="project-card__btn" (click)="rename.emit(project().id)">
          Rename
        </button>
        <button type="button" class="project-card__btn" (click)="color.emit(project().id)">
          Color
        </button>
        <button
          type="button"
          class="project-card__btn project-card__btn--danger"
          (click)="archive.emit(project().id)"
        >
          Archive
        </button>
      </footer>
    </article>
  `,
  styles: [
    `
      .project-card {
        display: grid;
        gap: var(--spacing-3);
        min-height: 14rem;
        padding: var(--spacing-4);
        border: 1px solid var(--color-border);
        border-radius: var(--container-radius-panel);
        background: var(--color-bg-surface);
        box-shadow: var(--elevation-subtle);
        cursor: pointer;
      }

      .project-card__header {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
      }

      .project-card__chip {
        inline-size: 0.75rem;
        block-size: 0.75rem;
        border-radius: 999px;
      }

      .project-card__title {
        font-size: 1rem;
        line-height: 1.3;
        color: var(--color-text-primary);
      }

      .project-card__badge {
        color: var(--color-text-primary);
        font-size: 0.875rem;
      }

      .project-card__meta {
        color: var(--color-text-secondary);
        font-size: 0.8125rem;
      }

      .project-card__actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-2);
      }

      .project-card__btn {
        min-height: 2.75rem;
        border: 1px solid var(--color-border);
        border-radius: var(--container-radius-control);
        background: var(--color-bg-surface);
        color: var(--color-text-primary);
        padding-inline: var(--spacing-2);
        cursor: pointer;
      }

      .project-card__btn--danger {
        color: var(--color-danger);
      }
    `,
  ],
})
export class ProjectCardComponent {
  readonly project = input.required<ProjectListItem>();
  readonly colorToken = input.required<string>();

  readonly open = output<string>();
  readonly rename = output<string>();
  readonly color = output<string>();
  readonly archive = output<string>();
}
