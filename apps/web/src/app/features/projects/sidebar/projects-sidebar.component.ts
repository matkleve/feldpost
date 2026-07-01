import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ProjectListItem } from '../../../core/projects/projects.types';
import type { SortConfig } from '../../../core/workspace-view/workspace-view.types';
import { I18nService } from '../../../core/i18n/i18n.service';
import { colorTokenFor } from '../page/projects-page.logic';
import {
  PROJECT_SIDEBAR_ACTIVITY_GROUP_ORDER,
  projectSidebarActivityGroupKey,
  type ProjectSidebarActivityGroupKey,
} from '../logic/projects-formatters.logic';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { PageRailComponent } from '../../../shared/page-rail';
import { PageRailTitleComponent } from '../../../shared/page-rail-title';
import { RailNavButtonComponent } from '../../../shared/rail-nav-button';
import { RailSearchFieldComponent } from '../../../shared/rail-search-field';
import { RailGroupHeadingComponent } from '../../../shared/rail-group-heading';
import { RailSectionComponent } from '../../../shared/rail-section';
import { RailStatusComponent } from '../../../shared/rail-status';
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

interface ProjectSidebarTimeGroup {
  key: ProjectSidebarActivityGroupKey;
  label: string;
  items: RailSelectListItem[];
}

@Component({
  selector: 'app-projects-sidebar',
  standalone: true,
  imports: [
    FormsModule,
    PageRailComponent,
    PageRailTitleComponent,
    RailNavButtonComponent,
    RailSearchFieldComponent,
    RailGroupHeadingComponent,
    RailSectionComponent,
    RailStatusComponent,
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
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

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
  readonly starredExpanded = signal(true);
  readonly projectsExpanded = signal(true);
  readonly starredProjectIds = signal<Set<string>>(this.readStarredProjectIds());

  private static readonly STARRED_PROJECTS_STORAGE_KEY = 'feldpost.projects.starred';

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

  readonly starredProjectItems = computed(() =>
    this.projects()
      .filter((project) => this.starredProjectIds().has(project.id))
      .map((project) => this.toProjectListItem(project)),
  );

  readonly projectTimeGroups = computed((): ProjectSidebarTimeGroup[] => {
    const starred = this.starredProjectIds();
    const buckets = new Map<ProjectSidebarActivityGroupKey, ProjectListItem[]>();

    for (const project of this.projects()) {
      if (starred.has(project.id)) {
        continue;
      }
      const key = projectSidebarActivityGroupKey(project.lastActivity, project.updatedAt);
      const list = buckets.get(key) ?? [];
      list.push(project);
      buckets.set(key, list);
    }

    return PROJECT_SIDEBAR_ACTIVITY_GROUP_ORDER.flatMap((key) => {
      const projectsInGroup = buckets.get(key);
      if (!projectsInGroup?.length) {
        return [];
      }
      return [
        {
          key,
          label: this.activityGroupLabel(key),
          items: projectsInGroup.map((project) => this.toProjectListItem(project)),
        },
      ];
    });
  });

  readonly hasVisibleProjects = computed(
    () =>
      this.starredProjectItems().length > 0 ||
      this.projectTimeGroups().some((group) => group.items.length > 0),
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
      case 'star':
        this.toggleProjectStar(event.itemId);
        break;
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

  private activityGroupLabel(key: ProjectSidebarActivityGroupKey): string {
    switch (key) {
      case 'today':
        return this.t('projects.sidebar.group.today', 'Today');
      case 'lastWeek':
        return this.t('projects.sidebar.group.lastWeek', 'Last week');
      case 'lastMonth':
        return this.t('projects.sidebar.group.lastMonth', 'Last month');
      case 'older':
        return this.t('projects.sidebar.group.older', 'Older');
    }
  }

  private toProjectListItem(project: ProjectListItem): RailSelectListItem {
    const isStarred = this.starredProjectIds().has(project.id);
    const actions: RailSelectListItem['actions'] = [
      {
        type: 'button',
        action: {
          id: 'star',
          icon: isStarred ? 'star' : 'star_border',
          alwaysVisible: isStarred,
          active: isStarred,
          ariaLabel: isStarred
            ? this.t('projects.sidebar.action.unstar', 'Remove from favorites')
            : this.t('projects.sidebar.action.star', 'Add to favorites'),
          title: isStarred
            ? this.t('projects.sidebar.action.unstar', 'Remove from favorites')
            : this.t('projects.sidebar.action.star', 'Add to favorites'),
        },
      },
      ...(project.status === 'active'
        ? [
            {
              type: 'button' as const,
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
              type: 'button' as const,
              action: {
                id: 'restore',
                icon: 'unarchive',
                ariaLabel: this.t('projects.page.action.restore', 'Restore'),
                title: this.t('projects.page.action.restore', 'Restore'),
              },
            },
            {
              type: 'confirm' as const,
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
                tone: 'danger' as const,
              },
            },
          ]),
    ];

    return {
      id: project.id,
      label: project.name,
      leading: { kind: 'dot', color: colorTokenFor(project.colorKey) },
      actions,
    };
  }

  private toggleProjectStar(projectId: string): void {
    this.starredProjectIds.update((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      this.persistStarredProjectIds(next);
      return next;
    });
  }

  private readStarredProjectIds(): Set<string> {
    try {
      const raw = localStorage.getItem(ProjectsSidebarComponent.STARRED_PROJECTS_STORAGE_KEY);
      if (!raw) {
        return new Set();
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return new Set();
      }
      return new Set(parsed.filter((id): id is string => typeof id === 'string'));
    } catch {
      return new Set();
    }
  }

  private persistStarredProjectIds(ids: Set<string>): void {
    localStorage.setItem(
      ProjectsSidebarComponent.STARRED_PROJECTS_STORAGE_KEY,
      JSON.stringify([...ids]),
    );
  }
}
