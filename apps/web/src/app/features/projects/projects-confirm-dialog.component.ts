import { Component, input, output } from '@angular/core';
import {
  UiButtonDirective,
  UiButtonSecondaryDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';

@Component({
  selector: 'app-projects-confirm-dialog',
  standalone: true,
  imports: [UiButtonDirective, UiButtonSecondaryDirective],
  templateUrl: './projects-confirm-dialog.component.html',
  styleUrl: './projects-confirm-dialog.component.scss',
})
export class ProjectsConfirmDialogComponent {
  readonly open = input<boolean>(false);
  readonly title = input<string>('');
  readonly message = input<string>('');
  readonly confirmLabel = input<string>('');
  readonly cancelLabel = input<string>('Cancel');
  readonly busy = input<boolean>(false);
  readonly danger = input<boolean>(false);

  readonly cancel = output<void>();
  readonly confirm = output<void>();

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirm(): void {
    this.confirm.emit();
  }
}

