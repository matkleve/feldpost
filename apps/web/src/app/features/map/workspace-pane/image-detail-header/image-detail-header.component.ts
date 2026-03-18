import { Component, inject, input, output } from '@angular/core';
import { ClickOutsideDirective } from '../../../../shared/click-outside.directive';
import { I18nService } from '../../../../core/i18n/i18n.service';

@Component({
  selector: 'app-image-detail-header',
  standalone: true,
  imports: [ClickOutsideDirective],
  templateUrl: './image-detail-header.component.html',
  styleUrl: '../image-detail-view.component.scss',
})
export class ImageDetailHeaderComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly displayTitle = input.required<string>();
  readonly titleValue = input<string>('');
  readonly mediaTypeLabel = input.required<string>();
  readonly editingTitle = input(false);
  readonly showContextMenu = input(false);

  readonly closed = output<void>();
  readonly titleEditRequested = output<void>();
  readonly titleSaveRequested = output<string>();
  readonly titleEditCancelled = output<void>();
  readonly contextMenuToggled = output<void>();
  readonly contextMenuClosed = output<void>();
  readonly deleteRequested = output<void>();
  readonly copyCoordinatesRequested = output<void>();
}
