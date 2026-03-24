import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import {
  UiButtonDirective,
  UiButtonPrimaryDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';

@Component({
  selector: 'app-projects-page-header',
  standalone: true,
  imports: [CommonModule, RouterLink, UiButtonDirective, UiButtonPrimaryDirective],
  templateUrl: './projects-page-header.component.html',
  styleUrl: './projects-page-header.component.scss',
})
export class ProjectsPageHeaderComponent {
  private readonly i18nService = inject(I18nService);

  readonly currentProjectId = input<string | null>(null);
  readonly breadcrumbCurrentLabel = input<string>('');
  readonly projectCountLabel = input<string>('');
  readonly loading = input<boolean>(false);

  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly newProject = output<void>();

  onNewProject(): void {
    this.newProject.emit();
  }
}
