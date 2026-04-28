import { Component, input, output } from '@angular/core';
import { PaneHeaderComponent } from '../pane-header.component';

@Component({
  selector: 'app-workspace-pane-header',
  standalone: true,
  imports: [PaneHeaderComponent],
  template: `
    <app-pane-header
      [title]="title()"
      [editable]="editable()"
      [editEnabled]="editEnabled()"
      [editValue]="editValue()"
      [colorToken]="colorToken()"
      [colorPickerEnabled]="colorPickerEnabled()"
      [colorPickerOpen]="colorPickerOpen()"
      (editValueChange)="editValueChange.emit($event)"
      (editSubmitted)="editSubmitted.emit($event)"
      (editRequested)="editRequested.emit()"
      (colorPickerRequested)="colorPickerRequested.emit()"
      (close)="close.emit()"
    ></app-pane-header>
  `,
  styleUrl: './workspace-pane-header.component.scss',
})
export class WorkspacePaneHeaderComponent {
  readonly title = input('');
  readonly editable = input(false);
  readonly editEnabled = input(false);
  readonly editValue = input('');
  readonly colorToken = input<string | null>(null);
  readonly colorPickerEnabled = input(false);
  readonly colorPickerOpen = input(false);

  readonly editValueChange = output<string>();
  readonly editSubmitted = output<string>();
  readonly editRequested = output<void>();
  readonly colorPickerRequested = output<void>();
  readonly close = output<void>();
}
