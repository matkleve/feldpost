import { Component, input, output } from '@angular/core';
import type { ProjectColorKey } from '../../core/projects/projects.types';

interface ProjectColorOption {
  key: ProjectColorKey;
  label: string;
  token: string;
}

const COLOR_OPTIONS: ProjectColorOption[] = [
  { key: 'clay', label: 'Clay', token: 'var(--color-clay)' },
  { key: 'accent', label: 'Accent', token: 'var(--color-accent)' },
  { key: 'success', label: 'Success', token: 'var(--color-success)' },
  { key: 'warning', label: 'Warning', token: 'var(--color-warning)' },
];

@Component({
  selector: 'app-project-color-picker',
  standalone: true,
  template: `
    <div class="project-color-picker" role="menu" aria-label="Project color">
      @for (option of colorOptions; track option.key) {
        <button
          type="button"
          class="project-color-picker__option"
          role="menuitemradio"
          [attr.aria-checked]="selectedColor() === option.key"
          [class.project-color-picker__option--active]="selectedColor() === option.key"
          (click)="colorSelected.emit(option.key)"
        >
          <span class="project-color-picker__dot" [style.background]="option.token"></span>
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .project-color-picker {
        display: grid;
        gap: var(--spacing-1);
        padding: var(--spacing-2);
        border: 1px solid var(--color-border);
        border-radius: var(--container-radius-control);
        background: var(--color-bg-elevated);
        box-shadow: var(--elevation-dropdown);
      }

      .project-color-picker__option {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-2);
        min-height: 2.5rem;
        border: 0;
        border-radius: var(--container-radius-control);
        background: transparent;
        color: var(--color-text-primary);
        padding-inline: var(--spacing-2);
        cursor: pointer;
        text-align: left;
      }

      .project-color-picker__option--active,
      .project-color-picker__option:hover {
        background: color-mix(in srgb, var(--color-clay) 8%, transparent);
      }

      .project-color-picker__dot {
        inline-size: 0.75rem;
        block-size: 0.75rem;
        border-radius: 999px;
      }
    `,
  ],
})
export class ProjectColorPickerComponent {
  readonly selectedColor = input.required<ProjectColorKey>();
  readonly colorSelected = output<ProjectColorKey>();

  protected readonly colorOptions = COLOR_OPTIONS;
}
