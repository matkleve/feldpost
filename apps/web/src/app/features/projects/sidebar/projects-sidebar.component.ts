import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ProjectListItem } from '../../../core/projects/projects.types';
import type { SortConfig } from '../../../core/workspace-view/workspace-view.types';
import { I18nService } from '../../../core/i18n/i18n.service';
import { colorTokenFor } from '../page/projects-page.logic';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { ToolbarDropdownStackComponent } from '../../../shared/dropdown-trigger/toolbar/toolbar-dropdown-stack.component';
import {
  FilterDropdownComponent,
  type FilterDropdownPropertyOption,
} from '../../../shared/dropdown-trigger/filter/filter-dropdown.component';
import {
  SortDropdownComponent,
  type SortDropdownOption,
} from '../../../shared/dropdown-trigger/sort/sort-dropdown.component';

type ProjectsSidebarDropdown = 'filter' | 'sort' | null;

@Component({
  selector: 'app-projects-sidebar',
  standalone: true,
  imports: [
    FormsModule,
    ToolbarDropdownStackComponent,
    FilterDropdownComponent,
    SortDropdownComponent,
    ...HLM_BUTTON_IMPORTS,
  ],
  templateUrl: './projects-sidebar.component.html',
  styleUrl: './projects-sidebar.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-col',
  },
})
export class ProjectsSidebarComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly projects = input<ProjectListItem[]>([]);
  readonly selectedProjectId = input<string | null>(null);
  readonly showArchived = input(false);
  readonly dashboardActive = input(false);
  readonly loading = input(false);
  readonly searchQuery = input('');
  readonly filterOptions = input<FilterDropdownPropertyOption[]>([]);
  readonly sortOptions = input<SortDropdownOption[]>([]);
  readonly activeSorts = input<SortConfig[]>([]);
  readonly hasFilters = input(false);
  readonly hasCustomSort = input(false);

  readonly dashboardSelected = output<void>();
  readonly projectSelected = output<string>();
  readonly archiveToggled = output<void>();
  readonly searchQueryChange = output<string>();
  readonly sortChanged = output<SortConfig[]>();
  readonly newProject = output<void>();

  readonly activeDropdown = signal<ProjectsSidebarDropdown>(null);
  readonly dropdownAnchor = signal<HTMLElement | null>(null);
  readonly isDragging = signal(false);

  readonly toolbarButtons = computed(() => [
    {
      id: 'filter' as const,
      icon: 'filter_list',
      label: this.t('workspace.toolbar.button.filter', 'Filter'),
      active: this.hasFilters(),
    },
    {
      id: 'sort' as const,
      icon: 'sort',
      label: this.t('workspace.toolbar.button.sort', 'Sort'),
      active: this.hasCustomSort(),
    },
  ]);

  colorFor(project: ProjectListItem): string {
    return colorTokenFor(project.colorKey);
  }

  onProjectClick(projectId: string): void {
    this.projectSelected.emit(projectId);
  }

  onSearchInput(value: string): void {
    this.searchQueryChange.emit(value);
  }

  toggleDropdown(id: ProjectsSidebarDropdown, event: MouseEvent): void {
    if (this.activeDropdown() === id) {
      this.activeDropdown.set(null);
      this.dropdownAnchor.set(null);
      return;
    }

    this.dropdownAnchor.set(event.currentTarget as HTMLElement);
    this.activeDropdown.set(id);
  }

  closeDropdown(): void {
    this.activeDropdown.set(null);
    this.dropdownAnchor.set(null);
  }

  onSortChanged(sorts: SortConfig[]): void {
    this.sortChanged.emit(sorts);
  }
}
