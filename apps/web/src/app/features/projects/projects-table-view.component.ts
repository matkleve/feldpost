import { Component, input } from '@angular/core';
import type { ProjectColorKey, ProjectListItem } from '../../core/projects/projects.types';
import {
  UiRowShellDirective,
  UiRowShellSizeSmDirective,
  UiStatusBadgeDirective,
  UiStatusBadgeSizeSmDirective,
} from '../../shared/ui-primitives.directive';
import type { ProjectGroupedSection } from './projects-page.config';

@Component({
  selector: 'app-projects-table-view',
  standalone: true,
  imports: [
    UiRowShellDirective,
    UiRowShellSizeSmDirective,
    UiStatusBadgeDirective,
    UiStatusBadgeSizeSmDirective,
  ],
  templateUrl: './projects-table-view.component.html',
  styleUrl: './projects-table-view.component.scss',
})
export class ProjectsTableViewComponent {
  readonly section = input.required<ProjectGroupedSection>();
  readonly t = input.required<(key: string, fallback?: string) => string>();
  readonly tableAriaSort =
    input.required<(columnKey: string) => 'ascending' | 'descending' | 'none'>();
  readonly tableSortDirection = input.required<(columnKey: string) => 'asc' | 'desc' | null>();
  readonly colorTokenFor = input.required<(key: ProjectColorKey) => string>();
  readonly projectStatusLabel = input.required<(status: ProjectListItem['status']) => string>();
  readonly formatRelativeDate = input.required<(value: string | null) => string>();

  translate(key: string, fallback = ''): string {
    return this.t()(key, fallback);
  }

  ariaSort(columnKey: string): 'ascending' | 'descending' | 'none' {
    return this.tableAriaSort()(columnKey);
  }

  sortDirection(columnKey: string): 'asc' | 'desc' | null {
    return this.tableSortDirection()(columnKey);
  }

  itemColor(key: ProjectColorKey): string {
    return this.colorTokenFor()(key);
  }

  statusLabel(status: ProjectListItem['status']): string {
    return this.projectStatusLabel()(status);
  }

  relativeDate(value: string | null): string {
    return this.formatRelativeDate()(value);
  }
}
