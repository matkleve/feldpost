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
  templateUrl: './media-loading.component.html',
  styleUrl: './media-loading.component.scss',
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
