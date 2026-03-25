/**
 * MediaPageHeader — Page header for /media route
 *
 * Displays breadcrumb navigation and media count.
 */
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-media-page-header',
  standalone: true,
  template: `
    <header class="media-page-header">
      <nav class="media-page-header__breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span aria-hidden="true">/</span>
        <span>{{ title() }}</span>
      </nav>
      @if (mediaCount() !== null && !loading()) {
        <p class="media-page-header__count">{{ mediaCount() }} items</p>
      }
    </header>
  `,
  styles: [
    `
      .media-page-header {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
      }

      .media-page-header__breadcrumb {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: var(--color-text-muted);
      }

      .media-page-header__breadcrumb a {
        color: inherit;
        text-decoration: none;
        cursor: pointer;
      }

      .media-page-header__breadcrumb a:hover {
        color: var(--color-text-primary);
      }

      .media-page-header__count {
        margin: 0;
        font-size: 0.875rem;
        color: var(--color-text-secondary);
      }
    `,
  ],
})
export class MediaPageHeaderComponent {
  title = input('Media');
  mediaCount = input<number | null>(null);
  loading = input(false);
}
