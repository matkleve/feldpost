import { Component, input, output, viewChild } from '@angular/core';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HLM_BUTTON_IMPORTS } from '../../shared/ui/button';
import { HLM_DIALOG_IMPORTS } from '../../shared/ui/dialog';

@Component({
  selector: 'app-projects-confirm-dialog',
  standalone: true,
  imports: [...BrnDialogImports, ...HLM_DIALOG_IMPORTS, ...HLM_BUTTON_IMPORTS],
  templateUrl: './projects-confirm-dialog.component.html',
  styleUrl: './projects-confirm-dialog.component.scss',
})
export class ProjectsConfirmDialogComponent {
  /** BrnDialog on `ng-container`; confirm omits `brnDialogClose` so parent can unmount after async `busy()` without a race. */
  private readonly _brnDialog = viewChild(BrnDialog);

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

