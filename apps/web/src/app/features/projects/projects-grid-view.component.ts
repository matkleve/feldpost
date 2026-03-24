import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import type { ProjectColorKey } from '../../core/projects/projects.types';
import { ProjectColorPickerComponent } from './project-color-picker.component';
import {
  UiButtonDangerDirective,
  UiButtonDirective,
  UiButtonSecondaryDirective,
  UiButtonIconOnlyDirective,
  UiButtonIconWithTextDirective,
  UiButtonSizeMdDirective,
  UiCardShellDirective,
  UiCardShellSizeMdDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';
import type { ProjectGroupedSection } from './projects-page.config';

@Component({
  selector: 'app-projects-grid-view',
  standalone: true,
  imports: [
    ProjectColorPickerComponent,
    UiButtonDirective,
    UiButtonSecondaryDirective,
    UiButtonDangerDirective,
    UiButtonIconOnlyDirective,
    UiButtonIconWithTextDirective,
    UiCardShellDirective,
    UiCardShellSizeMdDirective,
    UiButtonSizeMdDirective,
  ],
  templateUrl: './projects-grid-view.component.html',
  styleUrl: './projects-grid-view.component.scss',
})
export class ProjectsGridViewComponent {
  private readonly i18nService = inject(I18nService);

  readonly section = input.required<ProjectGroupedSection>();
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);
  readonly colorTokenFor = input.required<(key: ProjectColorKey) => string>();
  readonly formatRelativeDate = input.required<(value: string | null) => string>();
  readonly coloringProjectId = input<string | null>(null);

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

  itemColor(key: ProjectColorKey): string {
    return this.colorTokenFor()(key);
  }

  relativeDate(value: string | null): string {
    return this.formatRelativeDate()(value);
  }
}
