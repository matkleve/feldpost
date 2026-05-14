import { Component, input, output, viewChild } from '@angular/core';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import { HLM_DIALOG_IMPORTS } from '../ui/dialog';

export interface ProjectSelectOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-project-select-dialog',
  standalone: true,
  imports: [...BrnDialogImports, ...HLM_DIALOG_IMPORTS, ...HLM_BUTTON_IMPORTS],
  templateUrl: './project-select-dialog.component.html',
  styleUrl: './project-select-dialog.component.scss',
})
export class ProjectSelectDialogComponent {
  /** BrnDialog on the root `ng-container`; used to close after confirm (no `brnDialogClose` on confirm). */
  private readonly _brnDialog = viewChild(BrnDialog);

  readonly title = input.required<string>();
  readonly message = input('');
  readonly options = input.required<ReadonlyArray<ProjectSelectOption>>();
  readonly selectedId = input<string | null>(null);
  readonly confirmLabel = input('Auswaehlen');
  readonly cancelLabel = input('Abbrechen');

  readonly selectedIdChange = output<string>();
  readonly confirmed = output<string>();
  readonly cancelled = output<void>();

  selectOption(projectId: string): void {
    this.selectedIdChange.emit(projectId);
  }

  confirmSelection(): void {
    const selectedId = this.selectedId();
    if (!selectedId) {
      return;
    }
    this.confirmed.emit(selectedId);
    this._brnDialog()?.close();
  }
}
