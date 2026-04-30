import type { OnInit } from '@angular/core';
import { Component, signal, computed, HostListener, inject } from '@angular/core';
import {
  GroupingDropdownComponent,
  type GroupingProperty,
} from '../../../../shared/dropdown-trigger/grouping-dropdown.component';
import { FilterDropdownComponent } from '../../../../shared/dropdown-trigger/filter-dropdown.component';
import { SortDropdownComponent } from '../../../../shared/dropdown-trigger/sort-dropdown.component';
import { ProjectsDropdownComponent } from './projects-dropdown.component';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { FilterService } from '../../../../core/filter/filter.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MetadataService } from '../../../../core/metadata/metadata.service';
import type {
  MetadataFieldRef,
  SortConfig,
  ThumbnailSizePreset,
} from '../../../../core/workspace-view/workspace-view.types';
import { DropdownShellComponent } from '../../../../shared/dropdown-trigger/dropdown-shell.component';
import { UiDropdownTriggerDirective } from '../../../../shared/dropdown-trigger/ui-dropdown-trigger.directive';
import { CardVariantSwitchComponent } from '../../../../shared/ui-primitives/card-variant-switch.component';
import { CardVariantSettingsService } from '../../../../shared/ui-primitives/card-variant-settings.service';
import {
  CARD_VARIANTS,
  type CardVariant,
} from '../../../../shared/ui-primitives/card-variant.types';

export type ToolbarDropdown = 'grouping' | 'filter' | 'sort' | 'projects' | null;

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
    UiDropdownTriggerDirective,
    CardVariantSwitchComponent,
  ],
})
export class WorkspaceToolbarComponent implements OnInit {
  private readonly viewService = inject(WorkspaceViewService);
  private readonly filterService = inject(FilterService);
  private readonly i18nService = inject(I18nService);
  private readonly metadata = inject(MetadataService);
  private readonly cardVariantSettings = inject(CardVariantSettingsService);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);
  readonly currentLanguage = this.i18nService.language;

  ngOnInit(): void {
    // Restore persisted variant for map scope
    const savedVariant = this.cardVariantSettings.getVariant('map');
    if (savedVariant) {
      this.viewService.setThumbnailSizePreset(savedVariant as ThumbnailSizePreset);
    }
  }

  readonly activeDropdown = signal<ToolbarDropdown>(null);
  readonly thumbnailSizePreset = computed(() => this.viewService.thumbnailSizePreset());
  readonly allowedCardVariants = CARD_VARIANTS;

  // Dropdown position (fixed, computed from button rect)
  readonly dropdownTop = signal(0);
  readonly dropdownLeft = signal(0);

  // --- Grouping state (persists across dropdown open/close) ---
  readonly activeGroupings = signal<GroupingProperty[]>([]);
  readonly availableGroupings = computed<GroupingProperty[]>(() => {
    const activeIds = new Set(this.activeGroupings().map((g) => g.id));
    return this.metadata
      .groupableMetadataFields()
      .filter((field) => !activeIds.has(field.id))
      .map((field) => ({ id: field.id, label: field.label, icon: field.icon }));
  });

  // Active-state indicators — wired to services
  readonly hasGrouping = computed(() => this.viewService.activeGroupings().length > 0);
  readonly hasFilters = computed(() => this.filterService.activeCount() > 0);
  readonly hasCustomSort = computed(() => {
    const sorts = this.viewService.activeSorts();
    return sorts.length !== 1 || sorts[0].key !== 'date-captured' || sorts[0].direction !== 'desc';
  });
  readonly hasProject = computed(() => this.viewService.selectedProjectIds().size > 0);

  readonly buttons = computed(() => {
    this.currentLanguage();
    return [
      {
        id: 'grouping' as const,
        label: this.t('workspace.toolbar.button.grouping', 'Grouping'),
        active: this.hasGrouping,
      },
      {
        id: 'filter' as const,
        label: this.t('workspace.toolbar.button.filter', 'Filter'),
        active: this.hasFilters,
      },
      {
        id: 'sort' as const,
        label: this.t('workspace.toolbar.button.sort', 'Sort'),
        active: this.hasCustomSort,
      },
      {
        id: 'projects' as const,
        label: this.t('workspace.toolbar.button.projects', 'Projects'),
        active: this.hasProject,
      },
    ];
  });

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

  onGroupingsChanged(active: GroupingProperty[]): void {
    this.activeGroupings.set(active);
    // Push to WorkspaceViewService
    this.viewService.setActiveGroupings(
      active.map((g) => ({ id: g.id, label: g.label, icon: g.icon }) as MetadataFieldRef),
    );
  }

  onSortChanged(sortConfigs: SortConfig[]): void {
    this.viewService.setActiveSorts(sortConfigs);
  }

  onProjectsChanged(selectedIds: Set<string>): void {
    this.viewService.setSelectedProjectIds(selectedIds);
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

  onThumbnailSizeChanged(value: string | null): void {
    if (value !== 'row' && value !== 'small' && value !== 'medium' && value !== 'large') return;
    this.viewService.setThumbnailSizePreset(value as ThumbnailSizePreset);
    this.cardVariantSettings.setVariant('map', value as CardVariant);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDropdown();
  }
}
