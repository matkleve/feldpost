import { Component, input, output } from '@angular/core';
import { UI_PRIMITIVE_DIRECTIVES } from '../ui-primitives/ui-primitives.directive';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [...UI_PRIMITIVE_DIRECTIVES],
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

