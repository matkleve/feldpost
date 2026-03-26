import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { CardVariant } from '../../shared/ui-primitives/card-variant.types';
import type { ProjectColorKey, ProjectListItem } from '../../core/projects/projects.types';
import { ProjectColorPickerComponent } from './project-color-picker.component';
import {
  UiButtonDangerDirective,
  UiButtonDirective,
  UiButtonIconOnlyDirective,
  UiButtonIconWithTextDirective,
  UiButtonSecondaryDirective,
  UiButtonSizeMdDirective,
  UiCardShellDirective,
  UiCardShellSizeMdDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';
import { I18nService } from '../../core/i18n/i18n.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [
    ProjectColorPickerComponent,
    UiButtonDirective,
    UiButtonSecondaryDirective,
    UiButtonDangerDirective,
    UiButtonIconOnlyDirective,
    UiButtonIconWithTextDirective,
    UiButtonSizeMdDirective,
    UiCardShellDirective,
    UiCardShellSizeMdDirective,
  ],
  templateUrl: './project-card.component.html',
  styleUrl: './project-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCardComponent {
  readonly project = input.required<ProjectListItem>();
  readonly variant = input<CardVariant>('medium');
  readonly coloringProjectId = input<string | null>(null);
  readonly colorTokenFor = input.required<(key: ProjectColorKey) => string>();
  readonly formatRelativeDate = input.required<(value: string | null) => string>();

  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

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
}
