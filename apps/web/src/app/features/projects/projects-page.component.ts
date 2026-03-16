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
import { ToastService } from '../../core/toast.service';
import type {
  ProjectColorKey,
  ProjectListItem,
  ProjectStatusFilter,
  ProjectsSortMode,
  ProjectsViewMode,
  ProjectsWorkspaceContext,
} from '../../core/projects/projects.types';
import type { FilterRule, SortConfig } from '../../core/workspace-view.types';
import { WorkspaceViewService } from '../../core/workspace-view.service';
import { SearchBarComponent } from '../map/search-bar/search-bar.component';
import { DragDividerComponent } from '../map/workspace-pane/drag-divider/drag-divider.component';
import { GroupHeaderComponent } from '../map/workspace-pane/group-header.component';
import { WorkspacePaneComponent } from '../map/workspace-pane/workspace-pane.component';
import {
  GroupingDropdownComponent,
  type GroupingProperty,
} from '../map/workspace-pane/workspace-toolbar/grouping-dropdown.component';
import {
  FilterDropdownComponent,
  type FilterDropdownPropertyOption,
} from '../map/workspace-pane/workspace-toolbar/filter-dropdown.component';
import {
  SortDropdownComponent,
  type SortDropdownOption,
} from '../map/workspace-pane/workspace-toolbar/sort-dropdown.component';
import { ProjectColorPickerComponent } from './project-color-picker.component';
import { ProjectsViewToggleComponent } from './projects-view-toggle.component';
import { ClickOutsideDirective } from '../../shared/click-outside.directive';
import { DropdownShellComponent } from '../../shared/dropdown-shell.component';

const VIEW_MODE_STORAGE_KEY = 'feldpost-projects-view-mode';
type ProjectsToolbarDropdown = 'grouping' | 'filter' | 'sort' | null;
type PendingProjectAction = 'archive' | 'delete' | null;

const PROJECT_GROUPING_OPTIONS: GroupingProperty[] = [
  { id: 'status', label: 'Status', icon: 'inventory_2' },
  { id: 'district', label: 'Primary district', icon: 'map' },
  { id: 'city', label: 'Primary city', icon: 'location_city' },
  { id: 'color-key', label: 'Color', icon: 'palette' },
];

const PROJECT_FILTER_OPTIONS: FilterDropdownPropertyOption[] = [
  { id: 'name', label: 'Name', type: 'text' },
  { id: 'status', label: 'Status', type: 'text' },
  { id: 'district', label: 'Primary district', type: 'text' },
  { id: 'city', label: 'Primary city', type: 'text' },
  { id: 'color-key', label: 'Color', type: 'text' },
  { id: 'image-count', label: 'Image count', type: 'number' },
  { id: 'updated-at', label: 'Updated', type: 'date' },
  { id: 'last-activity', label: 'Last activity', type: 'date' },
];

const PROJECT_SORT_OPTIONS: SortDropdownOption[] = [
  { id: 'name', label: 'Name', icon: 'sort_by_alpha', defaultDirection: 'asc' },
  { id: 'updated-at', label: 'Updated', icon: 'update', defaultDirection: 'desc' },
  { id: 'last-activity', label: 'Last activity', icon: 'history', defaultDirection: 'desc' },
  { id: 'image-count', label: 'Image count', icon: 'photo_library', defaultDirection: 'desc' },
  { id: 'status', label: 'Status', icon: 'inventory_2', defaultDirection: 'asc' },
  { id: 'district', label: 'Primary district', icon: 'map', defaultDirection: 'asc' },
  { id: 'city', label: 'Primary city', icon: 'location_city', defaultDirection: 'asc' },
  { id: 'color-key', label: 'Color', icon: 'palette', defaultDirection: 'asc' },
];

const TEXT_OPERATORS = ['contains', 'equals', 'is', 'is not', 'before', 'after'];
const NUMBER_OPERATORS = ['=', '≠', '>', '<', '≥', '≤'];
const DATE_OPERATORS = ['is', 'is not', 'before', 'after'];

function operatorsForType(type: FilterDropdownPropertyOption['type'] | undefined): string[] {
  switch (type) {
    case 'number':
      return NUMBER_OPERATORS;
    case 'date':
      return DATE_OPERATORS;
    default:
      return TEXT_OPERATORS;
  }
}

interface ProjectGroupedSection {
  id: string;
  heading: string;
  level: number;
  projectCount: number;
  projects: ProjectListItem[];
}

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [
    CommonModule,
    SearchBarComponent,
    DragDividerComponent,
    GroupHeaderComponent,
    WorkspacePaneComponent,
    GroupingDropdownComponent,
    FilterDropdownComponent,
    SortDropdownComponent,
    ProjectsViewToggleComponent,
    ProjectColorPickerComponent,
    ClickOutsideDirective,
    DropdownShellComponent,
  ],
  templateUrl: './projects-page.component.html',
  styleUrl: './projects-page.component.scss',
})
export class ProjectsPageComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly toastService = inject(ToastService);
  private readonly filterService = inject(FilterService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly projectGroupingOptionIds = new Set(PROJECT_GROUPING_OPTIONS.map((o) => o.id));
  private readonly projectFilterOptionIds = new Set(PROJECT_FILTER_OPTIONS.map((o) => o.id));
  private readonly projectSortOptionIds = new Set(PROJECT_SORT_OPTIONS.map((o) => o.id));
  private readonly projectFilterOptionById = new Map(PROJECT_FILTER_OPTIONS.map((o) => [o.id, o]));

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
  readonly pendingProjectAction = signal<PendingProjectAction>(null);
  readonly pendingProjectId = signal<string | null>(null);
  readonly pendingActionBusy = signal(false);
  readonly coloringProjectId = signal<string | null>(null);
  readonly detailImageId = signal<string | null>(null);
  readonly isMobile = signal(false);
  readonly activeToolbarDropdown = signal<ProjectsToolbarDropdown>(null);
  readonly toolbarDropdownTop = signal(0);
  readonly toolbarDropdownLeft = signal(0);
  readonly activeGroupings = signal<GroupingProperty[]>([]);
  readonly collapsedGroupIds = signal<Set<string>>(new Set());
  readonly isToolbarDragging = signal(false);
  readonly activeProjectSorts = signal<SortConfig[]>([]);
  readonly projectFilterOptions = PROJECT_FILTER_OPTIONS;
  readonly projectSortOptions = PROJECT_SORT_OPTIONS;
  readonly projectDefaultSorts: SortConfig[] = [];
  readonly activeGroupingIds = computed(() => this.activeGroupings().map((group) => group.id));
  readonly projectFilterRules = computed(() =>
    this.filterService
      .rules()
      .filter((rule) => !rule.property || this.projectFilterOptionIds.has(rule.property)),
  );

  readonly availableGroupings = computed<GroupingProperty[]>(() => {
    const activeIds = new Set(this.activeGroupings().map((group) => group.id));
    return PROJECT_GROUPING_OPTIONS.filter((grouping) => !activeIds.has(grouping.id));
  });

  readonly hasGrouping = computed(() => this.activeGroupings().length > 0);
  readonly hasFilters = computed(() => this.projectFilterRules().length > 0);
  readonly hasCustomSort = computed(() => this.activeProjectSorts().length > 0);
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

    const filterScoped = this.applyProjectFilters(queryScoped);

    return this.sortProjects(filterScoped, this.sortMode(), this.activeProjectSorts());
  });

  readonly projectCountLabel = computed(() => {
    const total = this.visibleProjects().length;
    return `${total} project${total === 1 ? '' : 's'}`;
  });

  readonly workspacePaneTitle = computed(() => {
    const selectedId = this.selectedProjectId();
    if (!selectedId) {
      return 'Workspace';
    }

    const selectedProject = this.projects().find((project) => project.id === selectedId);
    return selectedProject?.name ?? 'Workspace';
  });

  readonly groupedSections = computed<ProjectGroupedSection[]>(() => {
    const projects = this.visibleProjects();
    const groupings = this.activeGroupings();

    if (groupings.length === 0) {
      return [
        {
          id: 'all-projects',
          heading: '',
          level: 0,
          projectCount: projects.length,
          projects,
        },
      ];
    }

    return this.buildGroupedSections(projects, groupings, []);
  });

  readonly showEmptyState = computed(
    () => !this.loading() && this.visibleProjects().length === 0 && !this.workspacePaneOpen(),
  );

  constructor() {
    effect(() => {
      this.persistViewMode(this.viewMode());
    });

    this.normalizeProjectFilterRules();
    this.syncViewportMode();
    void this.refreshProjects();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncViewportMode();
    this.closeOverlays();
  }

  onOutsideInteraction(): void {
    if (this.isToolbarDragging()) {
      return;
    }

    this.closeOverlays();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeOverlays();
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

    if (id === 'filter') {
      this.normalizeProjectFilterRules();
    }

    this.coloringProjectId.set(null);
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
    this.activeGroupings.set(active.filter((group) => this.projectGroupingOptionIds.has(group.id)));
    // Reset collapsed state when grouping structure changes.
    this.collapsedGroupIds.set(new Set());
  }

  toggleGroupCollapsed(sectionId: string): void {
    this.collapsedGroupIds.update((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  isGroupCollapsed(sectionId: string): boolean {
    return this.collapsedGroupIds().has(sectionId);
  }

  isSectionHidden(index: number): boolean {
    const sections = this.groupedSections();
    const section = sections[index];

    // Top-level group headers are never hidden.
    if (section.heading && section.level === 0) {
      return false;
    }

    let contextLevel = section.heading ? section.level : Number.POSITIVE_INFINITY;

    for (let i = index - 1; i >= 0; i--) {
      const prev = sections[i];
      if (!prev.heading) {
        continue;
      }

      if (prev.level < contextLevel) {
        if (this.isGroupCollapsed(prev.id)) {
          return true;
        }

        contextLevel = prev.level;
        if (contextLevel === 0) {
          break;
        }
      }
    }

    return false;
  }

  onSortChanged(sortConfigs: SortConfig[]): void {
    const sanitizedSorts = sortConfigs.filter((sort) => this.projectSortOptionIds.has(sort.key));
    this.activeProjectSorts.set(sanitizedSorts);

    const nextSort = this.mapSortConfigToProjectsSortMode(sanitizedSorts);
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
    this.closeToolbarDropdown();
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

  private closeOverlays(): void {
    this.closeToolbarDropdown();
    this.coloringProjectId.set(null);
    this.cancelPendingAction();
  }

  requestDangerAction(projectId: string): void {
    const project = this.projects().find((entry) => entry.id === projectId);
    if (!project) {
      return;
    }

    this.pendingProjectAction.set(project.status === 'archived' ? 'delete' : 'archive');
    this.pendingProjectId.set(projectId);
    this.closeToolbarDropdown();
    this.coloringProjectId.set(null);
  }

  cancelPendingAction(): void {
    if (this.pendingActionBusy()) {
      return;
    }

    this.pendingProjectAction.set(null);
    this.pendingProjectId.set(null);
  }

  async confirmPendingAction(): Promise<void> {
    const projectId = this.pendingProjectId();
    const action = this.pendingProjectAction();
    const project = this.pendingProject();

    if (!projectId || !action || !project) {
      this.cancelPendingAction();
      return;
    }

    this.pendingActionBusy.set(true);

    try {
      if (action === 'archive') {
        const persisted = await this.projectsService.archiveProject(projectId);
        if (!persisted) {
          this.toastService.show({
            message: 'Could not archive project. Please try again.',
            type: 'error',
            dedupe: true,
          });
          return;
        }

        const archivedAt = new Date().toISOString();
        this.projects.update((all) =>
          all.map((entry) =>
            entry.id === projectId
              ? {
                  ...entry,
                  archivedAt,
                  status: 'archived',
                  updatedAt: archivedAt,
                }
              : entry,
          ),
        );

        this.toastService.show({ message: 'Project archived', type: 'success' });
      }

      if (action === 'delete') {
        if (project.status !== 'archived') {
          return;
        }

        const persisted = await this.projectsService.deleteProject(projectId);
        if (!persisted) {
          this.toastService.show({
            message:
              'Could not delete archived project. Check permissions or refresh and try again.',
            type: 'error',
            dedupe: true,
          });
          return;
        }

        this.projects.update((all) => all.filter((entry) => entry.id !== projectId));
        this.toastService.show({ message: 'Archived project deleted', type: 'success' });
      }

      if (this.selectedProjectId() === projectId) {
        this.closeWorkspacePane();
      }

      await this.refreshSearchCounts();
      this.pendingProjectAction.set(null);
      this.pendingProjectId.set(null);
    } finally {
      this.pendingActionBusy.set(false);
    }
  }

  pendingActionTitle(): string {
    if (this.pendingProjectAction() === 'delete') {
      return 'Delete archived project?';
    }

    return 'Archive project?';
  }

  pendingActionMessage(): string {
    const name = this.pendingProject()?.name ?? 'this project';
    if (this.pendingProjectAction() === 'delete') {
      return `"${name}" will be permanently deleted for your organization.`;
    }

    return `"${name}" will move to Archived and stay visible for all users in your organization.`;
  }

  pendingActionConfirmLabel(): string {
    return this.pendingProjectAction() === 'delete' ? 'Delete now' : 'Archive now';
  }

  isDeletePending(): boolean {
    return this.pendingProjectAction() === 'delete';
  }

  async openWorkspace(projectId: string, navigate = false): Promise<void> {
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
    const brandHueMatch = key.match(/^brand-hue-(\d{1,3})$/);
    if (brandHueMatch) {
      const hue = Number.parseInt(brandHueMatch[1], 10);
      if (Number.isFinite(hue)) {
        // Keep saturation/lightness close to brand orange and only vary hue.
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

    const effectiveSorts = this.buildEffectiveProjectSorts(activeSorts);
    if (effectiveSorts.length > 0) {
      sorted.sort((left, right) => {
        for (const sort of effectiveSorts) {
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

  private buildEffectiveProjectSorts(activeSorts: SortConfig[]): SortConfig[] {
    const groupings = this.activeGroupings();
    if (groupings.length === 0) {
      return activeSorts;
    }

    const userSortMap = new Map(activeSorts.map((sort) => [sort.key, sort]));
    const groupingIds = new Set(groupings.map((grouping) => grouping.id));

    const groupingSorts: SortConfig[] = groupings.map((grouping) => {
      const existing = userSortMap.get(grouping.id);
      return { key: grouping.id, direction: existing?.direction ?? 'asc' };
    });

    const remainingSorts = activeSorts.filter((sort) => !groupingIds.has(sort.key));
    return [...groupingSorts, ...remainingSorts];
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
      primary === 'last-activity' ||
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
        return project.name;
      case 'image-count':
      case 'photo-count':
      case 'images-count':
      case 'photos-count':
        return project.totalImageCount;
      case 'updated':
      case 'updated-at':
      case 'created-at':
        return project.updatedAt;
      case 'last-activity':
        return project.lastActivity;
      case 'status':
        return project.status;
      case 'color-key':
        return project.colorKey;
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
      const value = this.getProjectGroupingValue(project, current.id);
      const bucket = buckets.get(value);
      if (bucket) {
        bucket.push(project);
      } else {
        buckets.set(value, [project]);
      }
    }

    const sections: ProjectGroupedSection[] = [];
    for (const [groupValue, bucket] of buckets) {
      const nextPathKeys = [...pathKeys, `${current.id}:${groupValue}`];
      const heading = `${current.label}: ${groupValue}`;
      const level = pathKeys.length;

      sections.push({
        id: `${nextPathKeys.join('||')}::header`,
        heading,
        level,
        projectCount: bucket.length,
        projects: [],
      });

      if (rest.length === 0) {
        sections.push({
          id: `${nextPathKeys.join('||')}::leaf`,
          heading: '',
          level,
          projectCount: bucket.length,
          projects: bucket,
        });
      } else {
        sections.push(...this.buildGroupedSections(bucket, rest, nextPathKeys));
      }
    }

    return sections;
  }

  private getProjectGroupingValue(project: ProjectListItem, groupingId: string): string {
    switch (groupingId) {
      case 'status':
        return project.status === 'archived' ? 'Archived' : 'Active';
      case 'district':
        return project.district?.trim() || 'Unknown district';
      case 'city':
        return project.city?.trim() || 'Unknown city';
      case 'color-key':
        return project.colorKey.charAt(0).toUpperCase() + project.colorKey.slice(1);
      default:
        return 'Other';
    }
  }

  private applyProjectFilters(projects: ProjectListItem[]): ProjectListItem[] {
    const rules = this.projectFilterRules();
    if (rules.length === 0) return projects;

    return projects.filter((project) => this.matchesProjectRules(project, rules));
  }

  private matchesProjectRules(project: ProjectListItem, rules: FilterRule[]): boolean {
    let result = this.evaluateProjectRule(project, rules[0]);

    for (let i = 1; i < rules.length; i++) {
      const ruleResult = this.evaluateProjectRule(project, rules[i]);
      if (rules[i].conjunction === 'or') {
        result = result || ruleResult;
      } else {
        result = result && ruleResult;
      }
    }

    return result;
  }

  private evaluateProjectRule(project: ProjectListItem, rule: FilterRule): boolean {
    if (!rule.property || !rule.operator) return true;

    const fieldValue = this.getProjectFilterValue(project, rule.property);
    const option = this.projectFilterOptionById.get(rule.property);
    const ruleValue = rule.value.trim();
    const ruleLower = ruleValue.toLowerCase();

    if (fieldValue == null || fieldValue === '') {
      return rule.operator === 'is not' || rule.operator === '≠' ? ruleLower !== '' : false;
    }

    if (option?.type === 'number' || NUMBER_OPERATORS.includes(rule.operator)) {
      const fieldNumber =
        typeof fieldValue === 'number' ? fieldValue : Number.parseFloat(fieldValue);
      const ruleNumber = Number.parseFloat(ruleValue);
      if (Number.isNaN(fieldNumber) || Number.isNaN(ruleNumber)) {
        return false;
      }

      switch (rule.operator) {
        case '=':
          return fieldNumber === ruleNumber;
        case '≠':
          return fieldNumber !== ruleNumber;
        case '>':
          return fieldNumber > ruleNumber;
        case '<':
          return fieldNumber < ruleNumber;
        case '≥':
          return fieldNumber >= ruleNumber;
        case '≤':
          return fieldNumber <= ruleNumber;
        default:
          return false;
      }
    }

    if (option?.type === 'date') {
      const left = Date.parse(String(fieldValue));
      const right = Date.parse(ruleValue);
      if (!Number.isFinite(left) || !Number.isFinite(right)) {
        return false;
      }

      switch (rule.operator) {
        case 'is':
        case 'equals':
          return left === right;
        case 'is not':
          return left !== right;
        case 'before':
          return left < right;
        case 'after':
          return left > right;
        default:
          return false;
      }
    }

    const fieldLower = String(fieldValue).toLowerCase();
    switch (rule.operator) {
      case 'contains':
        return fieldLower.includes(ruleLower);
      case 'equals':
      case 'is':
        return fieldLower === ruleLower;
      case 'is not':
        return fieldLower !== ruleLower;
      case 'before':
        return fieldLower < ruleLower;
      case 'after':
        return fieldLower > ruleLower;
      default:
        return true;
    }
  }

  private getProjectFilterValue(
    project: ProjectListItem,
    propertyId: string,
  ): string | number | null {
    switch (propertyId) {
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

  private normalizeProjectFilterRules(): void {
    const rules = this.filterService.rules();
    const normalized = rules
      .filter((rule) => !rule.property || this.projectFilterOptionIds.has(rule.property))
      .map((rule) => {
        if (!rule.property) return rule;

        const validOperators = operatorsForType(
          this.projectFilterOptionById.get(rule.property)?.type,
        );
        if (!rule.operator || validOperators.includes(rule.operator)) {
          return rule;
        }

        return { ...rule, operator: '' };
      });

    if (
      normalized.length !== rules.length ||
      normalized.some((rule, index) => rule !== rules[index])
    ) {
      this.filterService.rules.set(normalized);
    }
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
