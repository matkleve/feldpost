import { Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import type { MetadataComposeValueType } from '../../../../core/metadata/metadata-validation.helpers';

@Component({
  selector: 'app-metadata-value-editor',
  standalone: true,
  template: `
    @switch (valueType()) {
      @case ('number') {
        <input
          class="detail-row__field-input detail-row__field-input--value"
          type="number"
          [value]="value()"
          [disabled]="disabled()"
          [attr.aria-label]="ariaLabel()"
          [placeholder]="t('workspace.metadata.input.value.placeholder', 'Value')"
          (input)="onInput($event)"
        />
      }
      @case ('date') {
        <input
          class="detail-row__field-input detail-row__field-input--value"
          type="date"
          [value]="value()"
          [disabled]="disabled()"
          [attr.aria-label]="ariaLabel()"
          (input)="onInput($event)"
        />
      }
      @default {
        <input
          class="detail-row__field-input detail-row__field-input--value"
          type="text"
          [value]="value()"
          [disabled]="disabled()"
          [attr.aria-label]="ariaLabel()"
          [placeholder]="t('workspace.metadata.input.value.placeholder', 'Value')"
          (input)="onInput($event)"
        />
      }
    }
  `,
  host: {
    class: 'metadata-value-editor block min-w-0 w-full',
  },
})
export class MetadataValueEditorComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly valueType = input.required<MetadataComposeValueType>();
  readonly value = input('');
  readonly disabled = input(false);
  readonly ariaLabel = input('');

  readonly valueChange = output<string>();

  onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
