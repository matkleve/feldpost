import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { DropdownShellComponent } from '../../shared/dropdown-shell.component';
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
import {
  SegmentedSwitchComponent,
  type SegmentedSwitchOption,
} from '../../shared/segmented-switch/segmented-switch.component';
import { UiDropdownTriggerDirective } from '../../shared/ui-dropdown-trigger.directive';
import { ProjectsViewToggleComponent } from './projects-view-toggle.component';
import type { ProjectsViewMode, ProjectStatusFilter } from '../../core/projects/projects.types';
import type { SortConfig } from '../../core/workspace-view.types';

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
    UiDropdownTriggerDirective,
    ProjectsViewToggleComponent,
  ],
  template: `
    <section class="projects-toolbar">
      <app-segmented-switch
        class="projects-toolbar__status"
        [ariaLabel]="t('projects.toolbar.status.aria', 'Project status filter')"
        [options]="statusOptions()"
        [value]="statusFilter()"
        (valueChange)="onStatusValueChange($event)"
      />

      <div
        class="projects-toolbar__controls"
        role="toolbar"
        [attr.aria-label]="t('projects.toolbar.aria.controls', 'Project controls')"
      >
        @for (btn of buttons(); track btn.id) {
          <button
            type="button"
            uiDropdownTrigger
            [class.ui-button--active]="btn.active"
            [open]="activeDropdown() === btn.id"
            [attr.aria-expanded]="activeDropdown() === btn.id"
            [attr.aria-haspopup]="true"
            (click)="toggleDropdown(btn.id, $event)"
          >
            <span class="ui-dropdown-trigger__label">{{ btn.label }}</span>
            <span class="ui-dropdown-trigger__chevron material-icons" aria-hidden="true">expand_more</span>
          </button>
        }
      </div>

      <app-projects-view-toggle
        class="projects-toolbar__view-toggle"
        [viewMode]="viewMode()"
        (viewModeChange)="viewModeChange.emit($event)"
      />
    </section>

    @if (activeDropdown()) {
      <app-dropdown-shell
        panelClass="toolbar-dropdown option-menu-surface"
        [top]="dropdownTop()"
        [left]="dropdownLeft()"
        [outsideCloseEnabled]="!isDragging()"
        (closeRequested)="closeDropdown()"
      >
        @switch (activeDropdown()) {
          @case ('grouping') {
            <app-grouping-dropdown
              [activeGroupings]="activeGroupings()"
              [availableProperties]="availableGroupings()"
              (groupingsChanged)="onGroupingsChanged($event.active, $event.available)"
              (dragStarted)="onDragStarted()"
              (dragEnded)="onDragEnded()"
            />
          }
          @case ('filter') {
            <app-filter-dropdown [propertyOptionsInput]="filterOptions()" />
          }
          @case ('sort') {
            <app-sort-dropdown
              [optionsInput]="sortOptions()"
              [groupingIdsInput]="activeGroupingIds()"
              [activeSortsInput]="activeSorts()"
              [defaultSorts]="[]"
              (sortChanged)="sortChanged.emit($event)"
            />
          }
        }
      </app-dropdown-shell>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .projects-toolbar {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
        min-width: 0;
        flex-wrap: wrap;
      }

      .projects-toolbar__controls {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-2);
        flex-wrap: wrap;
      }

      .projects-toolbar__view-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        flex: 0 0 auto;
      }

      @media (max-width: 60rem) {
        .projects-toolbar {
          flex-direction: column;
          align-items: stretch;
        }

        .projects-toolbar__status,
        .projects-toolbar__view-toggle {
          width: 100%;
        }
      }
    `,
  ],
})
export class ProjectsToolbarComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly groupingOptions = input.required<GroupingProperty[]>();
  readonly activeGroupingsInput = input.required<GroupingProperty[]>();
  readonly filterOptions = input.required<FilterDropdownPropertyOption[]>();
  readonly sortOptions = input.required<SortDropdownOption[]>();
  readonly hasGrouping = input.required<boolean>();
  readonly hasFilters = input.required<boolean>();
  readonly hasCustomSort = input.required<boolean>();
  readonly hasArchivedProjects = input.required<boolean>();
  readonly viewMode = input.required<ProjectsViewMode>();
  readonly statusFilter = input.required<ProjectStatusFilter>();
  readonly activeSorts = input.required<SortConfig[]>();

  readonly groupingChanged = output<GroupingProperty[]>();
  readonly sortChanged = output<SortConfig[]>();
  readonly viewModeChange = output<ProjectsViewMode>();
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
      label: this.t('projects.toolbar.status.all', 'All'),
      icon: 'apps',
    },
    {
      id: 'active',
      label: this.t('projects.toolbar.status.active', 'Active'),
      icon: 'check_circle',
    },
    {
      id: 'archived',
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

  onGroupingsChanged(active: GroupingProperty[], _available: GroupingProperty[]): void {
    this.activeGroupings.set(active);
    this.groupingChanged.emit(active);
  }

  onStatusValueChange(value: string | null): void {
    if (value === 'all' || value === 'active' || value === 'archived') {
      this.statusFilterChange.emit(value);
    }
  }
}

