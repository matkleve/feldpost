import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { FilterService } from '../../../core/filter/filter.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ProjectsService } from '../../../core/projects/projects.service';
import type { SortConfig } from '../../../core/workspace-view/workspace-view.types';
import { ToastService } from '../../../core/toast/toast.service';
import { UploadManagerService } from '../../../core/upload/upload-manager.service';
import { WorkspacePaneObserverAdapter } from '../../../core/workspace-pane/workspace-pane-observer.adapter';
import type { SelectedItemsContextPort } from '../../../core/workspace-pane/workspace-pane-context.port';
import type {
  ProjectColorKey,
  ProjectListItem,
  ProjectMediaListItem,
} from '../../../core/projects/projects.types';
import { ProjectsConfirmDialogComponent } from '../dialogs/projects-confirm-dialog.component';
import { ProjectsSidebarComponent } from '../sidebar/projects-sidebar.component';
import { ProjectDashboardViewComponent } from '../dashboard/project-dashboard-view.component';
import { ProjectDetailViewComponent } from '../detail/project-detail-view.component';
import { ProjectDetailsPanelComponent } from '../details-panel/project-details-panel.component';
import {
  applyProjectFilters,
  buildDefaultProjectName,
  pendingActionConfirmLabel,
  pendingActionMessage,
  pendingActionTitle,
  projectLabel,
  sortProjects,
} from './projects-page.logic';
import { FILTER_OPTIONS, SORT_OPTIONS } from './projects-page.config';
import { PageGridComponent } from '../../../shared/page-grid';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import type { PendingProjectAction } from './projects-page.config';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [
    PageGridComponent,
    ProjectsSidebarComponent,
    ProjectDashboardViewComponent,
    ProjectDetailViewComponent,
    ProjectDetailsPanelComponent,
    ProjectsConfirmDialogComponent,
    ...HLM_BUTTON_IMPORTS,
  ],
  templateUrl: './projects-page.component.html',
  styleUrl: './projects-page.component.scss',
  providers: [FilterService],
})
export class ProjectsPageComponent implements OnDestroy {
  private readonly i18nService = inject(I18nService);
  private readonly filterService = inject(FilterService);
  private readonly projectsService = inject(ProjectsService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly uploadManager = inject(UploadManagerService);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);

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
    const segment = match?.[1] ? decodeURIComponent(match[1]) : null;
    if (!segment || segment === 'settings') return null;
    return segment;
  });

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly projects = signal<ProjectListItem[]>([]);
  readonly searchQuery = signal('');
  readonly activeSorts = signal<SortConfig[]>([]);
  readonly showArchived = signal(false);
  readonly detailsPanelOpen = signal(false);
  readonly colorPickerOpen = signal(false);
  readonly mediaLoading = signal(false);
  readonly exclusiveMedia = signal<ProjectMediaListItem[]>([]);
  readonly sharedMedia = signal<ProjectMediaListItem[]>([]);
  readonly creatingProject = signal(false);
  readonly namingProjectId = signal<string | null>(null);
  readonly renamingProject = signal(false);
  readonly pendingProjectAction = signal<PendingProjectAction>(null);
  readonly pendingProjectId = signal<string | null>(null);
  readonly pendingActionBusy = signal(false);

  readonly hasPendingAction = computed(
    () => !!this.pendingProjectAction() && !!this.pendingProjectId(),
  );

  readonly pendingProject = computed(() => {
    const projectId = this.pendingProjectId();
    if (!projectId) return null;
    return this.projects().find((project) => project.id === projectId) ?? null;
  });

  readonly currentProject = computed(() => {
    const projectId = this.currentProjectId();
    if (!projectId) return null;
    return this.projects().find((project) => project.id === projectId) ?? null;
  });

  readonly isNamingCurrentProject = computed(
    () =>
      this.namingProjectId() !== null && this.namingProjectId() === this.currentProjectId(),
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

  readonly hasFilters = computed(() => this.filterService.activeCount() > 0);
  readonly hasCustomSort = computed(() => this.activeSorts().length > 0);

  readonly sidebarProjects = computed(() => {
    const archived = this.showArchived();
    const statusScoped = this.projects().filter((project) =>
      archived ? project.status === 'archived' : project.status === 'active',
    );

    const query = this.searchQuery().trim().toLowerCase();
    const searchScoped = query
      ? statusScoped.filter((project) => project.name.toLowerCase().includes(query))
      : statusScoped;

    const rules = this.filterService.rules().filter((rule) => rule.property && rule.operator);
    const filterScoped = applyProjectFilters(searchScoped, rules);
    return sortProjects(filterScoped, this.activeSorts());
  });

  constructor() {
    effect(() => {
      const projectId = this.currentProjectId();
      const namingId = this.namingProjectId();
      if (namingId && projectId !== namingId) {
        void this.discardNamingDraft(namingId);
      }

      if (projectId) {
        const projectsSelectedItemsContext: SelectedItemsContextPort = {
          contextKey: 'projects',
          selectedMediaIds$: this.projectMediaIds,
          requestOpenDetail: () => undefined,
          requestSetHover: () => undefined,
        };
        this.workspacePaneObserver.onContextRebind(projectsSelectedItemsContext);
        void this.loadProjectMedia(projectId);
      } else {
        this.detailsPanelOpen.set(false);
        this.colorPickerOpen.set(false);
        this.exclusiveMedia.set([]);
        this.sharedMedia.set([]);
      }
    });

    this.uploadManager.imageUploaded$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const projectId = this.currentProjectId();
        if (!projectId) {
          return;
        }
        void this.loadProjectMedia(projectId);
      });

    void this.refreshProjects();
  }

  ngOnDestroy(): void {
    const namingId = this.namingProjectId();
    if (namingId) {
      void this.projectsService.discardDraftProject(namingId);
    }
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

  async loadProjectMedia(projectId: string): Promise<void> {
    this.mediaLoading.set(true);
    try {
      const sections = await this.projectsService.loadProjectMediaSections(projectId);
      this.exclusiveMedia.set(sections.exclusive);
      this.sharedMedia.set(sections.shared);
      this.projectMediaIds.set(
        new Set([
          ...sections.exclusive.map((item) => item.id),
          ...sections.shared.map((item) => item.id),
        ]),
      );
    } finally {
      this.mediaLoading.set(false);
    }
  }

  onDashboardSelected(): void {
    void this.router.navigate(['/projects']);
  }

  onProjectSelected(projectId: string): void {
    void this.router.navigate(['/projects', projectId]);
  }

  onArchiveToggled(): void {
    this.showArchived.update((value) => !value);
  }

  onSearchQueryChange(value: string): void {
    this.searchQuery.set(value);
  }

  onSortChanged(sorts: SortConfig[]): void {
    this.activeSorts.set(sorts);
  }

  onDetailsToggled(): void {
    this.detailsPanelOpen.update((value) => !value);
  }

  async onProjectTitleRenamed(projectName: string): Promise<void> {
    const project = this.currentProject();
    if (!project || this.renamingProject()) return;

    const isNaming = this.namingProjectId() === project.id;
    const trimmed = projectName.trim();
    const finalName = trimmed
      ? trimmed
      : buildDefaultProjectName(
          this.projects(),
          this.t('projects.page.defaultProjectName', 'Project {number}'),
        );

    if (!isNaming && (!trimmed || trimmed === project.name)) {
      return;
    }

    if (isNaming) {
      this.namingProjectId.set(null);
    }

    this.renamingProject.set(true);

    try {
      const persisted = await this.projectsService.renameProject(project.id, finalName);
      if (!persisted) {
        if (isNaming) {
          this.namingProjectId.set(project.id);
        }
        this.showMutationError(
          isNaming ? 'projects.page.toast.createError' : 'projects.page.toast.renameError',
          isNaming
            ? 'Could not create project. Please try again.'
            : 'Could not rename project. Please try again.',
        );
        return;
      }

      this.projects.update((all) =>
        all.map((entry) => (entry.id === project.id ? { ...entry, name: finalName } : entry)),
      );
    } finally {
      this.renamingProject.set(false);
    }
  }

  onDetailsPanelClosed(): void {
    this.detailsPanelOpen.set(false);
  }

  async onMediaAdded(mediaIds: string[]): Promise<void> {
    const projectId = this.currentProjectId();
    if (!projectId || mediaIds.length === 0) return;

    const result = await this.projectsService.assignMediaItemsToProject(mediaIds, projectId);
    if (!result.ok) {
      this.showMutationError(
        'projects.media.toast.addError',
        'Could not add media to project. Please try again.',
      );
      return;
    }

    this.toastService.show({
      message: this.t('projects.media.toast.addSuccess', 'Media added to project'),
      type: 'success',
      dedupe: true,
    });

    void this.loadProjectMedia(projectId);
  }

  async onMediaRemoved(mediaId: string): Promise<void> {
    const projectId = this.currentProjectId();
    if (!projectId) return;

    const ok = await this.projectsService.removeMediaFromProject(mediaId, projectId);
    if (!ok) {
      this.showMutationError(
        'projects.media.toast.removeError',
        'Could not remove media from project. Please try again.',
      );
      return;
    }

    this.projects.update((all) =>
      all.map((project) =>
        project.id === projectId
          ? { ...project, totalImageCount: Math.max(0, project.totalImageCount - 1) }
          : project,
      ),
    );

    void this.loadProjectMedia(projectId);
  }

  onColorPickerToggled(): void {
    this.colorPickerOpen.update((value) => !value);
  }

  async onNewProject(): Promise<void> {
    if (this.creatingProject()) return;

    const staleNamingId = this.namingProjectId();
    if (staleNamingId) {
      await this.discardNamingDraft(staleNamingId);
    }

    this.creatingProject.set(true);

    try {
      const draft = await this.projectsService.createDraftProject();
      if (!draft) {
        this.showMutationError(
          'projects.page.toast.createError',
          'Could not create project. Please try again.',
        );
        return;
      }

      this.projects.update((all) => [draft, ...all]);
      await this.router.navigate(['/projects', draft.id]);
      this.namingProjectId.set(draft.id);
    } finally {
      this.creatingProject.set(false);
    }
  }

  private async discardNamingDraft(draftId: string): Promise<void> {
    if (this.namingProjectId() !== draftId) {
      return;
    }

    this.namingProjectId.set(null);
    const discarded = await this.projectsService.discardDraftProject(draftId);
    if (!discarded) {
      return;
    }

    this.projects.update((all) => all.filter((project) => project.id !== draftId));
  }

  async onColorSelected(projectId: string, colorKey: ProjectColorKey): Promise<void> {
    const persisted = await this.projectsService.setProjectColor(projectId, colorKey);
    if (!persisted) return;

    this.colorPickerOpen.set(false);
    this.projects.update((all) =>
      all.map((project) => (project.id === projectId ? { ...project, colorKey } : project)),
    );
  }

  async onArchiveProject(projectId: string): Promise<void> {
    const project = this.projects().find((entry) => entry.id === projectId);
    const projectName =
      project?.name ?? this.t('projects.page.pending.subject.thisProject', 'this project');

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

    if (this.currentProjectId() === projectId) {
      this.showArchived.set(true);
    }

    this.showMutationSuccess(
      'projects.page.toast.archiveSuccess',
      'Project "{name}" archived',
      projectName,
    );
  }

  async onRestoreProject(projectId: string): Promise<void> {
    const project = this.projects().find((entry) => entry.id === projectId);
    const projectName =
      project?.name ?? this.t('projects.page.pending.subject.thisProject', 'this project');

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

    // Mirror archive: switch to the matching list and keep the restored project in focus.
    this.showArchived.set(false);
    if (this.currentProjectId() !== projectId) {
      void this.router.navigate(['/projects', projectId]);
    }

    this.showMutationSuccess(
      'projects.page.toast.restoreSuccess',
      'Project "{name}" restored',
      projectName,
    );
  }

  requestDeleteProject(projectId: string): void {
    this.pendingProjectId.set(projectId);
    this.pendingProjectAction.set('delete');
  }

  async onDeleteProject(projectId: string): Promise<boolean> {
    const project = this.projects().find((entry) => entry.id === projectId);
    const projectName =
      project?.name ?? this.t('projects.page.pending.subject.thisProject', 'this project');

    const persisted = await this.projectsService.deleteProject(projectId);
    if (!persisted) {
      this.showMutationError(
        'projects.page.toast.deleteError',
        'Could not delete archived project. Please try again.',
      );
      return false;
    }

    this.projects.update((all) => all.filter((entry) => entry.id !== projectId));
    if (this.currentProjectId() === projectId) {
      this.detailsPanelOpen.set(false);
      void this.router.navigate(['/projects']);
    }

    this.showMutationSuccess(
      'projects.page.toast.deleteSuccess',
      'Project "{name}" deleted',
      projectName,
    );
    return true;
  }

  cancelPendingAction(): void {
    if (this.pendingActionBusy()) return;
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
      if (action === 'delete') {
        const deleted = await this.onDeleteProject(projectId);
        if (!deleted) {
          return;
        }
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
      title: this.t(key, fallback),
      type: 'error',
      dedupe: true,
      codeRef: { file: 'projects-page.component.ts', fn: 'showMutationError' },
    });
  }

  private showMutationSuccess(key: string, fallback: string, name: string): void {
    const message = this.t(key, fallback).replace('{name}', name);
    this.toastService.show({
      message,
      type: 'success',
      dedupe: true,
    });
  }
}
