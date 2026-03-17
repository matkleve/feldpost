import { Component, input, output } from '@angular/core';
import type { ProjectColorKey } from '../../core/projects/projects.types';

@Component({
  selector: 'app-project-color-picker',
  standalone: true,
  template: `
    <div class="project-color-picker option-menu-surface" role="menu" aria-label="Project color">
      <div class="dd-items">
        <button type="button" class="dd-item" (click)="pickRandomBrandHue()">
          <span class="material-icons dd-item__icon" aria-hidden="true">palette</span>
          <span class="dd-item__label">Random brand hue</span>
          <span
            class="dd-item__trailing project-color-picker__swatch"
            [style.background]="previewColor()"
          ></span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .project-color-picker {
        min-width: 14rem;
      }

      .project-color-picker .dd-items {
        max-height: none;
      }

      .project-color-picker .dd-item {
        width: 100%;
      }

      .project-color-picker__swatch {
        inline-size: 1rem;
        block-size: 1rem;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--color-border-strong) 64%, var(--color-border));
      }
    `,
  ],
})
export class ProjectColorPickerComponent {
  readonly selectedColor = input.required<ProjectColorKey>();
  readonly colorSelected = output<ProjectColorKey>();

  protected previewColor(): string {
    const match = this.selectedColor().match(/^brand-hue-(\d{1,3})$/);
    if (match) {
      const hue = Number.parseInt(match[1], 10);
      if (Number.isFinite(hue)) {
        return `hsl(${hue} 58% 52%)`;
      }
    }
    return 'var(--color-clay)';
  }

  protected pickRandomBrandHue(): void {
    const hue = Math.floor(Math.random() * 360);
    this.colorSelected.emit(`brand-hue-${hue}`);
  }
}
