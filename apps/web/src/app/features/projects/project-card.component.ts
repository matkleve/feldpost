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
import type { CardVariant } from '../../shared/ui-primitives/card-variant.types';
import {
  fileTypeCategoryLabel,
  fileTypeChipIcon as resolveFileTypeChipIcon,
  fileTypeChipVariant as resolveFileTypeChipVariant,
} from '../../core/projects/projects-file-type-chips.helpers';
import type {
  ProjectColorKey,
  ProjectFileTypeCount,
  ProjectListItem,
} from '../../core/projects/projects.types';
import type { FileTypeCategory } from '../../core/media/media-renderer.types';
import type { ChipVariant } from '../../shared/components/chip/chip.component';
import { ProjectColorPickerComponent } from './project-color-picker.component';
import { DropdownShellComponent } from '../../shared/dropdown-trigger/dropdown-shell.component';
import { ChipComponent } from '../../shared/components/chip/chip.component';
import { HLM_BUTTON_IMPORTS } from '../../shared/ui/button';
import { HlmMenuItemDirective, HlmMenuSeparatorDirective } from '../../shared/ui/menu';
import { I18nService } from '../../core/i18n/i18n.service';

const PROJECT_CARD_MENU_WIDTH = 224;
const PROJECT_CARD_MENU_OFFSET_Y = 4;

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

  readonly project = input.required<ProjectListItem>();
  readonly variant = input<CardVariant>('medium');
  readonly colorTokenFor = input.required<(key: ProjectColorKey) => string>();
  readonly formatRelativeDate = input.required<(value: string | null) => string>();

  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  readonly colorSelected = output<{ projectId: string; colorKey: ProjectColorKey }>();
  readonly dangerAction = output<{ projectId: string; action: 'archive' | 'restore' | 'delete' }>();

  readonly menuOpen = signal(false);
  readonly menuPanel = signal<ProjectCardMenuPanel>('actions');
  readonly menuPosition = signal<{ x: number; y: number } | null>(null);

  readonly availableMenuActions = computed<ProjectCardMenuAction[]>(() => {
    const project = this.project();
    if (project.status === 'archived') {
      return ['restore', 'delete'];
    }

    const actions: ProjectCardMenuAction[] = ['change_color'];
    if (this.variant() !== 'small') {
      actions.push('archive');
    }
    return actions;
  });

  readonly hasMenuActions = computed(() => this.availableMenuActions().length > 0);

  onMenuTriggerClick(event: MouseEvent): void {
    if (!this.hasMenuActions()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (this.menuOpen()) {
      this.closeMenu();
      return;
    }

    this.menuPanel.set('actions');
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      const rect = target.getBoundingClientRect();
      const menuHeight = this.estimateMenuHeight('actions');
      const downwardY = rect.bottom + PROJECT_CARD_MENU_OFFSET_Y;
      const hasSpaceBelow = downwardY + menuHeight <= window.innerHeight - 8;
      const menuY = hasSpaceBelow
        ? downwardY
        : rect.top - menuHeight - PROJECT_CARD_MENU_OFFSET_Y;
      this.openMenuAt(rect.right - PROJECT_CARD_MENU_WIDTH, menuY, menuHeight);
      return;
    }

    this.openMenuAt(event.clientX, event.clientY, this.estimateMenuHeight('actions'));
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

  fileTypeChipVariant(category: FileTypeCategory): ChipVariant {
    return resolveFileTypeChipVariant(category);
  }

  fileTypeChipIcon(category: FileTypeCategory): string {
    return resolveFileTypeChipIcon(category);
  }

  fileTypeChipAriaLabel(fileType: ProjectFileTypeCount): string {
    return this.t('projects.page.fileType.countAria', '{count} {type}')
      .replace('{count}', String(fileType.count))
      .replace('{type}', fileTypeCategoryLabel(fileType.category));
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

  private estimateMenuHeight(panel: ProjectCardMenuPanel): number {
    if (panel === 'colors') {
      return 120;
    }
    return this.availableMenuActions().length * 44 + 24;
  }

  private closeMenu(): void {
    if (ProjectCardComponent.activeMenuOwner === this) {
      ProjectCardComponent.activeMenuOwner = null;
    }
    this.menuOpen.set(false);
    this.menuPosition.set(null);
    this.menuPanel.set('actions');
  }

  private clampMenuPosition(x: number, y: number, menuHeight: number): { x: number; y: number } {
    if (typeof window === 'undefined') {
      return { x, y };
    }

    const margin = 8;
    return {
      x: Math.min(Math.max(x, margin), window.innerWidth - PROJECT_CARD_MENU_WIDTH - margin),
      y: Math.min(Math.max(y, margin), window.innerHeight - menuHeight - margin),
    };
  }

  private openMenuAt(x: number, y: number, menuHeight: number): void {
    const previousOwner = ProjectCardComponent.activeMenuOwner;
    if (previousOwner && previousOwner !== this) {
      previousOwner.closeMenu();
    }

    this.menuPosition.set(this.clampMenuPosition(x, y, menuHeight));
    this.menuOpen.set(true);
    ProjectCardComponent.activeMenuOwner = this;
  }
}
