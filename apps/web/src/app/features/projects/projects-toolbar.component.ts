import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { DropdownShellComponent } from '../../shared/dropdown-trigger/dropdown-shell.component';
import {
  GroupingDropdownComponent,
  type GroupingProperty,
} from '../../shared/dropdown-trigger/grouping-dropdown.component';
import {
  FilterDropdownComponent,
  type FilterDropdownPropertyOption,
} from '../../shared/dropdown-trigger/filter-dropdown.component';
import {
  SortDropdownComponent,
  type SortDropdownOption,
} from '../../shared/dropdown-trigger/sort-dropdown.component';
import {
  SegmentedSwitchComponent,
  type SegmentedSwitchOption,
} from '../../shared/segmented-switch/segmented-switch.component';
import { CardVariantSwitchComponent } from '../../shared/ui-primitives/card-variant-switch.component';
import { UiDropdownTriggerDirective } from '../../shared/dropdown-trigger/ui-dropdown-trigger.directive';
import { PaneToolbarComponent } from '../../shared/pane-toolbar/pane-toolbar.component';
import type { ProjectsViewMode, ProjectStatusFilter } from '../../core/projects/projects.types';
import type { SortConfig } from '../../core/workspace-view/workspace-view.types';
import { CARD_VARIANTS, type CardVariant } from '../../shared/ui-primitives/card-variant.types';

type ProjectsToolbarDropdown = 'grouping' | 'filter' | 'sort' | null;

@Component({
  selector: 'app-projects-toolbar',
  standalone: true,
  imports: [
    DropdownShellComponent,
    GroupingDropdownComponent,
    FilterDropdownComponent,
    SortDropdownComponent,
    SegmentedSwitchComponent,
    CardVariantSwitchComponent,
    UiDropdownTriggerDirective,
    PaneToolbarComponent,
  ],
  templateUrl: './projects-toolbar.component.html',
  styleUrl: './projects-toolbar.component.scss',
})
export class ProjectsToolbarComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = ''): string => {
    const value = this.i18nService.t(key, fallback);
    if (typeof value === 'string' && value.trim().length > 0) return value;
    if (fallback.trim().length > 0) return fallback;
    return key;
  };

  readonly groupingOptions = input.required<GroupingProperty[]>();
  readonly activeGroupingsInput = input.required<GroupingProperty[]>();
  readonly filterOptions = input.required<FilterDropdownPropertyOption[]>();
  readonly sortOptions = input.required<SortDropdownOption[]>();
  readonly hasGrouping = input.required<boolean>();
  readonly hasFilters = input.required<boolean>();
  readonly hasCustomSort = input.required<boolean>();
  readonly hasArchivedProjects = input.required<boolean>();
  readonly viewMode = input.required<ProjectsViewMode>();
  readonly cardVariant = input<CardVariant>('medium');
  readonly allowedCardVariants = input<ReadonlyArray<CardVariant>>(CARD_VARIANTS);
  readonly statusFilter = input.required<ProjectStatusFilter>();
  readonly activeSorts = input.required<SortConfig[]>();

  readonly groupingChanged = output<GroupingProperty[]>();
  readonly sortChanged = output<SortConfig[]>();
  readonly viewModeChange = output<ProjectsViewMode>();
  readonly cardVariantChange = output<CardVariant>();
  readonly statusFilterChange = output<ProjectStatusFilter>();

  readonly activeDropdown = signal<ProjectsToolbarDropdown>(null);
  readonly dropdownTop = signal(0);
  readonly dropdownLeft = signal(0);
  readonly isDragging = signal(false);
  readonly activeGroupings = signal<GroupingProperty[]>([]);

  readonly availableGroupings = computed(() => {
    const activeIds = new Set(this.activeGroupings().map((group) => group.id));
    return this.groupingOptions().filter((group) => !activeIds.has(group.id));
  });
  readonly activeGroupingIds = computed(() => this.activeGroupings().map((group) => group.id));
  readonly statusOptions = computed<ReadonlyArray<SegmentedSwitchOption>>(() => [
    {
      id: 'all',
      type: 'icon-with-text',
      label: this.t('projects.toolbar.status.all', 'All'),
      icon: 'apps',
    },
    {
      id: 'archived',
      type: 'icon-with-text',
      label: this.t('projects.toolbar.status.archived', 'Archived'),
      icon: 'inventory_2',
      inactive: !this.hasArchivedProjects(),
    },
  ]);
  readonly buttons = computed(() => [
    {
      id: 'grouping' as const,
      label: this.t('workspace.toolbar.button.grouping', 'Grouping'),
      active: this.hasGrouping(),
    },
    {
      id: 'filter' as const,
      label: this.t('workspace.toolbar.button.filter', 'Filter'),
      active: this.hasFilters(),
    },
    {
      id: 'sort' as const,
      label: this.t('workspace.toolbar.button.sort', 'Sort'),
      active: this.hasCustomSort(),
    },
  ]);

  constructor() {
    effect(() => {
      this.activeGroupings.set(this.activeGroupingsInput());
    });
  }

  toggleDropdown(id: ProjectsToolbarDropdown, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeDropdown() === id) {
      this.closeDropdown();
      return;
    }

    const trigger = event.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();
    const dropdownWidth = id === 'filter' ? 352 : 240;
    const viewportWidth = window.innerWidth;
    const padding = 16;

    let left = rect.left;
    if (left + dropdownWidth > viewportWidth - padding) {
      left = Math.max(padding, viewportWidth - dropdownWidth - padding);
    }

    this.dropdownTop.set(rect.bottom + 4);
    this.dropdownLeft.set(left);
    this.activeDropdown.set(id);
  }

  closeDropdown(): void {
    this.activeDropdown.set(null);
  }

  onDragStarted(): void {
    this.isDragging.set(true);
  }

  onDragEnded(): void {
    setTimeout(() => this.isDragging.set(false));
  }

  onGroupingsChanged(active: GroupingProperty[]): void {
    this.activeGroupings.set(active);
    this.groupingChanged.emit(active);
  }

  onStatusValueChange(value: string | null): void {
    if (value === 'all' || value === 'active' || value === 'archived') {
      this.statusFilterChange.emit(value);
    }
  }

  onCardVariantChanged(value: CardVariant): void {
    this.cardVariantChange.emit(value);
  }
}
