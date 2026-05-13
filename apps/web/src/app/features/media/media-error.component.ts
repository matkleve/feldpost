import { Component, output } from '@angular/core';
import { inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { HLM_BUTTON_IMPORTS } from '../../shared/ui/button';

@Component({
  selector: 'app-media-error',
  standalone: true,
  imports: [...HLM_BUTTON_IMPORTS],
  templateUrl: './media-error.component.html',
  styleUrl: './media-error.component.scss',
  host: {
    role: 'alert',
    '[class.media-error]': 'true',
  },
})
export class MediaErrorComponent {
  private readonly i18nService = inject(I18nService);
  readonly retry = output<void>();

  readonly t = (key: string, fallback: string): string => {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  };
}
