import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { FilterService } from '../../core/filter/filter.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ProjectsService } from '../../core/projects/projects.service';
import { ToastService } from '../../core/toast/toast.service';
import { WorkspacePaneObserverAdapter } from '../../core/workspace-pane-observer.adapter';
import type { SelectedItemsContextPort } from '../../core/workspace-pane-context.port';
import type {
  ProjectColorKey,
  ProjectListItem,
  ProjectStatusFilter,
  ProjectsViewMode,
} from '../../core/projects/projects.types';
import { GroupHeaderComponent } from '../../shared/ui-primitives/group-header.component';
import { type GroupingProperty } from '../../shared/dropdown-trigger/grouping-dropdown.component';
import type { SortConfig } from '../../core/workspace-view/workspace-view.types';
import { ProjectsConfirmDialogComponent } from './projects-confirm-dialog.component';
import { ProjectsGridViewComponent } from './projects-grid-view.component';
import { ProjectsPageHeaderComponent } from './projects-page-header.component';
import {
  applyProjectFilters,
  buildGroupedSections,
  colorTokenFor,
  formatRelativeDate,
  pendingActionConfirmLabel,
  pendingActionMessage,
  pendingActionTitle,
  projectLabel,
  projectStatusLabel,
  sortProjects,
  tableAriaSort,
  tableSortDirection,
} from './projects-page.logic';
import { ProjectsTableViewComponent } from './projects-table-view.component';
import { ProjectsToolbarComponent } from './projects-toolbar.component';
import { CardVariantSettingsService } from '../../shared/ui-primitives/card-variant-settings.service';
import { CARD_VARIANTS, type CardVariant } from '../../shared/ui-primitives/card-variant.types';
import {
  UiButtonDirective,
  UiButtonSecondaryDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';

import {
  FILTER_OPTIONS,
  GROUPING_OPTIONS,
  type PendingProjectAction,
  type ProjectGroupedSection,
  SORT_OPTIONS,
} from './projects-page.config';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [
    CommonModule,
    GroupHeaderComponent,
    ProjectsConfirmDialogComponent,
    ProjectsGridViewComponent,
    ProjectsPageHeaderComponent,
    ProjectsTableViewComponent,
    ProjectsToolbarComponent,
    UiButtonDirective,
    UiButtonSecondaryDirective,
  ],
  templateUrl: './projects-page.component.html',
  styleUrl: './projects-page.component.scss',
  providers: [FilterService],
})
export class ProjectsPageComponent implements OnDestroy {
  private readonly i18nService = inject(I18nService);
  private readonly projectsService = inject(ProjectsService);
  private readonly filterService = inject(FilterService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  private readonly cardVariantSettings = inject(CardVariantSettingsService);

  // Project-scoped media selection for workspace pane
  private readonly projectMediaIds = signal<Set<string>>(new Set());
  readonly t = (key: string, fallback = ''): string => {
    const value = this.i18nService.t(key, fallback);
    if (typeof value === 'string' && value.trim().length > 0) return value;
    if (fallback.trim().length > 0) return fallback;
    return key;
  };

  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  readonly currentProjectId = computed(() => {
    const match = this.currentUrl().match(/^\/projects\/([^/?#]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  });

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly projects = signal<ProjectListItem[]>([]);
  readonly statusFilter = signal<ProjectStatusFilter>('all');
  readonly viewMode = signal<ProjectsViewMode>('cards');
  readonly cardVariant = signal<CardVariant>(this.cardVariantSettings.getVariant('projects'));
  readonly activeGroupings = signal<GroupingProperty[]>([]);
  readonly activeSorts = signal<SortConfig[]>([]);
  readonly creatingProject = signal(false);
  readonly coloringProjectId = signal<string | null>(null);
  readonly pendingProjectAction = signal<PendingProjectAction>(null);
  readonly pendingProjectId = signal<string | null>(null);
  readonly pendingActionBusy = signal(false);

  readonly groupingOptions = computed(() =>
    GROUPING_OPTIONS.map((option) => ({
      ...option,
      label: projectLabel(option.id, option.label, this.t),
    })),
  );
  readonly filterOptions = computed(() =>
    FILTER_OPTIONS.map((option) => ({
      ...option,
      label: projectLabel(option.id, option.label, this.t),
    })),
  );
  readonly sortOptions = computed(() =>
    SORT_OPTIONS.map((option) => ({
      ...option,
      label: projectLabel(option.id, option.label, this.t),
    })),
  );
  readonly hasArchivedProjects = computed(() =>
    this.projects().some((project) => project.status === 'archived'),
  );
  readonly hasGrouping = computed(() => this.activeGroupings().length > 0);
  readonly hasFilters = computed(() => this.filterService.activeCount() > 0);
  readonly hasCustomSort = computed(() => this.activeSorts().length > 0);
  readonly hasPendingAction = computed(
    () => !!this.pendingProjectAction() && !!this.pendingProjectId(),
  );
  readonly allowedCardVariants = CARD_VARIANTS;
  readonly pendingProject = computed(() => {
    const projectId = this.pendingProjectId();
    if (!projectId) {
      return null;
    }

    return this.projects().find((project) => project.id === projectId) ?? null;
  });
  readonly currentProject = computed(() => {
    const projectId = this.currentProjectId();
    if (!projectId) {
      return null;
    }

    return this.projects().find((project) => project.id === projectId) ?? null;
  });
  readonly breadcrumbCurrentLabel = computed(
    () => this.currentProject()?.name ?? this.currentProjectId() ?? '',
  );
  readonly visibleProjects = computed(() => {
    const status = this.statusFilter();
    const rules = this.filterService.rules().filter((rule) => rule.property && rule.operator);
    const statusScoped = this.projects().filter((project) =>
      status === 'all' ? true : project.status === status,
    );
    const filterScoped = applyProjectFilters(statusScoped, rules);
    return sortProjects(filterScoped, this.activeSorts());
  });
  readonly groupedSections = computed<ProjectGroupedSection[]>(() => {
    const projects = this.visibleProjects();
    const groupings = this.activeGroupings();
    if (groupings.length === 0) {
      return [
        { id: 'all-projects', heading: '', level: 0, projectCount: projects.length, projects },
      ];
    }
    return buildGroupedSections(projects, groupings, [], this.t);
  });
  readonly projectCountLabel = computed(() => {
    const total = this.visibleProjects().length;
    if (total === 1) {
      return this.t('projects.page.count.single', '1 project');
    }
    return this.t('projects.page.count.multi', '{count} projects').replace(
      '{count}',
      String(total),
    );
  });
  readonly tableSortDirectionFn = (columnKey: string): 'asc' | 'desc' | null =>
    tableSortDirection(this.activeSorts(), columnKey);
  readonly tableAriaSortFn = (columnKey: string): 'ascending' | 'descending' | 'none' =>
    tableAriaSort(this.activeSorts(), columnKey);
  readonly colorTokenForFn = (key: ProjectColorKey): string => colorTokenFor(key);
  readonly formatRelativeDateFn = (value: string | null): string =>
    formatRelativeDate(value, this.t);
  readonly projectStatusLabelFn = (status: ProjectListItem['status']): string =>
    projectStatusLabel(status, this.t);

  constructor() {
    effect(() => {
      this.cardVariantSettings.setVariant('projects', this.cardVariant());
    });

    effect(() => {
      const labelsById = new Map(this.groupingOptions().map((option) => [option.id, option.label]));
      this.activeGroupings.update((current) =>
        current.map((entry) => ({ ...entry, label: labelsById.get(entry.id) ?? entry.label })),
      );
    });

    // Bind/unbind workspace pane context when project is selected
    effect(() => {
      const projectId = this.currentProjectId();
      if (projectId) {
        // Project selected: bind project-scoped context
        const projectsSelectedItemsContext: SelectedItemsContextPort = {
          contextKey: 'projects',
          selectedMediaIds$: this.projectMediaIds,
          requestOpenDetail: () => {
            // TODO: Open detail view for project media
          },
          requestSetHover: () => {
            // TODO: Set hover state for project media
          },
        };
        this.workspacePaneObserver.onContextRebind(projectsSelectedItemsContext);
      } else {
        // No project selected: keep context unbound (workspace pane empty)
        // onRouteLeave will be called in ngOnDestroy
      }
    });

    void this.refreshProjects();
  }

  ngOnDestroy(): void {
    this.workspacePaneObserver.onRouteLeave('projects');
  }

  async refreshProjects(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const projects = await this.projectsService.loadProjects();
      this.projects.set(projects);
    } catch {
      this.loadError.set(this.t('projects.page.error.title', 'Could not load projects'));
    } finally {
      this.loading.set(false);
    }
  }

  onStatusFilterChange(value: ProjectStatusFilter): void {
    this.statusFilter.set(value);
  }

  async onNewProject(): Promise<void> {
    if (this.creatingProject()) {
      return;
    }

    this.creatingProject.set(true);

    try {
      const draft = await this.projectsService.createDraftProject();
      if (!draft) {
        this.toastService.show({
          message: this.t(
            'projects.page.toast.createError',
            'Could not create project. Please try again.',
          ),
          type: 'error',
          dedupe: true,
        });
        return;
      }

      this.projects.update((all) => [draft, ...all]);
      this.viewMode.set('cards');
    } finally {
      this.creatingProject.set(false);
    }
  }

  toggleColorPicker(projectId: string): void {
    this.coloringProjectId.update((current) => (current === projectId ? null : projectId));
  }

  async onColorSelected(projectId: string, colorKey: ProjectColorKey): Promise<void> {
    const persisted = await this.projectsService.setProjectColor(projectId, colorKey);
    if (!persisted) {
      return;
    }

    this.projects.update((all) =>
      all.map((project) => (project.id === projectId ? { ...project, colorKey } : project)),
    );
    this.coloringProjectId.set(null);
  }

  requestDangerAction(projectId: string, action: Exclude<PendingProjectAction, null>): void {
    this.pendingProjectId.set(projectId);
    this.pendingProjectAction.set(action);
    this.coloringProjectId.set(null);
  }

  cancelPendingAction(): void {
    if (this.pendingActionBusy()) {
      return;
    }

    this.pendingProjectId.set(null);
    this.pendingProjectAction.set(null);
  }

  async confirmPendingAction(): Promise<void> {
    const projectId = this.pendingProjectId();
    const action = this.pendingProjectAction();
    if (!projectId || !action) {
      this.cancelPendingAction();
      return;
    }

    this.pendingActionBusy.set(true);

    try {
      if (action === 'archive') {
        const persisted = await this.projectsService.archiveProject(projectId);
        if (!persisted) {
          this.showMutationError(
            'projects.page.toast.archiveError',
            'Could not archive project. Please try again.',
          );
          return;
        }

        const archivedAt = new Date().toISOString();
        this.projects.update((all) =>
          all.map((project) =>
            project.id === projectId
              ? { ...project, archivedAt, status: 'archived', updatedAt: archivedAt }
              : project,
          ),
        );
      }

      if (action === 'restore') {
        const persisted = await this.projectsService.restoreProject(projectId);
        if (!persisted) {
          this.showMutationError(
            'projects.page.toast.restoreError',
            'Could not restore project. Please try again.',
          );
          return;
        }

        const restoredAt = new Date().toISOString();
        this.projects.update((all) =>
          all.map((project) =>
            project.id === projectId
              ? { ...project, archivedAt: null, status: 'active', updatedAt: restoredAt }
              : project,
          ),
        );
      }

      if (action === 'delete') {
        const persisted = await this.projectsService.deleteProject(projectId);
        if (!persisted) {
          this.showMutationError(
            'projects.page.toast.deleteError',
            'Could not delete archived project. Please try again.',
          );
          return;
        }

        this.projects.update((all) => all.filter((project) => project.id !== projectId));
      }

      this.pendingProjectId.set(null);
      this.pendingProjectAction.set(null);
    } finally {
      this.pendingActionBusy.set(false);
    }
  }

  pendingActionTitle(): string {
    return pendingActionTitle(this.pendingProjectAction(), this.t);
  }

  pendingActionMessage(): string {
    const name =
      this.pendingProject()?.name ??
      this.t('projects.page.pending.subject.thisProject', 'this project');
    return pendingActionMessage(this.pendingProjectAction(), name, this.t);
  }

  pendingActionConfirmLabel(): string {
    return pendingActionConfirmLabel(this.pendingProjectAction(), this.t);
  }

  private showMutationError(key: string, fallback: string): void {
    this.toastService.show({
      message: this.t(key, fallback),
      type: 'error',
      dedupe: true,
    });
  }
}
