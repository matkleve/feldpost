import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ProjectColorKey } from '../../core/projects/projects.types';
import { CardGridComponent } from '../../shared/ui-primitives/card-grid.component';
import type { CardVariant } from '../../shared/ui-primitives/card-variant.types';
import type { ProjectGroupedSection } from './projects-page.config';
import { ProjectCardComponent } from './project-card.component';

@Component({
  selector: 'app-projects-grid-view',
  standalone: true,
  imports: [CardGridComponent, ProjectCardComponent],
  templateUrl: './projects-grid-view.component.html',
  styleUrl: './projects-grid-view.component.scss',
})
export class ProjectsGridViewComponent {
  private readonly i18nService = inject(I18nService);

  readonly section = input.required<ProjectGroupedSection>();
  readonly t = (key: string, fallback = ''): string => {
    const value = this.i18nService.t(key, fallback);
    if (typeof value === 'string' && value.trim().length > 0) return value;
    if (fallback.trim().length > 0) return fallback;
    return key;
  };
  readonly colorTokenFor = input.required<(key: ProjectColorKey) => string>();
  readonly formatRelativeDate = input.required<(value: string | null) => string>();
  readonly coloringProjectId = input<string | null>(null);
  readonly cardVariant = input<CardVariant>('medium');

  readonly toggleColorPicker = output<string>();
  readonly colorSelected = output<{ projectId: string; colorKey: ProjectColorKey }>();
  readonly dangerAction = output<{ projectId: string; action: 'archive' | 'restore' | 'delete' }>();

  onToggleColorPicker(projectId: string): void {
    this.toggleColorPicker.emit(projectId);
  }

  onColorSelected(projectId: string, colorKey: ProjectColorKey): void {
    this.colorSelected.emit({ projectId, colorKey });
  }

  onDangerAction(projectId: string, action: 'archive' | 'restore' | 'delete'): void {
    this.dangerAction.emit({ projectId, action });
  }

  translate(key: string, fallback = ''): string {
    return this.t(key, fallback);
  }

  translateFn = (key: string, fallback = ''): string => this.translate(key, fallback);
}
