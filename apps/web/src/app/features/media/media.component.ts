/**
 * MediaComponent — /media page shell.
 * Displays all media (images, videos, documents) with grid layout.
 * Workspace pane is mounted by AuthenticatedAppLayoutComponent (global split), not here.
 *
 * Flat host-owned layout:
 * app-media host > content-clamp stack > header + content
 */
import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { auditTime, merge } from 'rxjs';
import { BrnToggleGroupImports, type ToggleValue } from '@spartan-ng/brain/toggle-group';
import { VStackComponent } from '../../shared/containers';
import { MediaPageHeaderComponent, type MediaPageHeaderState } from './media-page-header.component';
import { MediaContentComponent, type MediaContentState } from './media-content.component';
import { buildCardVariantToggleOptions } from '../../shared/ui-primitives/card-variant-toggle.helpers';
import { toggleSingleStringValue } from '../../shared/ui/toggle-group/toggle-group-option.helpers';
import type { SelectedItemsContextPort } from '../../core/workspace-pane/workspace-pane-context.port';
import { WorkspacePaneObserverAdapter } from '../../core/workspace-pane/workspace-pane-observer.adapter';
import { WorkspaceSelectionService } from '../../core/workspace-selection/workspace-selection.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { CardVariantSettingsService } from '../../shared/ui-primitives/card-variant-settings.service';
import { CARD_VARIANTS, type CardVariant } from '../../shared/ui-primitives/card-variant.types';
import type { ImageRecord } from '../../core/media-query/media-query.types';
import { MediaQueryService } from '../../core/media-query/media-query.service';
import {
  flattenGroupedSectionsToMediaRenderRows,
  runMediaGalleryViewPipeline,
} from '../../core/media-query/media-gallery-view.helpers';
import { workspaceMediaToImageRecord } from '../../core/workspace-view/workspace-media-mapper';
import { PaneToolbarComponent } from '../../shared/pane-toolbar/pane-toolbar.component';
import { AuthService } from '../../core/auth/auth.service';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import { WorkspaceViewService } from '../../core/workspace-view/workspace-view.service';
import { FilterService } from '../../core/filter/filter.service';
import { MetadataService } from '../../core/metadata/metadata.service';
import type { SortConfig, WorkspaceMedia } from '../../core/workspace-view/workspace-view.types';
import type { ProjectsViewMode } from '../../core/projects/projects.types';
import {
  GroupingDropdownComponent,
  type GroupingProperty,
} from '../../shared/dropdown-trigger/grouping-dropdown.component';
import { FilterDropdownComponent } from '../../shared/dropdown-trigger/filter-dropdown.component';
import { SortDropdownComponent } from '../../shared/dropdown-trigger/sort-dropdown.component';
import { ProjectsDropdownComponent } from '../../shared/workspace-pane/toolbar/workspace-toolbar/projects-dropdown.component';
import { ProjectsViewToggleComponent } from '../../shared/view-toggle/projects-view-toggle.component';
import { DropdownShellComponent } from '../../shared/dropdown-trigger/dropdown-shell.component';
import { UiDropdownTriggerDirective } from '../../shared/dropdown-trigger/ui-dropdown-trigger.directive';
import type { ToolbarDropdown } from '../../shared/workspace-pane/toolbar/workspace-toolbar/workspace-toolbar.component';

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [
    VStackComponent,
    MediaPageHeaderComponent,
    MediaContentComponent,
    ...BrnToggleGroupImports,
    PaneToolbarComponent,
    DropdownShellComponent,
    UiDropdownTriggerDirective,
    GroupingDropdownComponent,
    FilterDropdownComponent,
    SortDropdownComponent,
    ProjectsDropdownComponent,
    ProjectsViewToggleComponent,
  ],
  templateUrl: './media.component.html',
  styleUrl: './media.component.scss',
  host: {
    'data-i18n-skip': '',
  },
})
export class MediaComponent implements OnDestroy {
  private static readonly MIN_RESET_LOADING_MS = 220;

  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  protected readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly mediaQueryService = inject(MediaQueryService);
  private readonly i18nService = inject(I18nService);
  private readonly cardVariantSettings = inject(CardVariantSettingsService);
  private readonly authService = inject(AuthService);
  private readonly uploadManager = inject(UploadManagerService);
  protected readonly viewService = inject(WorkspaceViewService);
  private readonly filterService = inject(FilterService);
  private readonly metadata = inject(MetadataService);

  readonly loading = signal(false);
  readonly initialLoadSettled = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly rawWorkspaceImages = signal<WorkspaceMedia[]>([]);
  readonly uploadRefreshTick = signal(0);
  readonly activeDropdown = signal<ToolbarDropdown>(null);
  readonly dropdownTop = signal(0);
  readonly dropdownLeft = signal(0);
  readonly activeGroupings = signal<GroupingProperty[]>(
    this.viewService.activeGroupings().map((g) => ({ id: g.id, label: g.label, icon: g.icon })),
  );
  readonly cardVariant = signal<CardVariant>(this.cardVariantSettings.getVariant('media'));
  readonly allowedCardVariants = CARD_VARIANTS;
  readonly cardVariantToggleOptions = computed(() =>
    buildCardVariantToggleOptions((k, f) => this.t(k, f), this.allowedCardVariants, true),
  );
  readonly projectNameForFn = (projectId: string | null): string => this.projectNameFor(projectId);
  readonly projectsViewMode = computed<ProjectsViewMode>(() =>
    this.cardVariant() === 'row' ? 'list' : 'cards',
  );
  readonly emptyReason = computed<'auth-required' | 'no-results'>(() => {
    if (!this.authService.loading() && !this.authService.user()) {
      return 'auth-required';
    }

    return 'no-results';
  });
  readonly headerState = computed<MediaPageHeaderState>(() =>
    this.loading() ? 'loading' : 'ready',
  );
  readonly contentState = computed<MediaContentState>(() => {
    if (!this.initialLoadSettled()) {
      return 'loading';
    }

    if (this.loading()) {
      return 'loading';
    }
    if (this.loadError()) {
      return 'error';
    }
    return 'ready';
  });
  readonly gallerySections = computed(() =>
    runMediaGalleryViewPipeline({
      images: this.rawWorkspaceImages(),
      projectIds: this.viewService.selectedProjectIds(),
      rules: this.filterService.rules(),
      sorts: this.viewService.effectiveSorts(),
      groupings: this.viewService.activeGroupings(),
      filterService: this.filterService,
      metadata: this.metadata,
    }),
  );
  readonly mediaRenderRows = computed(() =>
    flattenGroupedSectionsToMediaRenderRows(this.gallerySections(), workspaceMediaToImageRecord),
  );
  readonly flatDisplayItems = computed(() =>
    this.mediaRenderRows()
      .filter((r): r is { type: 'grid'; items: ImageRecord[] } => r.type === 'grid')
      .flatMap((r) => r.items),
  );
  readonly projectNameById = computed(() => {
    const map = new Map<string, string>();
    for (const img of this.rawWorkspaceImages()) {
      const ids = img.projectIds ?? [];
      const names = img.projectNames ?? [];
      for (let i = 0; i < ids.length; i++) {
        const name = names[i];
        if (name) {
          map.set(ids[i]!, name);
        }
      }
    }
    return map as ReadonlyMap<string, string>;
  });
  readonly availableGroupings = computed<GroupingProperty[]>(() => {
    const activeIds = new Set(this.activeGroupings().map((g) => g.id));
    return this.metadata
      .groupableMetadataFields()
      .filter((field) => !activeIds.has(field.id))
      .map((field) => ({ id: field.id, label: field.label, icon: field.icon }));
  });
  readonly hasGrouping = computed(() => this.viewService.activeGroupings().length > 0);
  readonly hasFilters = computed(() => this.filterService.activeCount() > 0);
  readonly hasCustomSort = computed(() => {
    const sorts = this.viewService.activeSorts();
    return sorts.length !== 1 || sorts[0].key !== 'date-captured' || sorts[0].direction !== 'desc';
  });
  readonly hasProject = computed(() => this.viewService.selectedProjectIds().size > 0);
  readonly activeGroupingIds = computed(() => this.activeGroupings().map((g) => g.id));
  readonly toolbarButtons = computed(() => {
    this.i18nService.language();
    return [
      {
        id: 'projects' as const,
        label: this.t('workspace.toolbar.button.projects', 'Projects'),
        active: this.hasProject,
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
        id: 'grouping' as const,
        label: this.t('workspace.toolbar.button.grouping', 'Grouping'),
        active: this.hasGrouping,
      },
    ];
  });
  readonly isDragging = signal(false);

  private loadRequestId = 0;

  constructor() {
    void this.metadata.refreshMetadataFields();

    const mediaSelectedItemsContext: SelectedItemsContextPort = {
      contextKey: 'media',
      selectedMediaIds$: this.workspaceSelectionService.selectedMediaIds,
      requestOpenDetail: (mediaId: string) => this.onMediaItemClicked(mediaId),
      requestSetHover: (mediaId: string | null) =>
        this.workspacePaneObserver.setDetailImageId(mediaId),
    };

    this.workspacePaneObserver.onContextRebind(mediaSelectedItemsContext);

    effect(() => {
      this.cardVariantSettings.setVariant('media', this.cardVariant());
    });

    merge(
      this.uploadManager.batchComplete$,
      this.uploadManager.imageUploaded$,
      this.uploadManager.imageReplaced$,
      this.uploadManager.imageAttached$,
    )
      .pipe(auditTime(300), takeUntilDestroyed())
      .subscribe(() => {
        this.uploadRefreshTick.update((n) => n + 1);
      });

    effect(() => {
      const user = this.authService.user();
      void this.viewService.selectedProjectIds();
      void this.viewService.effectiveSorts();
      void this.viewService.activeGroupings();
      void this.filterService.rules();
      void this.uploadRefreshTick();

      if (!user) {
        this.rawWorkspaceImages.set([]);
        this.loadError.set(null);
        this.initialLoadSettled.set(true);
        this.loading.set(false);
        return;
      }

      void this.reloadMediaGallery();
    });
  }

  ngOnDestroy(): void {
    this.workspacePaneObserver.onRouteLeave('media');
  }

  t(key: string, fallback: string): string {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  }

  onCardVariantToggleChange(raw: ToggleValue<string>): void {
    const value = toggleSingleStringValue(raw);
    if (value === 'row' || value === 'small' || value === 'medium' || value === 'large') {
      this.cardVariant.set(value);
    }
  }

  onProjectsViewModeChange(mode: ProjectsViewMode): void {
    if (mode === 'list') {
      this.cardVariant.set('row');
      return;
    }
    if (this.cardVariant() === 'row') {
      this.cardVariant.set('medium');
    }
  }

  onMediaItemClicked(mediaId: string): void {
    this.workspacePaneObserver.setDetailImageId(mediaId);
  }

  onRetryLoad(): void {
    this.loadError.set(null);
    this.initialLoadSettled.set(false);
    void this.reloadMediaGallery();
  }

  projectNameFor(projectId: string | null): string {
    if (!projectId) {
      return this.t('workspace.quickFilter.chip.noProject', 'No project');
    }

    return (
      this.projectNameById().get(projectId) ??
      this.t('workspace.quickFilter.chip.noProject', 'No project')
    );
  }

  onGroupingsChanged(active: GroupingProperty[]): void {
    this.activeGroupings.set(active);
    this.viewService.setActiveGroupings(
      active.map((g) => ({ id: g.id, label: g.label, icon: g.icon })),
    );
  }

  onSortChanged(sortConfigs: SortConfig[]): void {
    this.viewService.setActiveSorts(sortConfigs);
  }

  onProjectsChanged(selectedIds: Set<string>): void {
    this.viewService.setSelectedProjectIds(selectedIds);
  }

  onDragStarted(): void {
    this.isDragging.set(true);
  }

  onDragEnded(): void {
    setTimeout(() => this.isDragging.set(false));
  }

  toggleDropdown(id: ToolbarDropdown, event: MouseEvent): void {
    if (this.activeDropdown() === id) {
      this.activeDropdown.set(null);
      return;
    }

    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
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

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    this.closeDropdown();
  }

  private async reloadMediaGallery(): Promise<void> {
    if (!this.authService.user()) {
      return;
    }

    const requestId = ++this.loadRequestId;
    const resetLoadStartedAtMs = Date.now();
    this.loading.set(true);

    try {
      const rows = await this.mediaQueryService.loadAllCurrentUserWorkspaceMedia();
      if (requestId !== this.loadRequestId) {
        return;
      }

      this.rawWorkspaceImages.set(rows);
      this.loadError.set(null);
    } catch {
      if (requestId === this.loadRequestId) {
        this.loadError.set(this.t('media.page.error', 'Failed to load media'));
        this.rawWorkspaceImages.set([]);
      }
    } finally {
      if (requestId === this.loadRequestId) {
        await this.ensureResetLoadingWindow(resetLoadStartedAtMs);
        this.initialLoadSettled.set(true);
        this.loading.set(false);
      }
    }
  }

  private async ensureResetLoadingWindow(startedAtMs: number): Promise<void> {
    const elapsedMs = Date.now() - startedAtMs;
    const remainingMs = MediaComponent.MIN_RESET_LOADING_MS - elapsedMs;

    if (remainingMs <= 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, remainingMs);
    });
  }
}
