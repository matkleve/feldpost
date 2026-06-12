import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { ProjectColorKey, ProjectSummary } from '../../../core/projects/projects.types';
import type { ChipVariant } from '../../../shared/components/chip/chip.component';
import { formatRelativeDate } from '../logic/projects-formatters.logic';
import { ProjectColorPickerComponent } from './project-color-picker.component';
import { DropdownShellComponent } from '../../../shared/dropdown-trigger/shell/dropdown-shell.component';
import { ChipComponent } from '../../../shared/components/chip/chip.component';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { HlmMenuItemDirective, HlmMenuSeparatorDirective } from '../../../shared/ui/menu';
import { I18nService } from '../../../core/i18n/i18n.service';
import { CONTEXT_MENU_PANEL_WIDTH_PX } from '../../../shared/ui/menu/context-menu-layout.constants';

// @see docs/specs/component/project/project-card.md

type ProjectCardMenuAction = 'change_color' | 'archive' | 'restore' | 'delete';
type ProjectCardMenuPanel = 'actions' | 'colors';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [
    ProjectColorPickerComponent,
    DropdownShellComponent,
    ChipComponent,
    ...HLM_BUTTON_IMPORTS,
    HlmMenuItemDirective,
    HlmMenuSeparatorDirective,
  ],
  templateUrl: './project-card.component.html',
  styleUrl: './project-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCardComponent implements OnDestroy {
  private static activeMenuOwner: ProjectCardComponent | null = null;

  // Single required input — @see docs/specs/component/project/project-card.md § Inputs
  readonly project = input.required<ProjectSummary>();

  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  readonly colorSelected = output<{ projectId: string; colorKey: ProjectColorKey }>();
  readonly dangerAction = output<{ projectId: string; action: 'archive' | 'restore' | 'delete' }>();

  /** Anchored menu width — `14rem` @ 16px root. */
  readonly contextMenuMinWidthPx = CONTEXT_MENU_PANEL_WIDTH_PX;

  // Stable state: menu closed
  readonly menuOpen = signal(false);
  readonly menuPanel = signal<ProjectCardMenuPanel>('actions');
  readonly menuAnchor = signal<HTMLElement | null>(null);

  // Relative-time label — computed so Date.now() is never called in the template
  // @see docs/specs/component/project/project-card.md § Activity line
  readonly relativeActivity = computed(() => {
    const at = this.project().lastActivityAt;
    if (!at) return null;
    return formatRelativeDate(at, this.t);
  });

  // Thumbnail zone: mosaic > map stub > building placeholder
  readonly hasThumbnails = computed(() => (this.project().thumbnailUrls?.length ?? 0) > 0);
  readonly hasLocation = computed(() => !!this.project().location);

  // Status chip variant and icon mapping — @see project-card.md § Chip Language
  readonly statusChipVariant = computed<ChipVariant>(() => {
    const s = this.project().status;
    if (s === 'active') return 'success';
    if (s === 'archived') return 'warning';
    return 'neutral';
  });

  readonly statusChipIcon = computed(() => {
    const s = this.project().status;
    if (s === 'active') return 'lens';
    if (s === 'archived') return 'archive';
    return 'edit';
  });

  readonly statusChipLabel = computed(() =>
    this.t('projects.status.' + this.project().status, this.project().status),
  );

  readonly availableMenuActions = computed<ProjectCardMenuAction[]>(() => {
    const project = this.project();
    if (project.status === 'archived') {
      return ['restore', 'delete'];
    }
    return ['change_color', 'archive'];
  });

  readonly hasMenuActions = computed(() => this.availableMenuActions().length > 0);

  onMenuTriggerClick(event: MouseEvent): void {
    if (!this.hasMenuActions()) return;

    event.preventDefault();
    event.stopPropagation();

    if (this.menuOpen()) {
      this.closeMenu();
      return;
    }

    this.menuPanel.set('actions');
    this.openMenu(event.currentTarget instanceof HTMLElement ? event.currentTarget : null);
  }

  onMenuCloseRequested(): void {
    this.closeMenu();
  }

  onMenuAction(action: ProjectCardMenuAction): void {
    if (action === 'change_color') {
      this.menuPanel.set('colors');
      return;
    }

    this.closeMenu();
    this.dangerAction.emit({
      projectId: this.project().id,
      action,
    });
  }

  onColorSelectedFromMenu(colorKey: ProjectColorKey): void {
    this.closeMenu();
    this.colorSelected.emit({ projectId: this.project().id, colorKey });
  }

  isDestructiveAction(action: ProjectCardMenuAction): boolean {
    return action === 'delete';
  }

  shouldShowSeparatorBefore(action: ProjectCardMenuAction): boolean {
    return action === 'delete';
  }

  menuPanelClass(): string {
    return 'map-context-menu option-menu-surface project-card-context-menu';
  }

  actionIcon(action: ProjectCardMenuAction): string {
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

  actionLabel(action: ProjectCardMenuAction): string {
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

  ngOnDestroy(): void {
    if (ProjectCardComponent.activeMenuOwner === this) {
      ProjectCardComponent.activeMenuOwner = null;
    }
  }

  private closeMenu(): void {
    if (ProjectCardComponent.activeMenuOwner === this) {
      ProjectCardComponent.activeMenuOwner = null;
    }
    this.menuOpen.set(false);
    this.menuAnchor.set(null);
    this.menuPanel.set('actions');
  }

  private openMenu(anchor: HTMLElement | null): void {
    const previousOwner = ProjectCardComponent.activeMenuOwner;
    if (previousOwner && previousOwner !== this) {
      previousOwner.closeMenu();
    }
    this.menuAnchor.set(anchor);
    this.menuOpen.set(true);
    ProjectCardComponent.activeMenuOwner = this;
  }
}
