import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
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
import { Projects2ToolbarComponent } from './projects-2-toolbar.component';

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
  selector: 'app-projects-2-page',
  standalone: true,
  imports: [
    CommonModule,
    GroupHeaderComponent,
    Projects2ToolbarComponent,
    ProjectColorPickerComponent,
  ],
  template: `
    <main class="projects2-page">
      <section class="projects2-rail">
        <header class="projects2-header">
          <div class="projects2-header__actions">
            <button
              type="button"
              class="ui-button ui-button--primary projects2-header__new"
              [disabled]="loading()"
              (click)="onNewProject()"
              [attr.aria-label]="t('projects.page.action.newProject', 'New project')"
            >
              <span class="material-icons" aria-hidden="true">add</span>
              <span>{{ t('projects.page.action.newProject', 'New project') }}</span>
            </button>
          </div>

          <div class="projects2-header__title-wrap">
            <h1 class="projects2-header__title">{{ t('nav.item.projects', 'Projects') }}</h1>
            <p class="projects2-header__count">{{ projectCountLabel() }}</p>
          </div>
        </header>

        <app-projects-2-toolbar
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
            class="projects2-loading"
            role="status"
            [attr.aria-label]="t('projects.page.loading.aria', 'Loading projects')"
          >
            <div class="projects2-loading__row"></div>
            <div class="projects2-loading__row"></div>
            <div class="projects2-loading__row"></div>
          </section>
        } @else if (groupedSections().length === 0) {
          <section class="projects2-empty">
            <h2>{{ t('projects.page.empty.title', 'No projects match your filters') }}</h2>
            <p>
              {{ t('projects.page.empty.body', 'Try another search or reset your status filter.') }}
            </p>
          </section>
        } @else {
          <section
            class="projects2-content"
            [class.projects2-content--cards]="viewMode() === 'cards'"
          >
            @for (section of groupedSections(); track section.id) {
              <section class="projects2-section">
                @if (section.heading) {
                  <app-group-header
                    [heading]="section.heading"
                    [imageCount]="section.projectCount"
                    [level]="section.level"
                    [collapsed]="false"
                  />
                }

                @if (viewMode() === 'list') {
                  <div class="projects2-list">
                    @for (project of section.projects; track project.id) {
                      <article
                        class="project2-row"
                        [style.--project-item-color]="colorTokenFor(project.colorKey)"
                      >
                        <span
                          class="project2-row__dot"
                          [style.background]="colorTokenFor(project.colorKey)"
                        ></span>
                        <div class="project2-row__content">
                          <h3 class="project2-row__name">{{ project.name }}</h3>
                          <p class="project2-row__meta">
                            {{ project.totalImageCount }}
                            {{ t('projects.page.metric.photos', 'photos') }} ·
                            {{ formatRelativeDate(project.lastActivity) }}
                          </p>
                        </div>
                      </article>
                    }
                  </div>
                } @else {
                  <div class="projects2-grid">
                    @for (project of section.projects; track project.id) {
                      <article
                        class="project2-card"
                        [style.--project-item-color]="colorTokenFor(project.colorKey)"
                      >
                        <div class="project2-card__header">
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

                        <div class="project2-card__actions">
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
          <section class="projects2-confirm" role="dialog" aria-modal="true">
            <div class="projects2-confirm__surface">
              <h2>{{ pendingActionTitle() }}</h2>
              <p>{{ pendingActionMessage() }}</p>
              <div class="projects2-confirm__actions">
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

      .projects2-page {
        min-height: 100%;
        padding: var(--spacing-4);
      }

      .projects2-rail {
        width: min(25rem, 100%);
        margin-inline: auto;
        display: grid;
        gap: var(--spacing-4);
      }

      .projects2-header {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: var(--spacing-3);
        align-items: center;
      }

      .projects2-header__title-wrap {
        display: grid;
        gap: var(--spacing-1);
        min-width: 0;
        justify-items: end;
        text-align: right;
      }

      .projects2-header__count {
        color: var(--color-text-secondary);
      }

      .projects2-header__actions {
        display: inline-flex;
        justify-self: start;
      }

      .projects2-header__new {
        white-space: nowrap;
      }

      .projects2-loading {
        display: grid;
        gap: var(--spacing-2);
      }

      .projects2-loading__row {
        min-height: 4rem;
        border-radius: var(--container-radius-control);
        background: linear-gradient(
          90deg,
          color-mix(in srgb, var(--color-border) 65%, transparent) 0%,
          color-mix(in srgb, var(--color-bg-surface) 75%, transparent) 50%,
          color-mix(in srgb, var(--color-border) 65%, transparent) 100%
        );
        background-size: 200% 100%;
        animation: projects2-loading-pulse 1.2s ease-in-out infinite;
      }

      .projects2-empty {
        border: 1px solid var(--color-border);
        border-radius: var(--container-radius-panel);
        background: var(--color-bg-surface);
        padding: var(--spacing-4);
        display: grid;
        gap: var(--spacing-2);
      }

      .projects2-content {
        display: grid;
        gap: var(--spacing-3);
      }

      .projects2-section {
        display: grid;
        gap: var(--spacing-2);
      }

      .projects2-list {
        display: grid;
        gap: var(--spacing-2);
      }

      .project2-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: var(--spacing-3);
        align-items: center;
        border: 1px solid var(--project-item-color, var(--color-border));
        border-radius: var(--container-radius-control);
        background: color-mix(in srgb, var(--color-bg-surface) 94%, var(--color-bg-base));
        padding: var(--spacing-3);
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

      .projects2-grid {
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

      .projects2-confirm {
        position: fixed;
        inset: 0;
        background: color-mix(in srgb, var(--color-bg-base) 68%, transparent);
        display: grid;
        place-items: center;
        padding: var(--spacing-4);
        z-index: 40;
      }

      .projects2-confirm__surface {
        width: min(26rem, 100%);
        border: 1px solid var(--color-border);
        border-radius: var(--container-radius-panel);
        background: var(--color-bg-surface);
        padding: var(--spacing-4);
        display: grid;
        gap: var(--spacing-3);
        box-shadow: var(--elevation-floating);
      }

      .projects2-confirm__actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-2);
      }

      @keyframes projects2-loading-pulse {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -20% 0;
        }
      }

      @media (max-width: 60rem) {
        .projects2-header {
          grid-template-columns: 1fr;
        }

        .projects2-header__actions,
        .projects2-header__new {
          width: 100%;
        }

        .projects2-header__title-wrap {
          justify-items: start;
          text-align: left;
        }

        .project2-card__actions {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  providers: [FilterService],
})
export class Projects2PageComponent {
  private readonly i18nService = inject(I18nService);
  private readonly projectsService = inject(ProjectsService);
  private readonly filterService = inject(FilterService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly loading = signal(false);
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
    try {
      const projects = await this.projectsService.loadProjects();
      this.projects.set(projects);
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
