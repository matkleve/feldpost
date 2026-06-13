import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { ProjectColorKey, ProjectListItem } from '../../../core/projects/projects.types';
import type { ItemDisplayMode } from '../../../shared/item-grid/item.component';
import { ItemGridComponent } from '../../../shared/item-grid/item-grid.component';
import { ProjectItemComponent } from '../project-item.component';
import type { ProjectGroupedSection } from '../page/projects-page.config';
import { ProjectColorPickerComponent } from '../cards/project-color-picker.component';
import { DropdownShellComponent } from '../../../shared/dropdown-trigger/shell/dropdown-shell.component';
import { HlmMenuItemDirective, HlmMenuSeparatorDirective } from '../../../shared/ui/menu';
import { CONTEXT_MENU_PANEL_WIDTH_PX } from '../../../shared/ui/menu/context-menu-layout.constants';
import type { CardVariant } from '../../../shared/ui-primitives/card-variant.types';

type ProjectGridMenuAction = 'change_color' | 'archive' | 'restore' | 'delete';
type ProjectGridMenuPanel = 'actions' | 'colors';

@Component({
  selector: 'app-projects-grid-view',
  standalone: true,
  imports: [
    ItemGridComponent,
    ProjectItemComponent,
    ProjectColorPickerComponent,
    DropdownShellComponent,
    HlmMenuItemDirective,
    HlmMenuSeparatorDirective,
  ],
  templateUrl: './projects-grid-view.component.html',
  styleUrl: './projects-grid-view.component.scss',
})
export class ProjectsGridViewComponent {
  private readonly i18nService = inject(I18nService);
  private readonly router = inject(Router);

  readonly section = input.required<ProjectGroupedSection>();
  readonly cardVariant = input<CardVariant>('medium');

  readonly colorSelected = output<{ projectId: string; colorKey: ProjectColorKey }>();
  readonly dangerAction = output<{ projectId: string; action: 'archive' | 'restore' | 'delete' }>();

  readonly contextMenuOpen = signal(false);
  readonly contextMenuPosition = signal<{ x: number; y: number } | null>(null);
  readonly contextMenuProjectId = signal<string | null>(null);
  readonly contextMenuPanel = signal<ProjectGridMenuPanel>('actions');

  readonly contextMenuMinWidthPx = CONTEXT_MENU_PANEL_WIDTH_PX;

  readonly t = (key: string, fallback = ''): string => {
    const value = this.i18nService.t(key, fallback);
    if (typeof value === 'string' && value.trim().length > 0) return value;
    if (fallback.trim().length > 0) return fallback;
    return key;
  };

  readonly itemMode = computed<ItemDisplayMode>(() => {
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

  readonly contextProject = computed(() => {
    const id = this.contextMenuProjectId();
    if (!id) return null;
    return this.section().projects.find((project) => project.id === id) ?? null;
  });

  readonly contextMenuActions = computed<ProjectGridMenuAction[]>(() => {
    const project = this.contextProject();
    if (!project) return [];
    if (project.status === 'archived') {
      return ['restore', 'delete'];
    }
    return ['change_color', 'archive'];
  });

  onProjectOpened(projectId: string): void {
    void this.router.navigate(['/projects', projectId]);
  }

  onProjectContextMenu(event: MouseEvent, projectId: string): void {
    event.preventDefault();
    this.contextMenuProjectId.set(projectId);
    this.contextMenuPanel.set('actions');
    this.contextMenuPosition.set({ x: event.clientX, y: event.clientY });
    this.contextMenuOpen.set(true);
  }

  closeContextMenu(): void {
    this.contextMenuOpen.set(false);
    this.contextMenuPosition.set(null);
    this.contextMenuProjectId.set(null);
    this.contextMenuPanel.set('actions');
  }

  onContextMenuAction(action: ProjectGridMenuAction): void {
    const project = this.contextProject();
    if (!project) return;

    if (action === 'change_color') {
      this.contextMenuPanel.set('colors');
      return;
    }

    this.closeContextMenu();
    this.dangerAction.emit({ projectId: project.id, action });
  }

  onColorSelectedFromMenu(colorKey: ProjectColorKey): void {
    const project = this.contextProject();
    this.closeContextMenu();
    if (!project) return;
    this.colorSelected.emit({ projectId: project.id, colorKey });
  }

  menuPanelClass(): string {
    return 'map-context-menu option-menu-surface project-card-context-menu';
  }

  isDestructiveAction(action: ProjectGridMenuAction): boolean {
    return action === 'delete';
  }

  shouldShowSeparatorBefore(action: ProjectGridMenuAction): boolean {
    return action === 'delete';
  }

  actionIcon(action: ProjectGridMenuAction): string {
    switch (action) {
      case 'change_color':
        return 'palette';
      case 'archive':
        return 'archive';
      case 'restore':
        return 'unarchive';
      case 'delete':
        return 'delete';
    }
  }

  actionLabel(action: ProjectGridMenuAction): string {
    switch (action) {
      case 'change_color':
        return this.t('projects.page.menu.changeColor', 'Change color');
      case 'archive':
        return this.t('projects.page.action.archiveProject', 'Archive project');
      case 'restore':
        return this.t('projects.page.action.restoreProject', 'Restore project');
      case 'delete':
        return this.t('projects.page.action.deleteProject', 'Delete project');
    }
  }
}
