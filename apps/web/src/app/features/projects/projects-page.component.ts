import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectsService } from '../../core/projects/projects.service';
import { FilterService } from '../../core/filter.service';
import { PropertyRegistryService } from '../../core/property-registry.service';
import type {
  ProjectColorKey,
  ProjectListItem,
  ProjectStatusFilter,
  ProjectsSortMode,
  ProjectsViewMode,
  ProjectsWorkspaceContext,
} from '../../core/projects/projects.types';
import type { PropertyRef, SortConfig } from '../../core/workspace-view.types';
import { WorkspaceViewService } from '../../core/workspace-view.service';
import { SearchBarComponent } from '../map/search-bar/search-bar.component';
import { DragDividerComponent } from '../map/workspace-pane/drag-divider/drag-divider.component';
import { WorkspacePaneComponent } from '../map/workspace-pane/workspace-pane.component';
import {
  GroupingDropdownComponent,
  type GroupingProperty,
} from '../map/workspace-pane/workspace-toolbar/grouping-dropdown.component';
import { FilterDropdownComponent } from '../map/workspace-pane/workspace-toolbar/filter-dropdown.component';
import { SortDropdownComponent } from '../map/workspace-pane/workspace-toolbar/sort-dropdown.component';
import { ProjectCardComponent } from './project-card.component';
import { ProjectColorPickerComponent } from './project-color-picker.component';
import { ProjectsViewToggleComponent } from './projects-view-toggle.component';

const VIEW_MODE_STORAGE_KEY = 'feldpost-projects-view-mode';
type ProjectsToolbarDropdown = 'grouping' | 'filter' | 'sort' | null;

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [
    CommonModule,
    SearchBarComponent,
    DragDividerComponent,
    WorkspacePaneComponent,
    GroupingDropdownComponent,
    FilterDropdownComponent,
    SortDropdownComponent,
    ProjectsViewToggleComponent,
    ProjectCardComponent,
    ProjectColorPickerComponent,
  ],
  templateUrl: './projects-page.component.html',
  styleUrl: './projects-page.component.scss',
})
export class ProjectsPageComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly filterService = inject(FilterService);
  private readonly registry = inject(PropertyRegistryService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

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
  readonly isMobile = signal(false);
  readonly activeToolbarDropdown = signal<ProjectsToolbarDropdown>(null);
  readonly toolbarDropdownTop = signal(0);
  readonly toolbarDropdownLeft = signal(0);
  readonly activeGroupings = signal<GroupingProperty[]>([]);
  readonly isToolbarDragging = signal(false);
  readonly activeProjectSorts = signal<SortConfig[]>([]);

  readonly availableGroupings = computed<GroupingProperty[]>(() => {
    const activeIds = new Set(this.activeGroupings().map((group) => group.id));
    return this.registry
      .groupableProperties()
      .filter((property) => !activeIds.has(property.id))
      .map((property) => ({ id: property.id, label: property.label, icon: property.icon }));
  });

  readonly hasGrouping = computed(() => this.activeGroupings().length > 0);
  readonly hasFilters = computed(() => this.filterService.activeCount() > 0);
  readonly hasCustomSort = computed(() => {
    const sorts = this.workspaceViewService.activeSorts();
    return sorts.length !== 1 || sorts[0].key !== 'date-captured' || sorts[0].direction !== 'desc';
  });

  readonly workspacePaneWidth = signal(360);
  readonly workspacePaneMinWidth = 280;
  readonly workspacePaneMaxWidth = computed(() => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    return Math.max(this.workspacePaneMinWidth, viewportWidth - 320);
  });
  readonly workspacePaneDefaultWidth = computed(() => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const golden = Math.round(viewportWidth * (1 - 1 / 1.618));
    return Math.min(Math.max(golden, this.workspacePaneMinWidth), this.workspacePaneMaxWidth());
  });

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

    return this.sortProjects(queryScoped, this.sortMode(), this.activeProjectSorts());
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

    this.syncViewportMode();
    void this.refreshProjects();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncViewportMode();
    this.closeToolbarDropdown();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isToolbarDragging()) return;
    if (!this.activeToolbarDropdown()) return;
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeToolbarDropdown();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeToolbarDropdown();
  }

  async refreshProjects(): Promise<void> {
    this.loading.set(true);
    try {
      const projects = await this.projectsService.loadProjects();
      this.projects.set(projects);
      await this.refreshSearchCounts();

      const routeProjectId = this.route.snapshot.paramMap.get('projectId');
      if (routeProjectId && projects.some((project) => project.id === routeProjectId)) {
        await this.openWorkspace(routeProjectId, false);
      }
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

  toggleToolbarDropdown(id: Exclude<ProjectsToolbarDropdown, null>, event: MouseEvent): void {
    if (this.activeToolbarDropdown() === id) {
      this.closeToolbarDropdown();
      return;
    }

    const trigger = event.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();
    const dropdownWidth = 240;
    const viewportWidth = window.innerWidth;
    const padding = 16;

    let left = rect.left;
    if (left + dropdownWidth > viewportWidth - padding) {
      left = Math.max(padding, viewportWidth - dropdownWidth - padding);
    }

    this.toolbarDropdownTop.set(rect.bottom + 4);
    this.toolbarDropdownLeft.set(left);
    this.activeToolbarDropdown.set(id);
  }

  closeToolbarDropdown(): void {
    this.activeToolbarDropdown.set(null);
  }

  onDragStarted(): void {
    this.isToolbarDragging.set(true);
  }

  onDragEnded(): void {
    setTimeout(() => this.isToolbarDragging.set(false));
  }

  onGroupingsChanged(active: GroupingProperty[], _available: GroupingProperty[]): void {
    this.activeGroupings.set(active);
    this.workspaceViewService.activeGroupings.set(
      active.map(
        (group) => ({ id: group.id, label: group.label, icon: group.icon }) as PropertyRef,
      ),
    );
  }

  onSortChanged(sortConfigs: SortConfig[]): void {
    this.workspaceViewService.activeSorts.set(sortConfigs);
    this.activeProjectSorts.set(sortConfigs);

    const nextSort = this.mapSortConfigToProjectsSortMode(sortConfigs);
    if (nextSort) {
      this.sortMode.set(nextSort);
    }
  }

  async onNewProject(): Promise<void> {
    this.creatingProject.set(true);
    try {
      const draft = await this.projectsService.createDraftProject();
      if (!draft) return;

      this.projects.update((all) => [draft, ...all]);
      this.editingProjectId.set(draft.id);
      await this.openWorkspace(draft.id);
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

    if (this.selectedProjectId() === projectId) {
      void this.router.navigate(['/projects', projectId]);
    }
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

  async openWorkspace(projectId: string, navigate = true): Promise<void> {
    this.persistWorkspaceContext(this.selectedProjectId());

    if (!this.workspacePaneOpen()) {
      this.workspacePaneWidth.set(this.workspacePaneDefaultWidth());
    }

    this.selectedProjectId.set(projectId);
    this.workspacePaneOpen.set(true);

    this.workspaceViewService.selectedProjectIds.set(new Set([projectId]));

    const images = await this.projectsService.loadProjectWorkspaceImages(projectId);
    this.workspaceViewService.setActiveSelectionImages(images);

    const context = this.workspaceContexts.get(projectId);
    this.detailImageId.set(context?.detailImageId ?? null);

    if (navigate) {
      void this.router.navigate(['/projects', projectId]);
    }

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
    void this.router.navigate(['/projects']);
  }

  onWorkspaceWidthChange(newWidth: number): void {
    this.workspacePaneWidth.set(newWidth);
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

  private sortProjects(
    projects: ProjectListItem[],
    mode: ProjectsSortMode,
    activeSorts: SortConfig[],
  ): ProjectListItem[] {
    const sorted = [...projects];

    if (activeSorts.length === 0 && this.activeGroupings().length > 0) {
      const groupingSorts: SortConfig[] = this.activeGroupings().map((grouping) => ({
        key: grouping.id,
        direction: 'asc',
      }));

      sorted.sort((left, right) => {
        for (const sort of groupingSorts) {
          const leftValue = this.getProjectSortValue(left, sort.key);
          const rightValue = this.getProjectSortValue(right, sort.key);
          const order = this.compareSortValues(leftValue, rightValue);
          if (order !== 0) {
            return order;
          }
        }

        return left.name.localeCompare(right.name);
      });

      return sorted;
    }

    if (activeSorts.length > 0) {
      sorted.sort((left, right) => {
        for (const sort of activeSorts) {
          const leftValue = this.getProjectSortValue(left, sort.key);
          const rightValue = this.getProjectSortValue(right, sort.key);

          const order = this.compareSortValues(leftValue, rightValue);
          if (order !== 0) {
            return sort.direction === 'asc' ? order : -order;
          }
        }

        return left.name.localeCompare(right.name);
      });

      return sorted;
    }

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

  private mapSortConfigToProjectsSortMode(sortConfigs: SortConfig[]): ProjectsSortMode | null {
    const primary = sortConfigs[0]?.key;
    if (!primary) return null;

    if (primary === 'project-name' || primary === 'name' || primary === 'title') {
      return 'name';
    }

    if (
      primary === 'image-count' ||
      primary === 'photo-count' ||
      primary === 'images-count' ||
      primary === 'photos-count'
    ) {
      return 'image-count';
    }

    if (
      primary === 'updated-at' ||
      primary === 'updated' ||
      primary === 'date-captured' ||
      primary === 'created-at'
    ) {
      return 'updated';
    }

    return null;
  }

  private getProjectSortValue(project: ProjectListItem, sortKey: string): string | number | null {
    switch (sortKey) {
      case 'name':
      case 'project-name':
      case 'project':
        return project.name;
      case 'image-count':
      case 'photo-count':
      case 'images-count':
      case 'photos-count':
        return project.totalImageCount;
      case 'updated':
      case 'updated-at':
      case 'date-captured':
      case 'date-uploaded':
      case 'created-at':
        return project.updatedAt;
      case 'district':
        return project.district;
      case 'city':
        return project.city;
      case 'street':
        return project.street;
      case 'country':
        return project.country;
      default:
        return null;
    }
  }

  private compareSortValues(left: string | number | null, right: string | number | null): number {
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;

    if (typeof left === 'number' && typeof right === 'number') {
      return left - right;
    }

    const leftAsDate = Date.parse(String(left));
    const rightAsDate = Date.parse(String(right));
    if (Number.isFinite(leftAsDate) && Number.isFinite(rightAsDate)) {
      return leftAsDate - rightAsDate;
    }

    return String(left).localeCompare(String(right));
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

  private syncViewportMode(): void {
    if (typeof window === 'undefined') {
      this.isMobile.set(false);
      return;
    }

    this.isMobile.set(window.innerWidth < 768);
  }
}
