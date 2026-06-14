import { Component, computed, effect, inject, signal } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ProjectsService } from '../../../core/projects/projects.service';
import { ToastService } from '../../../core/toast/toast.service';
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
import {
  pendingActionConfirmLabel,
  pendingActionMessage,
  pendingActionTitle,
} from './projects-page.logic';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { TextInputDialogComponent } from '../../../shared/text-input-dialog/text-input-dialog.component';
import type { PendingProjectAction } from './projects-page.config';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [
    ProjectsSidebarComponent,
    ProjectDashboardViewComponent,
    ProjectDetailViewComponent,
    ProjectsConfirmDialogComponent,
    TextInputDialogComponent,
    ...HLM_BUTTON_IMPORTS,
  ],
  templateUrl: './projects-page.component.html',
  styleUrl: './projects-page.component.scss',
})
export class ProjectsPageComponent implements OnDestroy {
  private readonly i18nService = inject(I18nService);
  private readonly projectsService = inject(ProjectsService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
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
  readonly showArchived = signal(false);
  readonly detailsPanelOpen = signal(false);
  readonly colorPickerOpen = signal(false);
  readonly mediaLoading = signal(false);
  readonly exclusiveMedia = signal<ProjectMediaListItem[]>([]);
  readonly sharedMedia = signal<ProjectMediaListItem[]>([]);
  readonly creatingProject = signal(false);
  readonly projectNameDialogOpen = signal(false);
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

  constructor() {
    effect(() => {
      const projectId = this.currentProjectId();
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

  async loadProjectMedia(projectId: string): Promise<void> {
    this.mediaLoading.set(true);
    try {
      const sections = await this.projectsService.loadProjectMediaSections(projectId);
      this.exclusiveMedia.set(sections.exclusive);
      this.sharedMedia.set(sections.shared);
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

  onDetailsToggled(): void {
    this.detailsPanelOpen.update((value) => !value);
  }

  onDetailsPanelClosed(): void {
    this.detailsPanelOpen.set(false);
  }

  onColorPickerToggled(): void {
    this.colorPickerOpen.update((value) => !value);
  }

  onNewProject(): void {
    if (this.creatingProject() || this.projectNameDialogOpen()) return;
    this.projectNameDialogOpen.set(true);
  }

  onProjectNameDialogCancelled(): void {
    if (this.creatingProject()) return;
    this.projectNameDialogOpen.set(false);
  }

  async onProjectNameDialogConfirmed(projectName: string): Promise<void> {
    if (this.creatingProject()) return;

    this.creatingProject.set(true);
    this.projectNameDialogOpen.set(false);

    try {
      const draft = await this.projectsService.createDraftProject();
      if (!draft) {
        this.showMutationError(
          'projects.page.toast.createError',
          'Could not create project. Please try again.',
        );
        return;
      }

      const renamed = await this.projectsService.renameProject(draft.id, projectName);
      if (!renamed) {
        this.showMutationError(
          'projects.page.toast.createError',
          'Could not create project. Please try again.',
        );
        return;
      }

      const createdProject = { ...draft, name: projectName.trim() };
      this.projects.update((all) => [createdProject, ...all]);
      void this.router.navigate(['/projects', createdProject.id]);
    } finally {
      this.creatingProject.set(false);
    }
  }

  async onColorSelected(projectId: string, colorKey: ProjectColorKey): Promise<void> {
    const persisted = await this.projectsService.setProjectColor(projectId, colorKey);
    if (!persisted) return;

    this.colorPickerOpen.set(false);
    this.projects.update((all) =>
      all.map((project) => (project.id === projectId ? { ...project, colorKey } : project)),
    );
  }

  requestDangerAction(projectId: string, action: Exclude<PendingProjectAction, null>): void {
    this.pendingProjectId.set(projectId);
    this.pendingProjectAction.set(action);
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
        void this.router.navigate(['/projects']);
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
        void this.router.navigate(['/projects']);
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
}
