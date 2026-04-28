import type { ElementRef} from '@angular/core';
import { Component, effect, inject, input, output, viewChild } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-pane-header',
  template: `
    <div class="pane-header">
      <div class="pane-header__leading">
        @if (colorPickerEnabled()) {
          <button
            type="button"
            class="pane-header__color-btn"
            [attr.aria-label]="t('workspace.pane.color.aria', 'Change project color')"
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
          [attr.aria-label]="t('workspace.pane.projectTitle.aria', 'Project title')"
          (input)="onEditInput(titleInput.value)"
          (keydown.enter)="onEditSubmit(titleInput.value)"
          (blur)="onEditSubmit(titleInput.value)"
        />
      } @else {
        @if (editEnabled()) {
          <button
            type="button"
            class="pane-header__title-btn"
            [attr.aria-label]="t('workspace.pane.rename.aria', 'Rename project')"
            [title]="t('workspace.pane.rename.title', 'Rename project')"
            (click)="requestEdit()"
          >
            <span class="pane-header__title" data-i18n-skip>{{ title() }}</span>
          </button>
        } @else {
          <span class="pane-header__title" data-i18n-skip>{{ title() }}</span>
        }
      }

      <button
        class="pane-header__close-btn"
        type="button"
        [attr.aria-label]="t('workspace.pane.close.aria', 'Close workspace pane')"
        [title]="t('workspace.pane.close.title', 'Close workspace pane')"
        (click)="close.emit()"
      >
        <span class="material-icons" aria-hidden="true">close</span>
      </button>
    </div>
  `,
  styleUrl: './pane-header.component.scss',
})
export class PaneHeaderComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

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
