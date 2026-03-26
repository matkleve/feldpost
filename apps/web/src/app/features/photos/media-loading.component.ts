import { Component } from '@angular/core';
import { inject } from '@angular/core';
import { input } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { CenteredLayoutComponent } from '../../shared/containers/centered-layout.component';
import type { CardVariant } from '../../shared/ui-primitives/card-variant.types';

@Component({
  selector: 'app-media-loading',
  standalone: true,
  imports: [CenteredLayoutComponent],
  template: `
    <app-centered-layout>
      <section
        class="media-loading"
        [class.media-loading--row]="variant() === 'row'"
        [class.media-loading--small]="variant() === 'small'"
        [class.media-loading--medium]="variant() === 'medium'"
        [class.media-loading--large]="variant() === 'large'"
        role="status"
        [attr.aria-label]="t('common.loading', 'Loading media...')"
      >
        @if (variant() === 'row') {
          @for (row of rowSkeletonItems; track row) {
            <div class="media-loading__row"></div>
          }
        } @else {
          @for (tile of tileSkeletonItems; track tile) {
            <div class="media-loading__tile"></div>
          }
        }
      </section>
    </app-centered-layout>
  `,
  styles: [
    `
      .media-loading {
        display: grid;
        gap: var(--spacing-2);
        width: min(100%, 80rem);
      }

      .media-loading--small,
      .media-loading--medium,
      .media-loading--large {
        grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
      }

      .media-loading--medium {
        grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
      }

      .media-loading--large {
        grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
      }

      .media-loading--row {
        grid-template-columns: 1fr;
      }

      .media-loading__row {
        min-height: 4rem;
        border-radius: var(--container-radius-control);
      }

      .media-loading__tile {
        aspect-ratio: 1;
        border-radius: var(--container-radius-control);
      }

      .media-loading__row,
      .media-loading__tile {
        background: linear-gradient(
          90deg,
          color-mix(in srgb, var(--color-border) 65%, transparent) 0%,
          color-mix(in srgb, var(--color-bg-surface) 75%, transparent) 50%,
          color-mix(in srgb, var(--color-border) 65%, transparent) 100%
        );
        background-size: 200% 100%;
        animation: media-loading-pulse 1.2s ease-in-out infinite;
      }

      @keyframes media-loading-pulse {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -20% 0;
        }
      }
    `,
  ],
})
export class MediaLoadingComponent {
  readonly variant = input<CardVariant>('medium');
  readonly rowSkeletonItems = [1, 2, 3, 4];
  readonly tileSkeletonItems = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback: string): string => {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  };
}
