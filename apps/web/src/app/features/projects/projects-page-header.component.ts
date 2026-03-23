import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiButtonDirective, UiButtonPrimaryDirective } from '../../shared/ui-primitives.directive';

@Component({
  selector: 'app-projects-page-header',
  standalone: true,
  imports: [CommonModule, RouterLink, UiButtonDirective, UiButtonPrimaryDirective],
  templateUrl: './projects-page-header.component.html',
  styleUrl: './projects-page-header.component.scss',
})
export class ProjectsPageHeaderComponent {
  readonly currentProjectId = input<string | null>(null);
  readonly breadcrumbCurrentLabel = input<string>('');
  readonly projectCountLabel = input<string>('');
  readonly loading = input<boolean>(false);
  readonly t = input.required<(key: string, fallback?: string) => string>();

  readonly newProject = output<void>();

  onNewProject(): void {
    this.newProject.emit();
  }

  translate(key: string, fallback = ''): string {
    return this.t()(key, fallback);
  }
}
