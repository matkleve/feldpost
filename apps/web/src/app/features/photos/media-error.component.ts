import { Component, input, output } from '@angular/core';
import { inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-media-error',
  standalone: true,
  template: `
    <div class="media-error" role="alert">
      <p>{{ t('media.page.error', 'Failed to load media') }}</p>
      <button (click)="retry.emit()" class="media-error__retry">
        {{ t('media.page.retry', 'Retry') }}
      </button>
    </div>
  `,
  styles: [
    `
      .media-error {
        border: 1px solid color-mix(in srgb, var(--color-warning) 45%, var(--color-border));
        border-radius: var(--container-radius-panel);
        background: color-mix(in srgb, var(--color-bg-surface) 88%, var(--color-warning));
        padding: var(--spacing-4);
        display: grid;
        gap: var(--spacing-2);
        text-align: center;

        p {
          margin: 0;
          color: var(--color-text-secondary);
        }
      }

      .media-error__retry {
        max-width: fit-content;
        margin-inline: auto;
        padding: var(--spacing-2) var(--spacing-3);
        border: 1px solid var(--color-border);
        border-radius: var(--container-radius-control);
        background: var(--color-bg-base);
        color: var(--color-text-primary);
        cursor: pointer;
        font-size: 0.875rem;
        transition: background-color 0.2s;

        &:hover {
          background: var(--color-bg-surface);
        }
      }
    `,
  ],
})
export class MediaErrorComponent {
  private readonly i18nService = inject(I18nService);
  readonly retry = output<void>();

  readonly t = (key: string, fallback: string): string => {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  };
}
