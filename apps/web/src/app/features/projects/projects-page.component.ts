import { CommonModule } from '@angular/common';
import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectsService } from '../../core/projects/projects.service';
import type {
  ProjectColorKey,
  ProjectListItem,
  ProjectStatusFilter,
  ProjectsSortMode,
  ProjectsViewMode,
  ProjectsWorkspaceContext,
} from '../../core/projects/projects.types';
import { WorkspaceViewService } from '../../core/workspace-view.service';
import { SearchBarComponent } from '../map/search-bar/search-bar.component';
import { WorkspacePaneComponent } from '../map/workspace-pane/workspace-pane.component';
import { ProjectCardComponent } from './project-card.component';
import { ProjectColorPickerComponent } from './project-color-picker.component';
import { ProjectsViewToggleComponent } from './projects-view-toggle.component';

const VIEW_MODE_STORAGE_KEY = 'feldpost-projects-view-mode';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [
    CommonModule,
    SearchBarComponent,
    WorkspacePaneComponent,
    ProjectsViewToggleComponent,
    ProjectCardComponent,
    ProjectColorPickerComponent,
  ],
  templateUrl: './projects-page.component.html',
  styleUrl: './projects-page.component.scss',
})
export class ProjectsPageComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly router = inject(Router);

  readonly projects = signal<ProjectListItem[]>([]);
  readonly loading = signal(false);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<ProjectStatusFilter>('all');
  readonly viewMode = signal<ProjectsViewMode>(this.loadStoredViewMode());
  readonly sortMode = signal<ProjectsSortMode>('updated');
  readonly projectMatchCounts = signal<Record<string, number>>({});
  readonly selectedProjectId = signal<string | null>(null);
  readonly workspacePaneOpen = signal(false);
  readonly editingProjectId = signal<string | null>(null);
  readonly creatingProject = signal(false);
  readonly archivingProjectId = signal<string | null>(null);
  readonly coloringProjectId = signal<string | null>(null);
  readonly detailImageId = signal<string | null>(null);

  private readonly workspaceContexts = new Map<string, ProjectsWorkspaceContext>();
  private readonly searchRefreshTimer = signal<ReturnType<typeof setTimeout> | null>(null);

  readonly workspacePaneHost = viewChild<ElementRef<HTMLElement>>('workspacePaneHost');

  readonly visibleProjects = computed(() => {
    const statusFilter = this.statusFilter();
    const query = this.searchTerm().trim();
    const counts = this.projectMatchCounts();

    const base = this.projects().map((project) => {
      const matching = query ? (counts[project.id] ?? 0) : project.totalImageCount;
      return {
        ...project,
        matchingImageCount: matching,
      };
    });

    const statusScoped = base.filter((project) => {
      if (statusFilter === 'all') return true;
      return project.status === statusFilter;
    });

    const queryScoped = query
      ? statusScoped.filter((project) => (counts[project.id] ?? 0) > 0)
      : statusScoped;

    return this.sortProjects(queryScoped, this.sortMode());
  });

  readonly projectCountLabel = computed(() => {
    const total = this.visibleProjects().length;
    return `${total} project${total === 1 ? '' : 's'}`;
  });

  readonly showEmptyState = computed(
    () => !this.loading() && this.visibleProjects().length === 0 && !this.workspacePaneOpen(),
  );

  constructor() {
    effect(() => {
      this.persistViewMode(this.viewMode());
    });

    void this.refreshProjects();
  }

  async refreshProjects(): Promise<void> {
    this.loading.set(true);
    try {
      const projects = await this.projectsService.loadProjects();
      this.projects.set(projects);
      await this.refreshSearchCounts();
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChanged(value: string): void {
    this.searchTerm.set(value);

    const pendingTimer = this.searchRefreshTimer();
    if (pendingTimer) {
      clearTimeout(pendingTimer);
    }

    const timer = setTimeout(() => {
      void this.refreshSearchCounts();
      this.searchRefreshTimer.set(null);
    }, 300);

    this.searchRefreshTimer.set(timer);
  }

  onStatusFilterChange(filter: ProjectStatusFilter): void {
    this.statusFilter.set(filter);
    void this.refreshSearchCounts();
  }

  onSortModeChange(value: string): void {
    if (value === 'name' || value === 'updated' || value === 'image-count') {
      this.sortMode.set(value);
    }
  }

  onViewModeChange(mode: ProjectsViewMode): void {
    this.viewMode.set(mode);
  }

  async onNewProject(): Promise<void> {
    this.creatingProject.set(true);
    try {
      const draft = await this.projectsService.createDraftProject();
      if (!draft) return;

      this.projects.update((all) => [draft, ...all]);
      this.editingProjectId.set(draft.id);
      await this.refreshSearchCounts();
    } finally {
      this.creatingProject.set(false);
    }
  }

  startRename(projectId: string): void {
    this.editingProjectId.set(projectId);
  }

  async confirmRename(projectId: string, value: string): Promise<void> {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const persisted = await this.projectsService.renameProject(projectId, trimmed);
    if (!persisted) {
      return;
    }

    this.projects.update((all) =>
      all.map((project) =>
        project.id === projectId
          ? {
              ...project,
              name: trimmed,
              updatedAt: new Date().toISOString(),
            }
          : project,
      ),
    );

    this.editingProjectId.set(null);
  }

  onRenameInputKeydown(event: KeyboardEvent, projectId: string, value: string): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      void this.confirmRename(projectId, value);
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.editingProjectId.set(null);
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

  askArchive(projectId: string): void {
    this.archivingProjectId.set(projectId);
  }

  async confirmArchive(projectId: string): Promise<void> {
    const confirmed = window.confirm('Archive this project?');
    if (!confirmed) {
      this.archivingProjectId.set(null);
      return;
    }

    const persisted = await this.projectsService.archiveProject(projectId);
    if (!persisted) {
      this.archivingProjectId.set(null);
      return;
    }

    this.projects.update((all) =>
      all.map((project) =>
        project.id === projectId
          ? {
              ...project,
              archivedAt: new Date().toISOString(),
              status: 'archived',
              updatedAt: new Date().toISOString(),
            }
          : project,
      ),
    );

    if (this.selectedProjectId() === projectId) {
      this.closeWorkspacePane();
    }

    this.archivingProjectId.set(null);
    await this.refreshSearchCounts();
  }

  async openWorkspace(projectId: string): Promise<void> {
    this.persistWorkspaceContext(this.selectedProjectId());

    this.selectedProjectId.set(projectId);
    this.workspacePaneOpen.set(true);

    this.workspaceViewService.selectedProjectIds.set(new Set([projectId]));

    const images = await this.projectsService.loadProjectWorkspaceImages(projectId);
    this.workspaceViewService.setActiveSelectionImages(images);

    const context = this.workspaceContexts.get(projectId);
    this.detailImageId.set(context?.detailImageId ?? null);

    setTimeout(() => {
      const host = this.workspacePaneHost();
      if (!host || !context) return;
      host.nativeElement.scrollTop = context.scrollTop;
    }, 0);
  }

  closeWorkspacePane(): void {
    this.persistWorkspaceContext(this.selectedProjectId());
    this.workspacePaneOpen.set(false);
    this.selectedProjectId.set(null);
    this.detailImageId.set(null);
    this.workspaceViewService.selectedProjectIds.set(new Set());
    this.workspaceViewService.clearActiveSelection();
  }

  onDetailRequested(imageId: string): void {
    this.detailImageId.set(imageId);
  }

  onDetailClosed(): void {
    this.detailImageId.set(null);
  }

  onZoomToLocation(event: { imageId: string; lat: number; lng: number }): void {
    void this.router.navigate(['/map'], {
      state: {
        mapFocus: {
          imageId: event.imageId,
          lat: event.lat,
          lng: event.lng,
        },
      },
    });
  }

  colorTokenFor(key: ProjectColorKey): string {
    if (key === 'accent') return 'var(--color-accent)';
    if (key === 'success') return 'var(--color-success)';
    if (key === 'warning') return 'var(--color-warning)';
    return 'var(--color-clay)';
  }

  formatRelativeDate(value: string | null): string {
    if (!value) {
      return 'No activity';
    }

    const deltaMs = Date.now() - new Date(value).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.floor(deltaMs / dayMs);

    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months} month${months === 1 ? '' : 's'} ago`;
    }

    const years = Math.floor(months / 12);
    return `${years} year${years === 1 ? '' : 's'} ago`;
  }

  private async refreshSearchCounts(): Promise<void> {
    const counts = await this.projectsService.loadGroupedSearchCounts(
      this.searchTerm(),
      this.statusFilter(),
    );
    this.projectMatchCounts.set(counts);
  }

  private persistWorkspaceContext(projectId: string | null): void {
    if (!projectId) return;

    const host = this.workspacePaneHost();
    this.workspaceContexts.set(projectId, {
      detailImageId: this.detailImageId(),
      scrollTop: host?.nativeElement.scrollTop ?? 0,
    });
  }

  private sortProjects(projects: ProjectListItem[], mode: ProjectsSortMode): ProjectListItem[] {
    const sorted = [...projects];

    if (mode === 'name') {
      sorted.sort((left, right) => left.name.localeCompare(right.name));
      return sorted;
    }

    if (mode === 'image-count') {
      sorted.sort((left, right) => right.totalImageCount - left.totalImageCount);
      return sorted;
    }

    sorted.sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );
    return sorted;
  }

  private loadStoredViewMode(): ProjectsViewMode {
    if (typeof window === 'undefined') {
      return 'list';
    }

    const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return stored === 'cards' ? 'cards' : 'list';
  }

  private persistViewMode(mode: ProjectsViewMode): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  }
}
