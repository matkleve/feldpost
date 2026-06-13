/**
 * WorkspaceProjectsPanelComponent — compact project manager in the Workspace Pane Projects tab.
 * Three internal states: list (default), detail (single project), new-draft (inline create row).
 * @see docs/specs/ui/workspace/workspace-pane-projects-tab.md
 */
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectsService } from '../../../core/projects/projects.service';
import { MapContextActionsService } from '../../../features/map/map-shell/context-menu/map-context-actions.service';
import { ToastService } from '../../../core/toast/toast.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { ProjectListItem, ProjectColorKey } from '../../../core/projects/projects.types';
import { ProjectColorPickerComponent } from '../../../features/projects/cards/project-color-picker.component';
import { ProjectItemComponent } from '../../../features/projects/project-item.component';
import type { ItemDisplayMode } from '../../item-grid/item.component';
import { ItemGridComponent } from '../../item-grid/item-grid.component';
import { DropdownShellComponent } from '../../dropdown-trigger/shell/dropdown-shell.component';
import { HlmMenuItemDirective } from '../../ui/menu';
import { CardVariantSettingsService } from '../../ui-primitives/card-variant-settings.service';
import type { CardVariant } from '../../ui-primitives/card-variant.types';
import { WorkspaceProjectsToolbarComponent } from './workspace-projects-toolbar.component';

// Panel view states — @see docs/specs/ui/workspace/workspace-pane-projects-tab.md § State
type ProjectsPanelState = 'list' | 'detail' | 'new-draft';

// MIME type for HTML5 drag transfer payloads carrying media IDs
export const DRAG_MEDIA_IDS_MIME = 'application/x-feldpost-media-ids';

@Component({
  selector: 'app-workspace-projects-panel',
  standalone: true,
  imports: [
    FormsModule,
    SlicePipe,
    ProjectColorPickerComponent,
    ProjectItemComponent,
    ItemGridComponent,
    DropdownShellComponent,
    HlmMenuItemDirective,
    WorkspaceProjectsToolbarComponent,
  ],
  templateUrl: './workspace-projects-panel.component.html',
  styleUrl: './workspace-projects-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceProjectsPanelComponent {
  private readonly projectsService = inject(ProjectsService);
  private readonly contextActions = inject(MapContextActionsService);
  private readonly toastService = inject(ToastService);
  private readonly i18nService = inject(I18nService);
  private readonly router = inject(Router);
  private readonly cardVariantSettings = inject(CardVariantSettingsService);

  protected readonly t = (key: string, fallback = ''): string =>
    this.i18nService.t(key, fallback);

  readonly draftInputRef = viewChild<ElementRef<HTMLInputElement>>('draftInput');
  readonly renameInputRef = viewChild<ElementRef<HTMLInputElement>>('renameInput');

  // Stable state: list — shows scrollable project rows + new-project trigger
  // Stable state: detail — shows single project detail and drop zone
  // Stable state: new-draft — inline create row at list bottom
  // @see docs/specs/ui/workspace/workspace-pane-projects-tab.md § State
  readonly panelState = signal<ProjectsPanelState>('list');
  readonly searchTerm = signal('');
  readonly openProjectId = signal<string | null>(null);
  readonly draftName = signal('');
  readonly draftBusy = signal(false);
  readonly projects = signal<ProjectListItem[]>([]);
  readonly loading = signal(false);
  readonly showArchived = signal(false);
  readonly isDragOver = signal(false);
  readonly colorPickerOpen = signal(false);
  readonly contextMenuOpen = signal(false);
  readonly contextMenuPosition = signal<{ x: number; y: number } | null>(null);
  readonly contextMenuProjectId = signal<string | null>(null);

  // Rename flow state for detail view
  readonly renameValue = signal('');
  readonly renameBusy = signal(false);

  readonly cardVariant = signal<CardVariant>(this.cardVariantSettings.getVariant('projects'));
  readonly gridMode = computed<ItemDisplayMode>(() => {
    switch (this.cardVariant()) {
      case 'row':
        return 'row';
      case 'small':
        return 'grid-sm';
      case 'medium':
        return 'grid-md';
      case 'large':
        return 'grid-lg';
      default:
        return 'grid-md';
    }
  });
  readonly skeletonSlots = [1, 2, 3, 4, 5, 6] as const;

  readonly activeProjects = computed(() =>
    this.projects().filter((p) => p.status === 'active'),
  );

  readonly archivedProjects = computed(() =>
    this.projects().filter((p) => p.status === 'archived'),
  );

  readonly filteredActive = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.activeProjects();
    return this.activeProjects().filter((p) => p.name.toLowerCase().includes(term));
  });

  readonly filteredArchived = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.archivedProjects();
    return this.archivedProjects().filter((p) => p.name.toLowerCase().includes(term));
  });

  readonly openProject = computed(() =>
    this.projects().find((p) => p.id === this.openProjectId()) ?? null,
  );

  onProjectItemOpened(projectId: string): void {
    this.openDetail(projectId);
  }

  onProjectItemContextMenu(event: MouseEvent, projectId: string): void {
    this.openContextMenu(event, projectId);
  }

  // Colour preview helper — kept in TS to stay consistent with ProjectColorPickerComponent
  protected projectColorStyle(colorKey: ProjectColorKey): string {
    const match = colorKey.match(/^brand-hue-(\d{1,3})$/);
    if (match) {
      const hue = Number.parseInt(match[1], 10);
      if (Number.isFinite(hue)) {
        return `hsl(${hue} 58% 52%)`;
      }
    }
    return `var(--color-${colorKey}, var(--primary))`;
  }

  // Lifecycle — load on first render (panel mounts only when tab is active)
  constructor() {
    effect(() => {
      this.cardVariantSettings.setVariant('projects', this.cardVariant());
    });
    void this.loadProjects();
  }

  async loadProjects(): Promise<void> {
    this.loading.set(true);
    const result = await this.projectsService.loadProjects();
    this.projects.set(result);
    this.loading.set(false);
  }

  // --- Navigation ---

  openDetail(projectId: string): void {
    const project = this.projects().find((p) => p.id === projectId);
    if (!project) return;
    this.openProjectId.set(projectId);
    this.renameValue.set(project.name);
    this.panelState.set('detail');
  }

  backToList(): void {
    this.openProjectId.set(null);
    this.colorPickerOpen.set(false);
    this.panelState.set('list');
  }

  startNewDraft(): void {
    this.draftName.set('');
    this.panelState.set('new-draft');
    // Focus is handled in the template via autofocus or viewChild effect
  }

  cancelDraft(): void {
    this.draftName.set('');
    this.draftBusy.set(false);
    this.panelState.set('list');
  }

  async confirmDraft(): Promise<void> {
    if (this.draftBusy()) return;
    const name = this.draftName().trim();
    if (!name) return;

    this.draftBusy.set(true);
    const created = await this.projectsService.createProject(name);
    this.draftBusy.set(false);

    if (!created) {
      this.toastService.show({
        message: this.t('workspace.projects.panel.createError', 'Could not create project'),
        type: 'error',
      });
      return;
    }

    // Prepend to list, enter detail view
    this.projects.update((prev) => [created, ...prev]);
    this.draftName.set('');
    this.openDetail(created.id);
  }

  onDraftKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      void this.confirmDraft();
    } else if (event.key === 'Escape') {
      this.cancelDraft();
    }
  }

  // --- Rename in detail view ---

  async submitRename(): Promise<void> {
    if (this.renameBusy()) return;
    const name = this.renameValue().trim();
    const project = this.openProject();
    if (!name || !project || name === project.name) return;

    this.renameBusy.set(true);
    const ok = await this.projectsService.renameProject(project.id, name);
    this.renameBusy.set(false);

    if (ok) {
      this.projects.update((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, name } : p)),
      );
    } else {
      this.toastService.show({
        message: this.t('workspace.projects.panel.renameError', 'Could not rename project'),
        type: 'error',
      });
      this.renameValue.set(project.name);
    }
  }

  onRenameKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      void this.submitRename();
    } else if (event.key === 'Escape') {
      const project = this.openProject();
      if (project) this.renameValue.set(project.name);
    }
  }

  // --- Color ---

  toggleColorPicker(): void {
    this.colorPickerOpen.update((v) => !v);
  }

  async onColorSelected(colorKey: ProjectColorKey): Promise<void> {
    const project = this.openProject();
    if (!project) return;
    this.colorPickerOpen.set(false);
    const ok = await this.projectsService.setProjectColor(project.id, colorKey);
    if (ok) {
      this.projects.update((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, colorKey } : p)),
      );
    }
  }

  // --- Danger actions ---

  async onDangerAction(
    projectId: string,
    action: 'archive' | 'restore' | 'delete',
  ): Promise<void> {
    if (action === 'archive') {
      const ok = await this.projectsService.archiveProject(projectId);
      if (ok) {
        this.projects.update((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, status: 'archived' as const, archivedAt: new Date().toISOString() }
              : p,
          ),
        );
        this.backToList();
      }
    } else if (action === 'restore') {
      const ok = await this.projectsService.restoreProject(projectId);
      if (ok) {
        this.projects.update((prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, status: 'active' as const, archivedAt: null } : p,
          ),
        );
        this.backToList();
      }
    } else if (action === 'delete') {
      const ok = await this.projectsService.deleteProject(projectId);
      if (ok) {
        this.projects.update((prev) => prev.filter((p) => p.id !== projectId));
        this.backToList();
      }
    }
  }

  // --- Context menu (right-click on project row) ---

  openContextMenu(event: MouseEvent, projectId: string): void {
    event.preventDefault();
    this.contextMenuProjectId.set(projectId);
    this.contextMenuPosition.set({ x: event.clientX, y: event.clientY });
    this.contextMenuOpen.set(true);
  }

  closeContextMenu(): void {
    this.contextMenuOpen.set(false);
    this.contextMenuPosition.set(null);
    this.contextMenuProjectId.set(null);
  }

  openInProjectsPage(): void {
    const id = this.contextMenuProjectId();
    this.closeContextMenu();
    if (!id) return;
    void this.router.navigate(['/projects'], { queryParams: { project: id } });
  }

  // --- Drag and Drop ---

  onDragOver(event: DragEvent): void {
    if (event.dataTransfer?.types.includes(DRAG_MEDIA_IDS_MIME)) {
      event.preventDefault();
      this.isDragOver.set(true);
    }
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isDragOver.set(false);

    const raw = event.dataTransfer?.getData(DRAG_MEDIA_IDS_MIME);
    const projectId = this.openProjectId();
    if (!raw || !projectId) return;

    let mediaIds: string[];
    try {
      mediaIds = JSON.parse(raw) as string[];
    } catch {
      return;
    }

    if (!mediaIds.length) return;

    const result = await this.contextActions.assignImagesToProject(mediaIds, projectId);

    if (result.ok) {
      const msg = this.t('workspace.projects.panel.dropSuccess', '{count} items added to project')
        .replace('{count}', String(mediaIds.length));
      this.toastService.show({ message: msg, type: 'success' });
      // Refresh project list to update media count
      void this.loadProjects();
    } else {
      this.toastService.show({
        message: this.t('workspace.projects.panel.dropError', 'Could not assign media to project'),
        type: 'error',
      });
    }
  }
}
