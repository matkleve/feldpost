import { Component, signal, computed, HostListener, inject } from '@angular/core';
import { GroupingDropdownComponent, type GroupingProperty } from './grouping-dropdown.component';
import { FilterDropdownComponent } from './filter-dropdown.component';
import { SortDropdownComponent } from './sort-dropdown.component';
import { ProjectsDropdownComponent } from './projects-dropdown.component';
import { WorkspaceViewService } from '../../../../core/workspace-view.service';
import { FilterService } from '../../../../core/filter.service';
import { PropertyRegistryService } from '../../../../core/property-registry.service';
import type {
  PropertyRef,
  SortConfig,
  ThumbnailSizePreset,
} from '../../../../core/workspace-view.types';
import { DropdownShellComponent } from '../../../../shared/dropdown-shell.component';
import {
  SnapSizeSliderComponent,
  type SnapSizeSliderOption,
} from '../../../../shared/snap-size-slider/snap-size-slider.component';

export type ToolbarDropdown = 'grouping' | 'filter' | 'sort' | 'projects' | null;

const THUMBNAIL_SIZE_OPTIONS: ReadonlyArray<SnapSizeSliderOption> = [
  { value: 'small', label: 'Small', shortLabel: 'S', icon: 'view_comfy' },
  { value: 'medium', label: 'Medium', shortLabel: 'M', icon: 'grid_view' },
  { value: 'large', label: 'Large', shortLabel: 'L', icon: 'apps' },
];

@Component({
  selector: 'app-workspace-toolbar',
  templateUrl: './workspace-toolbar.component.html',
  styleUrl: './workspace-toolbar.component.scss',
  imports: [
    DropdownShellComponent,
    GroupingDropdownComponent,
    FilterDropdownComponent,
    SortDropdownComponent,
    ProjectsDropdownComponent,
    SnapSizeSliderComponent,
  ],
})
export class WorkspaceToolbarComponent {
  private readonly viewService = inject(WorkspaceViewService);
  private readonly filterService = inject(FilterService);
  private readonly registry = inject(PropertyRegistryService);

  readonly activeDropdown = signal<ToolbarDropdown>(null);
  readonly thumbnailSizeOptions = THUMBNAIL_SIZE_OPTIONS;
  readonly thumbnailSizePreset = computed(() => this.viewService.thumbnailSizePreset());

  // Dropdown position (fixed, computed from button rect)
  readonly dropdownTop = signal(0);
  readonly dropdownLeft = signal(0);

  // --- Grouping state (persists across dropdown open/close) ---
  readonly activeGroupings = signal<GroupingProperty[]>([]);
  readonly availableGroupings = computed<GroupingProperty[]>(() => {
    const activeIds = new Set(this.activeGroupings().map((g) => g.id));
    return this.registry
      .groupableProperties()
      .filter((p) => !activeIds.has(p.id))
      .map((p) => ({ id: p.id, label: p.label, icon: p.icon }));
  });

  // Active-state indicators — wired to services
  readonly hasGrouping = computed(() => this.viewService.activeGroupings().length > 0);
  readonly hasFilters = computed(() => this.filterService.activeCount() > 0);
  readonly hasCustomSort = computed(() => {
    const sorts = this.viewService.activeSorts();
    return sorts.length !== 1 || sorts[0].key !== 'date-captured' || sorts[0].direction !== 'desc';
  });
  readonly hasProject = computed(() => this.viewService.selectedProjectIds().size > 0);

  readonly buttons = [
    { id: 'grouping' as const, label: 'Grouping', active: this.hasGrouping },
    { id: 'filter' as const, label: 'Filter', active: this.hasFilters },
    { id: 'sort' as const, label: 'Sort', active: this.hasCustomSort },
    { id: 'projects' as const, label: 'Projects', active: this.hasProject },
  ];

  // Guard: skip click-outside detection during CDK drag operations
  readonly isDragging = signal(false);

  /** Called by child dropdowns to suppress click-outside while dragging. */
  onDragStarted(): void {
    this.isDragging.set(true);
  }

  /** Called by child dropdowns when drag ends. */
  onDragEnded(): void {
    // Defer reset so the synthetic click from mouseup doesn't trigger close
    setTimeout(() => this.isDragging.set(false));
  }

  onGroupingsChanged(active: GroupingProperty[], _available: GroupingProperty[]): void {
    this.activeGroupings.set(active);
    // Push to WorkspaceViewService
    this.viewService.activeGroupings.set(
      active.map((g) => ({ id: g.id, label: g.label, icon: g.icon }) as PropertyRef),
    );
  }

  onSortChanged(sortConfigs: SortConfig[]): void {
    this.viewService.activeSorts.set(sortConfigs);
  }

  onProjectsChanged(selectedIds: Set<string>): void {
    this.viewService.selectedProjectIds.set(selectedIds);
  }

  toggleDropdown(id: ToolbarDropdown, event: MouseEvent): void {
    if (this.activeDropdown() === id) {
      this.activeDropdown.set(null);
      return;
    }
    // Position dropdown below the clicked button, clamped to viewport
    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const dropdownWidth = id === 'filter' ? 352 : 240; // min-width per spec
    const viewportWidth = window.innerWidth;
    const padding = 16; // keep 16px from viewport edge

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

  onThumbnailSizeChanged(value: string): void {
    if (value !== 'small' && value !== 'medium' && value !== 'large') return;
    this.viewService.setThumbnailSizePreset(value as ThumbnailSizePreset);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDropdown();
  }
}
