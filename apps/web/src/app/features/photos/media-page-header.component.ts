/**
 * MediaPageHeader — Page header for /media route
 *
 * Displays breadcrumb navigation and media count.
 */
import { Component, input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-media-page-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="media-page-header">
      <nav class="media-page-header__breadcrumb" [attr.aria-label]="t('media.page.title', 'Media')">
        <a [routerLink]="['/']">{{ t('nav.home', 'Home') }}</a>
        <span aria-hidden="true">/</span>
        <span>{{ title() }}</span>
      </nav>
      <h1 class="media-page-header__title">{{ title() }}</h1>
      <p class="media-page-header__count">
        @if (loading()) {
          {{ t('common.loading', 'Loading media...') }}
        } @else if (showLoadedOfTotal()) {
          {{ loadedOfTotalLabel() }}
        } @else {
          {{ mediaCount() }}
          {{
            mediaCount() === 1
              ? t('media.page.header.item', 'item')
              : t('media.page.header.items', 'items')
          }}
        }
      </p>
    </header>
  `,
  styles: [
    `
      .media-page-header {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-1);
      }

      .media-page-header__breadcrumb {
        display: flex;
        align-items: center;
        gap: var(--spacing-1);
        min-width: 0;
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
      }

      .media-page-header__breadcrumb a {
        color: inherit;
        text-decoration: underline;
        text-underline-offset: 0.15em;
        cursor: pointer;
      }

      .media-page-header__breadcrumb a:hover {
        color: var(--color-text-primary);
      }

      .media-page-header__title {
        margin: 0;
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        line-height: var(--line-height-tight);
        color: var(--color-text-primary);
      }

      .media-page-header__count {
        margin: 0;
        font-size: var(--font-size-md);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
      }
    `,
  ],
})
export class MediaPageHeaderComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = ''): string => {
    const value = this.i18nService.t(key, fallback);
    if (typeof value === 'string' && value.trim().length > 0) return value;
    if (fallback.trim().length > 0) return fallback;
    return key;
  };

  title = input('Media');
  mediaCount = input<number | null>(null);
  totalCount = input<number | null>(null);
  loading = input(false);

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
