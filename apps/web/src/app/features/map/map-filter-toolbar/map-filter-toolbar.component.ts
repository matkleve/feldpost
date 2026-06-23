import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MapTimespaceCatalogService } from '../../../core/map-timespace/map-timespace-catalog.service';
import { FilterDropdownComponent } from '../../../shared/dropdown-trigger/filter/filter-dropdown.component';
import { ToolbarDropdownStackComponent } from '../../../shared/dropdown-trigger/toolbar/toolbar-dropdown-stack.component';
import { ProjectsDropdownComponent } from '../../../shared/workspace-pane/toolbar/workspace-toolbar/projects-dropdown.component';
import { FilterService } from '../../../core/filter/filter.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { WorkspaceViewService } from '../../../core/workspace-view/workspace-view.service';
import { TimespaceDropdownComponent } from './timespace-dropdown.component';

export type MapFilterDropdown = 'filter' | 'projects' | 'timespace' | null;

@Component({
  selector: 'app-map-filter-toolbar',
  templateUrl: './map-filter-toolbar.component.html',
  styleUrl: './map-filter-toolbar.component.scss',
  imports: [
    ToolbarDropdownStackComponent,
    FilterDropdownComponent,
    ProjectsDropdownComponent,
    TimespaceDropdownComponent,
  ],
})
export class MapFilterToolbarComponent implements OnInit {
  private readonly filterService = inject(FilterService);
  private readonly viewService = inject(WorkspaceViewService);
  private readonly i18nService = inject(I18nService);
  private readonly mapTimespaceCatalog = inject(MapTimespaceCatalogService);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  readonly activeDropdown = signal<MapFilterDropdown>(null);
  readonly dropdownAnchor = signal<HTMLElement | null>(null);
  readonly isDragging = signal(false);

  readonly hasFilters = computed(() => this.filterService.activeCount() > 0);
  readonly hasProject = computed(() => this.viewService.selectedProjectIds().size > 0);
  readonly hasTimespace = this.viewService.hasTimeRange;

  ngOnInit(): void {
    this.mapTimespaceCatalog.ensureLoaded();
  }

  readonly buttons = computed(() => {
    this.i18nService.language();
    return [
      {
        id: 'filter' as const,
        icon: 'filter_list',
        label: this.t('map.filter.button.filter', 'Filter'),
        active: this.hasFilters,
      },
      {
        id: 'projects' as const,
        icon: 'folder',
        label: this.t('map.filter.button.projects', 'Projects'),
        active: this.hasProject,
      },
      {
        id: 'timespace' as const,
        icon: 'date_range',
        label: this.t('map.filter.button.timespace', 'Timespace'),
        active: this.hasTimespace,
      },
    ];
  });

  onProjectsChanged(selectedIds: Set<string>): void {
    this.viewService.setSelectedProjectIds(selectedIds);
  }

  onDragStarted(): void {
    this.isDragging.set(true);
  }

  onDragEnded(): void {
    setTimeout(() => this.isDragging.set(false));
  }

  toggleDropdown(id: MapFilterDropdown, event: MouseEvent): void {
    if (this.activeDropdown() === id) {
      this.closeDropdown();
      return;
    }
    this.dropdownAnchor.set(event.currentTarget as HTMLElement);
    this.activeDropdown.set(id);
  }

  closeDropdown(): void {
    this.activeDropdown.set(null);
    this.dropdownAnchor.set(null);
  }
}
