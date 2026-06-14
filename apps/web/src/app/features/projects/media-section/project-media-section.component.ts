import { Component, computed, inject, input, output, signal } from '@angular/core';
import type { ProjectMediaListItem } from '../../../core/projects/projects.types';
import { projectMediaListItemToMediaRecord } from '../../../core/projects/projects.helpers';
import type { MediaRecord } from '../../../core/media-query/media-query.types';
import { isImageLikeStoragePath } from '../../../core/media-download/media-preview-target.helpers';
import { MediaDownloadService } from '../../../core/media-download/media-download.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { ItemGridComponent } from '../../../shared/item-grid/item-grid.component';
import type { ItemDisplayMode } from '../../../shared/item-grid/item.component';
import { MediaItemComponent } from '../../../shared/media-item/media-item.component';
import { PhotoLightboxComponent } from '../../../shared/photo-lightbox/photo-lightbox.component';

@Component({
  selector: 'app-project-media-section',
  standalone: true,
  imports: [...HLM_BUTTON_IMPORTS, ItemGridComponent, MediaItemComponent, PhotoLightboxComponent],
  templateUrl: './project-media-section.component.html',
  styleUrl: './project-media-section.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col',
  },
})
export class ProjectMediaSectionComponent {
  private readonly i18nService = inject(I18nService);
  private readonly mediaDownloadService = inject(MediaDownloadService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly exclusive = input<ProjectMediaListItem[]>([]);
  readonly shared = input<ProjectMediaListItem[]>([]);
  readonly loading = input(false);
  readonly displayMode = input<ItemDisplayMode>('grid-sm');

  readonly mediaRemoved = output<string>();

  readonly showLightbox = signal(false);
  readonly lightboxMediaId = signal<string | null>(null);

  readonly exclusiveRecords = computed(() =>
    this.exclusive().map(projectMediaListItemToMediaRecord),
  );
  readonly sharedRecords = computed(() => this.shared().map(projectMediaListItemToMediaRecord));

  readonly lightboxImageUrl = computed(() => {
    const id = this.lightboxMediaId()?.trim();
    if (!id) {
      return null;
    }
    return (
      this.mediaDownloadService.getCachedUrl(id, 'full') ??
      this.mediaDownloadService.getCachedUrl(id, 'thumb')
    );
  });

  onItemPointerClick(
    item: MediaRecord,
    modifiers: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
  ): void {
    if (modifiers.shiftKey || modifiers.ctrlKey || modifiers.metaKey) {
      return;
    }
    if (!isImageLikeStoragePath(item.storage_path)) {
      return;
    }
    this.openLightbox(item);
  }

  openLightbox(item: MediaRecord): void {
    const id = item.id.trim();
    if (!id) {
      return;
    }
    this.lightboxMediaId.set(id);
    void this.mediaDownloadService.requestFullPreview(id).then(() => {
      if (this.lightboxImageUrl()) {
        this.showLightbox.set(true);
      }
    });
  }

  closeLightbox(): void {
    this.showLightbox.set(false);
    this.lightboxMediaId.set(null);
  }

  onRemoveMedia(mediaId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.mediaRemoved.emit(mediaId);
  }
}
