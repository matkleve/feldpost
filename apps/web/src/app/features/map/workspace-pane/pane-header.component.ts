import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-pane-header',
  template: `
    <div class="pane-header">
      <div class="pane-header__leading">
        @if (colorPickerEnabled()) {
          <button
            type="button"
            class="pane-header__color-btn"
            aria-label="Change project color"
            [attr.aria-expanded]="colorPickerOpen()"
            (click)="requestColorPicker()"
          >
            <span
              class="pane-header__color-swatch"
              [style.background]="colorToken() ?? 'var(--color-clay)'"
            ></span>
            <span class="pane-header__color-icon material-icons" aria-hidden="true">palette</span>
          </button>
        }
      </div>

      @if (editable()) {
        <input
          #titleInput
          class="pane-header__title-input"
          type="text"
          [value]="editValue()"
          aria-label="Project title"
          (input)="onEditInput(titleInput.value)"
          (keydown.enter)="onEditSubmit(titleInput.value)"
          (blur)="onEditSubmit(titleInput.value)"
        />
      } @else {
        @if (editEnabled()) {
          <button
            type="button"
            class="pane-header__title-btn"
            aria-label="Rename project"
            title="Rename project"
            (click)="requestEdit()"
          >
            <span class="pane-header__title">{{ title() }}</span>
          </button>
        } @else {
          <span class="pane-header__title">{{ title() }}</span>
        }
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

  requestEdit(): void {
    if (!this.editEnabled()) {
      return;
    }

    this.editRequested.emit();
  }

  requestColorPicker(): void {
    if (!this.colorPickerEnabled()) {
      return;
    }

    this.colorPickerRequested.emit();
  }
}
