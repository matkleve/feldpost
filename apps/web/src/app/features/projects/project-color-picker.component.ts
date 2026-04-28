import { Component, input, output } from '@angular/core';
import type { ProjectColorKey } from '../../core/projects/projects.types';

@Component({
  selector: 'app-project-color-picker',
  standalone: true,
  templateUrl: './project-color-picker.component.html',
  styleUrl: './project-color-picker.component.scss',
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
