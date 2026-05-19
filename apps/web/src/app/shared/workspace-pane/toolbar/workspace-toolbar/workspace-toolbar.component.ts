import type { OnInit } from '@angular/core';
import { Component, signal, computed, inject } from '@angular/core';
import { BrnToggleGroupImports, type ToggleValue } from '@spartan-ng/brain/toggle-group';
import { HLM_TOGGLE_GROUP_IMPORTS } from '../../../../shared/ui/toggle-group';
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
import {
  toolbarDropdownPanelClass,
  toolbarDropdownPositionWidthPx,
} from '../../../../shared/dropdown-trigger/toolbar-menu-panel-layout';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import { buildCardVariantToggleOptions } from '../../../../shared/ui-primitives/card-variant-toggle.helpers';
import { toggleSingleStringValue } from '../../../../shared/ui/toggle-group/toggle-group-option.helpers';
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
    ...HLM_BUTTON_IMPORTS,
    ...BrnToggleGroupImports,
    ...HLM_TOGGLE_GROUP_IMPORTS,
  ],
})
export class WorkspaceToolbarComponent implements OnInit {
  /** Bound to `app-dropdown-shell` `panelClass` (filter adds wider shell modifier). */
  protected readonly toolbarDropdownPanelClass = toolbarDropdownPanelClass;

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
  readonly cardVariantToggleOptions = computed(() =>
    buildCardVariantToggleOptions(this.t, this.allowedCardVariants, true),
  );
  readonly currentCardVariantToggleOption = computed(() => {
    const options = this.cardVariantToggleOptions();
    if (options.length === 0) return null;
    const current = this.thumbnailSizePreset();
    return options.find((opt) => opt.id === current) ?? options[0];
  });
  readonly nextCardVariantToggleOption = computed(() => {
    const options = this.cardVariantToggleOptions();
    if (options.length === 0) return null;
    const current = this.thumbnailSizePreset();
    const currentIndex = options.findIndex((opt) => opt.id === current);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % options.length;
    return options[nextIndex] ?? options[0];
  });
  readonly compactCardVariantToggleTitle = computed(() => {
    const next = this.nextCardVariantToggleOption();
    if (!next) return this.t('workspace.toolbar.size.compact.switchTo.fallback', 'Switch view');
    const template = this.t('workspace.toolbar.size.compact.switchTo', 'Switch to {{view}}');
    return template.replace('{{view}}', next.label);
  });

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
        icon: 'group_work',
        label: this.t('workspace.toolbar.button.grouping', 'Group'),
        active: this.hasGrouping,
      },
      {
        id: 'filter' as const,
        icon: 'filter_list',
        label: this.t('workspace.toolbar.button.filter', 'Filter'),
        active: this.hasFilters,
      },
      {
        id: 'sort' as const,
        icon: 'sort',
        label: this.t('workspace.toolbar.button.sort', 'Sort'),
        active: this.hasCustomSort,
      },
      {
        id: 'projects' as const,
        icon: 'folder',
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
    const dropdownWidth = toolbarDropdownPositionWidthPx(id);
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

  onThumbnailSizeToggleChange(raw: ToggleValue<string>): void {
    const value = toggleSingleStringValue(raw);
    if (value !== 'row' && value !== 'small' && value !== 'medium' && value !== 'large') return;
    this.applyThumbnailPreset(value);
  }

  cycleThumbnailSizePreset(): void {
    const next = this.nextCardVariantToggleOption();
    if (!next) return;
    const value = next.id;
    if (value !== 'row' && value !== 'small' && value !== 'medium' && value !== 'large') return;
    this.applyThumbnailPreset(value);
  }

  private applyThumbnailPreset(value: ThumbnailSizePreset): void {
    this.viewService.setThumbnailSizePreset(value);
    this.cardVariantSettings.setVariant('map', value as CardVariant);
  }
}
