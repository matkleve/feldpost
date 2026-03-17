import { Component, input, output } from '@angular/core';

export interface ProjectSelectOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-project-select-dialog',
  standalone: true,
  templateUrl: './project-select-dialog.component.html',
  styleUrl: './project-select-dialog.component.scss',
})
export class ProjectSelectDialogComponent {
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
  }
}
