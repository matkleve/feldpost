import { Component } from '@angular/core';
import { inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-media-loading',
  standalone: true,
  template: `
    <div
      class="media-loading"
      role="status"
      [attr.aria-label]="t('common.loading', 'Loading media...')"
    >
      <p>{{ t('common.loading', 'Loading media...') }}</p>
    </div>
  `,
  styles: [
    `
      .media-loading {
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
export class MediaLoadingComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback: string): string => {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  };
}
