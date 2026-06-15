import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

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
  readonly value = input('');
  readonly placeholder = input('Search…');
  readonly ariaLabel = input('Search');

  readonly valueChange = output<string>();
  /** Fired when the user presses Enter in the field (e.g. message search). */
  readonly submitted = output<void>();

  onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }

  onEnter(event: Event): void {
    event.preventDefault();
    this.submitted.emit();
  }
}
