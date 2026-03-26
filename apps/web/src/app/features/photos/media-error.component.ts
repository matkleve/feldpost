import { Component, output } from '@angular/core';
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
  templateUrl: './media-error.component.html',
  styleUrl: './media-error.component.scss',
})
export class MediaErrorComponent {
  private readonly i18nService = inject(I18nService);
  readonly retry = output<void>();

  readonly t = (key: string, fallback: string): string => {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  };
}
