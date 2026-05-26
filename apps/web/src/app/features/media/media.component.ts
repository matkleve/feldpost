/**
 * MediaComponent — /media page shell.
 * Displays all media (images, videos, documents) with grid layout.
 * Workspace pane is mounted by AuthenticatedAppLayoutComponent (global split), not here.
 *
 * Flat host-owned layout:
 * app-media host > content-clamp stack > header + content
 */
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BrnToggleGroupImports, type ToggleValue } from '@spartan-ng/brain/toggle-group';
import { HLM_TOGGLE_GROUP_IMPORTS } from '../../shared/ui/toggle-group';
import { VStackComponent } from '../../shared/containers';
import { MediaPageHeaderComponent, type MediaPageHeaderState } from './media-page-header.component';
import { MediaContentComponent, type MediaContentState } from './media-content.component';
import {
  buildCardVariantToggleOptions,
  buildCompactCardVariantSwitchTitle,
  getNextCardVariantToggleOption,
} from '../../shared/ui-primitives/card-variant-toggle.helpers';
import { toggleSingleStringValue } from '../../shared/ui/toggle-group/toggle-group-option.helpers';
import type { SelectedItemsContextPort } from '../../core/workspace-pane/workspace-pane-context.port';
import { WorkspacePaneObserverAdapter } from '../../core/workspace-pane/workspace-pane-observer.adapter';
import { WorkspaceSelectionService } from '../../core/workspace-selection/workspace-selection.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { CardVariantSettingsService } from '../../shared/ui-primitives/card-variant-settings.service';
import { CARD_VARIANTS, type CardVariant } from '../../shared/ui-primitives/card-variant.types';
import type { MediaRecord } from '../../core/media-query/media-query.types';
import { MediaQueryService } from '../../core/media-query/media-query.service';
import {
  flattenGroupedSectionsToMediaRenderRows,
  runMediaGalleryViewPipeline,
} from '../../core/media-query/media-gallery-view.helpers';
import { workspaceMediaToMediaRecord } from '../../core/workspace-view/workspace-media-mapper';
import { PaneToolbarComponent } from '../../shared/pane-toolbar/pane-toolbar.component';
import { AuthService } from '../../core/auth/auth.service';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import { getLaneForJob } from '../upload/upload-phase.helpers';
import { WORKSPACE_PANE_SHELL_HOST } from '../../core/workspace-pane/workspace-pane-shell-host.token';
import type {
  ImageUploadedEvent,
  UploadLocationMapPickRequest,
  UploadLocationPreviewEvent,
} from '../../core/workspace-pane/workspace-pane-shell-events.types';
import { UploadPanelComponent } from '../upload/upload-panel.component';
import { UploadResolverTrayComponent } from '../upload/upload-resolver-tray.component';
import type { ZoomToLocationEvent } from '../upload/upload-panel-row-handlers';
import { WorkspaceViewService } from '../../core/workspace-view/workspace-view.service';
import { FilterService } from '../../core/filter/filter.service';
import { MetadataService } from '../../core/metadata/metadata.service';
import { MediaPageStateService } from '../../core/media-page-state/media-page-state.service';
import { MediaThumbnailRealtimeService } from '../../core/media-thumbnail/media-thumbnail-realtime.service';
import { buildMediaGalleryQuerySignature } from '../../core/media-page-state/media-page-state.helpers';
import type { MediaGalleryQueryInputs } from '../../core/media-page-state/media-page-state.types';
import type { SortConfig, WorkspaceMedia } from '../../core/workspace-view/workspace-view.types';
import {
  GroupingDropdownComponent,
  type GroupingProperty,
} from '../../shared/dropdown-trigger/grouping-dropdown.component';
import { FilterDropdownComponent } from '../../shared/dropdown-trigger/filter-dropdown.component';
import { SortDropdownComponent } from '../../shared/dropdown-trigger/sort-dropdown.component';
import { ProjectsDropdownComponent } from '../../shared/workspace-pane/toolbar/workspace-toolbar/projects-dropdown.component';
import { DropdownShellComponent } from '../../shared/dropdown-trigger/dropdown-shell.component';
import {
  toolbarDropdownPanelClass,
  toolbarDropdownPositionWidthPx,
} from '../../shared/dropdown-trigger/toolbar-menu-panel-layout';
import { HLM_BUTTON_IMPORTS } from '../../shared/ui/button';
import type { ToolbarDropdown } from '../../shared/workspace-pane/toolbar/workspace-toolbar/workspace-toolbar.component';

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [
    VStackComponent,
    MediaPageHeaderComponent,
    MediaContentComponent,
    ...BrnToggleGroupImports,
    ...HLM_TOGGLE_GROUP_IMPORTS,
    PaneToolbarComponent,
    DropdownShellComponent,
    ...HLM_BUTTON_IMPORTS,
    GroupingDropdownComponent,
    FilterDropdownComponent,
    SortDropdownComponent,
    ProjectsDropdownComponent,
    UploadPanelComponent,
    UploadResolverTrayComponent,
  ],
  templateUrl: './media.component.html',
  styleUrl: './media.component.scss',
  host: {
    'data-i18n-skip': '',
  },
})
export class MediaComponent implements OnDestroy {
  private static readonly MIN_RESET_LOADING_MS = 220;

  /** Bound to `app-dropdown-shell` `panelClass` (filter adds wider shell modifier). */
  protected readonly toolbarDropdownPanelClass = toolbarDropdownPanelClass;
  protected readonly toolbarDropdownPositionWidthPx = toolbarDropdownPositionWidthPx;

  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  protected readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly mediaQueryService = inject(MediaQueryService);
  private readonly i18nService = inject(I18nService);
  private readonly cardVariantSettings = inject(CardVariantSettingsService);
  private readonly authService = inject(AuthService);
  private readonly uploadManager = inject(UploadManagerService);
  private readonly shellHost = inject(WORKSPACE_PANE_SHELL_HOST);
  protected readonly viewService = inject(WorkspaceViewService);
  private readonly filterService = inject(FilterService);
  private readonly metadata = inject(MetadataService);
  private readonly mediaPageState = inject(MediaPageStateService);
  private readonly thumbnailRealtime = inject(MediaThumbnailRealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostElement = inject(ElementRef<HTMLElement>);

  readonly loading = signal(false);
  readonly initialLoadSettled = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly rawWorkspaceImages = signal<WorkspaceMedia[]>([]);
  readonly activeDropdown = signal<ToolbarDropdown>(null);
  readonly dropdownAnchor = signal<HTMLElement | null>(null);
  readonly activeGroupings = signal<GroupingProperty[]>(
    this.viewService.activeGroupings().map((g) => ({ id: g.id, label: g.label, icon: g.icon })),
  );
  readonly cardVariant = signal<CardVariant>(this.cardVariantSettings.getVariant('media'));
  readonly allowedCardVariants = CARD_VARIANTS;
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
  readonly projectNameForFn = (projectId: string | null): string => this.projectNameFor(projectId);
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
    flattenGroupedSectionsToMediaRenderRows(this.gallerySections(), workspaceMediaToMediaRecord),
  );
  readonly flatDisplayItems = computed(() =>
    this.mediaRenderRows()
      .filter((r): r is { type: 'grid'; items: MediaRecord[] } => r.type === 'grid')
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
        icon: 'folder',
        label: this.t('workspace.toolbar.button.projects', 'Projects'),
        active: this.hasProject,
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
        id: 'grouping' as const,
        icon: 'group_work',
        label: this.t('workspace.toolbar.button.grouping', 'Grouping'),
        active: this.hasGrouping,
      },
    ];
  });
  readonly isDragging = signal(false);
  readonly uploadPanelPinned = signal(false);
  readonly uploadPanelOpen = this.uploadPanelPinned.asReadonly();
  readonly uploadBatch = this.uploadManager.activeBatch;
  readonly uploadBatchProgress = computed(() => this.uploadBatch()?.overallProgress ?? 0);
  readonly uploadBatchActive = computed(() => {
    const batch = this.uploadBatch();
    return !!batch && (batch.status === 'uploading' || batch.status === 'scanning');
  });
  readonly uploadResolverPending = computed(
    () => this.uploadBatch()?.pendingDisambiguationCount ?? 0,
  );
  readonly showUploadDock = computed(
    () => this.uploadPanelOpen() || this.uploadResolverPending() > 0,
  );
  readonly uploadHasIssues = computed(() =>
    this.uploadManager.jobs().some((job) => getLaneForJob(job) === 'issues'),
  );

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

    this.thumbnailRealtime.updates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ mediaId, thumbnailPath, previewGenerationStatus }) => {
        this.mediaPageState.patchMediaItemPreview(mediaId, {
          thumbnailPath,
          previewGenerationStatus,
        });

        this.rawWorkspaceImages.update((items) =>
          items.map((item) =>
            item.id === mediaId
              ? {
                  ...item,
                  thumbnailPath: thumbnailPath ?? item.thumbnailPath,
                  previewGenerationStatus,
                }
              : item,
          ),
        );
      });

    effect(() => {
      this.cardVariantSettings.setVariant('media', this.cardVariant());
    });

    effect(() => {
      const user = this.authService.user();
      void this.viewService.selectedProjectIds();
      void this.viewService.effectiveSorts();
      void this.viewService.activeGroupings();
      void this.filterService.rules();

      if (!user) {
        this.rawWorkspaceImages.set([]);
        this.loadError.set(null);
        this.initialLoadSettled.set(true);
        this.loading.set(false);
        return;
      }

      const queryInputs = this.buildGalleryQueryInputs(user.id);
      const cacheLookup = this.mediaPageState.lookup(queryInputs);

      if (cacheLookup.hit) {
        this.rawWorkspaceImages.set([...cacheLookup.mediaItems]);
        this.loadError.set(null);
        this.initialLoadSettled.set(true);
        this.loading.set(false);
        this.mediaPageState.scheduleRevalidate(queryInputs);
        return;
      }

      void this.loadMediaGallery(queryInputs);
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

  cycleCardVariant(): void {
    const next = this.nextCardVariantToggleOption();
    if (!next) return;
    const value = next.id;
    if (value === 'row' || value === 'small' || value === 'medium' || value === 'large') {
      this.cardVariant.set(value);
    }
  }


  onMediaItemClicked(mediaId: string): void {
    this.workspacePaneObserver.setDetailImageId(mediaId);
  }

  toggleUploadPanel(): void {
    this.uploadPanelPinned.update((open) => !open);
  }

  closeUploadPanel(): void {
    this.uploadPanelPinned.set(false);
  }

  onImageUploaded(event: ImageUploadedEvent): void {
    this.shellHost.onImageUploadedFromWorkspacePane(event);
  }

  openDetailView(mediaId: string): void {
    this.shellHost.openDetailView(mediaId);
  }

  onZoomToLocation(event: ZoomToLocationEvent): void {
    this.shellHost.onZoomToLocationRequested(event);
  }

  enterPlacementMode(key: string): void {
    this.shellHost.enterPlacementModeFromWorkspacePane(key);
  }

  onUploadLocationPreviewRequested(event: UploadLocationPreviewEvent): void {
    this.shellHost.onUploadLocationPreviewRequestedFromWorkspacePane(event);
  }

  onUploadLocationPreviewCleared(): void {
    this.shellHost.onUploadLocationPreviewClearedFromWorkspacePane();
  }

  onUploadLocationMapPickRequested(event: UploadLocationMapPickRequest): void {
    this.shellHost.onUploadLocationMapPickRequestedFromWorkspacePane(event);
  }

  onRetryLoad(): void {
    this.loadError.set(null);
    this.initialLoadSettled.set(false);
    const user = this.authService.user();
    if (!user) {
      return;
    }
    this.mediaPageState.invalidateActiveCache();
    void this.loadMediaGallery(this.buildGalleryQueryInputs(user.id));
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.uploadPanelOpen()) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    const uploadShell = this.hostElement.nativeElement.querySelector('.upload-shell');
    if (uploadShell?.contains(target)) {
      return;
    }

    this.closeUploadPanel();
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    if (this.uploadPanelOpen()) {
      this.closeUploadPanel();
      return;
    }
    this.closeDropdown();
  }

  private buildGalleryQueryInputs(userId: string): MediaGalleryQueryInputs {
    return {
      userId,
      projectIds: this.viewService.selectedProjectIds(),
      sorts: this.viewService.effectiveSorts(),
      groupingIds: this.viewService.activeGroupings().map((group) => group.id),
      filterRules: this.filterService.rules(),
    };
  }

  private async loadMediaGallery(queryInputs: MediaGalleryQueryInputs): Promise<void> {
    if (!this.authService.user()) {
      return;
    }

    const signature = buildMediaGalleryQuerySignature(queryInputs);
    const requestId = ++this.loadRequestId;
    const resetLoadStartedAtMs = Date.now();
    this.loading.set(true);

    try {
      const rows = await this.mediaQueryService.loadAllCurrentUserWorkspaceMedia();
      if (requestId !== this.loadRequestId) {
        return;
      }

      if (buildMediaGalleryQuerySignature(this.buildGalleryQueryInputs(queryInputs.userId)) !== signature) {
        return;
      }

      this.rawWorkspaceImages.set(rows);
      this.mediaPageState.writeCache(queryInputs, rows);
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
