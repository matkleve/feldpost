import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

/**
 * Bordered search field with magnifier icon — page rails, chat headers, toolbars.
 * @see docs/design/page-rail-grid.md
 */
@Component({
  selector: 'app-rail-search-field',
  standalone: true,
  templateUrl: './rail-search-field.component.html',
  styleUrl: './rail-search-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RailSearchFieldComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly value = input('');
  readonly placeholder = input('Search…');
  readonly ariaLabel = input('Search');

  readonly valueChange = output<string>();
  /** Fired when the user presses Enter in the field (e.g. message search). */
  readonly submitted = output<void>();

  readonly hasValue = computed(() => this.value().trim().length > 0);

  onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }

  onEnter(event: Event): void {
    event.preventDefault();
    this.submitted.emit();
  }

  onClear(event: MouseEvent): void {
    event.preventDefault();
    this.valueChange.emit('');
  }
}
