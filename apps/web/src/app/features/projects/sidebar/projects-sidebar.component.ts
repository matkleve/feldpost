import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ProjectListItem } from '../../../core/projects/projects.types';
import type { SortConfig } from '../../../core/workspace-view/workspace-view.types';
import { I18nService } from '../../../core/i18n/i18n.service';
import { colorTokenFor } from '../page/projects-page.logic';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { PageRailTitleComponent } from '../../../shared/page-rail-title';
import { RailSearchFieldComponent } from '../../../shared/rail-search-field';
import { RailSelectListComponent, type RailSelectListItem } from '../../../shared/rail-select-list';
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
    PageRailTitleComponent,
    RailSearchFieldComponent,
    RailSelectListComponent,
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
  readonly projectArchiveRequested = output<string>();
  readonly projectRestoreRequested = output<string>();
  readonly projectDeleteRequested = output<string>();
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

  readonly projectListItems = computed<RailSelectListItem[]>(() =>
    this.projects().map((project) => {
      const actions: RailSelectListItem['actions'] =
        project.status === 'active'
          ? [
              {
                type: 'button',
                action: {
                  id: 'archive',
                  icon: 'inventory_2',
                  ariaLabel: this.t('projects.page.action.archive', 'Archive'),
                  title: this.t('projects.page.action.archive', 'Archive'),
                },
              },
            ]
          : [
              {
                type: 'button',
                action: {
                  id: 'restore',
                  icon: 'unarchive',
                  ariaLabel: this.t('projects.page.action.restore', 'Restore'),
                  title: this.t('projects.page.action.restore', 'Restore'),
                },
              },
              {
                type: 'confirm',
                action: {
                  id: 'delete',
                  idleIcon: 'delete',
                  armedIcon: 'warning',
                  initialAriaKey: 'projects.sidebar.action.delete',
                  initialAriaFallback: 'Delete project',
                  initialTitleKey: 'projects.sidebar.action.delete',
                  initialTitleFallback: 'Delete project',
                  confirmAriaKey: 'projects.sidebar.action.confirmDelete',
                  confirmAriaFallback: 'Confirm delete project',
                  tone: 'danger',
                },
              },
            ];

      return {
        id: project.id,
        label: project.name,
        leading: { kind: 'dot', color: colorTokenFor(project.colorKey) },
        actions,
      };
    }),
  );

  readonly projectListEmptyMessage = computed(() =>
    this.showArchived()
      ? this.t('projects.sidebar.empty.archived', 'No archived projects')
      : this.t('projects.sidebar.empty.active', 'No active projects'),
  );

  onProjectClick(projectId: string): void {
    this.projectSelected.emit(projectId);
  }

  onProjectListAction(event: { itemId: string; actionId: string }): void {
    switch (event.actionId) {
      case 'archive':
        this.projectArchiveRequested.emit(event.itemId);
        break;
      case 'restore':
        this.projectRestoreRequested.emit(event.itemId);
        break;
      case 'delete':
        this.projectDeleteRequested.emit(event.itemId);
        break;
    }
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
