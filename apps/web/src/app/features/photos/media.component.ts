/**
 * MediaComponent — /media page shell.
 * Displays all media (images, videos, documents) with grid layout.
 * Workspace pane is mounted globally by AppShell, not here.
 *
 * Layout mirrors projects-page pattern:
 * main > section.content-clamp > header + content
 */
import { Component, effect, inject, signal } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { VStackComponent } from '../../shared/containers';
import { MediaPageHeaderComponent } from './media-page-header.component';
import { MediaContentComponent } from './media-content.component';
import { CardVariantSwitchComponent } from '../../shared/ui-primitives/card-variant-switch.component';
import type { SelectedItemsContextPort } from '../../core/workspace-pane-context.port';
import { WorkspacePaneObserverAdapter } from '../../core/workspace-pane-observer.adapter';
import { WorkspaceSelectionService } from '../../core/workspace-selection.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { CardVariantSettingsService } from '../../shared/ui-primitives/card-variant-settings.service';
import { CARD_VARIANTS, type CardVariant } from '../../shared/ui-primitives/card-variant.types';
import type { ImageRecord } from '../map/workspace-pane/image-detail-view.types';
import { MediaQueryService } from '../../core/media-query.service';

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [
    VStackComponent,
    MediaPageHeaderComponent,
    MediaContentComponent,
    CardVariantSwitchComponent,
  ],
  templateUrl: './media.component.html',
  styleUrl: './media.component.scss',
})
export class MediaComponent implements OnDestroy {
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  protected readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly mediaQueryService = inject(MediaQueryService);
  private readonly i18nService = inject(I18nService);
  private readonly cardVariantSettings = inject(CardVariantSettingsService);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly mediaItems = signal<ImageRecord[]>([]);
  readonly projectNameById = signal<ReadonlyMap<string, string>>(new Map<string, string>());
  readonly cardVariant = signal<CardVariant>(this.cardVariantSettings.getVariant('media'));
  readonly allowedCardVariants = CARD_VARIANTS;
  readonly projectNameForFn = (projectId: string | null): string => this.projectNameFor(projectId);

  constructor() {
    void this.loadMedia();

    // Bind media context to workspace pane
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
  }

  ngOnDestroy(): void {
    this.workspacePaneObserver.onRouteLeave('media');
  }

  t(key: string, fallback: string): string {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  }

  onMediaItemClicked(mediaId: string): void {
    // Single-select: set as single selected item + open detail view
    this.workspaceSelectionService.setSingle(mediaId);
    // Open detail view in workspace pane
    this.workspacePaneObserver.setDetailImageId(mediaId);
  }

  onRetryLoad(): void {
    this.loadError.set(null);
    void this.loadMedia();
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

  async loadMedia(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.mediaQueryService.loadCurrentUserMedia();
      this.mediaItems.set(result.items);
      this.projectNameById.set(result.projectNameById);
    } catch {
      this.loadError.set(this.t('media.page.error', 'Failed to load media'));
      this.mediaItems.set([]);
      this.projectNameById.set(new Map<string, string>());
    } finally {
      this.loading.set(false);
    }
  }
}
