import { Component, input, output, viewChild } from '@angular/core';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { UI_PRIMITIVE_DIRECTIVES } from '../ui-primitives/ui-primitives.directive';
import { HLM_DIALOG_IMPORTS } from '../ui/dialog';

@Component({
  selector: 'app-text-input-dialog',
  standalone: true,
  imports: [...BrnDialogImports, ...HLM_DIALOG_IMPORTS, ...UI_PRIMITIVE_DIRECTIVES],
  templateUrl: './text-input-dialog.component.html',
  styleUrl: './text-input-dialog.component.scss',
})
export class TextInputDialogComponent {
  /** BrnDialog lives on the template `ng-container`; query it for programmatic close (Enter / Escape). */
  private readonly _brnDialog = viewChild(BrnDialog);

  readonly title = input.required<string>();
  readonly message = input('');
  readonly placeholder = input('');
  readonly confirmLabel = input('Speichern');
  readonly cancelLabel = input('Abbrechen');
  readonly initialValue = input('');

  readonly confirmed = output<string>();
  readonly cancelled = output<void>();

  /** Escape closes the CDK dialog and emits cancel (no `brnDialogClose` on the input). */
  onEscape(): void {
    this.cancelled.emit();
    this._brnDialog()?.close();
  }

  emitConfirmed(rawValue: string): void {
    const value = rawValue.trim();
    if (!value) {
      return;
    }
    this.confirmed.emit(value);
    this._brnDialog()?.close();
  }
}
