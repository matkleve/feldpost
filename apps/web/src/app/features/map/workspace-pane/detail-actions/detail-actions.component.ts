import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';

@Component({
  selector: 'app-detail-actions',
  standalone: true,
  templateUrl: './detail-actions.component.html',
  styleUrl: './detail-actions.component.scss',
})
export class DetailActionsComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly hasCoordinates = input(false);

  readonly zoomToLocation = output<void>();
  readonly addToProject = output<void>();
  readonly copyCoordinates = output<void>();
  readonly deleteImage = output<void>();
}
