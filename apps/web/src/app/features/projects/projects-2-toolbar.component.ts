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
import { ProjectsViewToggleComponent } from './projects-view-toggle.component';
import type { ProjectsViewMode, ProjectStatusFilter } from '../../core/projects/projects.types';
import type { SortConfig } from '../../core/workspace-view.types';

type Projects2ToolbarDropdown = 'grouping' | 'filter' | 'sort' | null;

@Component({
  selector: 'app-projects-2-toolbar',
  standalone: true,
  imports: [
    DropdownShellComponent,
    GroupingDropdownComponent,
    FilterDropdownComponent,
    SortDropdownComponent,
    SegmentedSwitchComponent,
    ProjectsViewToggleComponent,
  ],
  template: `
    <section class="projects2-toolbar">
      <div
        class="projects2-toolbar__controls"
        role="toolbar"
        [attr.aria-label]="t('projects.toolbar.aria.controls', 'Project controls')"
      >
        @for (btn of buttons(); track btn.id) {
          <button
            type="button"
            class="toolbar-btn"
            [class.toolbar-btn--active]="btn.active"
            [class.toolbar-btn--open]="activeDropdown() === btn.id"
            [attr.aria-expanded]="activeDropdown() === btn.id"
            [attr.aria-haspopup]="true"
            (click)="toggleDropdown(btn.id, $event)"
          >
            <span class="toolbar-btn__label">{{ btn.label }}</span>
            <span class="toolbar-btn__chevron material-icons" aria-hidden="true">expand_more</span>
          </button>
        }
      </div>

      <span class="projects2-toolbar__spacer" aria-hidden="true"></span>

      <app-segmented-switch
        class="projects2-toolbar__status"
        [ariaLabel]="t('projects.toolbar.status.aria', 'Project status filter')"
        [options]="statusOptions()"
        [value]="statusFilter()"
        (valueChange)="onStatusValueChange($event)"
      />

      <app-projects-view-toggle
        class="projects2-toolbar__view-toggle"
        [viewMode]="viewMode()"
        (viewModeChange)="viewModeChange.emit($event)"
      />
    </section>

    @if (activeDropdown()) {
      <app-dropdown-shell
        panelClass="projects2-toolbar-dropdown option-menu-surface"
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

      .projects2-toolbar {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
        min-width: 0;
      }

      .projects2-toolbar__controls {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-2);
        flex-wrap: wrap;
      }

      .toolbar-btn {
        min-height: 2.75rem;
        padding-inline: 0.95rem;
        padding-block: 0.375rem;
        border: 1px solid color-mix(in srgb, var(--action-border-default) 88%, var(--color-border));
        border-radius: var(--container-radius-control);
        background: color-mix(in srgb, var(--menu-surface-bg) 92%, var(--color-bg-base));
        color: var(--action-text-default);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-2);
        white-space: nowrap;
        box-shadow: var(--elevation-subtle);
        cursor: pointer;
        transition:
          border-color 140ms ease,
          background-color 140ms ease,
          color 140ms ease,
          box-shadow 140ms ease;
      }

      .toolbar-btn__label {
        display: inline-flex;
        align-items: center;
        white-space: nowrap;
      }

      .toolbar-btn__chevron {
        font-size: 1rem;
        line-height: 1;
      }

      .toolbar-btn:hover {
        color: var(--color-text-primary);
        background: color-mix(in srgb, var(--color-clay) 10%, transparent);
      }

      .toolbar-btn--active,
      .toolbar-btn--open {
        border-color: color-mix(in srgb, var(--action-border-active) 82%, transparent);
        background: var(--field-bg);
        color: var(--action-text-active);
        box-shadow:
          0 1px 2px color-mix(in srgb, var(--color-clay) 16%, transparent),
          0 0 0 1px color-mix(in srgb, var(--color-clay) 22%, transparent) inset;
      }

      .projects2-toolbar__spacer {
        flex: 1 1 auto;
        min-width: var(--spacing-2);
      }

      .projects2-toolbar__view-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        flex: 0 0 auto;
      }

      @media (max-width: 60rem) {
        .projects2-toolbar {
          flex-direction: column;
          align-items: stretch;
        }

        .projects2-toolbar__status,
        .projects2-toolbar__view-toggle {
          width: 100%;
        }

        .projects2-toolbar__spacer {
          display: none;
        }
      }
    `,
  ],
})
export class Projects2ToolbarComponent {
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

  readonly activeDropdown = signal<Projects2ToolbarDropdown>(null);
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

  toggleDropdown(id: Projects2ToolbarDropdown, event: MouseEvent): void {
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
