import { Component } from '@angular/core';
import { inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-media-empty',
  standalone: true,
  template: `
    <div class="media-empty">
      <p>{{ t('media.page.empty', 'No media found') }}</p>
    </div>
  `,
  styles: [
    `
      .media-empty {
        border: 1px solid var(--color-border);
        border-radius: var(--container-radius-panel);
        background: var(--color-bg-surface);
        padding: var(--spacing-4);
        display: grid;
        gap: var(--spacing-2);
        text-align: center;
        color: var(--color-text-muted);
      }
    `,
  ],
})
export class MediaEmptyComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback: string): string => {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  };
}
