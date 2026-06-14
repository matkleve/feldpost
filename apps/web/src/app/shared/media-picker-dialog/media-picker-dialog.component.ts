import { Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { BrnToggleGroupImports, type ToggleValue } from '@spartan-ng/brain/toggle-group';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import { HLM_DIALOG_IMPORTS } from '../ui/dialog';
import { HLM_INPUT_IMPORTS } from '../ui/input';
import { HLM_TOGGLE_GROUP_IMPORTS } from '../ui/toggle-group';
import {
  buildCardVariantToggleOptions,
  buildCompactCardVariantSwitchTitle,
  getNextCardVariantToggleOption,
} from '../ui-primitives/card-variant-toggle.helpers';
import { CARD_VARIANTS, type CardVariant } from '../ui-primitives/card-variant.types';
import { toggleSingleStringValue } from '../ui/toggle-group/toggle-group-option.helpers';
import { I18nService } from '../../core/i18n/i18n.service';
import { MediaQueryService } from '../../core/media-query/media-query.service';
import { FilterService } from '../../core/filter/filter.service';
import { MetadataService } from '../../core/metadata/metadata.service';
import type { MediaRecord } from '../../core/media-query/media-query.types';
import {
  flattenGroupedSectionsToMediaRenderRows,
  runMediaGalleryViewPipeline,
} from '../../core/media-query/media-gallery-view.helpers';
import { workspaceMediaToMediaRecord } from '../../core/workspace-view/workspace-media-mapper';
import type { SortConfig, WorkspaceMedia, MetadataFieldRef } from '../../core/workspace-view/workspace-view.types';
import {
  GroupingDropdownComponent,
  type GroupingProperty,
} from '../dropdown-trigger/grouping/grouping-dropdown.component';
import { FilterDropdownComponent } from '../dropdown-trigger/filter/filter-dropdown.component';
import { SortDropdownComponent } from '../dropdown-trigger/sort/sort-dropdown.component';
import { ProjectsDropdownComponent } from '../workspace-pane/toolbar/workspace-toolbar/projects-dropdown.component';
import { ToolbarDropdownStackComponent } from '../dropdown-trigger/toolbar/toolbar-dropdown-stack.component';
import type { ToolbarDropdown } from '../workspace-pane/toolbar/workspace-toolbar/workspace-toolbar.component';
import { MEDIA_ITEM_ACTION_CONTEXT, MediaItemComponent } from '../media-item/media-item.component';
import type { ItemDisplayMode } from '../item-grid/item.component';
import {
  isAdditivePointerSelection,
  resolveRangeAnchorId,
  sliceIdRangeInOrder,
} from '../../core/workspace-selection/workspace-selection.helpers';

@Component({
  selector: 'app-media-picker-dialog',
  standalone: true,
  imports: [
    ...BrnDialogImports,
    ...BrnToggleGroupImports,
    ...HLM_DIALOG_IMPORTS,
    ...HLM_BUTTON_IMPORTS,
    ...HLM_INPUT_IMPORTS,
    ...HLM_TOGGLE_GROUP_IMPORTS,
    GroupingDropdownComponent,
    FilterDropdownComponent,
    SortDropdownComponent,
    ProjectsDropdownComponent,
    ToolbarDropdownStackComponent,
    MediaItemComponent,
  ],
  providers: [FilterService],
  templateUrl: './media-picker-dialog.component.html',
  styleUrl: './media-picker-dialog.component.scss',
})
export class MediaPickerDialogComponent {
  private readonly _brnDialog = viewChild(BrnDialog);
  private readonly i18nService = inject(I18nService);
  private readonly mediaQueryService = inject(MediaQueryService);
  private readonly filterService = inject(FilterService);
  private readonly metadata = inject(MetadataService);

  readonly confirmed = output<string[]>();
  readonly cancelled = output<void>();
  readonly excludeMediaIds = input<readonly string[]>([]);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly rawItems = signal<WorkspaceMedia[]>([]);
  readonly searchQuery = signal('');
  readonly activeSorts = signal<SortConfig[]>([{ key: 'date-captured', direction: 'desc' }]);
  readonly activeGroupings = signal<GroupingProperty[]>([]);
  readonly selectedProjectIds = signal<Set<string>>(new Set());
  readonly cardVariant = signal<CardVariant>('small');
  readonly allowedCardVariants = CARD_VARIANTS;
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly rangeAnchorId = signal<string | null>(null);
  readonly activeDropdown = signal<ToolbarDropdown>(null);
  readonly dropdownAnchor = signal<HTMLElement | null>(null);
  readonly isDragging = signal(false);

  readonly mediaItemActionContext = MEDIA_ITEM_ACTION_CONTEXT;

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
        return 'grid-sm';
    }
  });

  readonly cardVariantToggleOptions = computed(() =>
    buildCardVariantToggleOptions((k, f) => this.t(k, f), this.allowedCardVariants, true),
  );

  readonly currentCardVariantToggleOption = computed(() => {
    const options = this.cardVariantToggleOptions();
    if (options.length === 0) return null;
    const current = this.cardVariant();
    return options.find((opt) => opt.id === current) ?? options[0];
  });

  readonly nextCardVariantToggleOption = computed(() =>
    getNextCardVariantToggleOption(this.cardVariantToggleOptions(), this.cardVariant()),
  );

  readonly compactCardVariantToggleTitle = computed(() =>
    buildCompactCardVariantSwitchTitle((k, f) => this.t(k, f), this.nextCardVariantToggleOption()),
  );

  readonly hasGrouping = computed(() => this.activeGroupings().length > 0);
  readonly hasFilters = computed(() => this.filterService.activeCount() > 0);
  readonly hasCustomSort = computed(() => {
    const sorts = this.activeSorts();
    return sorts.length !== 1 || sorts[0].key !== 'date-captured' || sorts[0].direction !== 'desc';
  });
  readonly hasProject = computed(() => this.selectedProjectIds().size > 0);

  readonly availableGroupings = computed<GroupingProperty[]>(() => {
    const activeIds = new Set(this.activeGroupings().map((g) => g.id));
    return this.metadata
      .groupableMetadataFields()
      .filter((field) => !activeIds.has(field.id))
      .map((field) => ({ id: field.id, label: field.label, icon: field.icon }));
  });

  readonly toolbarButtons = computed(() => {
    this.i18nService.language();
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

  readonly gallerySections = computed(() =>
    runMediaGalleryViewPipeline({
      images: this.searchScopedItems(),
      projectIds: this.selectedProjectIds(),
      rules: this.filterService.rules(),
      sorts: this.activeSorts(),
      groupings: this.activeGroupings().map(
        (g) => ({ id: g.id, label: g.label, icon: g.icon }) as MetadataFieldRef,
      ),
      filterService: this.filterService,
      metadata: this.metadata,
    }),
  );

  private readonly assignableItems = computed(() => {
    const excluded = new Set(this.excludeMediaIds());
    return this.rawItems().filter((item) => !excluded.has(item.id));
  });

  private readonly searchScopedItems = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const items = this.assignableItems();
    if (!query) {
      return items;
    }

    return items.filter((item) => this.matchesSearchQuery(item, query));
  });

  readonly displayItems = computed(() =>
    flattenGroupedSectionsToMediaRenderRows(this.gallerySections(), workspaceMediaToMediaRecord)
      .filter((row): row is { type: 'grid'; items: MediaRecord[] } => row.type === 'grid')
      .flatMap((row) => row.items),
  );

  readonly orderedVisibleMediaIds = computed(() => this.displayItems().map((item) => item.id));
  readonly selectionCount = computed(() => this.selectedIds().size);

  readonly confirmButtonLabel = computed(() => {
    const count = this.selectionCount();
    if (count === 0) {
      return this.t('projects.mediaPicker.confirm', 'Add');
    }
    return this.t('projects.mediaPicker.confirmWithCount', 'Add ({count} media)').replace(
      '{count}',
      String(count),
    );
  });

  readonly loadingPlaceholderIds = Array.from({ length: 18 }, (_, index) => index);

  readonly t = (key: string, fallback = '') => {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  };

  constructor() {
    void this.metadata.refreshMetadataFields();
    void this.loadMedia();
  }

  private async loadMedia(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const items = await this.mediaQueryService.loadAllCurrentUserWorkspaceMedia();
      this.rawItems.set(items);
    } catch {
      this.loadError.set(this.t('projects.mediaPicker.loadError', 'Failed to load media'));
      this.rawItems.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  isSelected(itemId: string): boolean {
    return this.selectedIds().has(itemId);
  }

  onItemPointerClick(
    mediaId: string,
    modifiers: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
  ): void {
    const orderedIds = this.orderedVisibleMediaIds();

    if (modifiers.shiftKey) {
      const anchorId = resolveRangeAnchorId(this.rangeAnchorId(), this.selectedIds(), mediaId);
      const rangeIds = sliceIdRangeInOrder(orderedIds, anchorId, mediaId);
      this.selectedIds.update((current) => {
        const next = isAdditivePointerSelection(modifiers) ? new Set(current) : new Set<string>();
        for (const id of rangeIds) {
          next.add(id);
        }
        return next;
      });
      this.rangeAnchorId.set(anchorId);
      return;
    }

    if (isAdditivePointerSelection(modifiers)) {
      this.toggleSelection(mediaId);
      return;
    }

    this.toggleSelection(mediaId);
  }

  onSelectionToggled(mediaId: string, selected: boolean): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (selected) {
        next.add(mediaId);
      } else {
        next.delete(mediaId);
      }
      return next;
    });
    this.rangeAnchorId.set(mediaId);
  }

  private toggleSelection(itemId: string): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
    this.rangeAnchorId.set(itemId);
  }

  onSortChanged(sorts: SortConfig[]): void {
    this.activeSorts.set(sorts);
  }

  onGroupingsChanged(active: GroupingProperty[]): void {
    this.activeGroupings.set(active);
  }

  onProjectsChanged(selectedIds: Set<string>): void {
    this.selectedProjectIds.set(new Set(selectedIds));
  }

  onDragStarted(): void {
    this.isDragging.set(true);
  }

  onDragEnded(): void {
    setTimeout(() => this.isDragging.set(false));
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  onCardVariantToggleChange(raw: ToggleValue<string>): void {
    const value = toggleSingleStringValue(raw);
    if (value === 'row' || value === 'small' || value === 'medium' || value === 'large') {
      this.cardVariant.set(value);
    }
  }

  cycleCardVariant(): void {
    const next = this.nextCardVariantToggleOption();
    if (!next) return;
    const value = next.id;
    if (value === 'row' || value === 'small' || value === 'medium' || value === 'large') {
      this.cardVariant.set(value);
    }
  }

  private matchesSearchQuery(item: WorkspaceMedia, query: string): boolean {
    const fields = [
      item.addressLabel,
      item.city,
      item.street,
      item.district,
      item.country,
      item.fileMetadata?.originalFilename,
      item.fileMetadata?.filename,
      item.fileMetadata?.title,
      item.fileMetadata?.name,
      item.projectName,
      ...(item.projectNames ?? []),
    ];

    return fields.some((value) => value?.toLowerCase().includes(query));
  }

  toggleDropdown(id: ToolbarDropdown, event: MouseEvent): void {
    if (this.activeDropdown() === id) {
      this.activeDropdown.set(null);
      this.dropdownAnchor.set(null);
      return;
    }

    this.dropdownAnchor.set(event.currentTarget as HTMLElement);
    this.activeDropdown.set(id);
  }

  closeDropdown(): void {
    this.activeDropdown.set(null);
    this.dropdownAnchor.set(null);
  }

  onConfirm(): void {
    this.confirmed.emit([...this.selectedIds()]);
    this._brnDialog()?.close();
  }

  onCancel(): void {
    this.cancelled.emit();
    this._brnDialog()?.close();
  }

  onRetryLoad(): void {
    void this.loadMedia();
  }
}
