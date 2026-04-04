/**
 * MediaPageHeader — Page header for /media route
 *
 * Displays breadcrumb navigation and media count.
 */
import { Component, input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';

export type MediaPageHeaderState = 'loading' | 'ready';

@Component({
  selector: 'app-media-page-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './media-page-header.component.html',
  styleUrl: './media-page-header.component.scss',
})
export class MediaPageHeaderComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = ''): string => {
    const value = this.i18nService.t(key, fallback);
    if (typeof value === 'string' && value.trim().length > 0) return value;
    if (fallback.trim().length > 0) return fallback;
    return key;
  };

  readonly title = input('Media');
  readonly mediaCount = input<number | null>(null);
  readonly totalCount = input<number | null>(null);
  readonly state = input<MediaPageHeaderState>('ready');

  showLoadedOfTotal(): boolean {
    const total = this.totalCount();
    const loaded = this.mediaCount() ?? 0;
    return typeof total === 'number' && total > loaded;
  }

  loadedOfTotalLabel(): string {
    const loaded = this.mediaCount() ?? 0;
    const total = this.totalCount() ?? loaded;
    return this.t('media.page.header.loadedOfTotal', '{loaded} of {total} items loaded')
      .replace('{loaded}', String(loaded))
      .replace('{total}', String(total));
  }
}
