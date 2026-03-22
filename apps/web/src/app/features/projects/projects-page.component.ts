import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { FilterService } from '../../core/filter.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ProjectsService } from '../../core/projects/projects.service';
import { ToastService } from '../../core/toast.service';
import type {
  ProjectColorKey,
  ProjectListItem,
  ProjectStatusFilter,
  ProjectsViewMode,
} from '../../core/projects/projects.types';
import { GroupHeaderComponent } from '../map/workspace-pane/group-header.component';
import { type GroupingProperty } from '../map/workspace-pane/workspace-toolbar/grouping-dropdown.component';
import { type FilterDropdownPropertyOption } from '../map/workspace-pane/workspace-toolbar/filter-dropdown.component';
import { type SortDropdownOption } from '../map/workspace-pane/workspace-toolbar/sort-dropdown.component';
import type { SortConfig } from '../../core/workspace-view.types';
import { ProjectColorPickerComponent } from './project-color-picker.component';
import { ProjectsToolbarComponent } from './projects-toolbar.component';

interface ProjectGroupedSection {
  id: string;
  heading: string;
  level: number;
  projectCount: number;
  projects: ProjectListItem[];
}

type PendingProjectAction = 'archive' | 'restore' | 'delete' | null;

const GROUPING_OPTIONS: GroupingProperty[] = [
  { id: 'status', icon: 'inventory_2', label: 'Status' },
  { id: 'district', icon: 'map', label: 'Primary district' },
  { id: 'city', icon: 'location_city', label: 'Primary city' },
  { id: 'color-key', icon: 'palette', label: 'Color' },
];

const FILTER_OPTIONS: FilterDropdownPropertyOption[] = [
  { id: 'name', type: 'text', label: 'Name' },
  { id: 'status', type: 'text', label: 'Status' },
  { id: 'district', type: 'text', label: 'Primary district' },
  { id: 'city', type: 'text', label: 'Primary city' },
  { id: 'color-key', type: 'text', label: 'Color' },
  { id: 'image-count', type: 'number', label: 'Image count' },
  { id: 'updated-at', type: 'date', label: 'Updated' },
  { id: 'last-activity', type: 'date', label: 'Last activity' },
];

const SORT_OPTIONS: SortDropdownOption[] = [
  { id: 'name', icon: 'sort_by_alpha', defaultDirection: 'asc', label: 'Name' },
  { id: 'updated-at', icon: 'update', defaultDirection: 'desc', label: 'Updated' },
  { id: 'last-activity', icon: 'history', defaultDirection: 'desc', label: 'Last activity' },
  { id: 'image-count', icon: 'photo_library', defaultDirection: 'desc', label: 'Image count' },
  { id: 'status', icon: 'inventory_2', defaultDirection: 'asc', label: 'Status' },
  { id: 'district', icon: 'map', defaultDirection: 'asc', label: 'Primary district' },
  { id: 'city', icon: 'location_city', defaultDirection: 'asc', label: 'Primary city' },
  { id: 'color-key', icon: 'palette', defaultDirection: 'asc', label: 'Color' },
];

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    GroupHeaderComponent,
    ProjectsToolbarComponent,
    ProjectColorPickerComponent,
  ],
  template: `
    <main class="projects-page">
      <section class="projects-rail">
        <header class="projects-header">
          <div class="projects-header__actions">
            <button
              type="button"
              class="ui-button ui-button--primary projects-header__new"
              [disabled]="loading()"
              (click)="onNewProject()"
              [attr.aria-label]="t('projects.page.action.newProject', 'New project')"
            >
              <span class="material-icons" aria-hidden="true">add</span>
              <span>{{ t('projects.page.action.newProject', 'New project') }}</span>
            </button>
          </div>

          <div class="projects-header__title-wrap">
            @if (currentProjectId()) {
              <nav
                class="projects-breadcrumbs"
                [attr.aria-label]="t('nav.item.projects', 'Projects')"
              >
                <a
                  class="projects-breadcrumbs__item projects-breadcrumbs__item--link"
                  [routerLink]="['/projects']"
                >
                  {{ t('nav.item.projects', 'Projects') }}
                </a>
                <span class="projects-breadcrumbs__separator" aria-hidden="true">/</span>
                <span class="projects-breadcrumbs__item projects-breadcrumbs__item--current">
                  {{ breadcrumbCurrentLabel() }}
                </span>
              </nav>
            }
            <h1 class="projects-header__title">{{ t('nav.item.projects', 'Projects') }}</h1>
            <p class="projects-header__count">{{ projectCountLabel() }}</p>
          </div>
        </header>

        <app-projects-toolbar
          [groupingOptions]="groupingOptions()"
          [activeGroupingsInput]="activeGroupings()"
          [filterOptions]="filterOptions()"
          [sortOptions]="sortOptions()"
          [hasGrouping]="hasGrouping()"
          [hasFilters]="hasFilters()"
          [hasCustomSort]="hasCustomSort()"
          [hasArchivedProjects]="hasArchivedProjects()"
          [viewMode]="viewMode()"
          [statusFilter]="statusFilter()"
          [activeSorts]="activeSorts()"
          (groupingChanged)="activeGroupings.set($event)"
          (sortChanged)="activeSorts.set($event)"
          (viewModeChange)="viewMode.set($event)"
          (statusFilterChange)="onStatusFilterChange($event)"
        />

        @if (loading()) {
          <section
            class="projects-loading"
            role="status"
            [attr.aria-label]="t('projects.page.loading.aria', 'Loading projects')"
          >
            <div class="projects-loading__row"></div>
            <div class="projects-loading__row"></div>
            <div class="projects-loading__row"></div>
          </section>
        } @else if (loadError()) {
          <section class="projects-error" role="alert">
            <h2>{{ t('projects.page.error.title', 'Could not load projects') }}</h2>
            <p>{{ t('projects.page.error.body', 'Please try again in a moment.') }}</p>
            <button
              type="button"
              class="ui-button ui-button--secondary"
              (click)="refreshProjects()"
            >
              {{ t('projects.page.error.retry', 'Retry') }}
            </button>
          </section>
        } @else if (groupedSections().length === 0) {
          <section class="projects-empty">
            <h2>{{ t('projects.page.empty.title', 'No projects match your filters') }}</h2>
            <p>
              {{ t('projects.page.empty.body', 'Try another search or reset your status filter.') }}
            </p>
          </section>
        } @else {
          <section
            class="projects-content"
            [class.projects-content--cards]="viewMode() === 'cards'"
          >
            @for (section of groupedSections(); track section.id) {
              <section class="projects-section">
                @if (section.heading) {
                  <app-group-header
                    [heading]="section.heading"
                    [imageCount]="section.projectCount"
                    [level]="section.level"
                    [collapsed]="false"
                  />
                }

                @if (viewMode() === 'list') {
                  <div
                    class="projects-list"
                    role="region"
                    [attr.aria-label]="t('projects.page.table.ariaLabel', 'Projects table')"
                  >
                    <table class="projects-table">
                      <thead>
                        <tr>
                          <th
                            scope="col"
                            [attr.aria-sort]="tableAriaSort('name')"
                            [attr.data-sort-direction]="tableSortDirection('name')"
                          >
                            {{ t('projects.toolbar.option.name', 'Name') }}
                          </th>
                          <th
                            scope="col"
                            [attr.aria-sort]="tableAriaSort('image-count')"
                            [attr.data-sort-direction]="tableSortDirection('image-count')"
                          >
                            {{ t('projects.toolbar.option.imageCount', 'Image count') }}
                          </th>
                          <th
                            scope="col"
                            [attr.aria-sort]="tableAriaSort('status')"
                            [attr.data-sort-direction]="tableSortDirection('status')"
                          >
                            {{ t('projects.toolbar.option.status', 'Status') }}
                          </th>
                          <th
                            scope="col"
                            [attr.aria-sort]="tableAriaSort('district')"
                            [attr.data-sort-direction]="tableSortDirection('district')"
                          >
                            {{ t('projects.toolbar.option.primaryDistrict', 'Primary district') }}
                          </th>
                          <th
                            scope="col"
                            [attr.aria-sort]="tableAriaSort('city')"
                            [attr.data-sort-direction]="tableSortDirection('city')"
                          >
                            {{ t('projects.toolbar.option.primaryCity', 'Primary city') }}
                          </th>
                          <th
                            scope="col"
                            [attr.aria-sort]="tableAriaSort('updated-at')"
                            [attr.data-sort-direction]="tableSortDirection('updated-at')"
                          >
                            {{ t('projects.toolbar.option.updated', 'Updated') }}
                          </th>
                          <th
                            scope="col"
                            [attr.aria-sort]="tableAriaSort('last-activity')"
                            [attr.data-sort-direction]="tableSortDirection('last-activity')"
                          >
                            {{ t('projects.toolbar.option.lastActivity', 'Last activity') }}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (project of section.projects; track project.id) {
                          <tr [style.--project-item-color]="colorTokenFor(project.colorKey)">
                            <th
                              scope="row"
                              class="project2-table__name-cell ui-row-shell ui-row-shell--sm"
                            >
                              <span
                                class="project2-row__dot ui-row-shell__leading"
                                [style.background]="colorTokenFor(project.colorKey)"
                              ></span>
                              <span class="project2-row__name ui-row-shell__label">{{
                                project.name
                              }}</span>
                            </th>
                            <td>
                              {{ project.totalImageCount }}
                              {{ t('projects.page.metric.photos', 'photos') }}
                            </td>
                            <td class="project2-row__meta">
                              <span
                                class="ui-status-badge ui-status-badge--sm"
                                [class.ui-status-badge--success]="project.status === 'active'"
                                [class.ui-status-badge--warning]="project.status === 'archived'"
                              >
                                {{ projectStatusLabel(project.status) }}
                              </span>
                            </td>
                            <td class="project2-row__meta">{{ project.district || '-' }}</td>
                            <td class="project2-row__meta">{{ project.city || '-' }}</td>
                            <td class="project2-row__meta">
                              {{ formatRelativeDate(project.updatedAt) }}
                            </td>
                            <td class="project2-row__meta">
                              {{ formatRelativeDate(project.lastActivity) }}
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <div class="projects-grid">
                    @for (project of section.projects; track project.id) {
                      <article
                        class="project2-card ui-card-shell ui-card-shell--md"
                        [style.--project-item-color]="colorTokenFor(project.colorKey)"
                      >
                        <div class="project2-card__header ui-card-shell__header">
                          <span
                            class="project2-card__dot"
                            [style.background]="colorTokenFor(project.colorKey)"
                          ></span>
                          <h3 class="project2-card__name">{{ project.name }}</h3>
                        </div>
                        <p class="project2-card__badge">
                          {{ project.totalImageCount }}
                          {{ t('projects.page.metric.photos', 'photos') }}
                        </p>
                        <p class="project2-card__meta">
                          {{ formatRelativeDate(project.lastActivity) }}
                        </p>

                        <div class="project2-card__actions ui-card-shell__actions">
                          @if (project.status === 'active') {
                            <div class="project2-card__action-wrap">
                              <button
                                type="button"
                                class="ui-button ui-button--secondary project2-card__action"
                                (click)="toggleColorPicker(project.id)"
                              >
                                <span class="material-icons" aria-hidden="true">palette</span>
                                <span>{{
                                  t('projects.page.action.changeColor', 'Change color')
                                }}</span>
                              </button>

                              @if (coloringProjectId() === project.id) {
                                <div class="project2-card__picker">
                                  <app-project-color-picker
                                    [selectedColor]="project.colorKey"
                                    (colorSelected)="onColorSelected(project.id, $event)"
                                  />
                                </div>
                              }
                            </div>

                            <button
                              type="button"
                              class="ui-button ui-button--secondary project2-card__action"
                              (click)="requestDangerAction(project.id, 'archive')"
                            >
                              <span>{{ t('projects.page.action.archiveProject', 'Archive') }}</span>
                            </button>
                          } @else {
                            <button
                              type="button"
                              class="ui-button ui-button--secondary project2-card__action"
                              (click)="requestDangerAction(project.id, 'restore')"
                            >
                              <span>{{ t('projects.page.action.restoreProject', 'Restore') }}</span>
                            </button>

                            <button
                              type="button"
                              class="ui-button ui-button--danger project2-card__action"
                              (click)="requestDangerAction(project.id, 'delete')"
                            >
                              <span>{{ t('projects.page.action.deleteProject', 'Delete') }}</span>
                            </button>
                          }
                        </div>
                      </article>
                    }
                  </div>
                }
              </section>
            }
          </section>
        }

        @if (hasPendingAction()) {
          <section class="projects-confirm" role="dialog" aria-modal="true">
            <div class="projects-confirm__surface">
              <h2>{{ pendingActionTitle() }}</h2>
              <p>{{ pendingActionMessage() }}</p>
              <div class="projects-confirm__actions">
                <button
                  type="button"
                  class="ui-button ui-button--secondary"
                  [disabled]="pendingActionBusy()"
                  (click)="cancelPendingAction()"
                >
                  {{ t('common.cancel', 'Cancel') }}
                </button>
                <button
                  type="button"
                  class="ui-button"
                  [class.ui-button--danger]="pendingProjectAction() === 'delete'"
                  [class.ui-button--primary]="pendingProjectAction() !== 'delete'"
                  [disabled]="pendingActionBusy()"
                  (click)="confirmPendingAction()"
                >
                  {{ pendingActionConfirmLabel() }}
                </button>
              </div>
            </div>
          </section>
        }
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }

      .projects-page {
        min-height: 100%;
        padding: var(--spacing-4);
      }

      .projects-rail {
        width: min(25rem, 100%);
        margin-inline: auto;
        display: grid;
        gap: var(--spacing-4);
      }

      .projects-header {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: var(--spacing-3);
        align-items: center;
      }

      .projects-header__title-wrap {
        display: grid;
        gap: var(--spacing-1);
        min-width: 0;
        justify-items: end;
        text-align: right;
      }

      .projects-header__count {
        color: var(--color-text-secondary);
      }

      .projects-breadcrumbs {
        display: flex;
        align-items: center;
        gap: var(--spacing-1);
        min-width: 0;
        color: var(--color-text-secondary);
        font-size: 0.8125rem;
      }

      .projects-breadcrumbs__item {
        min-width: 0;
      }

      .projects-breadcrumbs__item--link {
        color: inherit;
        text-decoration: underline;
        text-underline-offset: 0.15em;
      }

      .projects-breadcrumbs__item--current {
        color: var(--color-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .projects-breadcrumbs__separator {
        flex: 0 0 auto;
      }

      .projects-header__actions {
        display: inline-flex;
        justify-self: start;
      }

      .projects-header__new {
        white-space: nowrap;
      }

      .projects-loading {
        display: grid;
        gap: var(--spacing-2);
      }

      .projects-loading__row {
        min-height: 4rem;
        border-radius: var(--container-radius-control);
        background: linear-gradient(
          90deg,
          color-mix(in srgb, var(--color-border) 65%, transparent) 0%,
          color-mix(in srgb, var(--color-bg-surface) 75%, transparent) 50%,
          color-mix(in srgb, var(--color-border) 65%, transparent) 100%
        );
        background-size: 200% 100%;
        animation: projects-loading-pulse 1.2s ease-in-out infinite;
      }

      .projects-empty {
        border: 1px solid var(--color-border);
        border-radius: var(--container-radius-panel);
        background: var(--color-bg-surface);
        padding: var(--spacing-4);
        display: grid;
        gap: var(--spacing-2);
      }

      .projects-error {
        border: 1px solid color-mix(in srgb, var(--color-warning) 45%, var(--color-border));
        border-radius: var(--container-radius-panel);
        background: color-mix(in srgb, var(--color-bg-surface) 88%, var(--color-warning));
        padding: var(--spacing-4);
        display: grid;
        gap: var(--spacing-2);
      }

      .projects-content {
        display: grid;
        gap: var(--spacing-3);
      }

      .projects-section {
        display: grid;
        gap: var(--spacing-2);
      }

      .projects-list {
        overflow-x: auto;
        border: 1px solid var(--color-border);
        border-radius: var(--container-radius-control);
        background: color-mix(in srgb, var(--color-bg-surface) 94%, var(--color-bg-base));
      }

      .projects-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 60rem;
      }

      .projects-table thead th {
        text-align: left;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--color-text-secondary);
        padding: var(--spacing-2) var(--spacing-3);
        border-bottom: 1px solid var(--color-border);
      }

      .projects-table thead th[data-sort-direction='asc']::after,
      .projects-table thead th[data-sort-direction='desc']::after {
        margin-left: var(--spacing-1);
        color: var(--color-text-primary);
      }

      .projects-table thead th[data-sort-direction='asc']::after {
        content: '↑';
      }

      .projects-table thead th[data-sort-direction='desc']::after {
        content: '↓';
      }

      .projects-table tbody tr {
        border-left: 3px solid var(--project-item-color, var(--color-border));
      }

      .projects-table tbody tr + tr td,
      .projects-table tbody tr + tr th {
        border-top: 1px solid color-mix(in srgb, var(--color-border) 80%, transparent);
      }

      .projects-table tbody td,
      .projects-table tbody th {
        padding: var(--spacing-3);
        vertical-align: middle;
      }

      .project2-table__name-cell {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        min-width: 0;
      }

      .project2-row__dot,
      .project2-card__dot {
        inline-size: 0.9rem;
        block-size: 0.9rem;
        border-radius: 999px;
        flex: 0 0 auto;
      }

      .project2-row__content,
      .project2-card__header {
        min-width: 0;
      }

      .project2-row__name,
      .project2-card__name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .project2-row__meta,
      .project2-card__meta {
        color: var(--color-text-secondary);
        font-size: 0.8125rem;
      }

      .projects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
        gap: var(--spacing-3);
      }

      .project2-card {
        min-height: 12rem;
        padding: var(--spacing-3);
        border: 1px solid var(--project-item-color, var(--color-border));
        border-radius: var(--container-radius-panel);
        background: color-mix(in srgb, var(--color-bg-surface) 92%, var(--color-bg-base));
        display: grid;
        gap: var(--spacing-2);
        align-content: start;
        position: relative;
      }

      .project2-card__header {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        min-width: 0;
      }

      .project2-card__badge {
        font-size: 0.875rem;
      }

      .project2-card__actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--spacing-2);
        margin-top: auto;
      }

      .project2-card__action,
      .project2-card__actions .ui-button {
        width: 100%;
        justify-content: center;
      }

      .project2-card__action-wrap {
        position: relative;
      }

      .project2-card__picker {
        position: absolute;
        top: calc(100% + 0.5rem);
        left: 0;
        z-index: 10;
      }

      .projects-confirm {
        position: fixed;
        inset: 0;
        background: color-mix(in srgb, var(--color-bg-base) 68%, transparent);
        display: grid;
        place-items: center;
        padding: var(--spacing-4);
        z-index: 40;
      }

      .projects-confirm__surface {
        width: min(26rem, 100%);
        border: 1px solid var(--color-border);
        border-radius: var(--container-radius-panel);
        background: var(--color-bg-surface);
        padding: var(--spacing-4);
        display: grid;
        gap: var(--spacing-3);
        box-shadow: var(--elevation-floating);
      }

      .projects-confirm__actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-2);
      }

      @keyframes projects-loading-pulse {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -20% 0;
        }
      }

      @media (max-width: 60rem) {
        .projects-header {
          grid-template-columns: 1fr;
        }

        .projects-header__actions,
        .projects-header__new {
          width: 100%;
        }

        .projects-header__title-wrap {
          justify-items: start;
          text-align: left;
        }

        .projects-breadcrumbs {
          max-width: 100%;
        }

        .project2-card__actions {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  providers: [FilterService],
})
export class ProjectsPageComponent {
  private readonly i18nService = inject(I18nService);
  private readonly projectsService = inject(ProjectsService);
  private readonly filterService = inject(FilterService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

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
      label: this.projectLabel(option.id, option.label),
    })),
  );
  readonly filterOptions = computed(() =>
    FILTER_OPTIONS.map((option) => ({
      ...option,
      label: this.projectLabel(option.id, option.label),
    })),
  );
  readonly sortOptions = computed(() =>
    SORT_OPTIONS.map((option) => ({
      ...option,
      label: this.projectLabel(option.id, option.label),
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

    const statusScoped = this.projects().filter((project) =>
      status === 'all' ? true : project.status === status,
    );

    const filterScoped = this.applyProjectFilters(statusScoped);
    return this.sortProjects(filterScoped, this.activeSorts());
  });
  readonly groupedSections = computed<ProjectGroupedSection[]>(() => {
    const projects = this.visibleProjects();
    const groupings = this.activeGroupings();
    if (groupings.length === 0) {
      return [
        { id: 'all-projects', heading: '', level: 0, projectCount: projects.length, projects },
      ];
    }
    return this.buildGroupedSections(projects, groupings, []);
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

  constructor() {
    effect(() => {
      const labelsById = new Map(this.groupingOptions().map((option) => [option.id, option.label]));
      this.activeGroupings.update((current) =>
        current.map((entry) => ({ ...entry, label: labelsById.get(entry.id) ?? entry.label })),
      );
    });
    void this.refreshProjects();
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

  tableSortDirection(columnKey: string): 'asc' | 'desc' | null {
    const primarySort = this.activeSorts()[0];
    if (!primarySort || primarySort.key !== columnKey) {
      return null;
    }

    return primarySort.direction;
  }

  tableAriaSort(columnKey: string): 'ascending' | 'descending' | 'none' {
    const direction = this.tableSortDirection(columnKey);
    if (direction === 'asc') {
      return 'ascending';
    }
    if (direction === 'desc') {
      return 'descending';
    }
    return 'none';
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
    if (this.pendingProjectAction() === 'delete') {
      return this.t('projects.page.pending.title.deleteArchived', 'Delete archived project?');
    }

    if (this.pendingProjectAction() === 'restore') {
      return this.t('projects.page.pending.title.restore', 'Restore project?');
    }

    return this.t('projects.page.pending.title.archive', 'Archive project?');
  }

  pendingActionMessage(): string {
    const name =
      this.pendingProject()?.name ??
      this.t('projects.page.pending.subject.thisProject', 'this project');
    if (this.pendingProjectAction() === 'delete') {
      return this.t(
        'projects.page.pending.message.delete',
        '"{name}" will be permanently deleted for your organization.',
      ).replace('{name}', name);
    }

    if (this.pendingProjectAction() === 'restore') {
      return this.t(
        'projects.page.pending.message.restore',
        '"{name}" will move back to Active.',
      ).replace('{name}', name);
    }

    return this.t(
      'projects.page.pending.message.archive',
      '"{name}" will move to Archived.',
    ).replace('{name}', name);
  }

  pendingActionConfirmLabel(): string {
    if (this.pendingProjectAction() === 'delete') {
      return this.t('projects.page.pending.confirm.delete', 'Delete now');
    }

    if (this.pendingProjectAction() === 'restore') {
      return this.t('projects.page.pending.confirm.restore', 'Restore');
    }

    return this.t('projects.page.pending.confirm.archive', 'Archive');
  }

  colorTokenFor(key: ProjectColorKey): string {
    const brandHueMatch = key.match(/^brand-hue-(\d{1,3})$/);
    if (brandHueMatch) {
      const hue = Number.parseInt(brandHueMatch[1], 10);
      if (Number.isFinite(hue)) {
        return `hsl(${hue} 58% 52%)`;
      }
    }
    if (key === 'accent') return 'var(--color-accent)';
    if (key === 'success') return 'var(--color-success)';
    if (key === 'warning') return 'var(--color-warning)';
    return 'var(--color-clay)';
  }

  formatRelativeDate(value: string | null): string {
    if (!value) {
      return this.t('projects.page.relative.noActivity', 'No activity');
    }
    const deltaMs = Date.now() - new Date(value).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.floor(deltaMs / dayMs);
    if (days <= 0) return this.t('projects.page.relative.today', 'Today');
    if (days === 1) return this.t('projects.page.relative.yesterday', 'Yesterday');
    if (days < 30) {
      return this.t('projects.page.relative.daysAgo', '{count} days ago').replace(
        '{count}',
        String(days),
      );
    }
    const months = Math.floor(days / 30);
    if (months < 12) {
      return this.t(
        months === 1
          ? 'projects.page.relative.monthAgo.single'
          : 'projects.page.relative.monthAgo.multi',
        months === 1 ? '1 month ago' : '{count} months ago',
      ).replace('{count}', String(months));
    }
    const years = Math.floor(months / 12);
    return this.t(
      years === 1
        ? 'projects.page.relative.yearAgo.single'
        : 'projects.page.relative.yearAgo.multi',
      years === 1 ? '1 year ago' : '{count} years ago',
    ).replace('{count}', String(years));
  }

  projectStatusLabel(status: ProjectListItem['status']): string {
    return status === 'archived'
      ? this.t('projects.toolbar.status.archived', 'Archived')
      : this.t('projects.toolbar.status.active', 'Active');
  }

  private showMutationError(key: string, fallback: string): void {
    this.toastService.show({
      message: this.t(key, fallback),
      type: 'error',
      dedupe: true,
    });
  }

  private projectLabel(id: string, fallback: string): string {
    const map: Record<string, string> = {
      name: 'projects.toolbar.option.name',
      status: 'projects.toolbar.option.status',
      district: 'projects.toolbar.option.primaryDistrict',
      city: 'projects.toolbar.option.primaryCity',
      'color-key': 'projects.toolbar.option.color',
      'image-count': 'projects.toolbar.option.imageCount',
      'updated-at': 'projects.toolbar.option.updated',
      'last-activity': 'projects.toolbar.option.lastActivity',
    };
    return this.t(map[id] ?? '', fallback) || fallback;
  }

  private applyProjectFilters(projects: ProjectListItem[]): ProjectListItem[] {
    const rules = this.filterService.rules().filter((rule) => rule.property && rule.operator);
    if (rules.length === 0) {
      return projects;
    }

    return projects.filter((project) => this.matchesProject(project, rules));
  }

  private matchesProject(
    project: ProjectListItem,
    rules: Array<{ conjunction: string; property: string; operator: string; value: string }>,
  ): boolean {
    let result = this.evaluateRule(project, rules[0]!);
    for (let index = 1; index < rules.length; index += 1) {
      const rule = rules[index]!;
      const ruleResult = this.evaluateRule(project, rule);
      result = rule.conjunction === 'or' ? result || ruleResult : result && ruleResult;
    }
    return result;
  }

  private evaluateRule(
    project: ProjectListItem,
    rule: { property: string; operator: string; value: string },
  ): boolean {
    const fieldValue = this.getProjectFieldValue(project, rule.property);
    const ruleValue = rule.value.toLowerCase();
    if (fieldValue == null) {
      return rule.operator === 'is not' || rule.operator === '≠' ? ruleValue !== '' : false;
    }
    const fieldStr = String(fieldValue).toLowerCase();
    const numericOps = ['=', '≠', '>', '<', '≥', '≤'];
    if (numericOps.includes(rule.operator)) {
      const numField = parseFloat(fieldStr);
      const numRule = parseFloat(ruleValue);
      if (Number.isNaN(numField) || Number.isNaN(numRule)) return false;
      switch (rule.operator) {
        case '=':
          return numField === numRule;
        case '≠':
          return numField !== numRule;
        case '>':
          return numField > numRule;
        case '<':
          return numField < numRule;
        case '≥':
          return numField >= numRule;
        case '≤':
          return numField <= numRule;
        default:
          return true;
      }
    }
    switch (rule.operator) {
      case 'contains':
        return fieldStr.includes(ruleValue);
      case 'equals':
      case 'is':
        return fieldStr === ruleValue;
      case 'is not':
        return fieldStr !== ruleValue;
      case 'before':
        return fieldStr < ruleValue;
      case 'after':
        return fieldStr > ruleValue;
      default:
        return true;
    }
  }

  private getProjectFieldValue(project: ProjectListItem, property: string): string | number | null {
    switch (property) {
      case 'name':
        return project.name;
      case 'status':
        return project.status;
      case 'district':
        return project.district;
      case 'city':
        return project.city;
      case 'color-key':
        return project.colorKey;
      case 'image-count':
        return project.totalImageCount;
      case 'updated-at':
        return project.updatedAt;
      case 'last-activity':
        return project.lastActivity;
      default:
        return null;
    }
  }

  private sortProjects(projects: ProjectListItem[], activeSorts: SortConfig[]): ProjectListItem[] {
    const sorted = [...projects];
    if (activeSorts.length === 0) {
      sorted.sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      );
      return sorted;
    }
    sorted.sort((left, right) => {
      for (const sort of activeSorts) {
        const leftValue = this.getProjectFieldValue(left, sort.key);
        const rightValue = this.getProjectFieldValue(right, sort.key);
        const order = this.compareValues(leftValue, rightValue);
        if (order !== 0) {
          return sort.direction === 'asc' ? order : -order;
        }
      }
      return left.name.localeCompare(right.name);
    });
    return sorted;
  }

  private compareValues(left: string | number | null, right: string | number | null): number {
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    if (typeof left === 'number' && typeof right === 'number') return left - right;
    const leftAsDate = Date.parse(String(left));
    const rightAsDate = Date.parse(String(right));
    if (Number.isFinite(leftAsDate) && Number.isFinite(rightAsDate)) {
      return leftAsDate - rightAsDate;
    }
    return String(left).localeCompare(String(right));
  }

  private buildGroupedSections(
    projects: ProjectListItem[],
    groupings: GroupingProperty[],
    pathKeys: string[],
  ): ProjectGroupedSection[] {
    if (groupings.length === 0) {
      return [
        {
          id: pathKeys.join('||') || 'all-projects',
          heading: '',
          level: Math.max(pathKeys.length - 1, 0),
          projectCount: projects.length,
          projects,
        },
      ];
    }
    const [current, ...rest] = groupings;
    const buckets = new Map<string, ProjectListItem[]>();
    for (const project of projects) {
      const value = this.getGroupingValue(project, current.id);
      const bucket = buckets.get(value);
      if (bucket) bucket.push(project);
      else buckets.set(value, [project]);
    }
    const sections: ProjectGroupedSection[] = [];
    for (const [groupValue, bucket] of buckets) {
      const nextPathKeys = [...pathKeys, `${current.id}:${groupValue}`];
      sections.push({
        id: `${nextPathKeys.join('||')}::header`,
        heading: `${current.label}: ${groupValue}`,
        level: pathKeys.length,
        projectCount: bucket.length,
        projects: [],
      });
      if (rest.length === 0) {
        sections.push({
          id: `${nextPathKeys.join('||')}::leaf`,
          heading: '',
          level: pathKeys.length,
          projectCount: bucket.length,
          projects: bucket,
        });
      } else {
        sections.push(...this.buildGroupedSections(bucket, rest, nextPathKeys));
      }
    }
    return sections;
  }

  private getGroupingValue(project: ProjectListItem, groupingId: string): string {
    switch (groupingId) {
      case 'status':
        return project.status === 'archived'
          ? this.t('projects.page.status.archived', 'Archived')
          : this.t('projects.page.status.active', 'Active');
      case 'district':
        return (
          project.district ?? this.t('projects.page.value.unknownDistrict', 'Unknown district')
        );
      case 'city':
        return project.city ?? this.t('projects.page.value.unknownCity', 'Unknown city');
      case 'color-key':
        return project.colorKey;
      default:
        return this.t('projects.page.value.other', 'Other');
    }
  }
}
