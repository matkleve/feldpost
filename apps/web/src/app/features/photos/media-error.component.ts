import { Component, input, output } from '@angular/core';
import { inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import {
  UiButtonDirective,
  UiButtonSecondaryDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';

@Component({
  selector: 'app-media-error',
  standalone: true,
  imports: [UiButtonDirective, UiButtonSecondaryDirective],
  template: `
    <div class="media-error" role="alert">
      <h2 class="media-error__title">{{ t('media.page.error', 'Failed to load media') }}</h2>
      <p class="media-error__body">
        {{ t('projects.page.error.body', 'Please try again in a moment.') }}
      </p>
      <button
        uiButton
        uiButtonSecondary
        type="button"
        class="ui-button ui-button--secondary media-error__retry"
        (click)="retry.emit()"
      >
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
      }

      .media-error__title {
        margin: 0;
        color: var(--color-text-primary);
        font-size: var(--font-size-lg);
      }

      .media-error__body {
        margin: 0;
        color: var(--color-text-secondary);
      }

      .media-error__retry {
        justify-self: start;
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
