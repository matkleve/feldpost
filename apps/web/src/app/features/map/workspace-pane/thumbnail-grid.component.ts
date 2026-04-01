import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  input,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { WorkspaceViewService } from '../../../core/workspace-view.service';
import { FilterService } from '../../../core/filter.service';
import { WorkspaceSelectionService } from '../../../core/workspace-selection.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ToastService } from '../../../core/toast.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { GroupedSection, WorkspaceImage } from '../../../core/workspace-view.types';
import {
  ThumbnailCardComponent,
  ThumbnailCardContextMenuEvent,
  ThumbnailCardHoverEvent,
  ThumbnailCardInteraction,
} from './thumbnail-card/thumbnail-card.component';
import { GroupHeaderComponent } from '../../../shared/ui-primitives/group-header.component';
import { DropdownShellComponent } from '../../../shared/dropdown-trigger/dropdown-shell.component';
import { ACTION_CONTEXT_IDS } from '../../action-system/action-context-ids';

/** Flat renderable item — either a group header or a grid of images. */
type RenderItem =
  | { type: 'header'; heading: string; imageCount: number; level: number }
  | { type: 'grid'; images: WorkspaceImage[] };

type ThumbnailContextActionId = 'remove_from_project' | 'delete_media';

export const WS_GRID_THUMBNAIL_CONTEXT = ACTION_CONTEXT_IDS.wsGridThumbnail;

export const WS_GRID_THUMBNAIL_ACTION_IDS: ReadonlyArray<ThumbnailContextActionId> = [
  'remove_from_project',
  'delete_media',
];

@Component({
  selector: 'app-thumbnail-grid',
  template: `
    <div
      class="thumbnail-grid"
      [class.thumbnail-grid--row]="viewService.thumbnailSizePreset() === 'row'"
      [class.thumbnail-grid--small]="viewService.thumbnailSizePreset() === 'small'"
      [class.thumbnail-grid--medium]="viewService.thumbnailSizePreset() === 'medium'"
      [class.thumbnail-grid--large]="viewService.thumbnailSizePreset() === 'large'"
      [attr.data-language]="languageTick()"
      #scrollContainer
      (scroll)="onScroll()"
      [style.--thumbnail-grid-card-size.px]="thumbnailCardSizePx()"
    >
      @if (viewService.isLoading()) {
        <div class="thumbnail-grid__skeleton">
          @for (i of skeletonCards; track i) {
            <div class="thumbnail-grid__skeleton-card"></div>
          }
        </div>
      } @else if (viewService.emptySelection()) {
        <div class="thumbnail-grid__empty-selection">
          <span class="thumbnail-grid__empty-icon">📷</span>
          <p>
            {{ t('workspace.thumbnailGrid.emptySelection.title', 'No photos at this location') }}
          </p>
          <p class="thumbnail-grid__empty-hint">
            {{
              t(
                'workspace.thumbnailGrid.emptySelection.hint',
                'Images may not have been uploaded yet for this area.'
              )
            }}
          </p>
        </div>
      } @else if (viewService.rawImages().length === 0) {
        <p class="thumbnail-grid__empty">
          {{
            t(
              'workspace.thumbnailGrid.empty.selectMarker',
              'Select a marker on the map to see photos.'
            )
          }}
        </p>
      } @else if (viewService.totalImageCount() === 0) {
        <div class="thumbnail-grid__filter-empty">
          <p>
            {{
              t('workspace.thumbnailGrid.filterEmpty.title', 'No images match the current filters')
            }}
          </p>
          <button class="thumbnail-grid__clear-btn" type="button" (click)="clearFilters()">
            {{ t('workspace.thumbnailGrid.filterEmpty.clear', 'Clear filters') }}
          </button>
        </div>
      } @else if (hasGrouping()) {
        @for (item of renderItems(); track $index) {
          @if (!isItemHidden($index)) {
            @if (item.type === 'header') {
              <app-group-header
                [heading]="item.heading"
                [imageCount]="item.imageCount"
                [level]="item.level"
                [collapsed]="isCollapsed(item.heading)"
                (toggle)="viewService.toggleGroupCollapsed(item.heading)"
              />
            } @else {
              <div
                class="thumbnail-grid__cards"
                [class.thumbnail-grid__cards--start]="isUnderfilled(item.images.length)"
              >
                @for (img of item.images; track img.id) {
                  <app-thumbnail-card
                    [image]="img"
                    [viewMode]="viewService.thumbnailSizePreset()"
                    [selected]="selectionService.isSelected(img.id)"
                    [linkedHovered]="isLinkedHovered(img.id)"
                    (clicked)="thumbnailClicked.emit($event)"
                    (zoomToLocationRequested)="zoomToLocationRequested.emit($event)"
                    (selectionToggled)="onSelectionToggled($event)"
                    (hoverStarted)="hoverStarted.emit($event)"
                    (hoverEnded)="hoverEnded.emit($event)"
                    (contextMenuRequested)="onThumbnailContextMenuRequested($event)"
                  />
                }
              </div>
            }
          }
        }
      } @else {
        <div
          class="thumbnail-grid__cards"
          [class.thumbnail-grid__cards--start]="isUnderfilled(flatImages().length)"
        >
          @for (img of flatImages(); track img.id) {
            <app-thumbnail-card
              [image]="img"
              [viewMode]="viewService.thumbnailSizePreset()"
              [selected]="selectionService.isSelected(img.id)"
              [linkedHovered]="isLinkedHovered(img.id)"
              (clicked)="thumbnailClicked.emit($event)"
              (zoomToLocationRequested)="zoomToLocationRequested.emit($event)"
              (selectionToggled)="onSelectionToggled($event)"
              (hoverStarted)="hoverStarted.emit($event)"
              (hoverEnded)="hoverEnded.emit($event)"
              (contextMenuRequested)="onThumbnailContextMenuRequested($event)"
            />
          }
        </div>
      }

      @if (thumbnailContextMenuOpen() && thumbnailContextMenuPosition(); as menuPos) {
        <app-dropdown-shell
          class="map-context-menu"
          [top]="menuPos.y"
          [left]="menuPos.x"
          [minWidth]="224"
          [panelClass]="'map-context-menu option-menu-surface'"
          (closeRequested)="closeThumbnailContextMenu()"
        >
          <div
            class="dd-items"
            role="menu"
            tabindex="-1"
            [attr.aria-label]="t('workspace.thumbnailGrid.menu.aria', 'Thumbnail context menu')"
          >
            @for (action of thumbnailContextActions(); track action.id) {
              <button
                class="dd-item dd-item--danger"
                type="button"
                role="menuitem"
                [disabled]="action.disabled"
                (click)="onThumbnailContextActionSelected(action.id)"
              >
                <span class="material-icons dd-item__icon" aria-hidden="true">{{
                  action.icon
                }}</span>
                <span class="dd-item__label">{{ action.label }}</span>
              </button>
            }
          </div>
        </app-dropdown-shell>
      }
    </div>
  `,
  styleUrl: './thumbnail-grid.component.scss',
  imports: [ThumbnailCardComponent, GroupHeaderComponent, DropdownShellComponent],
})
export class ThumbnailGridComponent implements OnDestroy {
  protected readonly viewService = inject(WorkspaceViewService);
  protected readonly selectionService = inject(WorkspaceSelectionService);
  private readonly filterService = inject(FilterService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly toastService = inject(ToastService);
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);
  readonly currentLanguage = this.i18nService.language;

  readonly thumbnailCardSizePx = computed(() => {
    switch (this.viewService.thumbnailSizePreset()) {
      case 'row':
        return 96;
      case 'small':
        return 96;
      case 'large':
        return 160;
      default:
        return 128;
    }
  });

  readonly linkedHoveredMediaIds = input<Set<string>>(new Set());
  readonly thumbnailClicked = output<string>();
  readonly zoomToLocationRequested = output<{ mediaId: string; lat: number; lng: number }>();
  readonly hoverStarted = output<ThumbnailCardHoverEvent>();
  readonly hoverEnded = output<string>();

  private readonly scrollContainerRef = viewChild<ElementRef<HTMLElement>>('scrollContainer');
  private signBatchTimer: ReturnType<typeof setTimeout> | null = null;
  readonly maxColumns = signal(1);
  readonly thumbnailContextMenuOpen = signal(false);
  readonly thumbnailContextMenuPosition = signal<{ x: number; y: number } | null>(null);
  readonly thumbnailContextMenuMediaId = signal<string | null>(null);

  readonly sections = computed(() => this.viewService.groupedSections());

  readonly hasGrouping = computed(() => this.viewService.activeGroupings().length > 0);

  /** Flatten grouped sections into a linear list of headers + grids. */
  readonly renderItems = computed<RenderItem[]>(() => {
    const items: RenderItem[] = [];
    const flatten = (sections: GroupedSection[]) => {
      for (const section of sections) {
        if (section.heading) {
          items.push({
            type: 'header',
            heading: section.heading,
            imageCount: section.imageCount,
            level: section.headingLevel,
          });
        }
        if (section.subGroups && section.subGroups.length > 0) {
          flatten(section.subGroups);
        } else if (section.images.length > 0) {
          items.push({ type: 'grid', images: section.images });
        }
      }
    };
    flatten(this.sections());
    return items;
  });

  readonly flatImages = computed(() => {
    const sections = this.sections();
    if (sections.length === 1 && !sections[0].heading) {
      return sections[0].images;
    }
    return sections.flatMap((s) => s.images);
  });

  readonly skeletonCards = Array.from({ length: 12 }, (_, i) => i);
  readonly languageTick = computed(() => this.currentLanguage());
  readonly thumbnailContextActions = computed<
    ReadonlyArray<{
      id: ThumbnailContextActionId;
      icon: string;
      label: string;
      disabled: boolean;
    }>
  >(() => {
    const selectedCount = this.selectionService.selectedCount();
    return WS_GRID_THUMBNAIL_ACTION_IDS.map((id) => ({
      id,
      icon: id === 'remove_from_project' ? 'remove_circle_outline' : 'delete',
      label:
        id === 'remove_from_project'
          ? this.t('upload.item.menu.destructive.removeFromProject', 'Remove from project')
          : this.t('workspace.imageDetail.action.delete', 'Delete media'),
      disabled: selectedCount <= 0,
    }));
  });

  constructor() {
    afterNextRender(() => {
      this.scheduleThumbnailSigning();
      this.updateMaxColumns();
    });

    effect(() => {
      const flat = this.flatImages();
      const grouped = this.sections();
      const preset = this.viewService.thumbnailSizePreset();
      void flat;
      void grouped;
      void preset;
      this.scheduleThumbnailSigning();
    });
  }

  ngOnDestroy(): void {
    if (this.signBatchTimer) {
      clearTimeout(this.signBatchTimer);
    }
  }

  isUnderfilled(itemCount: number): boolean {
    if (this.viewService.thumbnailSizePreset() === 'row') return false;
    if (this.viewService.thumbnailSizePreset() === 'large') return false;
    return itemCount > 0 && itemCount < this.maxColumns();
  }

  isCollapsed(heading: string): boolean {
    return this.viewService.collapsedGroups().has(heading);
  }

  /**
   * Check if an item should be hidden because any ancestor header is collapsed.
   * For headers: hidden if any preceding header at a lower level is collapsed.
   * For grids:  hidden if the nearest header or any of its ancestors is collapsed.
   */
  isItemHidden(index: number): boolean {
    const items = this.renderItems();
    const item = items[index];

    // Top-level headers are never hidden
    if (item.type === 'header' && item.level === 0) return false;

    // Walk backward collecting ancestors.
    // contextLevel starts at the item's own level (header) or Infinity (grid).
    let contextLevel = item.type === 'header' ? item.level : Infinity;

    for (let i = index - 1; i >= 0; i--) {
      const prev = items[i];
      if (prev.type === 'header' && prev.level < contextLevel) {
        if (this.isCollapsed(prev.heading)) return true;
        contextLevel = prev.level;
        if (contextLevel === 0) break;
      }
    }
    return false;
  }

  clearFilters(): void {
    this.filterService.clearAll();
    this.viewService.selectedProjectIds.set(new Set());
  }

  onScroll(): void {
    this.scheduleThumbnailSigning();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateMaxColumns();
  }

  onSelectionToggled(event: ThumbnailCardInteraction): void {
    this.selectionService.toggle(event.imageId, { additive: event.additive });
  }

  onThumbnailContextMenuRequested(event: ThumbnailCardContextMenuEvent): void {
    const selected = this.selectionService.selectedMediaIds();
    if (!selected.has(event.mediaId)) {
      this.selectionService.clearSelection();
      this.selectionService.toggle(event.mediaId, { additive: true });
    }

    this.thumbnailContextMenuMediaId.set(event.mediaId);
    this.thumbnailContextMenuPosition.set({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 232)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 160)),
    });
    this.thumbnailContextMenuOpen.set(true);
  }

  closeThumbnailContextMenu(): void {
    this.thumbnailContextMenuOpen.set(false);
  }

  async onThumbnailContextActionSelected(actionId: ThumbnailContextActionId): Promise<void> {
    if (actionId === 'remove_from_project') {
      await this.removeSelectedFromProject();
      this.closeThumbnailContextMenu();
      return;
    }

    await this.deleteSelectedMedia();
    this.closeThumbnailContextMenu();
  }

  isLinkedHovered(mediaId: string): boolean {
    return this.linkedHoveredMediaIds().has(mediaId);
  }

  /** Batch-sign thumbnails for currently visible images after a debounce. */
  private scheduleThumbnailSigning(): void {
    if (this.signBatchTimer) clearTimeout(this.signBatchTimer);
    this.signBatchTimer = setTimeout(() => {
      const images =
        this.flatImages().length > 0
          ? this.flatImages()
          : this.sections().flatMap((s) => this.collectImages(s));
      const unsigned = images.filter((img) => !img.signedThumbnailUrl && !img.thumbnailUnavailable);
      if (unsigned.length > 0) {
        void this.viewService.batchSignThumbnails(unsigned.slice(0, 50));
      }
    }, 200);
  }

  private collectImages(
    section: GroupedSection,
  ): import('../../../core/workspace-view.types').WorkspaceImage[] {
    const result = [...section.images];
    if (section.subGroups) {
      for (const sub of section.subGroups) {
        result.push(...this.collectImages(sub));
      }
    }
    return result;
  }

  private updateMaxColumns(): void {
    const host = this.scrollContainerRef()?.nativeElement;
    if (!host) return;

    const measured = host.clientWidth;
    if (measured <= 0) {
      this.maxColumns.set(1);
      return;
    }

    const styles = getComputedStyle(host);
    const gapValue = styles.getPropertyValue('--spacing-2').trim();
    const gap = Number.parseFloat(gapValue || '8') || 8;
    const cardWidth = this.thumbnailCardSizePx();
    const columns = Math.max(1, Math.floor((measured + gap) / (cardWidth + gap)));
    this.maxColumns.set(columns);
  }

  private async resolveSelectedMediaItemIds(): Promise<string[]> {
    const selectedIds = Array.from(this.selectionService.selectedMediaIds());
    if (selectedIds.length === 0) {
      return [];
    }

    const idList = selectedIds.join(',');
    const { data, error } = await this.supabaseService.client
      .from('media_items')
      .select('id,source_image_id')
      .or(`id.in.(${idList}),source_image_id.in.(${idList})`);

    if (error || !Array.isArray(data)) {
      return [];
    }

    return Array.from(
      new Set(
        data
          .map((row) => (typeof row.id === 'string' ? row.id : null))
          .filter((id): id is string => !!id),
      ),
    );
  }

  private async removeSelectedFromProject(): Promise<void> {
    const selectedMediaItemIds = await this.resolveSelectedMediaItemIds();
    if (selectedMediaItemIds.length === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.noImagesSelected', 'No images selected.'),
        type: 'warning',
      });
      return;
    }

    const { error } = await this.supabaseService.client
      .from('media_projects')
      .delete()
      .in('media_item_id', selectedMediaItemIds);

    if (error) {
      this.toastService.show({ message: error.message, type: 'error' });
      return;
    }

    const selectedImageIds = this.selectionService.selectedMediaIds();
    this.viewService.rawImages.update((images) =>
      images.map((image) =>
        selectedImageIds.has(image.id)
          ? {
              ...image,
              projectId: null,
              projectName: null,
            }
          : image,
      ),
    );

    this.toastService.show({
      message: this.t(
        'upload.item.menu.project.remove.success',
        'Removed from project successfully.',
      ),
      type: 'success',
    });
  }

  private async deleteSelectedMedia(): Promise<void> {
    const selectedMediaItemIds = await this.resolveSelectedMediaItemIds();
    if (selectedMediaItemIds.length === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.noImagesSelected', 'No images selected.'),
        type: 'warning',
      });
      return;
    }

    const selectedIds = this.selectionService.selectedMediaIds();
    const { error } = await this.supabaseService.client
      .from('media_items')
      .delete()
      .in('id', selectedMediaItemIds);

    if (error) {
      this.toastService.show({ message: error.message, type: 'error' });
      return;
    }

    this.viewService.rawImages.update((images) =>
      images.filter((image) => !selectedIds.has(image.id)),
    );
    this.selectionService.clearSelection();
    this.toastService.show({
      message: this.t('workspace.export.success.deleted', 'Selected media deleted.'),
      type: 'success',
    });
  }
}
