import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-pane-header',
  template: `
    <div class="pane-header">
      @if (editable()) {
        <input
          #titleInput
          class="pane-header__title-input"
          type="text"
          [value]="editValue()"
          aria-label="Project title"
          (input)="onEditInput(titleInput.value)"
          (keydown.enter)="onEditSubmit(titleInput.value)"
        />
      } @else {
        <span class="pane-header__title">{{ title() }}</span>
      }
      <button
        class="pane-header__close-btn"
        type="button"
        aria-label="Close workspace pane"
        title="Close workspace pane"
        (click)="close.emit()"
      >
        <span class="material-icons" aria-hidden="true">close</span>
      </button>
    </div>
  `,
  styleUrl: './pane-header.component.scss',
})
export class PaneHeaderComponent {
  readonly title = input('Workspace');
  readonly editable = input(false);
  readonly editValue = input('');
  readonly editValueChange = output<string>();
  readonly editSubmitted = output<string>();
  readonly close = output<void>();

  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  constructor() {
    effect(() => {
      if (!this.editable()) {
        return;
      }

      setTimeout(() => {
        const input = this.titleInput()?.nativeElement;
        if (!input) {
          return;
        }

        input.focus();
        input.select();
      }, 0);
    });
  }

  onEditInput(value: string): void {
    this.editValueChange.emit(value);
  }

  onEditSubmit(value: string): void {
    this.editSubmitted.emit(value);
  }
}
