import { Component, input, output } from '@angular/core';
import { BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import { HLM_DIALOG_IMPORTS } from '../ui/dialog';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [...BrnDialogImports, ...HLM_DIALOG_IMPORTS, ...HLM_BUTTON_IMPORTS],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Delete');
  readonly cancelLabel = input('Cancel');
  readonly danger = input(true);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
