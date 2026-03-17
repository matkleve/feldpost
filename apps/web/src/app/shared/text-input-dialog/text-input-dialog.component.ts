import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-text-input-dialog',
  standalone: true,
  templateUrl: './text-input-dialog.component.html',
  styleUrl: './text-input-dialog.component.scss',
})
export class TextInputDialogComponent {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly placeholder = input('');
  readonly confirmLabel = input('Speichern');
  readonly cancelLabel = input('Abbrechen');
  readonly initialValue = input('');

  readonly confirmed = output<string>();
  readonly cancelled = output<void>();

  emitConfirmed(rawValue: string): void {
    const value = rawValue.trim();
    if (!value) {
      return;
    }
    this.confirmed.emit(value);
  }
}
